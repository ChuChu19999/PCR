from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import (
    Laboratory,
    Department,
    ResearchMethod,
    ResearchObject,
    ResearchMethodGroup,
    Calculation,
    ExcelTemplate,
    Protocol,
)


User = get_user_model()


class BaseModelSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        user = validated_data.pop("user", None)
        instance = super().create(validated_data)
        if user:
            instance.created_by = user.get("preferred_username")
            instance.updated_by = user.get("preferred_username")
            instance.save()
        return instance

    def update(self, instance, validated_data):
        user = validated_data.pop("user", None)
        instance = super().update(instance, validated_data)
        if user:
            instance.updated_by = user.get("preferred_username")
            instance.save()
        return instance


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


class DepartmentSerializer(BaseModelSerializer):
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


class LaboratorySerializer(BaseModelSerializer):
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


class ResearchMethodSerializer(BaseModelSerializer):
    groups = serializers.SerializerMethodField()

    def get_groups(self, obj):
        return [{"id": group.id, "name": group.name} for group in obj.groups.all()]

    class Meta:
        model = ResearchMethod
        fields = (
            "id",
            "name",
            "sample_type",
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
            "is_group_member",
            "groups",
        )
        read_only_fields = ("created_at", "updated_at", "deleted_at")

    def validate_rounding_type(self, value):
        if value not in ["decimal", "significant"]:
            raise serializers.ValidationError("Неверный тип округления")
        return value

    def validate_rounding_decimal(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Количество знаков округления не может быть отрицательным"
            )
        return value

    def validate_measurement_error(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Погрешность должна быть объектом")

        if "type" not in value:
            raise serializers.ValidationError("Не указан тип погрешности")

        if value["type"] not in ["fixed", "formula"]:
            raise serializers.ValidationError("Неверный тип погрешности")

        if "value" not in value:
            raise serializers.ValidationError("Не указано значение погрешности")

        if value["type"] == "fixed":
            try:
                float(value["value"])
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    "Фиксированное значение должно быть числом"
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

        for field in value.get("fields", []):
            if not isinstance(field, dict):
                raise serializers.ValidationError("Каждое поле должно быть объектом")

            required_field_keys = {"name", "description", "card_index"}
            if not all(key in field for key in required_field_keys):
                raise serializers.ValidationError(
                    f"Каждое поле должно содержать следующие ключи: {required_field_keys}"
                )

            if not isinstance(field["card_index"], int) or field["card_index"] < 1:
                raise serializers.ValidationError(
                    "Поле card_index должно быть положительным целым числом"
                )

            if "unit" in field and not isinstance(field["unit"], str):
                raise serializers.ValidationError("Поле unit должно быть строкой")

        return value

    def validate_intermediate_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "Промежуточные данные должны быть словарем"
            )

        for field in value.get("fields", []):
            if not isinstance(field, dict):
                raise serializers.ValidationError("Каждое поле должно быть объектом")

            required_field_keys = {"name", "formula", "description", "show_calculation"}
            if not all(key in field for key in required_field_keys):
                raise serializers.ValidationError(
                    f"Каждое поле должно содержать следующие ключи: {required_field_keys}"
                )

            if "unit" in field and not isinstance(field["unit"], str):
                raise serializers.ValidationError("Поле unit должно быть строкой")

            if not isinstance(field["show_calculation"], bool):
                raise serializers.ValidationError(
                    "Поле show_calculation должно быть логическим значением"
                )

            # Валидация параметров округления
            if "rounding_type" in field:
                if field["rounding_type"] not in [
                    "decimal",
                    "significant",
                    "multiple",
                    "threshold_table",
                    None,
                ]:
                    raise serializers.ValidationError(
                        "Неверный тип округления для промежуточного значения"
                    )

                if field["rounding_type"] == "multiple" and (
                    "rounding_decimal" not in field
                    or not isinstance(field["rounding_decimal"], (int, float))
                    or field["rounding_decimal"] <= 0
                ):
                    raise serializers.ValidationError(
                        "Для округления до кратного необходимо указать положительное число"
                    )

                if field["rounding_type"] == "threshold_table":
                    if "threshold_table_values" not in field:
                        raise serializers.ValidationError(
                            "Для метода ближайших табличных значений необходимо указать threshold_table_values"
                        )
                    threshold_values = field["threshold_table_values"]
                    required_threshold_keys = {
                        "target_variable",
                        "higher_variable",
                        "lower_variable",
                    }
                    if not all(
                        key in threshold_values for key in required_threshold_keys
                    ):
                        raise serializers.ValidationError(
                            f"threshold_table_values должен содержать следующие ключи: {required_threshold_keys}"
                        )
                    for key in required_threshold_keys:
                        if (
                            not isinstance(threshold_values[key], str)
                            or not threshold_values[key].strip()
                        ):
                            raise serializers.ValidationError(
                                f"Поле {key} в threshold_table_values должно быть непустой строкой"
                            )

            # Валидация диапазонного расчета
            if "range_calculation" in field and field["range_calculation"] is not None:
                if not isinstance(field["range_calculation"], dict):
                    raise serializers.ValidationError(
                        "range_calculation должен быть объектом"
                    )

                if "ranges" not in field["range_calculation"]:
                    raise serializers.ValidationError(
                        "range_calculation должен содержать ranges"
                    )

                if not isinstance(field["range_calculation"]["ranges"], list):
                    raise serializers.ValidationError("ranges должен быть списком")

                for range_item in field["range_calculation"]["ranges"]:
                    if not isinstance(range_item, dict):
                        raise serializers.ValidationError(
                            "Каждый диапазон должен быть объектом"
                        )

                    required_range_keys = {"condition", "formula"}
                    if not all(key in range_item for key in required_range_keys):
                        raise serializers.ValidationError(
                            f"Каждый диапазон должен содержать следующие ключи: {required_range_keys}"
                        )

        return value

    def validate_convergence_conditions(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "Условия повторяемости должны быть словарем"
            )

        if "formulas" not in value:
            raise serializers.ValidationError(
                "Условия повторяемости должны содержать ключ 'formulas'"
            )

        if not isinstance(value["formulas"], list):
            raise serializers.ValidationError(
                "Формулы условий повторяемости должны быть списком"
            )

        valid_convergence_values = [
            "satisfactory",
            "unsatisfactory",
            "absence",
            "traces",
            "custom",
        ]

        for formula_data in value["formulas"]:
            if not isinstance(formula_data, dict):
                raise serializers.ValidationError(
                    "Каждое условие повторяемости должно быть словарем"
                )

            if "formula" not in formula_data:
                raise serializers.ValidationError(
                    "Каждое условие должно содержать поле 'formula'"
                )

            if "convergence_value" not in formula_data:
                raise serializers.ValidationError(
                    "Каждое условие должно содержать поле 'convergence_value'"
                )

            if formula_data[
                "convergence_value"
            ] not in valid_convergence_values and not formula_data.get("custom_value"):
                raise serializers.ValidationError(
                    f"Значение повторяемости должно быть одним из: {', '.join(valid_convergence_values)} или иметь custom_value"
                )

            # Проверяем структуру формулы на наличие операторов И/ИЛИ
            formula = formula_data["formula"]
            if " and " in formula or " or " in formula:
                # Разбиваем на подусловия
                conditions = []
                if " or " in formula:
                    conditions = formula.split(" or ")
                else:
                    conditions = [formula]

                for condition in conditions:
                    if " and " in condition:
                        sub_conditions = condition.strip().split(" and ")
                        for sub_condition in sub_conditions:
                            sub_condition = sub_condition.strip().strip("()")
                            if not any(
                                op in sub_condition
                                for op in ["<=", ">=", ">", "<", "="]
                            ):
                                raise serializers.ValidationError(
                                    f"Некорректное условие: {sub_condition}. Должен присутствовать оператор сравнения"
                                )
                    else:
                        condition = condition.strip().strip("()")
                        if not any(
                            op in condition for op in ["<=", ">=", ">", "<", "="]
                        ):
                            raise serializers.ValidationError(
                                f"Некорректное условие: {condition}. Должен присутствовать оператор сравнения"
                            )
            else:
                # Проверяем простое условие
                if not any(op in formula for op in ["<=", ">=", ">", "<", "="]):
                    raise serializers.ValidationError(
                        f"Некорректное условие: {formula}. Должен присутствовать оператор сравнения"
                    )

        return value


