from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db.models import Count, Prefetch, Q
from ..models import Sample, Calculation
import json
from datetime import date


def format_date_ru(d):
    if not d:
        return ""
    if isinstance(d, str):
        try:
            d = date.fromisoformat(d)
        except Exception:
            return ""
    return d.strftime("%d.%m.%Y")


def get_object_suffix(test_object: str):
    if not test_object:
        return ""
    lo = test_object.lower()
    if "конденсат" in lo:
        return "дк"
    if "нефть" in lo:
        return "н"
    return ""


def format_protocol_number(number, date_obj, is_accredited, test_object):
    """Форматирование имени протокола"""
    if not number and not date_obj:
        return "-"

    if not is_accredited:
        return number or "-"

    formatted_date = format_date_ru(date_obj)

    suffix = get_object_suffix(test_object)

    if not number:
        return f"от {formatted_date}"

    if not date_obj:
        return number

    protocol_num = f"{number}/07/{suffix}" if suffix else f"{number}/07"
    return f"{protocol_num} от {formatted_date}"


@api_view(["GET"])
@permission_classes([AllowAny])
def get_reports(request):
    """Возвращает сводные данные по пробам, протоколам и расчетам."""

    laboratory_id = request.query_params.get("laboratory")
    department_id = request.query_params.get("department")

    if not laboratory_id:
        return Response({"detail": 'Parameter "laboratory" is required.'}, status=400)

    samples_qs = (
        Sample.objects.filter(is_deleted=False, laboratory_id=laboratory_id)
        .select_related("protocol", "department")
        .prefetch_related(
            Prefetch(
                "calculations",
                queryset=Calculation.objects.filter(is_deleted=False),
            )
        )
    )

    if department_id:
        samples_qs = samples_qs.filter(department_id=department_id)

    samples_qs = samples_qs.order_by("registration_number")

    report_rows = []
    for sample in samples_qs:
        calcs = sample.calculations.all()
        executors = list(
            {calc.executor for calc in calcs if calc.executor}
        )  # уникальные
        # Форматируем условия отбора
        raw_conditions = (
            sample.protocol.selection_conditions if sample.protocol else None
        )

        def format_conditions(raw):
            if not raw:
                return "-"

            if isinstance(raw, str):
                try:
                    data = json.loads(raw)
                except Exception:
                    data = {}
            else:
                data = raw

            result_lines = []
            for key, value in data.items():
                if value in (None, "", "null"):
                    continue

                alias = key
                unit = ""
                low = key.lower()
                if "давление" in low:
                    alias = "P"
                    unit = "МПа"
                elif "температура" in low:
                    alias = "T"
                    unit = "℃"
                elif key == "Расход":
                    unit = "т/час"

                if isinstance(value, (int, float)):
                    value_str = str(value).replace(".", ",")
                else:
                    try:
                        float(value)
                        value_str = str(value).replace(".", ",")
                    except Exception:
                        value_str = str(value)

                result_lines.append(f"{alias} = {value_str} {unit}".strip())

            return "\n".join(result_lines) if result_lines else "-"

        selection_conditions_str = format_conditions(raw_conditions)

        # Исполнители столбиком
        executors_str = "\n".join(executors) if executors else "-"

        formatted_protocol = "-"
        if sample.protocol:
            formatted_protocol = format_protocol_number(
                sample.protocol.test_protocol_number,
                sample.protocol.test_protocol_date,
                sample.protocol.is_accredited,
                sample.test_object,
            )

        report_rows.append(
            {
                "sample_id": sample.id,
                "registration_number": sample.registration_number,
                "sampling_location_detail": sample.sampling_location_detail,
                "sampling_date": sample.sampling_date,
                "receiving_date": sample.receiving_date,
                "selection_conditions": selection_conditions_str,
                "calculations_count": calcs.count(),
                "executors": executors_str,
                "protocol_number": formatted_protocol,
            }
        )
    return Response(report_rows)
