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
from .models import (
    Department,
    Laboratory,
    ResearchMethod,
    ResearchMethodGroup,
    ResearchObject,
    ResearchObjectMethod,
    Calculation,
    Protocol,
)
from .serializers import (
    DepartmentSerializer,
    LaboratorySerializer,
    ResearchMethodSerializer,
    ResearchMethodGroupSerializer,
    ResearchObjectSerializer,
    CalculationSerializer,
    ProtocolSerializer,
)
from .user_views import UserViewSet
from copy import copy
from decimal import Decimal, ROUND_HALF_UP
import logging


logger = logging.getLogger(__name__)


@permission_classes([AllowAny])
class LaboratoryViewSet(viewsets.ModelViewSet):
    serializer_class = LaboratorySerializer

    def get_queryset(self):
        return Laboratory.objects.filter(is_deleted=False)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Помечаем как удаленные все связанные research-pages
        ResearchObject.objects.filter(laboratory=instance).update(
            is_deleted=True, deleted_at=timezone.now()
        )
        instance.mark_as_deleted()
        return Response(status=status.HTTP_204_NO_CONTENT)


@permission_classes([AllowAny])
class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        return Department.objects.filter(is_deleted=False).select_related("laboratory")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Помечаем как удаленные все связанные research-pages
        ResearchObject.objects.filter(department=instance).update(
            is_deleted=True, deleted_at=timezone.now()
        )
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def create(self, request, *args, **kwargs):
        laboratory_id = request.data.get("laboratory")
        get_object_or_404(Laboratory, id=laboratory_id)
        return super().create(request, *args, **kwargs)


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
        serializer.save()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        if "convergence_conditions" in request.data:
            conditions = request.data.get("convergence_conditions")
            if not isinstance(conditions, dict) or "formulas" not in conditions:
                return Response(
                    {"error": "Неверный формат условий сходимости"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"])
    def toggle_active(self, request, pk=None):
        research_method = self.get_object()
        research_method.is_active = not research_method.is_active
        research_method.save()

        return Response({"status": "success", "is_active": research_method.is_active})

    @action(detail=True, methods=["post"])
    def mark_deleted(self, request, pk=None):
        research_method = self.get_object()
        research_method.is_deleted = True
        research_method.deleted_at = timezone.now()
        research_method.save()

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
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _round_to_significant_figures(number, significant_figures):
    """
    Округляет число до заданного количества значащих цифр.
    """
    if number == 0:
        return 0

    d = Decimal(str(float(number)))
    str_num = f"{d:E}"
    mantissa, exp = str_num.split("E")
    exp = int(exp)
    mantissa = mantissa.replace(".", "").rstrip("0")

    if len(mantissa) > significant_figures:
        mantissa = str(round(int(mantissa[: significant_figures + 1]) / 10))

    mantissa = mantissa.ljust(significant_figures, "0")

    if exp >= 0:
        if exp + 1 >= len(mantissa):
            result = Decimal(mantissa + "0" * (exp + 1 - len(mantissa)))
        else:
            result = Decimal(mantissa[: exp + 1] + "." + mantissa[exp + 1 :])
    else:
        result = Decimal("0." + "0" * (-exp - 1) + mantissa)

    return result


def _get_decimal_places(number):
    """
    Возвращает количество знаков после запятой в числе.
    """
    str_num = str(Decimal(str(float(number))))
    if "." not in str_num:
        return 0
    return len(str_num.split(".")[1])


def round_result(result, rounding_type, rounding_decimal):
    """
    Округляет результат по заданному типу и количеству знаков.
    """
    if rounding_type == "decimal":
        d = Decimal(str(float(result)))
        # Используем ROUND_HALF_UP для округления 0.5 вверх
        return d.quantize(Decimal("0.1") ** rounding_decimal, rounding=ROUND_HALF_UP)
    else:
        return _round_to_significant_figures(result, rounding_decimal)


def _replace_subscript_digits(text):
    """
    Заменяет подстрочные символы на обычные.
    """
    subscript_map = {
        "₀": "0",
        "₁": "1",
        "₂": "2",
        "₃": "3",
        "₄": "4",
        "₅": "5",
        "₆": "6",
        "₇": "7",
        "₈": "8",
        "₉": "9",
        "ₐ": "a",
        "ₑ": "e",
        "ₕ": "h",
        "ᵢ": "i",
        "ⱼ": "j",
        "ₖ": "k",
        "ₗ": "l",
        "ₘ": "m",
        "ₙ": "n",
        "ₒ": "o",
        "ₚ": "p",
        "ᵣ": "r",
        "ₛ": "s",
        "ₜ": "t",
        "ᵤ": "u",
        "ᵥ": "v",
        "ₓ": "x",
        "ᵦ": "β",
        "ᵧ": "γ",
        "ᵨ": "ρ",
        "ᵩ": "φ",
        "ᵪ": "χ",
    }

    result = text
    for subscript, normal in subscript_map.items():
        result = result.replace(subscript, normal)
    return result


def evaluate_formula(formula, variables, is_condition=False):
    """
    Вычисляет результат формулы.

    Args:
        variables (dict): Словарь переменных и их значений
        is_condition (bool): Флаг, указывающий что это вычисление условия
    """
    # Создаем копию переменных с замененными индексами
    decimal_vars = {}
    for name, value in variables.items():
        try:
            if isinstance(value, str):
                value = value.strip().replace(",", ".")
            new_name = _replace_subscript_digits(name)
            decimal_vars[new_name] = float(value)
        except Exception as e:
            raise ValueError(
                f"Ошибка преобразования значения {name} = {value} в число: {str(e)}"
            )

    try:
        formula = _replace_subscript_digits(formula)
        formula = formula.replace("×", "*").replace("÷", "/")

        # Создаем безопасный контекст для вычислений
        safe_dict = {"abs": abs, "pow": pow, "round": round, "max": max, "min": min}
        safe_dict.update(decimal_vars)

        if is_condition:
            # Для условий разбиваем формулу на части
            for operator in ["<=", ">=", ">", "<", "="]:
                if operator in formula:
                    left, right = formula.split(operator)
                    # Вычисляем левую и правую части
                    left_result = float(eval(left, {"__builtins__": {}}, safe_dict))
                    right_result = float(eval(right, {"__builtins__": {}}, safe_dict))

                    # Добавляем эпсилон для сравнения чисел с плавающей точкой
                    epsilon = 1e-10

                    if operator == "<=":
                        return left_result <= (right_result + epsilon)
                    elif operator == ">=":
                        return left_result >= (right_result - epsilon)
                    elif operator == ">":
                        return left_result > (right_result + epsilon)
                    elif operator == "<":
                        return left_result < (right_result - epsilon)
                    else:  # =
                        return abs(left_result - right_result) < 1e-10

            raise ValueError(
                f"Неподдерживаемый оператор сравнения в формуле: {formula}"
            )
        else:
            # Для обычных формул
            result = float(eval(formula, {"__builtins__": {}}, safe_dict))
            return Decimal(str(result))

    except Exception as e:
        raise ValueError(f"Ошибка при вычислении формулы '{formula}': {str(e)}")


@api_view(["POST"])
@permission_classes([AllowAny])
def calculate_result(request):
    """
    Вычисляет результат расчета.
    """
    try:
        logger.info("Начало расчета")

        input_data = request.data.get("input_data", {})
        research_method = request.data.get("research_method", {})

        logger.info(f"Полученные входные данные: {input_data}")
        logger.info(
            f"Метод исследования: {research_method['name']} (ID: {research_method['id']})"
        )
        logger.info(f"Формула расчета: {research_method['formula']}")
        logger.info(f"Погрешность: {research_method['measurement_error']}")

        if not input_data or not research_method:
            logger.error("Отсутствуют необходимые данные для расчета")
            return Response(
                {
                    "error": "Необходимо предоставить входные данные и метод исследования"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Сначала вычисляем промежуточные результаты
        logger.info("Начало вычисления промежуточных результатов")
        intermediate_results = {}
        variables = dict(input_data)

        for field in research_method["intermediate_data"]["fields"]:
            # Пропускаем поля с пустыми именами или формулами
            if not field["name"].strip() or not field["formula"].strip():
                logger.info(f"Пропущено пустое промежуточное поле: {field}")
                continue

            try:
                logger.info(
                    f"Вычисление промежуточного результата: {field['name']}, формула: {field['formula']}"
                )
                intermediate_value = evaluate_formula(field["formula"], variables)
                logger.info(
                    f"Промежуточный результат {field['name']} = {intermediate_value}"
                )
                # Добавляем результат в словарь только если show_calculation = true
                if field.get("show_calculation", True):
                    intermediate_results[field["name"]] = str(intermediate_value)
                # В любом случае добавляем значение в переменные для дальнейших расчетов
                variables[field["name"]] = intermediate_value
            except Exception as e:
                logger.error(
                    f"Ошибка при вычислении промежуточного результата {field['name']}: {str(e)}"
                )
                return Response(
                    {
                        "error": f"Ошибка при вычислении промежуточного результата: {str(e)}"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        logger.info("Начало проверки условий сходимости")
        satisfied_conditions = []

        for condition in research_method["convergence_conditions"]["formulas"]:
            try:
                logger.info(f"Проверка условия: {condition['formula']}")
                condition_result = evaluate_formula(
                    condition["formula"], variables, is_condition=True
                )
                logger.info(
                    f"Результат проверки условия: {condition_result} (тип: {condition['convergence_value']}"
                )

                if condition_result:
                    satisfied_conditions.append(condition["convergence_value"])
                    logger.info(
                        f"Условие {condition['formula']} выполнено, тип: {condition['convergence_value']}"
                    )
            except Exception as e:
                logger.error(f"Ошибка при проверке условия сходимости: {str(e)}")
                return Response(
                    {"error": f"Ошибка при проверке условия сходимости: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        logger.info(f"Все выполненные условия: {satisfied_conditions}")

        # Проверяем наличие особых условий
        special_conditions = [
            cond
            for cond in satisfied_conditions
            if cond in ["traces", "unsatisfactory", "absence"]
        ]

        # Сохраняем информацию о выполненных условиях
        conditions_info = []
        for condition in research_method["convergence_conditions"]["formulas"]:
            try:
                condition_result = evaluate_formula(
                    condition["formula"], variables, is_condition=True
                )
                conditions_info.append(
                    {
                        "formula": condition["formula"],
                        "satisfied": condition_result,
                        "convergence_value": condition["convergence_value"],
                        "calculation_steps": calculate_convergence_steps(
                            condition["formula"], variables
                        ),
                    }
                )
            except Exception as e:
                logger.error(f"Ошибка при проверке условия сходимости: {str(e)}")
                return Response(
                    {"error": f"Ошибка при проверке условия сходимости: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if special_conditions:
            # Если есть особые условия, возвращаем их через запятую
            convergence_result = ", ".join(special_conditions)
            logger.info(f"Найдены особые условия: {convergence_result}")

            return Response(
                {
                    "convergence": convergence_result,
                    "intermediate_results": {},
                    "result": None,
                    "measurement_error": None,
                    "unit": research_method["unit"],
                    "conditions_info": conditions_info,
                },
                status=status.HTTP_200_OK,
            )

        # Если особых условий нет, считаем результат удовлетворительным
        convergence_result = "satisfactory"
        logger.info("Условия сходимости удовлетворительны, продолжаем расчет")

        # Если сходимость удовлетворительная, вычисляем результат
        result = None
        measurement_error = None

        if convergence_result == "satisfactory":
            # Затем вычисляем основной результат
            try:
                logger.info(
                    f"Вычисление основного результата по формуле: {research_method['formula']}"
                )
                logger.info(f"Используемые переменные: {variables}")
                result = evaluate_formula(research_method["formula"], variables)
                logger.info(f"Неокругленный результат: {result}")
            except Exception as e:
                logger.error(f"Ошибка при вычислении основного результата: {str(e)}")
                return Response(
                    {"error": f"Ошибка при вычислении результата: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Округляем результат
            logger.info(
                f"Округление результата: тип={research_method['rounding_type']}, знаков={research_method['rounding_decimal']}"
            )
            result = round_result(
                result,
                research_method["rounding_type"],
                research_method["rounding_decimal"],
            )
            logger.info(f"Окончательный результат после округления: {result}")

            # Вычисляем количество знаков после запятой в результате
            result_decimal_places = (
                len(str(result).split(".")[-1]) if "." in str(result) else 0
            )
            logger.info(
                f"Количество знаков после запятой в результате: {result_decimal_places}"
            )

            # Вычисляем погрешность
            try:
                error_config = research_method["measurement_error"]
                logger.info(f"Вычисление погрешности: {error_config}")

                if error_config["type"] == "fixed":
                    measurement_error = float(error_config["value"])
                elif error_config["type"] == "formula":
                    variables["result"] = result
                    measurement_error = float(
                        evaluate_formula(error_config["value"], variables)
                    )
                elif error_config["type"] == "range":
                    for range_item in error_config["ranges"]:
                        if evaluate_formula(
                            range_item["formula"], variables, is_condition=True
                        ):
                            measurement_error = float(range_item["value"])
                            break
                    if measurement_error is None:
                        logger.warning("Не найден подходящий диапазон для погрешности")
                        measurement_error = 0

                # Округляем погрешность до того же количества знаков после запятой, что и результат
                if measurement_error is not None:
                    measurement_error = round(
                        Decimal(str(measurement_error)), result_decimal_places
                    )
                    logger.info(f"Погрешность после округления: {measurement_error}")

            except Exception as e:
                logger.error(f"Ошибка при вычислении погрешности: {str(e)}")
                return Response(
                    {"error": f"Ошибка при вычислении погрешности: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        response_data = {
            "convergence": convergence_result,
            "intermediate_results": intermediate_results,
            "result": str(result) if result is not None else None,
            "measurement_error": (
                str(measurement_error) if measurement_error is not None else None
            ),
            "unit": research_method["unit"],
            "conditions_info": conditions_info,
        }
        logger.info(f"Подготовлен ответ: {response_data}")

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Необработанная ошибка при расчете: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["PATCH"])
@permission_classes([AllowAny])
def update_research_method_status(request, page_id, method_id):
    """
    Обновляет статус метода исследования.
    """
    try:
        research_object = ResearchObject.objects.get(id=page_id)
        research_method = ResearchMethod.objects.get(id=method_id)

        research_object_method = ResearchObjectMethod.objects.get(
            research_object=research_object, research_method=research_method
        )

        research_object_method.is_active = request.data.get("is_active", True)
        research_object_method.save()

        return Response({"status": "success"})
    except (
        ResearchObject.DoesNotExist,
        ResearchMethod.DoesNotExist,
        ResearchObjectMethod.DoesNotExist,
    ):
        return Response(
            {"error": "Объект или метод исследования не найден"},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


def calculate_convergence_steps(formula, variables):
    """Вычисляет шаги расчета сходимости."""
    try:
        # Заменяем переменные на их значения
        step1 = formula
        for name, value in variables.items():
            if isinstance(value, str):
                value = value.strip().replace(",", ".")
            step1 = step1.replace(name, str(value))

        # Разбиваем формулу на левую и правую части
        for operator in ["<=", ">=", ">", "<", "="]:
            if operator in formula:
                left, right = step1.split(operator)

                # Вычисляем левую часть
                safe_dict = {
                    "abs": abs,
                    "pow": pow,
                    "round": round,
                    "max": max,
                    "min": min,
                }
                left_result = float(eval(left, {"__builtins__": {}}, safe_dict))
                right_result = float(eval(right, {"__builtins__": {}}, safe_dict))

                # Форматируем числа для красивого отображения
                left_str = f"{left_result:g}".replace(".", ",")
                right_str = f"{right_result:g}".replace(".", ",")

                return {
                    "step1": step1.replace("*", "×").replace(
                        "/", "÷"
                    ),  # Заменяем символы на математические
                    "step2": f"{left_str}{operator}{right_str}",
                }

        return None
    except Exception as e:
        logger.error(f"Ошибка при вычислении шагов сходимости: {str(e)}")
        return None


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
        serializer.save()

    @action(detail=True, methods=["post"])
    def toggle_active(self, request, pk=None):
        group = self.get_object()
        group.is_active = not group.is_active
        group.save()
        return Response({"status": "success", "is_active": group.is_active})

    @action(detail=True, methods=["post"])
    def mark_deleted(self, request, pk=None):
        group = self.get_object()
        group.is_deleted = True
        group.deleted_at = timezone.now()
        group.save()
        return Response(
            {"status": "success", "message": "Группа помечена как удаленная"}
        )


@api_view(["PATCH"])
@permission_classes([AllowAny])
def update_methods_order(request, page_id):
    """
    Обновляет порядок сортировки методов исследования для указанной страницы.
    """
    try:
        research_object = ResearchObject.objects.get(id=page_id)
        methods_data = request.data.get("methods", [])

        # Проверяем, что все методы принадлежат этой странице
        method_ids = [item["id"] for item in methods_data]
        existing_methods = ResearchObjectMethod.objects.filter(
            research_object=research_object, research_method_id__in=method_ids
        )

        if len(existing_methods) != len(method_ids):
            return Response(
                {
                    "error": "Некоторые методы не найдены или не принадлежат этой странице"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        for item in methods_data:
            ResearchObjectMethod.objects.filter(
                research_object=research_object, research_method_id=item["id"]
            ).update(sort_order=item["sort_order"])

        return Response({"status": "success"})

    except ResearchObject.DoesNotExist:
        return Response(
            {"error": "Страница исследований не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@permission_classes([AllowAny])
class ProtocolViewSet(viewsets.ModelViewSet):
    serializer_class = ProtocolSerializer

    def get_queryset(self):
        queryset = Protocol.objects.select_related("protocol_details")

        is_deleted = self.request.query_params.get("is_deleted")
        laboratory_id = self.request.query_params.get("laboratory")
        department_id = self.request.query_params.get("department")

        if is_deleted is not None:
            is_deleted = is_deleted.lower() == "true"
            queryset = queryset.filter(is_deleted=is_deleted)

        if laboratory_id:
            queryset = queryset.filter(
                calculations__laboratory_id=laboratory_id
            ).distinct()

        if department_id:
            queryset = queryset.filter(
                calculations__department_id=department_id
            ).distinct()

        return queryset.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {
                    "error": "Комбинация филиала и места отбора пробы должна быть уникальной"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def mark_deleted(self, request, pk=None):
        protocol = self.get_object()
        protocol.mark_as_deleted()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([AllowAny])
def save_calculation(request):
    """
    Сохраняет расчет.
    """
    try:
        data = request.data
        protocol_data = None
        calculation_data = None

        if "protocol_id" in data:
            existing_calculation = Calculation.objects.filter(
                protocol_id=data["protocol_id"],
                research_method=data.get("research_method"),
                is_deleted=False,
            ).first()

            if existing_calculation:
                return Response(
                    {
                        "error": "Для данного протокола уже существует расчет по этому методу исследования"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            calculation_data = {
                "input_data": data.get("input_data"),
                "result": data.get("result"),
                "measurement_error": data.get("measurement_error"),
                "unit": data.get("unit"),
                "laboratory": data.get("laboratory"),
                "department": data.get("department"),
                "research_method": data.get("research_method"),
                "protocol_id": data["protocol_id"],
                "laboratory_activity_date": data.get("laboratory_activity_date"),
            }
        else:
            # Создаем новый протокол
            protocol_data = {
                "test_protocol_number": data.get("test_protocol_number"),
                "sampling_act_number": data.get("sampling_act_number"),
                "registration_number": data.get("registration_number"),
                "sampling_location": data.get("sampling_location"),
                "sampling_date": data.get("sampling_date"),
                "receiving_date": data.get("receiving_date"),
                "laboratory_activity_dates": data.get("laboratory_activity_dates"),
                "executor": data.get("executor"),
                "excel_template": data.get("excel_template"),
            }

            protocol_serializer = ProtocolSerializer(data=protocol_data)
            if protocol_serializer.is_valid():
                protocol = protocol_serializer.save()
                existing_calculation = Calculation.objects.filter(
                    protocol_id=protocol.id,
                    research_method=data.get("research_method"),
                    is_deleted=False,
                ).first()

                if existing_calculation:
                    # Удаляем созданный протокол, так как расчет не может быть создан
                    protocol.delete()
                    return Response(
                        {
                            "error": "Для данного протокола уже существует расчет по этому методу исследования"
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                calculation_data = {
                    "input_data": data.get("input_data"),
                    "result": data.get("result"),
                    "measurement_error": data.get("measurement_error"),
                    "unit": data.get("unit"),
                    "laboratory": data.get("laboratory"),
                    "department": data.get("department"),
                    "research_method": data.get("research_method"),
                    "protocol_id": protocol.id,
                    "laboratory_activity_date": data.get("laboratory_activity_date"),
                }
            else:
                return Response(
                    protocol_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                )

        calculation_serializer = CalculationSerializer(data=calculation_data)
        if calculation_serializer.is_valid():
            try:
                calculation = calculation_serializer.save()
                return Response(
                    calculation_serializer.data, status=status.HTTP_201_CREATED
                )
            except IntegrityError:
                if protocol_data:
                    # Если это был новый протокол, удаляем его
                    Protocol.objects.filter(id=calculation_data["protocol_id"]).delete()
                return Response(
                    {
                        "error": "Для данного протокола уже существует расчет по этому методу исследования"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return Response(
            calculation_serializer.errors, status=status.HTTP_400_BAD_REQUEST
        )

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([AllowAny])
def get_registration_numbers(request):
    """
    Получает список регистрационных номеров для указанного метода и лаборатории.
    """
    laboratory_id = request.GET.get("laboratory_id")
    department_id = request.GET.get("department_id")
    method_id = request.GET.get("method_id")
    registration_number = request.GET.get("registration_number")
    partial_number = request.GET.get("partial_number")

    if not laboratory_id:
        return Response({"error": "Необходимо указать laboratory_id"}, status=400)

    protocols = Protocol.objects.filter(
        calculations__laboratory_id=laboratory_id, is_deleted=False
    ).distinct()

    if department_id:
        protocols = protocols.filter(calculations__department_id=department_id)

    # Если это поиск для автодополнения
    if partial_number is not None:
        if method_id:
            protocols = protocols.filter(calculations__research_method_id=method_id)
        protocols = protocols.filter(registration_number__icontains=partial_number)
        registration_numbers = protocols.values_list(
            "registration_number", flat=True
        ).distinct()
        return Response(list(registration_numbers))

    # Если это запрос конкретных данных
    if registration_number and method_id:
        try:
            calculation = (
                Calculation.objects.filter(
                    research_method_id=method_id,
                    protocol__registration_number=registration_number,
                    laboratory_id=laboratory_id,
                    is_deleted=False,
                )
                .order_by("-created_at")
                .first()
            )

            if calculation:
                response_data = calculation.input_data.copy()
                response_data["laboratory_activity_date"] = (
                    calculation.laboratory_activity_date.isoformat()
                    if calculation.laboratory_activity_date
                    else None
                )
                return Response(response_data)
            return Response({})
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    return Response(
        {
            "error": "Для получения данных необходимо указать method_id и registration_number"
        },
        status=400,
    )