class ResearchMethodBriefSerializer(BaseModelSerializer):
    class Meta:
        model = ResearchMethod
        fields = ("id", "name")


class ResearchObjectSerializer(BaseModelSerializer):
    research_methods = serializers.SerializerMethodField()
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

    def get_research_methods(self, obj):
        research_methods = (
            obj.research_methods.through.objects.filter(research_object=obj)
            .select_related("research_method")
            .order_by("sort_order", "created_at")
        )

        # Словарь для хранения групп
        groups = {}

        for method in research_methods:
            if method.research_method.groups.exists():
                group = method.research_method.groups.first()
                group_id = f"group_{group.id}"  # Уникальный ID для группы (group_1, group_2, ...)
                if group_id not in groups:
                    groups[group_id] = {
                        "id": group_id,
                        "name": group.name,
                        "is_group": True,
                        "methods": [],
                    }
                groups[group_id]["methods"].append(
                    {
                        "id": method.research_method.id,
                        "name": method.research_method.name,
                        "is_active": method.is_active,
                        "sort_order": method.sort_order,
                    }
                )

        result = []

        # Cамостоятельные методы (не входящие в группы)
        for method in research_methods:
            if not method.research_method.is_group_member:
                result.append(
                    {
                        "id": method.research_method.id,
                        "name": method.research_method.name,
                        "is_active": method.is_active,
                        "sort_order": method.sort_order,
                    }
                )

        for group in groups.values():
            group["methods"].sort(key=lambda x: (x["sort_order"], x["name"]))
            result.append(group)

        result.sort(
            key=lambda x: (
                x.get("sort_order", 0)
                if not x.get("is_group")
                else min(m["sort_order"] for m in x["methods"]) if x["methods"] else 0
            )
        )

        return result

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


