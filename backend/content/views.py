from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .models import Faq, FaqCategory, SiteSetting, Testimonial
from .notifications import notify_team
from .serializers import (
    EnquiryCreateSerializer, FaqCategorySerializer, FaqSerializer,
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


class EnquiryRateThrottle(AnonRateThrottle):
    """Separate throttle scope so form spam can't be raised by other traffic."""
    scope = 'enquiry'


class EnquiryCreateView(generics.CreateAPIView):
    """Public contact form endpoint. CREATE ONLY — deliberately no list or
    retrieve, so customer names, phones and emails can never be read back out
    over the public API. Staff read enquiries in the Django admin."""

    serializer_class = EnquiryCreateSerializer
    throttle_classes = [EnquiryRateThrottle]

    def _client_ip(self):
        forwarded = self.request.META.get('HTTP_X_FORWARDED_FOR', '')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return self.request.META.get('REMOTE_ADDR')

    def perform_create(self, serializer):
        # 1. Save first — the lead is now safe no matter what happens next.
        enquiry = serializer.save(source_ip=self._client_ip())
        # 2. Then try to notify. Failures are logged inside notify_team.
        notify_team(enquiry)

    def create(self, request, *args, **kwargs):
        super().create(request, *args, **kwargs)
        # Don't echo the submission back; just confirm receipt.
        return Response(
            {'detail': 'Thank you — your enquiry has reached our team. We will get back to you shortly.'},
            status=status.HTTP_201_CREATED,
        )


class SiteSettingView(generics.RetrieveAPIView):
    """Public contact options (WhatsApp). Read-only; edited in the Django admin
    under Content -> Site settings."""
    serializer_class = SiteSettingSerializer

    def get_object(self):
        return SiteSetting.load()
