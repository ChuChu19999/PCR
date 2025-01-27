from rest_framework import serializers
from .models import Laboratory, Department


class DepartmentSerializer(serializers.ModelSerializer):
    laboratory_name = serializers.CharField(source="laboratory.name", read_only=True)

    class Meta:
        model = Department
        fields = (
            "id",
            "name",
            "laboratory",
            "laboratory_name",
            "created_at",
            "is_deleted",
            "deleted_at",
        )
        read_only_fields = ("created_at", "is_deleted", "deleted_at")

    def validate_name(self, value):
        if value:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Название не может быть пустым")
        return value

    def validate(self, data):
        laboratory = data.get("laboratory")
        name = data.get("name")
        instance = self.instance

        if laboratory and name:
            if (
                Department.objects.filter(laboratory=laboratory, name=name)
                .exclude(id=instance.id if instance else None)
                .exists()
            ):
                raise serializers.ValidationError(
                    {
                        "name": "Подразделение с таким названием уже существует в данной лаборатории"
                    }
                )
        return data


class LaboratorySerializer(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)
    departments_count = serializers.SerializerMethodField()

    def get_departments_count(self, obj):
        return obj.departments.filter(is_deleted=False).count()

    class Meta:
        model = Laboratory
        fields = (
            "id",
            "name",
            "full_name",
            "departments",
            "departments_count",
            "created_at",
            "is_deleted",
            "deleted_at",
        )
        read_only_fields = ("created_at", "is_deleted", "deleted_at")

    def validate_name(self, value):
        if value:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Название не может быть пустым")
            if (
                Laboratory.objects.filter(name=value)
                .exclude(id=self.instance.id if self.instance else None)
                .exists()
            ):
                raise serializers.ValidationError(
                    "Лаборатория с таким названием уже существует"
                )
        return value

    def validate_full_name(self, value):
        if value:
            value = value.strip()
            if not value:
                raise serializers.ValidationError(
                    "Полное название не может быть пустым"
                )
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")

        if not request or not request.query_params.get("exclude_departments"):
            data["departments"] = [
                dept for dept in data["departments"] if not dept.get("is_deleted")
            ]
        else:
            data.pop("departments", None)
        return data
