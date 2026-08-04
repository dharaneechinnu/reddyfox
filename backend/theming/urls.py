from django.urls import path

from .views import ThemeView

urlpatterns = [
    path('theme/', ThemeView.as_view(), name='site-theme'),
]
