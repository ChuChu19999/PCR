from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LaboratoryViewSet, DepartmentViewSet

router = DefaultRouter()
router.register(r"laboratories", LaboratoryViewSet, basename="laboratory")
router.register(r"departments", DepartmentViewSet, basename="department")

urlpatterns = (path("api/", include(router.urls)),)
