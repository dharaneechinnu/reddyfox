from django.core.cache import cache
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import FeatureFlag

CACHE_KEY = 'feature_flags'
CACHE_SECONDS = 60


class FeatureFlagListView(APIView):
    """GET /api/flags/ -> {"exchange_rates_page": true, "live_board": true, ...}

    Flags change rarely and this is called on every page load, so the flat
    map is cached briefly rather than hitting the DB each time. A key
    missing from the response should be treated as enabled by the caller —
    this endpoint only ever tells you what's explicitly OFF or ON, never
    "doesn't exist."
    """

    def get(self, request):
        data = cache.get(CACHE_KEY)
        if data is None:
            data = {f.key: f.is_enabled for f in FeatureFlag.objects.all()}
            cache.set(CACHE_KEY, data, CACHE_SECONDS)
        return Response(data)
