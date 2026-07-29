from rest_framework import serializers
from .models import Currency, ConverterSetting


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = [
            'code', 'name', 'country_code', 'region',
            'buy_rate', 'sell_rate', 'change_pct',
            'is_popular', 'display_order', 'updated_at',
        ]


class ConverterSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConverterSetting
        fields = ['service_fee_percent', 'updated_at']
