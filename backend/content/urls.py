from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CallbackRequestCreateView, EnquiryCreateView, FaqCategoryViewSet, FaqViewSet, QuoteRequestCreateView,
    ServiceRequestCreateView, SiteImageViewSet, SiteSettingView, TestimonialViewSet,
)

router = DefaultRouter()
router.register('testimonials', TestimonialViewSet, basename='testimonial')
router.register('faqs', FaqViewSet, basename='faq')
router.register('faq-categories', FaqCategoryViewSet, basename='faq-category')
router.register('site-images', SiteImageViewSet, basename='site-image')

urlpatterns = router.urls + [
    # All four are create-only: there is intentionally no GET on any of them.
    path('enquiries/', EnquiryCreateView.as_view(), name='enquiry-create'),
    path('service-requests/', ServiceRequestCreateView.as_view(), name='service-request-create'),
    path('callbacks/', CallbackRequestCreateView.as_view(), name='callback-create'),
    # Nothing on the site posts here any more — the six service pop-ups replaced
    # the /quote page. Kept so the existing quote requests in the admin still
    # have a matching endpoint and the route can be reinstated without a
    # migration if the desk ever wants the standalone quote form back.
    path('quotes/', QuoteRequestCreateView.as_view(), name='quote-create'),

    path('site-settings/', SiteSettingView.as_view(), name='site-settings'),
]
