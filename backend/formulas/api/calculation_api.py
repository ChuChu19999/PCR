from django.db import IntegrityError
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from decimal import Decimal
import logging
from ..models import (
    ResearchObject,
    ResearchMethod,
    ResearchObjectMethod,
    Sample,
    Calculation,
)
from ..serializers import CalculationSerializer, SampleSerializer
from ..utils.formula_utils import (
    round_result,
    evaluate_formula,
    calculate_convergence_steps,
)

logger = logging.getLogger(__name__)


def round_value(
    value,
    rounding_type=None,
    rounding_decimal=None,
    threshold_table_values=None,
    variables=None,
):
    try:
        if value is None:
            return value

        # Преобразуем value в число, если оно передано как строка
        if isinstance(value, str):
            value = float(value.replace(",", "."))
        else:
            value = float(value)

        if rounding_type == "threshold_table":
            logger.info(f"Начало табличного округления. Входные параметры:")
            logger.info(f"value: {value}")
            logger.info(f"threshold_table_values: {threshold_table_values}")
            logger.info(f"variables: {variables}")

            if (
                not threshold_table_values
                or not isinstance(threshold_table_values, dict)
                or not variables
            ):
                logger.error(
                    "Отсутствуют необходимые параметры для табличного округления"
                )
                return value

            target_variable = threshold_table_values.get("target_variable")
            higher_variable = threshold_table_values.get("higher_variable")
            lower_variable = threshold_table_values.get("lower_variable")
            formula = threshold_table_values.get("formula")

            logger.info(f"Полученные переменные:")
            logger.info(f"target_variable: {target_variable}")
            logger.info(f"higher_variable: {higher_variable}")
            logger.info(f"lower_variable: {lower_variable}")
            logger.info(f"formula: {formula}")

            if not all([target_variable, higher_variable, lower_variable, formula]):
                logger.error("Не все необходимые переменные определены")
                return value

            # Получаем значения из variables
            try:
                target_value = float(
                    str(variables.get(target_variable, "0")).replace(",", ".")
                )
                formula_value = float(
                    str(variables.get(formula, "0")).replace(",", ".")
                )
                higher_value = float(
                    str(variables.get(higher_variable, "0")).replace(",", ".")
                )
                lower_value = float(
                    str(variables.get(lower_variable, "0")).replace(",", ".")
                )

                logger.info(f"Значения для сравнения:")
                logger.info(f"{target_variable}: {target_value}")
                logger.info(f"{formula}: {formula_value}")
                logger.info(f"{higher_variable}: {higher_value}")
                logger.info(f"{lower_variable}: {lower_value}")

            except (ValueError, TypeError) as e:
                logger.error(f"Ошибка преобразования значений: {str(e)}")
                logger.error(f"target={variables.get(target_variable)}")
                logger.error(f"formula={variables.get(formula)}")
                logger.error(f"higher={variables.get(higher_variable)}")
                logger.error(f"lower={variables.get(lower_variable)}")
                return value

            # Сравнение и выбор значения
            if formula_value < target_value:
                logger.info(
                    f"formula_value ({formula_value}) < target_value ({target_value})"
                )
                logger.info(f"Выбрано верхнее значение: {higher_value}")
                return higher_value
            else:
                logger.info(
                    f"formula_value ({formula_value}) >= target_value ({target_value})"
                )
                logger.info(f"Выбрано нижнее значение: {lower_value}")
                return lower_value

        elif rounding_type == "multiple":
            if not rounding_decimal:
                return value
            return round(value / rounding_decimal) * rounding_decimal

        elif rounding_type == "decimal":
            if rounding_decimal is None:
                return value
            return round(value, rounding_decimal)

        return value

    except (ValueError, TypeError) as e:
        logger.error(f"Ошибка в round_value: {str(e)}")
        return value


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

        # Заменяем пустые значения на '0'
        processed_input_data = {}
        for key, value in input_data.items():
            if value is None or value.strip() == "":
                processed_input_data[key] = "0"
                logger.info(f"Пустое значение в поле {key} заменено на '0'")
            else:
                processed_input_data[key] = value

        input_data = processed_input_data

        # Проверяем тип округления
        if research_method["rounding_type"] not in ["decimal", "significant"]:
            logger.error(f"Неверный тип округления: {research_method['rounding_type']}")
            return Response(
                {"error": "Неверный тип округления"},
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

                # Если используется метод ближайших табличных значений
                if field.get("use_threshold_table"):
                    # Находим поле с формулой для target_variable
                    target_field = next(
                        (
                            f
                            for f in research_method["intermediate_data"]["fields"]
                            if f["name"]
                            == field["threshold_table_values"]["target_variable"]
                        ),
                        None,
                    )

                    if target_field:
                        formula = target_field["formula"]
                    else:
                        formula = field["formula"]

                    intermediate_value = round_value(
                        value=0,
                        rounding_type="threshold_table",
                        threshold_table_values={
                            "target_variable": field["threshold_table_values"][
                                "target_variable"
                            ],
                            "higher_variable": field["threshold_table_values"][
                                "higher_variable"
                            ],
                            "lower_variable": field["threshold_table_values"][
                                "lower_variable"
                            ],
                            "formula": formula,
                        },
                        variables=variables,
                    )
                else:
                    # Подготавливаем параметры округления
                    rounding_params = None
                    if field.get("use_multiple_rounding"):
                        rounding_params = {
                            "use_multiple_rounding": True,
                            "rounding_type": field.get("rounding_type"),
                            "rounding_decimal": field.get("rounding_decimal"),
                            "multiple_value": field.get("multiple_value"),
                        }

                    # Проверяем наличие диапазонного расчета
                    range_calculation = field.get("range_calculation")

                    intermediate_value = evaluate_formula(
                        field["formula"],
                        variables,
                        range_calculation=range_calculation,
                        rounding_params=rounding_params,
                    )

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

        logger.info("Начало проверки условий повторяемости")
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
                logger.error(f"Ошибка при проверке условия повторяемости: {str(e)}")
                return Response(
                    {"error": f"Ошибка при проверке условия повторяемости: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        logger.info(f"Все выполненные условия: {satisfied_conditions}")

        # Проверяем условия в порядке приоритета
        convergence_result = "satisfactory"
        custom_value = None

        # Проверяем наличие кастомного значения
        for condition in research_method["convergence_conditions"]["formulas"]:
            if condition["convergence_value"] == "custom" and condition.get(
                "custom_value"
            ):
                try:
                    condition_result = evaluate_formula(
                        condition["formula"], variables, is_condition=True
                    )
                    if condition_result:
                        convergence_result = "custom"
                        custom_value = condition["custom_value"]
                        break
                except Exception as e:
                    logger.error(f"Ошибка при проверке кастомного условия: {str(e)}")
                    continue

        # Если кастомное условие не сработало, проверяем остальные условия
        if convergence_result != "custom":
            if "absence" in satisfied_conditions:
                convergence_result = "absence"
            elif "traces" in satisfied_conditions:
                convergence_result = "traces"
            elif "unsatisfactory" in satisfied_conditions:
                convergence_result = "unsatisfactory"

        # Сохраняем информацию только о выбранном условии
        conditions_info = []
        for condition in research_method["convergence_conditions"]["formulas"]:
            if condition["convergence_value"] == convergence_result:
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
                    logger.error(f"Ошибка при проверке условия повторяемости: {str(e)}")
                    return Response(
                        {
                            "error": f"Ошибка при проверке условия повторяемости: {str(e)}"
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Если выбрано особое условие или кастомное значение, возвращаем его
        if convergence_result in ["absence", "traces", "unsatisfactory", "custom"]:
            logger.info(f"Найдено особое условие: {convergence_result}")

            return Response(
                {
                    "convergence": convergence_result,
                    "intermediate_results": intermediate_results,
                    "result": custom_value if convergence_result == "custom" else None,
                    "measurement_error": None,
                    "unit": research_method["unit"],
                    "conditions_info": conditions_info,
                },
                status=status.HTTP_200_OK,
            )

        # Если особых условий нет, считаем результат удовлетворительным
        logger.info("Условия повторяемости удовлетворительны, продолжаем расчет")

        # Если повторяемость удовлетворительная, вычисляем результат
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
                else:
                    logger.warning("Неподдерживаемый тип погрешности")
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
        user = getattr(request, "decoded_token", {})

        research_object_method = ResearchObjectMethod.objects.get(
            research_object=research_object, research_method=research_method
        )

        research_object_method.is_active = request.data.get("is_active", True)
        research_object_method.save(user=user)

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


@api_view(["PATCH"])
@permission_classes([AllowAny])
def update_methods_order(request, page_id):
    """
    Обновляет порядок сортировки методов исследования для указанной страницы.
    """
    logger.info(f"Начало обновления порядка методов для страницы {page_id}")
    try:
        research_object = ResearchObject.objects.get(id=page_id)
        methods_data = request.data.get("methods", [])
        user = getattr(request, "decoded_token", {})

        logger.info(f"Полученные данные о методах: {methods_data}")
        logger.info(f"Данные пользователя: {user}")

        # Проверяем, что все методы принадлежат этой странице
        method_ids = [item["id"] for item in methods_data]
        logger.info(f"ID методов для обновления: {method_ids}")

        existing_methods = ResearchObjectMethod.objects.filter(
            research_object=research_object, research_method_id__in=method_ids
        )
        logger.info(f"Найдено существующих методов: {existing_methods.count()}")

        if len(existing_methods) != len(method_ids):
            logger.error(
                f"Несоответствие количества методов: найдено {len(existing_methods)}, ожидалось {len(method_ids)}"
            )
            return Response(
                {
                    "error": "Некоторые методы не найдены или не принадлежат этой странице"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        for item in methods_data:
            try:
                method = ResearchObjectMethod.objects.get(
                    research_object=research_object, research_method_id=item["id"]
                )
                logger.info(
                    f"Обновление sort_order для метода {item['id']}: {item['sort_order']}"
                )
                method.sort_order = item["sort_order"]
                method.save(user={"preferred_username": user.get("preferred_username")})
            except Exception as method_error:
                logger.error(
                    f"Ошибка при сохранении метода {item['id']}: {str(method_error)}"
                )
                raise

        logger.info("Успешное обновление порядка методов")
        return Response({"status": "success"})

    except ResearchObject.DoesNotExist:
        logger.error(f"Страница исследований не найдена: {page_id}")
        return Response(
            {"error": "Страница исследований не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.error(
            f"Необработанная ошибка при обновлении порядка методов: {str(e)}",
            exc_info=True,
        )
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def save_calculation(request):
    """
    Сохраняет расчет.
    """
    try:
        data = request.data
        sample_data = None
        calculation_data = None

        logger.info(f"Получены данные для сохранения расчета: {data}")
        logger.info(f"Значение поля executor: {data.get('executor')}")
        logger.info(f"Данные об оборудовании: {data.get('equipment_data')}")

        if "sample_id" in data:
            existing_calculation = Calculation.objects.filter(
                sample_id=data["sample_id"],
                research_method_id=data.get("research_method"),
                is_deleted=False,
            ).first()

            if existing_calculation:
                return Response(
                    {
                        "error": "Для данной пробы уже существует расчет по этому методу исследования"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            calculation_data = {
                "input_data": data.get("input_data"),
                "equipment_data": data.get("equipment_data"),
                "result": data.get("result"),
                "measurement_error": data.get("measurement_error"),
                "unit": data.get("unit"),
                "laboratory": data.get("laboratory"),
                "department": data.get("department"),
                "research_method_id": data.get("research_method"),
                "sample_id": data["sample_id"],
                "laboratory_activity_date": data.get("laboratory_activity_date"),
                "executor": data.get("executor"),
            }

            logger.info(
                f"Подготовленные данные для создания расчета: {calculation_data}"
            )
        else:
            # Создаем новую пробу
            sample_data = {
                "registration_number": data.get("registration_number"),
                "test_object": data.get("test_object"),
                "laboratory": data.get("laboratory"),
                "department": data.get("department"),
            }

            sample_serializer = SampleSerializer(data=sample_data)
            if sample_serializer.is_valid():
                sample = sample_serializer.save()
                existing_calculation = Calculation.objects.filter(
                    sample_id=sample.id,
                    research_method_id=data.get("research_method"),
                    is_deleted=False,
                ).first()

                if existing_calculation:
                    # Удаляем созданную пробу, так как расчет не может быть создан
                    sample.delete()
                    return Response(
                        {
                            "error": "Для данной пробы уже существует расчет по этому методу исследования"
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                calculation_data = {
                    "input_data": data.get("input_data"),
                    "equipment_data": data.get("equipment_data"),
                    "result": data.get("result"),
                    "measurement_error": data.get("measurement_error"),
                    "unit": data.get("unit"),
                    "laboratory": data.get("laboratory"),
                    "department": data.get("department"),
                    "research_method_id": data.get("research_method"),
                    "sample_id": sample.id,
                    "laboratory_activity_date": data.get("laboratory_activity_date"),
                    "executor": data.get("executor"),
                }
            else:
                return Response(
                    sample_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                )

        calculation_serializer = CalculationSerializer(data=calculation_data)
        logger.info(f"Данные для сериализатора: {calculation_data}")
        if calculation_serializer.is_valid():
            try:
                calculation = calculation_serializer.save()
                return Response(
                    calculation_serializer.data, status=status.HTTP_201_CREATED
                )
            except IntegrityError:
                if sample_data:
                    # Если это был новый протокол, удаляем его
                    Sample.objects.filter(id=calculation_data["sample_id"]).delete()
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
    Получает список регистрационных номеров проб для указанной лаборатории и подразделения.
    """
    try:
        laboratory_id = request.query_params.get("laboratory")
        department_id = request.query_params.get("department")
        search = request.query_params.get("search", "")

        if not laboratory_id:
            return Response(
                {"error": "Не указан ID лаборатории"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = Sample.objects.filter(
            laboratory_id=laboratory_id,
            is_deleted=False,
        )

        if department_id:
            queryset = queryset.filter(department_id=department_id)

        if search:
            queryset = queryset.filter(registration_number__icontains=search)

        samples = queryset.values("id", "registration_number", "test_object").order_by(
            "-created_at"
        )[:10]

        return Response(samples)

    except Exception as e:
        logger.error(f"Ошибка при получении регистрационных номеров: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
