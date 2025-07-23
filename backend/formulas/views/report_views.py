from rest_framework import viewsets, status
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import transaction
import logging

logger = logging.getLogger(__name__)
from ..models import ReportTemplate
from ..serializers import ReportTemplateSerializer


@permission_classes([AllowAny])
class ReportTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = ReportTemplateSerializer
    queryset = ReportTemplate.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        laboratory = self.request.query_params.get("laboratory")
        department = self.request.query_params.get("department")
        if laboratory:
            qs = qs.filter(laboratory_id=laboratory)
            if department:
                qs = qs.filter(department_id=department)
        return qs.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(
                "ReportTemplate create validation errors: %s", serializer.errors
            )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            logger.error("ReportTemplate update errors: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="active")
    def active_template(self, request):
        """Возвращает активный шаблон для лаборатории/подразделения (или null)."""
        laboratory = request.query_params.get("laboratory")
        if not laboratory:
            return Response({"detail": "laboratory param required"}, status=400)
        department = request.query_params.get("department")
        qs = self.get_queryset().filter(is_active=True)
        if department:
            qs = qs.filter(department_id=department)
        template = qs.first()
        if not template:
            return Response(None, status=200)
        return Response(self.get_serializer(template).data)

    @action(detail=True, methods=["post"], url_path="new-version")
    def new_version(self, request, pk=None):
        """Загрузка новой версии: деактивирует старую, создает новую запись."""
        old_template = self.get_object()
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"detail": "file is required"}, status=400)

        with transaction.atomic():
            old_template.is_active = False
            old_template.save()
            new_data = {
                "name": request.data.get("name", old_template.name),
                "laboratory": old_template.laboratory_id,
                "department": old_template.department_id,
                "file": uploaded_file,
                "file_name": uploaded_file.name,
            }
            serializer = self.get_serializer(data=new_data)
            if not serializer.is_valid():
                logger.error(
                    "ReportTemplate new-version validation errors: %s",
                    serializer.errors,
                )
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            template = serializer.save()
        return Response(self.get_serializer(template).data, status=201)
