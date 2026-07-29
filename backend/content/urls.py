from rest_framework.routers import DefaultRouter

from .views import FaqCategoryViewSet, FaqViewSet, TestimonialViewSet

router = DefaultRouter()
router.register('testimonials', TestimonialViewSet, basename='testimonial')
router.register('faqs', FaqViewSet, basename='faq')
router.register('faq-categories', FaqCategoryViewSet, basename='faq-category')

urlpatterns = router.urls