class ResearchMethodGroupSerializer(BaseModelSerializer):
    methods = ResearchMethodSerializer(many=True, read_only=True)
    method_ids = serializers.PrimaryKeyRelatedField(
        source="methods",
        queryset=ResearchMethod.objects.filter(is_group_member=False),
        many=True,
        write_only=True,
        required=False,
    )

    class Meta:
        model = ResearchMethodGroup
        fields = (
            "id",
            "name",
            "methods",
            "method_ids",
            "created_at",
            "updated_at",
            "is_deleted",
            "deleted_at",
            "is_active",
        )
        read_only_fields = ("created_at", "updated_at", "is_deleted", "deleted_at")

    def validate_name(self, value):
        if value:
            value = value.strip()
            if not value:
                raise serializers.ValidationError(
                    "Название группы не может быть пустым"
                )
        return value

    def validate_method_ids(self, value):
        if not value:
            raise serializers.ValidationError("Необходимо выбрать хотя бы один метод")

        # Проверяем, что ни один из методов не входит в другую группу
        existing_group_methods = ResearchMethod.objects.filter(
            id__in=[method.id for method in value], is_group_member=True
        )

        if existing_group_methods.exists():
            method_names = ", ".join([m.name for m in existing_group_methods])
            raise serializers.ValidationError(
                f"Следующие методы уже входят в другие группы: {method_names}"
            )

        return value

    def create(self, validated_data):
        method_ids = validated_data.pop("methods", [])
        instance = super().create(validated_data)

        if method_ids:
            # Обновляем флаг is_group_member для методов
            ResearchMethod.objects.filter(id__in=[m.id for m in method_ids]).update(
                is_group_member=True
            )
            instance.methods.set(method_ids)

        return instance

    def update(self, instance, validated_data):
        method_ids = validated_data.pop("methods", None)
        instance = super().update(instance, validated_data)

        if method_ids is not None:
            old_method_ids = set(instance.methods.values_list("id", flat=True))
            new_method_ids = set(m.id for m in method_ids)

            # Обновляем флаг is_group_member
            # Для удаленных методов
            ResearchMethod.objects.filter(
                id__in=old_method_ids - new_method_ids
            ).update(is_group_member=False)
            # Для новых методов
            ResearchMethod.objects.filter(
                id__in=new_method_ids - old_method_ids
            ).update(is_group_member=True)

            instance.methods.set(method_ids)

        return instance


