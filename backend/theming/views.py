from django.core.cache import cache
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ThemeSetting

CACHE_KEY = 'site_theme'
CACHE_SECONDS = 300


class ThemeView(APIView):
    """GET /api/theme/ -> {"css_variables": {"--fx-brand": "#E2571F", ...}, "fonts_url": "..."}

    Consumed once at app start by frontend/src/context/ThemeContext.jsx, which writes the
    variables onto :root. Deliberately returns raw CSS custom properties rather than a tidy
    nested object: the frontend's only job is to paste them into a style block, and any
    remapping in between is one more place for a token to go missing.

    Cached, since the theme changes about once a year and this is on the critical path of
    every page load; the cache is dropped the moment an admin saves (see signals.py).
    """

    def get(self, request):
        data = cache.get(CACHE_KEY)
        if data is None:
            theme = ThemeSetting.load()
            data = {'css_variables': theme.css_variables, 'fonts_url': theme.fonts_url}
            cache.set(CACHE_KEY, data, CACHE_SECONDS)
        return Response(data)
