import os
from django.conf import settings
from django.db import IntegrityError
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from ..models import (
    Department,
    Laboratory,
    ResearchMethod,
    ResearchMethodGroup,
    ResearchObject,
    ResearchObjectMethod,
    Calculation,
    Protocol,
    Sample,
    Equipment,
)
from ..serializers import (
    DepartmentSerializer,
    LaboratorySerializer,
    ResearchMethodSerializer,
    ResearchMethodGroupSerializer,
    ResearchObjectSerializer,
    CalculationSerializer,
    ProtocolSerializer,
    SampleSerializer,
)
from .user_views import UserViewSet
import logging

logger = logging.getLogger(__name__)


@permission_classes([AllowAny])
class LaboratoryViewSet(viewsets.ModelViewSet):
    serializer_class = LaboratorySerializer

    def get_queryset(self):
        return Laboratory.objects.filter(is_deleted=False)

    def perform_create(self, serializer):
        user = getattr(self.request, "decoded_token", {})
        serializer.save(user=user)

    def perform_update(self, serializer):
        user = getattr(self.request, "decoded_token", {})
        serializer.save(user=user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = getattr(request, "decoded_token", {})
        # Помечаем как удаленные все связанные research-pages
        ResearchObject.objects.filter(laboratory=instance).update(
            is_deleted=True,
            deleted_at=timezone.now(),
            deleted_by=user.get("preferred_username") if user else None,
        )
        instance.mark_as_deleted(user=user)
        return Response(status=status.HTTP_204_NO_CONTENT)


@permission_classes([AllowAny])
class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        return Department.objects.filter(is_deleted=False).select_related("laboratory")

    def perform_create(self, serializer):
        user = getattr(self.request, "decoded_token", {})
        serializer.save(user=user)

    def perform_update(self, serializer):
        user = getattr(self.request, "decoded_token", {})
        serializer.save(user=user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = getattr(request, "decoded_token", {})
        # Помечаем как удаленные все связанные research-pages
        ResearchObject.objects.filter(department=instance).update(
            is_deleted=True,
            deleted_at=timezone.now(),
            deleted_by=user.get("preferred_username") if user else None,
        )
        instance.mark_as_deleted(user=user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def create(self, request, *args, **kwargs):
        laboratory_id = request.data.get("laboratory")
        get_object_or_404(Laboratory, id=laboratory_id)
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def by_laboratory(self, request):
        """
        Получает список подразделений для конкретной лаборатории.
        URL: /api/departments/by_laboratory/?laboratory_id={id}
        """
        laboratory_id = request.query_params.get("laboratory_id")
        if not laboratory_id:
            return Response(
                {"error": "Не указан ID лаборатории"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.get_queryset().filter(laboratory_id=laboratory_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


@permission_classes([AllowAny])
class ResearchMethodViewSet(viewsets.ModelViewSet):
    serializer_class = ResearchMethodSerializer

    def get_queryset(self):
        queryset = ResearchMethod.objects.all()

        if self.action == "list":
            queryset = queryset.filter(is_active=True, is_deleted=False).order_by(
                "name"
            )

        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(nd_code__icontains=search)
                | Q(nd_name__icontains=search)
            )

        rounding_type = self.request.query_params.get("rounding_type", None)
        if rounding_type:
            queryset = queryset.filter(rounding_type=rounding_type)

        return queryset.order_by("name")

    def perform_create(self, serializer):
        user = getattr(self.request, "decoded_token", {})
        serializer.save(user=user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        if "convergence_conditions" in request.data:
            conditions = request.data.get("convergence_conditions")
            if not isinstance(conditions, dict) or "formulas" not in conditions:
                return Response(
                    {"error": "Неверный формат условий повторяемости"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)

    def perform_update(self, serializer):
        user = getattr(self.request, "decoded_token", {})
        serializer.save(user=user)

    @action(detail=True, methods=["post"])
    def toggle_active(self, request, pk=None):
        research_method = self.get_object()
        research_method.is_active = not research_method.is_active
        research_method.save()

        return Response({"status": "success", "is_active": research_method.is_active})

    @action(detail=True, methods=["post"])
    def mark_deleted(self, request, pk=None):
        research_method = self.get_object()
        user = getattr(request, "decoded_token", {})
        research_method.mark_as_deleted(user=user)
        return Response(
            {"status": "success", "message": "Метод исследования помечен как удаленный"}
        )

    @action(detail=False, methods=["get"])
    def active(self, request):
        queryset = self.get_queryset().filter(is_active=True, is_deleted=False)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def deleted(self, request):
        queryset = self.get_queryset().filter(is_deleted=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="available-methods")
    def available_methods(self, request):
        """
        Получает список активных и неудаленных методов исследования из ResearchObjectMethod.
        Если указан sample_id, исключает методы, уже привязанные к этой пробе.
        Методы возвращаются в том же порядке, что и на странице исследований.
        Фильтрует методы в зависимости от типа объекта испытаний пробы:
        - для "дегазированный конденсат" исключает методы с "Нефть"
        - для "Нефть" исключает методы с "Конденсат"
        """
        sample_id = request.query_params.get("sample_id")
        research_page_id = request.query_params.get("research_page_id")

        if not research_page_id:
            return Response(
                {"error": "Не указан ID страницы исследований"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Получаем страницу исследований
        research_object = get_object_or_404(ResearchObject, id=research_page_id)

        # Получаем активные методы для конкретной страницы с учетом порядка сортировки
        research_methods = (
            ResearchObjectMethod.objects.filter(
                research_object=research_object, is_active=True, is_deleted=False
            )
            .select_related("research_method")
            .order_by("sort_order", "created_at")
        )

        # Если указан sample_id, исключаем методы, уже привязанные к этой пробе
        # и фильтруем по типу объекта испытаний
        if sample_id:
            try:
                sample = Sample.objects.get(id=sample_id)
                used_methods = Calculation.objects.filter(
                    sample_id=sample_id, is_deleted=False
                ).values_list("research_method_id", flat=True)
                research_methods = research_methods.exclude(
                    research_method_id__in=used_methods
                )

                # Фильтруем методы в зависимости от типа объекта испытаний
                filtered_methods = []
                for rom in research_methods:
                    method = rom.research_method
                    method_name = method.name.lower()
                    test_object = sample.test_object.lower()

                    # Пропускаем метод если:
                    # - для дегазированного конденсата метод содержит "нефть"
                    # - для нефти метод содержит "конденсат"
                    if (
                        "дегазированный конденсат" in test_object
                        and "нефть" in method_name
                    ) or ("нефть" in test_object and "конденсат" in method_name):
                        continue
                    filtered_methods.append(rom)

                research_methods = filtered_methods

            except Sample.DoesNotExist:
                return Response(
                    {"error": "Проба не найдена"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # Получаем все активные группы
        groups = ResearchMethodGroup.objects.filter(
            is_active=True, is_deleted=False
        ).prefetch_related("methods")

        # Создаем список всех методов
        all_methods = []

        # Обрабатываем методы в порядке их sort_order
        for rom in research_methods:
            method = rom.research_method
            if method.groups.exists():
                group = method.groups.first()
                # Проверяем, есть ли уже группа в списке
                group_entry = next(
                    (item for item in all_methods if item.get("group_id") == group.id),
                    None,
                )
                if not group_entry:
                    # Если группы нет, добавляем её
                    group_entry = {
                        "id": f"group_{group.id}",
                        "name": group.name,
                        "is_group": True,
                        "group_id": group.id,
                        "methods": [],
                        "sort_order": rom.sort_order,
                    }
                    all_methods.append(group_entry)
                # Добавляем метод в группу
                group_entry["methods"].append(
                    {
                        "id": method.id,
                        "name": method.name,
                        "sort_order": rom.sort_order,
                        "input_data": method.input_data,
                        "intermediate_data": method.intermediate_data,
                        "unit": method.unit,
                    }
                )
            else:
                # Самостоятельный метод
                all_methods.append(
                    {
                        "id": method.id,
                        "name": method.name,
                        "sort_order": rom.sort_order,
                        "input_data": method.input_data,
                        "intermediate_data": method.intermediate_data,
                        "unit": method.unit,
                        "is_group": False,
                    }
                )

        # Удаляем пустые группы
        all_methods = [
            m for m in all_methods if not m.get("is_group") or m.get("methods")
        ]

        for method in all_methods:
            if method.get("is_group"):
                method["methods"].sort(key=lambda x: (x["sort_order"], x["name"]))

        # Сортируем все методы вместе (и группы, и индивидуальные)
        all_methods.sort(
            key=lambda x: (
                x["sort_order"] if not x.get("is_group") else x["sort_order"],
                x["name"],
            )
        )

        return Response({"methods": all_methods})


@permission_classes([AllowAny])
class ResearchObjectViewSet(viewsets.ModelViewSet):
    serializer_class = ResearchObjectSerializer

    def get_queryset(self):
        return ResearchObject.objects.filter(is_deleted=False)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def current_method(self, request, pk=None):
        """
        Получает полную информацию о текущем методе исследования.
        """
        try:
            instance = self.get_object()

            current_method_id = request.query_params.get("current_method_id")
            if not current_method_id:
                return Response(
                    {"error": "Не указан ID текущего метода исследования"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Проверяем, что метод принадлежит этой странице
            if not instance.research_methods.filter(id=current_method_id).exists():
                return Response(
                    {
                        "error": "Указанный метод не принадлежит данной странице исследований"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            current_method = ResearchMethod.objects.get(id=current_method_id)
            serializer = ResearchMethodSerializer(current_method)

            return Response({"current_method": serializer.data})

        except ResearchMethod.DoesNotExist:
            return Response(
                {"error": "Метод исследования не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request):
        """
        Создает страницу расчетов для выбранного типа исследования.
        Может быть привязана к подразделению или напрямую к лаборатории.
        """
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            research_type = serializer.validated_data["type"]
            laboratory_id = serializer.validated_data["laboratory"].id
            department = serializer.validated_data.get("department")
            department_id = department.id if department else None

            # Проверяем существование страницы
            existing_page = ResearchObject.objects.filter(
                laboratory_id=laboratory_id,
                department_id=department_id,
                type=research_type,
                is_deleted=False,
            ).first()

            if existing_page:
                return Response(
                    {"message": "Страница расчетов уже существует"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Если есть department_id, проверяем его
            if department_id:
                if department.laboratory_id != laboratory_id:
                    return Response(
                        {
                            "message": "Подразделение не принадлежит указанной лаборатории"
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Проверяем, что добавляемые методы не являются частью группы
            if "research_method_ids" in serializer.validated_data:
                group_methods = ResearchMethod.objects.filter(
                    id__in=serializer.validated_data["research_method_ids"],
                    is_group_member=True,
                )
                if group_methods.exists():
                    method_names = ", ".join([m.name for m in group_methods])
                    return Response(
                        {
                            "message": f"Следующие методы являются частью группы и не могут быть добавлены напрямую: {method_names}"
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            research_object = serializer.save()

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        # Если в запросе есть research_methods, обрабатываем их отдельно
        if "research_methods" in request.data:
            method_ids = []
            for item in request.data.pop("research_methods"):
                if isinstance(item, (int, str)):
                    # Если это строка и начинается с "group_", это идентификатор группы
                    if isinstance(item, str) and item.startswith("group_"):
                        try:
                            group_id = int(item.replace("group_", ""))
                            group = ResearchMethodGroup.objects.get(id=group_id)
                            # Добавляем все методы из группы
                            method_ids.extend(
                                group.methods.values_list("id", flat=True)
                            )
                        except (ValueError, ResearchMethodGroup.DoesNotExist):
                            return Response(
                                {
                                    "error": f"Группа методов с идентификатором {item} не найдена"
                                },
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                    else:
                        # Если это обычный метод, добавляем его ID
                        method_ids.append(int(item) if isinstance(item, str) else item)

            # Проверяем, что добавляемые методы не являются частью группы
            group_methods = ResearchMethod.objects.filter(
                id__in=method_ids, is_group_member=True
            ).exclude(
                id__in=ResearchMethod.objects.filter(groups__methods__id__in=method_ids)
            )

            if group_methods.exists():
                method_names = ", ".join([m.name for m in group_methods])
                return Response(
                    {
                        "message": f"Следующие методы являются частью группы и не могут быть добавлены напрямую: {method_names}"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            request.data["research_method_ids"] = method_ids

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)

    def list(self, request):
        """
        Возвращает список страниц расчетов с фильтрацией по лаборатории и подразделению.
        """
        laboratory_id = request.query_params.get("laboratory_id")
        department_id = request.query_params.get("department_id")

        queryset = self.get_queryset()

        if laboratory_id:
            queryset = queryset.filter(laboratory_id=laboratory_id)
        if department_id:
            queryset = queryset.filter(department_id=department_id)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = getattr(request, "decoded_token", {})
        instance.mark_as_deleted(user=user)
        return Response(status=status.HTTP_204_NO_CONTENT)


@permission_classes([AllowAny])
class ResearchMethodGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ResearchMethodGroupSerializer

    def get_queryset(self):
        queryset = ResearchMethodGroup.objects.all()

        if self.action == "list":
            queryset = queryset.filter(is_active=True, is_deleted=False).order_by(
                "name"
            )

        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset.order_by("name")

    def perform_create(self, serializer):
        user = getattr(self.request, "decoded_token", {})
        serializer.save(user=user)

    def perform_update(self, serializer):
        user = getattr(self.request, "decoded_token", {})
        serializer.save(user=user)

    @action(detail=True, methods=["post"])
    def toggle_active(self, request, pk=None):
        group = self.get_object()
        group.is_active = not group.is_active
        group.save()
        return Response({"status": "success", "is_active": group.is_active})

    @action(detail=True, methods=["post"])
    def mark_deleted(self, request, pk=None):
        group = self.get_object()
        user = getattr(request, "decoded_token", {})
        group.mark_as_deleted(user=user)
        return Response(
            {"status": "success", "message": "Группа помечена как удаленная"}
        )


@permission_classes([AllowAny])
class ProtocolViewSet(viewsets.ModelViewSet):
    serializer_class = ProtocolSerializer

    def get_queryset(self):
        queryset = Protocol.objects.select_related("laboratory", "department")

        is_deleted = self.request.query_params.get("is_deleted")
        laboratory_id = self.request.query_params.get("laboratory")
        department_id = self.request.query_params.get("department")

        if is_deleted is not None:
            is_deleted = is_deleted.lower() == "true"
            queryset = queryset.filter(is_deleted=is_deleted)

        if laboratory_id:
            queryset = queryset.filter(laboratory_id=laboratory_id)

        if department_id:
            queryset = queryset.filter(department_id=department_id)

        return queryset.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        try:
            # Проверяем, что лаборатория указана
            if not request.data.get("laboratory"):
                return Response(
                    {"error": "Необходимо указать лабораторию"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return super().create(request, *args, **kwargs)
        except IntegrityError as e:
            if "unique_registration_number_per_lab_dept" in str(e):
                return Response(
                    {
                        "error": "Протокол с таким регистрационным номером уже существует для данной лаборатории"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()

            # Проверяем, не удален ли протокол
            if instance.is_deleted:
                return Response(
                    {"error": "Невозможно редактировать удаленный протокол"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)

            self.perform_update(serializer)

            return Response(serializer.data)

        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_create(self, serializer):
        user = getattr(self.request, "decoded_token", {})
        serializer.save(user=user)

    def perform_update(self, serializer):
        user = getattr(self.request, "decoded_token", {})
        serializer.save(user=user)

    @action(detail=True, methods=["post"])
    def mark_deleted(self, request, pk=None):
        protocol = self.get_object()
        user = getattr(request, "decoded_token", {})
        protocol.mark_as_deleted(user=user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def calculations(self, request, pk=None):
        """
        Получить все расчеты для протокола, включая расчеты всех связанных проб
        """
        protocol = self.get_object()
        calculations = []

        # Получаем страницу исследований для определения порядка методов
        research_page = ResearchObject.objects.filter(
            laboratory=protocol.laboratory,
            department=protocol.department,
            type="oil_products",
            is_deleted=False,
        ).first()

        # Получаем порядок методов из ResearchObjectMethod
        method_order = {}
        if research_page:
            research_methods = (
                ResearchObjectMethod.objects.filter(
                    research_object=research_page, is_active=True, is_deleted=False
                )
                .select_related("research_method")
                .order_by("sort_order", "research_method__name", "created_at")
            )
            method_order = {
                rom.research_method_id: (rom.sort_order, rom.research_method.name)
                for rom in research_methods
            }

        samples = protocol.samples.filter(is_deleted=False).order_by(
            "registration_number"
        )

        for sample in samples.prefetch_related("calculations__research_method__groups"):
            sample_calculations = list(sample.calculations.filter(is_deleted=False))

            # Сортируем расчеты: сначала по sort_order, затем по имени метода
            sample_calculations.sort(
                key=lambda x: (
                    method_order.get(
                        x.research_method_id, (float("inf"), x.research_method.name)
                    )[0],
                    x.research_method.name,
                )
            )

            for calc in sample_calculations:
                equipment_list = []
                if calc.equipment_data:
                    equipment_ids = [
                        eq.get("id")
                        for eq in calc.equipment_data
                        if isinstance(eq, dict) and "id" in eq
                    ]
                    equipment = Equipment.objects.filter(
                        id__in=equipment_ids, is_deleted=False
                    )
                    equipment_list = [
                        {"name": eq.name, "serial_number": eq.serial_number}
                        for eq in equipment
                    ]

                formatted_result = calc.result
                if (
                    formatted_result
                    and formatted_result.replace(".", "").replace("-", "").isdigit()
                ):
                    num_value = float(formatted_result)
                    if num_value < 0:
                        formatted_result = f"минус {abs(num_value)}".replace(".", ",")
                    else:
                        formatted_result = str(num_value).replace(".", ",")

                calculations.append(
                    {
                        "key": calc.id,
                        "research_method": {
                            "name": calc.research_method.name,
                            "is_group_member": calc.research_method.is_group_member,
                            "groups": [
                                {"name": group.name}
                                for group in calc.research_method.groups.all()
                            ],
                        },
                        "unit": calc.unit or "-",
                        "input_data": calc.input_data,
                        "result": formatted_result,
                        "measurement_error": calc.measurement_error,
                        "equipment": equipment_list,
                        "executor": calc.executor or "-",
                        "sample": {"registration_number": sample.registration_number},
                    }
                )

        return Response(calculations)


@permission_classes([AllowAny])
class CalculationViewSet(viewsets.ModelViewSet):
    serializer_class = CalculationSerializer

    def get_queryset(self):
        queryset = Calculation.objects.select_related(
            "sample", "laboratory", "department", "research_method"
        ).all()

        sample_id = self.request.query_params.get("sample")
        is_deleted = (
            self.request.query_params.get("is_deleted", "false").lower() == "true"
        )

        if sample_id:
            queryset = queryset.filter(sample_id=sample_id)

        queryset = queryset.filter(is_deleted=is_deleted)

        return queryset

    def perform_create(self, serializer):
        user = getattr(self.request, "decoded_token", {})
        serializer.save(user=user)

    def perform_update(self, serializer):
        user = getattr(self.request, "decoded_token", {})
        serializer.save(user=user)


@api_view(["GET"])
@permission_classes([AllowAny])
def check_status_api(request):
    """
    Проверка работоспособности сервиса
    """
    try:
        laboratories = LaboratoryViewSet()
        laboratories.request = request
        laboratories.format_kwarg = None

        response = laboratories.list(request)

        return Response(
            {"status": "online"},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response(
            {"status": "offline"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


@permission_classes([AllowAny])
class SampleViewSet(viewsets.ModelViewSet):
    serializer_class = SampleSerializer

    def get_queryset(self):
        queryset = Sample.objects.filter(is_deleted=False).select_related(
            "laboratory", "department"
        )

        laboratory_id = self.request.query_params.get("laboratory")
        if laboratory_id:
            queryset = queryset.filter(laboratory_id=laboratory_id)

        department_id = self.request.query_params.get("department")
        if department_id:
            queryset = queryset.filter(department_id=department_id)

        # Поиск по регистрационному номеру или объекту испытаний
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(registration_number__icontains=search)
                | Q(test_object__icontains=search)
            )

        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        user = getattr(self.request, "decoded_token", {})
        serializer.save(user=user)

    def perform_update(self, serializer):
        user = getattr(self.request, "decoded_token", {})
        serializer.save(user=user)

    @action(detail=True, methods=["post"])
    def mark_deleted(self, request, pk=None):
        sample = self.get_object()
        user = getattr(request, "decoded_token", {})

        # Помечаем как удаленные все связанные расчеты
        Calculation.objects.filter(sample=sample).update(
            is_deleted=True,
            deleted_at=timezone.now(),
            deleted_by=user.get("preferred_username") if user else None,
        )

        sample.mark_as_deleted(user=user)
        return Response(
            {
                "status": "success",
                "message": "Проба и связанные расчеты помечены как удаленные",
            }
        )
