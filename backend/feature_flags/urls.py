from django.urls import path
from .views import FeatureFlagListView

urlpatterns = [
    path('flags/', FeatureFlagListView.as_view(), name='feature-flags'),
]
