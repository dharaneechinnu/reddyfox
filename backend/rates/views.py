from rest_framework import viewsets, generics
from .models import Currency, ConverterSetting
from .serializers import CurrencySerializer, ConverterSettingSerializer


class CurrencyViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only currency rate board. Values are edited via the Django admin.
    Only currencies with is_visible=True are exposed here — untick the box in
    admin to hide a currency from the site without deleting it."""
    queryset = Currency.objects.filter(is_visible=True)
    serializer_class = CurrencySerializer
    lookup_field = 'code'


class ConverterSettingView(generics.RetrieveAPIView):
    """Read-only converter config (currently just the service fee %). Edited via the Django admin."""
    serializer_class = ConverterSettingSerializer

    def get_object(self):
        return ConverterSetting.load()
