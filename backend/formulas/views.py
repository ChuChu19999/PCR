from rest_framework import viewsets, status
from rest_framework.response import Response
from django.utils import timezone
from .models import Laboratory, Department
from .serializers import LaboratorySerializer, DepartmentSerializer
from django.shortcuts import get_object_or_404


class LaboratoryViewSet(viewsets.ModelViewSet):
    serializer_class = LaboratorySerializer

    def get_queryset(self):
        return Laboratory.objects.filter(is_deleted=False)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.mark_as_deleted()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        return Department.objects.filter(is_deleted=False).select_related("laboratory")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def create(self, request, *args, **kwargs):
        laboratory_id = request.data.get("laboratory")
        get_object_or_404(Laboratory, id=laboratory_id)
        return super().create(request, *args, **kwargs)
