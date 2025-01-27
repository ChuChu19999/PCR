from django.contrib import admin
from .models import Laboratory, Department


@admin.register(Laboratory)
class LaboratoryAdmin(admin.ModelAdmin):
    list_display = ("name", "full_name", "created_at")
    search_fields = ("name", "full_name")
    ordering = ("name",)
    list_per_page = 20


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "laboratory", "created_at")
    list_filter = ("laboratory",)
    search_fields = ("name", "laboratory__name")
    ordering = ("laboratory", "name")
    list_per_page = 20

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("laboratory")