class ExcelTemplateSerializer(BaseModelSerializer):
    file = serializers.SerializerMethodField()
    laboratory_name = serializers.CharField(source="laboratory.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = ExcelTemplate
        fields = (
            "id",
            "name",
            "version",
            "file_name",
            "file",
            "is_active",
            "selection_conditions",
            "laboratory",
            "laboratory_name",
            "department",
            "department_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("version", "is_active", "created_at", "updated_at")

    def get_file(self, obj):
        return None

    def create(self, validated_data):
        # Получаем следующую версию для шаблона
        version = ExcelTemplate.get_next_version(validated_data["name"])
        validated_data["version"] = version
        validated_data["is_active"] = True
        return super().create(validated_data)

    def validate(self, data):
        if (
            data.get("department")
            and data["department"].laboratory != data["laboratory"]
        ):
            raise serializers.ValidationError(
                {
                    "department": "Подразделение должно принадлежать выбранной лаборатории"
                }
            )

        # При обновлении запрещаем менять лабораторию и подразделение
        if self.instance:
            if "laboratory" in data and data["laboratory"] != self.instance.laboratory:
                raise serializers.ValidationError(
                    {
                        "laboratory": "Нельзя изменить лабораторию у существующего шаблона"
                    }
                )
            if "department" in data and data["department"] != self.instance.department:
                raise serializers.ValidationError(
                    {
                        "department": "Нельзя изменить подразделение у существующего шаблона"
                    }
                )

        return data


class ProtocolSerializer(BaseModelSerializer):
    laboratory_name = serializers.CharField(source="laboratory.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

    def validate_selection_conditions(self, value):
        if value is not None:
            if not isinstance(value, list):
                raise serializers.ValidationError("Условия отбора должны быть списком")

            for condition in value:
                if not isinstance(condition, dict):
                    raise serializers.ValidationError(
                        "Каждое условие должно быть объектом"
                    )

                if "name" not in condition or "unit" not in condition:
                    raise serializers.ValidationError(
                        "Каждое условие должно содержать поля 'name' и 'unit'"
                    )

                if "value" in condition and condition["value"] is not None:
                    try:
                        float(condition["value"])
                    except (ValueError, TypeError):
                        raise serializers.ValidationError(
                            "Значение условия должно быть числом или null"
                        )

        return value

    class Meta:
        model = Protocol
        fields = (
            "id",
            "test_protocol_number",
            "test_object",
            "laboratory_location",
            "branch",
            "sampling_location_detail",
            "phone",
            "sampling_act_number",
            "registration_number",
            "sampling_date",
            "receiving_date",
            "selection_conditions",
            "excel_template",
            "laboratory",
            "laboratory_name",
            "department",
            "department_name",
            "created_at",
            "updated_at",
            "is_deleted",
            "deleted_at",
        )
        read_only_fields = ("created_at", "updated_at", "is_deleted", "deleted_at")

    def validate(self, data):
        if (
            data.get("department")
            and data["department"].laboratory != data["laboratory"]
        ):
            raise serializers.ValidationError(
                {
                    "department": "Подразделение должно принадлежать выбранной лаборатории"
                }
            )

        return data

    def validate_registration_number(self, value):
        request = self.context.get("request")
        if not request:
            return value

        laboratory = (
            self.instance.laboratory
            if self.instance
            else self.initial_data.get("laboratory")
        )
        department = (
            self.instance.department
            if self.instance
            else self.initial_data.get("department")
        )

        if not laboratory:
            return value

        # Проверяем существование протокола с таким же регистрационным номером
        existing_protocols = Protocol.objects.filter(
            registration_number=value,
            laboratory=laboratory,
            department=department,
            is_deleted=False,
        )

        # Исключаем текущий протокол при обновлении
        if self.instance:
            existing_protocols = existing_protocols.exclude(pk=self.instance.pk)

        if existing_protocols.exists():
            raise serializers.ValidationError(
                "Протокол с таким регистрационным номером уже существует для данной лаборатории"
                + (" и подразделения" if department else "")
            )

        return value


class CalculationSerializer(BaseModelSerializer):
    protocol = ProtocolSerializer(read_only=True)
    protocol_id = serializers.PrimaryKeyRelatedField(
        source="protocol",
        queryset=Protocol.objects.filter(is_deleted=False),
        write_only=True,
    )
    laboratory_activity_date = serializers.DateField(
        format="%Y-%m-%d", input_formats=["%Y-%m-%d"], required=True
    )
    research_method = ResearchMethodSerializer(read_only=True)
    research_method_id = serializers.PrimaryKeyRelatedField(
        source="research_method",
        queryset=ResearchMethod.objects.filter(is_deleted=False),
        write_only=True,
    )
    executor = serializers.CharField(required=True, allow_blank=False, min_length=2)

    def validate_executor(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Необходимо указать исполнителя")
        if len(value.strip()) < 2:
            raise serializers.ValidationError(
                "ФИО исполнителя должно содержать не менее 2 символов"
            )
        return value.strip()

    class Meta:
        model = Calculation
        fields = (
            "id",
            "input_data",
            "protocol",
            "protocol_id",
            "result",
            "measurement_error",
            "unit",
            "laboratory",
            "department",
            "research_method",
            "research_method_id",
            "laboratory_activity_date",
            "executor",
            "created_at",
            "updated_at",
            "is_deleted",
            "deleted_at",
        )
        read_only_fields = ("created_at", "updated_at", "is_deleted", "deleted_at")

    def validate(self, data):
        if (
            data.get("department")
            and data["department"].laboratory != data["laboratory"]
        ):
            raise serializers.ValidationError(
                {
                    "department": "Подразделение должно принадлежать выбранной лаборатории"
                }
            )

        return data
