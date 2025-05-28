from decimal import Decimal, ROUND_HALF_UP
import logging

logger = logging.getLogger(__name__)


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
        decimal_mantissa = Decimal(mantissa[: significant_figures + 1]) / Decimal("10")
        mantissa = str(decimal_mantissa.quantize(Decimal("1"), rounding=ROUND_HALF_UP))

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


def _round_to_multiple(number, multiple):
    """
    Округляет число до ближайшего кратного заданному числу.
    """
    try:
        d = Decimal(str(float(number)))
        m = Decimal(str(float(multiple)))
        return Decimal(round(d / m) * m)
    except Exception as e:
        raise ValueError(f"Ошибка при округлении до кратного: {str(e)}")


def round_result(result, rounding_type, rounding_decimal):
    """
    Округляет результат по заданному типу и количеству знаков.
    """
    if rounding_type == "decimal":
        d = Decimal(str(float(result)))
        # Используем ROUND_HALF_UP для округления 0.5 вверх
        return d.quantize(Decimal("0.1") ** rounding_decimal, rounding=ROUND_HALF_UP)
    else:  # significant
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


def evaluate_formula(
    formula, variables, is_condition=False, range_calculation=None, rounding_params=None
):
    """
    Вычисляет результат формулы.

    Args:
        variables (dict): Словарь переменных и их значений
        is_condition (bool): Флаг, указывающий что это вычисление условия
        range_calculation (dict): Параметры диапазонного расчета
        rounding_params (dict): Параметры округления (тип и значение)
    """
    try:
        formula = _replace_subscript_digits(formula)
        formula = formula.replace("×", "*").replace("÷", "/")

        # Если есть диапазонный расчет, сразу его применяем
        if not is_condition and range_calculation and "ranges" in range_calculation:
            # Создаем словарь переменных для диапазонного расчета
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

            safe_dict = {
                "__builtins__": {},
                "abs": abs,
                "pow": pow,
                "round": round,
                "max": max,
                "min": min,
            }
            safe_dict.update(decimal_vars)

            # Проверяем каждый диапазон
            for range_item in range_calculation["ranges"]:
                # Сначала разбиваем условие на части по or
                or_conditions = range_item["condition"].split(" or ")
                any_or_condition_met = False

                for or_condition in or_conditions:
                    # Разбиваем каждое or-условие на and-условия
                    and_conditions = or_condition.strip().split(" and ")
                    all_and_conditions_met = True

                    for and_condition in and_conditions:
                        and_condition = and_condition.strip().strip(
                            "()"
                        )  # Убираем скобки
                        condition_result = evaluate_formula(
                            and_condition, variables, is_condition=True
                        )
                        if not condition_result:
                            all_and_conditions_met = False
                            break

                    if all_and_conditions_met:
                        any_or_condition_met = True
                        break

                if any_or_condition_met:
                    # Если условие выполняется, вычисляем формулу из диапазона
                    result = float(
                        eval(range_item["formula"], {"__builtins__": None}, safe_dict)
                    )
                    return Decimal(str(result))

            # Если ни одно условие не выполнилось, возвращаем 0
            return Decimal("0")

        # Проверяем, является ли формула простым числом
        try:
            return Decimal(str(float(formula)))
        except ValueError:
            pass

        # Создаем словарь переменных для обычного расчета
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

        safe_dict = {
            "__builtins__": {},
            "abs": abs,
            "pow": pow,
            "round": round,
            "max": max,
            "min": min,
        }
        safe_dict.update(decimal_vars)

        if is_condition:
            # Проверяем наличие OR в условии
            if " or " in formula:
                or_conditions = formula.split(" or ")
                for or_condition in or_conditions:
                    # Для каждого OR условия проверяем AND условия
                    and_conditions = or_condition.strip().split(" and ")
                    all_and_conditions_met = True

                    for and_condition in and_conditions:
                        and_condition = and_condition.strip().strip("()")
                        condition_result = evaluate_formula(
                            and_condition, variables, is_condition=True
                        )
                        if not condition_result:
                            all_and_conditions_met = False
                            break

                    if all_and_conditions_met:
                        return True
                return False
            # Проверяем наличие AND в условии
            elif " and " in formula:
                and_conditions = formula.split(" and ")
                for and_condition in and_conditions:
                    and_condition = and_condition.strip().strip("()")
                    condition_result = evaluate_formula(
                        and_condition, variables, is_condition=True
                    )
                    if not condition_result:
                        return False
                return True
            else:
                # Для условий разбиваем формулу на части
                for operator in ["<=", ">=", ">", "<", "="]:
                    if operator in formula:
                        left, right = formula.split(operator)
                        # Вычисляем левую и правую части
                        left_result = float(
                            eval(left, {"__builtins__": None}, safe_dict)
                        )
                        right_result = float(
                            eval(right, {"__builtins__": None}, safe_dict)
                        )

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
            result = float(eval(formula, {"__builtins__": None}, safe_dict))
            result = Decimal(str(result))

            # Применяем округление, если заданы параметры
            if rounding_params:
                if rounding_params.get("use_multiple_rounding"):
                    if rounding_params.get("rounding_type") == "multiple":
                        multiple = float(rounding_params.get("multiple_value", "1"))
                        result = _round_to_multiple(result, multiple)
                    else:
                        result = round_result(
                            result,
                            rounding_params.get("rounding_type"),
                            rounding_params.get("rounding_decimal"),
                        )

            return result

    except Exception as e:
        raise ValueError(f"Ошибка при вычислении формулы '{formula}': {str(e)}")


