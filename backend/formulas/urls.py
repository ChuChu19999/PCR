from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LaboratoryViewSet,
    DepartmentViewSet,
    UserViewSet,
    check_status_api,
    save_excel,
    get_excel_styles,
)

router = DefaultRouter()
router.register(r"laboratories", LaboratoryViewSet, basename="laboratory")
router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"users", UserViewSet, basename="user")


urlpatterns = [
    path("", include(router.urls)),
    path("save-excel/", save_excel, name="save-excel"),
    path("get-excel-styles/", get_excel_styles, name="get_excel_styles"),
    path("monitoring/", check_status_api, name="monitoring"),
]
