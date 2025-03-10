from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Laboratory, Department, ResearchMethod, ResearchObject


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "fullName",
            "hashSnils",
            "is_staff",
            "preferred_username",
            "departmentNumber",
        )


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


class ResearchMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchMethod
        fields = (
            "id",
            "name",
            "formula",
            "measurement_error",
            "unit",
            "measurement_method",
            "nd_code",
            "nd_name",
            "input_data",
            "intermediate_data",
            "convergence_conditions",
            "created_at",
            "updated_at",
            "is_deleted",
            "deleted_at",
            "rounding_type",
            "rounding_decimal",
            "is_active",
            "parallel_count",
        )
        read_only_fields = ("created_at", "updated_at", "deleted_at")

    def validate_parallel_count(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Количество параллелей не может быть отрицательным"
            )
        return value

    def validate_measurement_error(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Погрешность должна быть объектом")

        if "type" not in value:
            raise serializers.ValidationError("Не указан тип погрешности")

        if value["type"] not in ["fixed", "formula", "range"]:
            raise serializers.ValidationError("Неверный тип погрешности")

        if "value" not in value and value["type"] != "range":
            raise serializers.ValidationError("Не указано значение погрешности")

        if value["type"] == "fixed":
            try:
                float(value["value"])
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    "Фиксированное значение должно быть числом"
                )

        elif value["type"] == "formula":
            if not any(op in value["value"] for op in ["+", "-", "*", "/", "(", ")"]):
                raise serializers.ValidationError(
                    "Формула погрешности должна быть корректной"
                )

        elif value["type"] == "range":
            if "ranges" not in value or not isinstance(value["ranges"], list):
                raise serializers.ValidationError(
                    "Для диапазонного типа необходимо указать ranges"
                )

            if not value["ranges"]:
                raise serializers.ValidationError("Ranges не может быть пустым")

            for range_item in value["ranges"]:
                if not isinstance(range_item, dict):
                    raise serializers.ValidationError(
                        "Каждый диапазон должен быть объектом"
                    )

                if "formula" not in range_item or "value" not in range_item:
                    raise serializers.ValidationError(
                        "Каждый диапазон должен содержать formula и value"
                    )

                try:
                    float(range_item["value"])
                except (ValueError, TypeError):
                    raise serializers.ValidationError(
                        "Значение в диапазоне должно быть числом"
                    )

        return value

    def validate_input_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Входные данные должны быть словарем")

        required_keys = {"fields"}
        if not all(key in value for key in required_keys):
            raise serializers.ValidationError(
                f"Входные данные должны содержать следующие ключи: {required_keys}"
            )
        return value

    def validate_intermediate_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "Промежуточные данные должны быть словарем"
            )
        return value

    def validate_convergence_conditions(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Условия сходимости должны быть словарем")

        if "formulas" not in value:
            raise serializers.ValidationError(
                "Условия сходимости должны содержать ключ 'formulas'"
            )

        if not isinstance(value["formulas"], list):
            raise serializers.ValidationError(
                "Формулы условий сходимости должны быть списком"
            )

        valid_convergence_values = [
            "satisfactory",
            "unsatisfactory",
            "absence",
            "traces",
        ]

        for formula_data in value["formulas"]:
            if not isinstance(formula_data, dict):
                raise serializers.ValidationError(
                    "Каждое условие сходимости должно быть словарем"
                )

            if "formula" not in formula_data:
                raise serializers.ValidationError(
                    "Каждое условие должно содержать поле 'formula'"
                )

            if "convergence_value" not in formula_data:
                raise serializers.ValidationError(
                    "Каждое условие должно содержать поле 'convergence_value'"
                )

            if formula_data["convergence_value"] not in valid_convergence_values:
                raise serializers.ValidationError(
                    f"Значение сходимости должно быть одним из: {', '.join(valid_convergence_values)}"
                )

        return value

    def validate_rounding_decimal(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Количество знаков округления не может быть отрицательным"
            )
        return value


class ResearchMethodBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchMethod
        fields = ("id", "name")


class ResearchObjectSerializer(serializers.ModelSerializer):
    research_methods = ResearchMethodBriefSerializer(many=True, read_only=True)
    research_method_ids = serializers.PrimaryKeyRelatedField(
        source="research_methods",
        queryset=ResearchMethod.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    laboratory_name = serializers.CharField(source="laboratory.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    laboratory = serializers.PrimaryKeyRelatedField(queryset=Laboratory.objects.all())
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), allow_null=True
    )

    class Meta:
        model = ResearchObject
        fields = (
            "id",
            "type",
            "laboratory",
            "laboratory_name",
            "department",
            "department_name",
            "research_methods",
            "research_method_ids",
            "created_at",
            "updated_at",
            "is_deleted",
            "deleted_at",
        )
        read_only_fields = ("created_at", "updated_at", "is_deleted", "deleted_at")
