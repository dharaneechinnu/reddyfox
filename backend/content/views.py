from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from telegram_alerts.services import notify_team_telegram

from .models import Faq, FaqCategory, SiteImage, SiteSetting, Testimonial
from .notifications import notify_team
from .serializers import (
    CallbackRequestCreateSerializer, EnquiryCreateSerializer, FaqCategorySerializer, FaqSerializer,
    QuoteRequestCreateSerializer, ServiceRequestCreateSerializer, SiteImageSerializer, SiteSettingSerializer,
    TestimonialSerializer,
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


class SiteImageViewSet(viewsets.ReadOnlyModelViewSet):
    """Staff-uploaded photos, one per fixed slot. Edited in the Django admin
    under Content -> Site images. `alt_text`/`url` per SiteImageSerializer."""
    serializer_class = SiteImageSerializer

    def get_queryset(self):
        return SiteImage.objects.filter(is_visible=True)


class LeadRateThrottle(AnonRateThrottle):
    """Shared scope across all three forms, so a bot cannot get three times the
    allowance simply by rotating between them."""
    scope = 'enquiry'


class BaseLeadCreateView(generics.CreateAPIView):
    """CREATE ONLY, deliberately. None of these endpoints support GET, so
    customer names and phones can never be read back over the public
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
        # 2. Then try every notification channel. Each one is independent and never raises —
        # a broken Telegram bot token must not stop the email, and vice versa.
        notify_team(self.lead)
        notify_team_telegram(self.lead)

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


class ServiceRequestCreateView(BaseLeadCreateView):
    """All six service pop-ups post here — `service` in the body says which one."""
    serializer_class = ServiceRequestCreateSerializer
    success_message = 'Thank you — your request has reached the counter. A dealer will call you back shortly.'


class CallbackRequestCreateView(BaseLeadCreateView):
    """Quick "get your best price" capture from the homepage converter widget."""
    serializer_class = CallbackRequestCreateSerializer
    success_message = "Thanks — we've got your details. Our team will call you back shortly with the best price."


class SiteSettingView(generics.RetrieveAPIView):
    """Public contact options (WhatsApp). Read-only; edited in the Django admin
    under Content -> Site settings."""
    serializer_class = SiteSettingSerializer

    def get_object(self):
        return SiteSetting.load()
