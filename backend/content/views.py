from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .models import Faq, FaqCategory, SiteSetting, Testimonial
from .notifications import notify_team
from .serializers import (
    CallbackRequestCreateSerializer, EnquiryCreateSerializer, FaqCategorySerializer, FaqSerializer,
    QuoteRequestCreateSerializer, RateLockCreateSerializer,
    SiteSettingSerializer, TestimonialSerializer,
)


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
        return {'detail': self.success_message}

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


class CallbackRequestCreateView(BaseLeadCreateView):
    """Quick "get your best price" capture from the homepage converter widget."""
    serializer_class = CallbackRequestCreateSerializer
    success_message = "Thanks — we've got your details. Our team will call you back shortly with the best price."


class RateLockCreateView(BaseLeadCreateView):
    """"Lock this rate" from the converter."""
    serializer_class = RateLockCreateSerializer

    def response_payload(self):
        # Tell the customer exactly when the lock runs out, so the promise on
        # screen matches what the desk sees in the admin.
        expires = self.lead.lock_expires_at
        return {
            'detail': 'Your rate is reserved. Our dealer will confirm it shortly.',
            'expires_at': expires.isoformat() if expires else None,
            'expires_at_display': (
                timezone.localtime(expires).strftime('%d %b %Y, %H:%M') + ' IST' if expires else None
            ),
        }


class SiteSettingView(generics.RetrieveAPIView):
    """Public contact options (WhatsApp). Read-only; edited in the Django admin
    under Content -> Site settings."""
    serializer_class = SiteSettingSerializer

    def get_object(self):
        return SiteSetting.load()
