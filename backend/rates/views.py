from rest_framework import viewsets
from .models import Currency
from .serializers import CurrencySerializer


class CurrencyViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only currency rate board. Values are edited via the Django admin.
    Only currencies with is_visible=True are exposed here — untick the box in
    admin to hide a currency from the site without deleting it."""
    queryset = Currency.objects.filter(is_visible=True)
    serializer_class = CurrencySerializer
    lookup_field = 'code'
