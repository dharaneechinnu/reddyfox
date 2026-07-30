from rest_framework import serializers
from .models import Currency


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = [
            'code', 'name', 'country_code', 'region', 'rate_type',
            'buy_rate', 'sell_rate', 'change_pct',
            'is_popular', 'display_order', 'updated_at',
        ]
