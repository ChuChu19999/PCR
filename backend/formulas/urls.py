from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LaboratoryViewSet,
    DepartmentViewSet,
    save_excel,
    get_excel_styles,
    check_gazprom_api,
)

router = DefaultRouter()
router.register(r"laboratories", LaboratoryViewSet, basename="laboratory")
router.register(r"departments", DepartmentViewSet, basename="department")

urlpatterns = [
    path("api/", include(router.urls)),
    path("api/save-excel/", save_excel, name="save-excel"),
    path("api/get-excel-styles/", get_excel_styles, name="get_excel_styles"),
    path("api/monitoring/", check_gazprom_api, name="monitoring"),
]
