"""Static ISO 4217 lookup used only to pre-fill the Name / Country code / Region fields when
staff add a currency the board doesn't have yet — see CurrencyAdmin.lookup_rate_view().

Deliberately separate from the market-rate lookup: rate/coverage comes live from
fx_providers.fetch_with_fallback(), which knows about ~160+ currencies a provider might quote,
but has no idea what a currency is *called* or which country badge to show. This table is the
other half — name and flag/country metadata, which none of those APIs' basic endpoints return.

Not exhaustive — covers currencies a Chennai forex counter plausibly deals with (the existing
board, plus the rest of the Gulf, the other major-traded currencies). A code missing from here
just means no name/country/region suggestion; the market-rate suggestion (which doesn't depend
on this table at all) still works. Region values must match rates.models.Region exactly.
"""

# code -> (name, country_code, region)
CURRENCY_METADATA = {
    # Americas
    'USD': ('US Dollar', 'US', 'Americas'),
    'CAD': ('Canadian Dollar', 'CA', 'Americas'),
    'MXN': ('Mexican Peso', 'MX', 'Americas'),
    'BRL': ('Brazilian Real', 'BR', 'Americas'),

    # Europe
    'EUR': ('Euro', 'EU', 'Europe'),
    'GBP': ('British Pound', 'GB', 'Europe'),
    'CHF': ('Swiss Franc', 'CH', 'Europe'),
    'SEK': ('Swedish Krona', 'SE', 'Europe'),
    'NOK': ('Norwegian Krone', 'NO', 'Europe'),
    'DKK': ('Danish Krone', 'DK', 'Europe'),
    'PLN': ('Polish Zloty', 'PL', 'Europe'),
    'TRY': ('Turkish Lira', 'TR', 'Europe'),

    # Middle East
    'AED': ('UAE Dirham', 'AE', 'Middle East'),
    'SAR': ('Saudi Riyal', 'SA', 'Middle East'),
    'QAR': ('Qatari Riyal', 'QA', 'Middle East'),
    'BHD': ('Bahraini Dinar', 'BH', 'Middle East'),
    'KWD': ('Kuwaiti Dinar', 'KW', 'Middle East'),
    'OMR': ('Omani Rial', 'OM', 'Middle East'),
    'JOD': ('Jordanian Dinar', 'JO', 'Middle East'),
    'ILS': ('Israeli Shekel', 'IL', 'Middle East'),

    # Asia-Pacific
    'JPY': ('Japanese Yen', 'JP', 'Asia-Pacific'),
    'SGD': ('Singapore Dollar', 'SG', 'Asia-Pacific'),
    'HKD': ('Hong Kong Dollar', 'HK', 'Asia-Pacific'),
    'MYR': ('Malaysian Ringgit', 'MY', 'Asia-Pacific'),
    'THB': ('Thai Baht', 'TH', 'Asia-Pacific'),
    'CNY': ('Chinese Yuan', 'CN', 'Asia-Pacific'),
    'NZD': ('New Zealand Dollar', 'NZ', 'Asia-Pacific'),
    'AUD': ('Australian Dollar', 'AU', 'Asia-Pacific'),
    'KRW': ('South Korean Won', 'KR', 'Asia-Pacific'),
    'IDR': ('Indonesian Rupiah', 'ID', 'Asia-Pacific'),
    'PHP': ('Philippine Peso', 'PH', 'Asia-Pacific'),
    'VND': ('Vietnamese Dong', 'VN', 'Asia-Pacific'),
    'TWD': ('Taiwan Dollar', 'TW', 'Asia-Pacific'),
    'LKR': ('Sri Lankan Rupee', 'LK', 'Asia-Pacific'),
    'NPR': ('Nepalese Rupee', 'NP', 'Asia-Pacific'),
}
