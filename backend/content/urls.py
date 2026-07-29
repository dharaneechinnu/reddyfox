from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    EnquiryCreateView, FaqCategoryViewSet, FaqViewSet, SiteSettingView, TestimonialViewSet,
)

router = DefaultRouter()
router.register('testimonials', TestimonialViewSet, basename='testimonial')
router.register('faqs', FaqViewSet, basename='faq')
router.register('faq-categories', FaqCategoryViewSet, basename='faq-category')

urlpatterns = router.urls + [
    # Create-only: there is intentionally no GET /enquiries/ on the public API.
    path('enquiries/', EnquiryCreateView.as_view(), name='enquiry-create'),
    path('site-settings/', SiteSettingView.as_view(), name='site-settings'),
]
