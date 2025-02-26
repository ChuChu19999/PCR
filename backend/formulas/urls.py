from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LaboratoryViewSet,
    DepartmentViewSet,
    UserViewSet,
    check_status_api,
    save_excel,
    get_excel_styles,
    ResearchMethodViewSet,
    ResearchPageViewSet,
    calculate_result,
)


router = DefaultRouter()
router.register(r"laboratories", LaboratoryViewSet, basename="laboratory")
router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"users", UserViewSet, basename="user")
router.register(r"research-methods", ResearchMethodViewSet, basename="research-method")
router.register(r"research-pages", ResearchPageViewSet, basename="research-page")

urlpatterns = [
    path("", include(router.urls)),
    path("save-excel/", save_excel, name="save-excel"),
    path("get-excel-styles/", get_excel_styles, name="get_excel_styles"),
    path("monitoring/", check_status_api, name="monitoring"),
    path("calculate/", calculate_result, name="calculate_result"),
]
