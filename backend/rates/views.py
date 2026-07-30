from rest_framework import viewsets
from .models import Currency, RateType
from .serializers import CurrencySerializer


class CurrencyViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only currency rate board. Values are edited via the Django admin.
    Only currencies with is_visible=True are exposed here — untick the box in
    admin to hide a currency from the site without deleting it.

    ?rate_type=cash|forex_card filters the list (default: all types). A
    currency code alone is no longer unique — one row per (code, rate_type) —
    so the single-object lookup by code defaults to the cash row, matching
    every existing caller that fetches by code with no type in mind."""
    serializer_class = CurrencySerializer
    lookup_field = 'code'

    def get_queryset(self):
        qs = Currency.objects.filter(is_visible=True)
        rate_type = self.request.query_params.get('rate_type')
        if rate_type:
            qs = qs.filter(rate_type=rate_type)
        elif self.action == 'retrieve':
            qs = qs.filter(rate_type=RateType.CASH)
        return qs
