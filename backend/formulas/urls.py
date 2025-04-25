from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.views import (
    DepartmentViewSet,
    LaboratoryViewSet,
    ResearchMethodGroupViewSet,
    ResearchMethodViewSet,
    ResearchObjectViewSet,
    ProtocolViewSet,
    CalculationViewSet,
    check_status_api,
)
from .views.excel_views import (
    ExcelTemplateViewSet,
    get_excel_styles,
    save_excel,
    get_sampling_locations,
    get_branches,
)
from .services.protocol_generator import generate_protocol_excel
from .views.user_views import UserViewSet
from .api.calculation_api import (
    calculate_result,
    update_research_method_status,
    save_calculation,
    update_methods_order,
    get_registration_numbers,
)


router = DefaultRouter()
router.register(r"laboratories", LaboratoryViewSet, basename="laboratory")
router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"research-methods", ResearchMethodViewSet, basename="research-method")
router.register(
    r"research-method-groups",
    ResearchMethodGroupViewSet,
    basename="research-method-group",
)
router.register(r"research-pages", ResearchObjectViewSet, basename="research-page")
router.register(r"protocols", ProtocolViewSet, basename="protocol")
router.register(r"calculations", CalculationViewSet, basename="calculation")
router.register(r"excel-templates", ExcelTemplateViewSet, basename="excel-template")
router.register(r"users", UserViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
    path("save-excel/", save_excel, name="save-excel"),
    path("get-excel-styles/", get_excel_styles, name="get_excel_styles"),
    path("monitoring/", check_status_api, name="monitoring"),
    path("calculate/", calculate_result, name="calculate_result"),
    path("save-calculation/", save_calculation, name="save_calculation"),
    path(
        "get-registration-numbers/",
        get_registration_numbers,
        name="get_registration_numbers",
    ),
    path(
        "generate-protocol-excel/",
        generate_protocol_excel,
        name="generate_protocol_excel",
    ),
    path(
        "research-pages/<int:page_id>/methods/<int:method_id>/",
        update_research_method_status,
        name="update_research_method_status",
    ),
    path(
        "research-pages/<int:page_id>/methods/order/",
        update_methods_order,
        name="update_methods_order",
    ),
    path(
        "get-sampling-locations/",
        get_sampling_locations,
        name="get_sampling_locations",
    ),
    path(
        "get-branches/",
        get_branches,
        name="get_branches",
    ),
]