def calculate_convergence_steps(formula, variables):
    """
    Вычисляет шаги расчета повторяемости.
    """
    try:
        # Заменяем переменные на их значения
        step1 = formula
        for name, value in variables.items():
            if isinstance(value, str):
                value = value.strip().replace(",", ".")
            step1 = step1.replace(name, str(value))

        safe_dict = {
            "abs": abs,
            "pow": pow,
            "round": round,
            "max": max,
            "min": min,
        }

        # Обрабатываем сложные условия
        if " or " in formula:
            or_conditions = step1.split(" or ")
            steps = []
            for or_condition in or_conditions:
                if " and " in or_condition:
                    and_conditions = or_condition.strip().split(" and ")
                    and_steps = []
                    for and_condition in and_conditions:
                        and_condition = and_condition.strip().strip("()")
                        step = _calculate_single_condition(and_condition, safe_dict)
                        if step:
                            and_steps.append(step)
                    if and_steps:
                        steps.append({"type": "and", "conditions": and_steps})
                else:
                    step = _calculate_single_condition(
                        or_condition.strip().strip("()"), safe_dict
                    )
                    if step:
                        steps.append({"type": "single", "condition": step})
            return {"type": "or", "steps": steps}
        elif " and " in formula:
            and_conditions = step1.split(" and ")
            steps = []
            for and_condition in and_conditions:
                step = _calculate_single_condition(
                    and_condition.strip().strip("()"), safe_dict
                )
                if step:
                    steps.append(step)
            return {"type": "and", "steps": steps}
        else:
            # Обрабатываем простое условие
            step = _calculate_single_condition(step1, safe_dict)
            if step:
                return {"type": "single", "step": step}

        return None
    except Exception as e:
        logger.error(f"Ошибка при вычислении шагов повторяемости: {str(e)}")
        return None


def _calculate_single_condition(condition, safe_dict):
    """
    Вычисляет шаги для одиночного условия.
    """
    for operator in ["<=", ">=", ">", "<", "="]:
        if operator in condition:
            left, right = condition.split(operator)
            try:
                left_result = float(eval(left, {"__builtins__": {}}, safe_dict))
                right_result = float(eval(right, {"__builtins__": {}}, safe_dict))

                # Форматируем числа для красивого отображения
                left_str = f"{left_result:g}".replace(".", ",")
                right_str = f"{right_result:g}".replace(".", ",")

                return {
                    "original": condition.replace("*", "×").replace("/", "÷"),
                    "evaluated": f"{left_str}{operator}{right_str}",
                }
            except Exception as e:
                logger.error(f"Ошибка при вычислении условия {condition}: {str(e)}")
                return None
    return None
