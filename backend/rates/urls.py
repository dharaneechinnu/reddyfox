from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import CurrencyViewSet, ConverterSettingView

router = DefaultRouter()
router.register('rates', CurrencyViewSet, basename='currency')

urlpatterns = router.urls + [
    path('converter-settings/', ConverterSettingView.as_view(), name='converter-settings'),
]
