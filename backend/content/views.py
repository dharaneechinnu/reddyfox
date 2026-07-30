from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import Faq, FaqCategory, Lead, SiteSetting, Testimonial
from .notifications import notify_team
from .serializers import (
    EnquiryCreateSerializer, FaqCategorySerializer, FaqSerializer,
    LeadTrackSerializer, QuoteRequestCreateSerializer, RateLockCreateSerializer,
    SiteSettingSerializer, TestimonialSerializer,
)
from .validators import normalize_phone


class TestimonialViewSet(viewsets.ReadOnlyModelViewSet):
    """Customer voices. Edited in the Django admin under Content -> Testimonials."""
    serializer_class = TestimonialSerializer

    def get_queryset(self):
        return Testimonial.objects.public()


class FaqViewSet(viewsets.ReadOnlyModelViewSet):
    """FAQs. Edited in the Django admin under Content -> FAQs.

    Supports ?homepage=true to fetch only the subset flagged for the
    homepage accordion, so the homepage and /faq page can differ.
    """
    serializer_class = FaqSerializer

    def get_queryset(self):
        qs = Faq.objects.public().select_related('category')
        if self.request.query_params.get('homepage') == 'true':
            qs = qs.filter(show_on_homepage=True)
        return qs


class FaqCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Categories for the FAQ page sidebar."""
    queryset = FaqCategory.objects.all()
    serializer_class = FaqCategorySerializer


class LeadRateThrottle(AnonRateThrottle):
    """Shared scope across all three forms, so a bot cannot get three times the
    allowance simply by rotating between them."""
    scope = 'enquiry'


class BaseLeadCreateView(generics.CreateAPIView):
    """CREATE ONLY, deliberately. None of these endpoints support GET, so
    customer names, phones and emails can never be read back over the public
    API. Staff read leads in the Django admin.
    """

    throttle_classes = [LeadRateThrottle]
    success_message = 'Thank you — your request has reached our team. We will get back to you shortly.'

    def _client_ip(self):
        forwarded = self.request.META.get('HTTP_X_FORWARDED_FOR', '')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return self.request.META.get('REMOTE_ADDR')

    def perform_create(self, serializer):
        # 1. Save first — the lead is now safe no matter what happens next.
        self.lead = serializer.save(source_ip=self._client_ip())
        # 2. Then try to notify. Failures are logged inside notify_team.
        notify_team(self.lead)

    def response_payload(self):
        return {'detail': self.success_message, 'reference': self.lead.reference_display}

    def create(self, request, *args, **kwargs):
        super().create(request, *args, **kwargs)
        # Don't echo the submission back; just confirm receipt.
        return Response(self.response_payload(), status=status.HTTP_201_CREATED)


class EnquiryCreateView(BaseLeadCreateView):
    """Contact form."""
    serializer_class = EnquiryCreateSerializer
    success_message = 'Thank you — your enquiry has reached our team. We will get back to you shortly.'


class QuoteRequestCreateView(BaseLeadCreateView):
    """"Get a free quote"."""
    serializer_class = QuoteRequestCreateSerializer
    success_message = 'Thank you — your quote request has reached our dealers. We will come back with a price shortly.'


class RateLockCreateView(BaseLeadCreateView):
    """"Lock this rate" from the converter."""
    serializer_class = RateLockCreateSerializer

    def response_payload(self):
        # Tell the customer exactly when the lock runs out, so the promise on
        # screen matches what the desk sees in the admin.
        expires = self.lead.lock_expires_at
        return {
            'detail': 'Your rate is reserved. Our dealer will confirm it shortly.',
            'reference': self.lead.reference_display,
            'expires_at': expires.isoformat() if expires else None,
            'expires_at_display': (
                timezone.localtime(expires).strftime('%d %b %Y, %H:%M') + ' IST' if expires else None
            ),
        }


class TrackLeadThrottle(AnonRateThrottle):
    """Own scope: this endpoint is a lookup, not a submission, but it still
    needs its own budget so brute-forcing reference codes can't hide inside
    the traffic allowance the three submit forms share."""
    scope = 'lead-track'


class TrackLeadView(APIView):
    """Public, read-only status lookup for a customer's own request.

    Requires BOTH the phone number used on the request AND its reference
    code — the reference alone is already high-entropy (~1e12 possibilities),
    but requiring the phone too means a brute-force attempt also has to guess
    a real customer's number, not just enumerate codes.
    """

    throttle_classes = [TrackLeadThrottle]

    def get(self, request, *args, **kwargs):
        reference = (request.query_params.get('reference') or '').strip().upper()
        reference = reference.replace('-', '').replace(' ', '')
        phone = normalize_phone(request.query_params.get('phone') or '')

        not_found = Response(
            {'detail': 'We could not find a request matching those details. Check your phone number and reference code, or call us.'},
            status=status.HTTP_404_NOT_FOUND,
        )
        if not reference or not phone:
            return not_found

        lead = Lead.objects.filter(reference=reference, phone=phone).first()
        if lead is None:
            return not_found
        return Response(LeadTrackSerializer(lead).data)


class SiteSettingView(generics.RetrieveAPIView):
    """Public contact options (WhatsApp). Read-only; edited in the Django admin
    under Content -> Site settings."""
    serializer_class = SiteSettingSerializer

    def get_object(self):
        return SiteSetting.load()
