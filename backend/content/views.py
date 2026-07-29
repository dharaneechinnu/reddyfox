from rest_framework import viewsets

from .models import Faq, FaqCategory, Testimonial
from .serializers import FaqCategorySerializer, FaqSerializer, TestimonialSerializer


class TestimonialViewSet(viewsets.ReadOnlyModelViewSet):
    """Customer voices. Edited in Wagtail under Snippets -> Testimonials."""
    serializer_class = TestimonialSerializer

    def get_queryset(self):
        return Testimonial.objects.public()


class FaqViewSet(viewsets.ReadOnlyModelViewSet):
    """FAQs. Edited in Wagtail under Snippets -> FAQs.

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
