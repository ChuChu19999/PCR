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


def calculate_convergence_steps(formula, variables):
    """
    Вычисляет шаги расчета сходимости.
    """
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
