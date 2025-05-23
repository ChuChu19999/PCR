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
)
from ..serializers import (
    DepartmentSerializer,
    LaboratorySerializer,
    ResearchMethodSerializer,
    ResearchMethodGroupSerializer,
    ResearchObjectSerializer,
    CalculationSerializer,
    ProtocolSerializer,
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
        Если указан protocol_id, исключает методы, уже привязанные к этому протоколу.
        """
        protocol_id = request.query_params.get("protocol_id")
        research_page_id = request.query_params.get("research_page_id")

        if not research_page_id:
            return Response(
                {"error": "Не указан ID страницы исследований"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Получаем активные методы для конкретной страницы
        active_method_ids = (
            ResearchObjectMethod.objects.filter(
                research_object_id=research_page_id, is_active=True, is_deleted=False
            )
            .values_list("research_method_id", flat=True)
            .distinct()
        )

        queryset = ResearchMethod.objects.filter(
            id__in=active_method_ids, is_deleted=False
        )

        # Если указан protocol_id, исключаем методы, уже привязанные к этому протоколу
        if protocol_id:
            used_methods = Calculation.objects.filter(
                protocol_id=protocol_id, is_deleted=False
            ).values_list("research_method_id", flat=True)
            queryset = queryset.exclude(id__in=used_methods)

        groups = ResearchMethodGroup.objects.filter(
            is_active=True, is_deleted=False
        ).prefetch_related("methods")

        result = {"individual_methods": [], "groups": []}

        # Добавляем негруппированные методы
        individual_methods = queryset.filter(is_group_member=False)
        result["individual_methods"] = self.get_serializer(
            individual_methods, many=True
        ).data

        # Добавляем группы с их методами
        for group in groups:
            group_methods = group.methods.filter(id__in=queryset, is_group_member=True)
            if group_methods.exists():
                result["groups"].append(
                    {
                        "id": group.id,
                        "name": group.name,
                        "methods": self.get_serializer(group_methods, many=True).data,
                    }
                )

        return Response(result)


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

            has_calculations = instance.calculations.filter(is_deleted=False).exists()

            # Если есть расчеты, запрещаем изменение критических полей
            if has_calculations:
                protected_fields = {
                    "registration_number": "Регистрационный номер",
                    "sampling_act_number": "Номер акта отбора",
                    "laboratory": "Лаборатория",
                    "department": "Подразделение",
                }

                for field, field_name in protected_fields.items():
                    if field in request.data and str(request.data[field]) != str(
                        getattr(instance, field)
                    ):
                        return Response(
                            {
                                "error": f"{field_name} нельзя изменить, так как протокол уже содержит расчеты"
                            },
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


@permission_classes([AllowAny])
class CalculationViewSet(viewsets.ModelViewSet):
    serializer_class = CalculationSerializer

    def get_queryset(self):
        queryset = Calculation.objects.select_related(
            "protocol", "laboratory", "department", "research_method"
        ).all()

        protocol_id = self.request.query_params.get("protocol")
        is_deleted = (
            self.request.query_params.get("is_deleted", "false").lower() == "true"
        )

        if protocol_id:
            queryset = queryset.filter(protocol_id=protocol_id)

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
