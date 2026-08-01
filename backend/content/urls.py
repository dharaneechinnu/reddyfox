from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CallbackRequestCreateView, EnquiryCreateView, FaqCategoryViewSet, FaqViewSet, QuoteRequestCreateView,
    RateLockCreateView, SiteImageViewSet, SiteSettingView, TestimonialViewSet,
)

router = DefaultRouter()
router.register('testimonials', TestimonialViewSet, basename='testimonial')
router.register('faqs', FaqViewSet, basename='faq')
router.register('faq-categories', FaqCategoryViewSet, basename='faq-category')
router.register('site-images', SiteImageViewSet, basename='site-image')

urlpatterns = router.urls + [
    # All three are create-only: there is intentionally no GET on any of them.
    path('enquiries/', EnquiryCreateView.as_view(), name='enquiry-create'),
    path('quotes/', QuoteRequestCreateView.as_view(), name='quote-create'),
    path('rate-locks/', RateLockCreateView.as_view(), name='rate-lock-create'),
    path('callbacks/', CallbackRequestCreateView.as_view(), name='callback-create'),

    path('site-settings/', SiteSettingView.as_view(), name='site-settings'),
]
