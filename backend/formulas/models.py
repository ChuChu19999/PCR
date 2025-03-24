from django.db import models, connection
from django.core.exceptions import ValidationError
from django.contrib.auth.models import AbstractUser
from django.utils import timezone, formats


class CustomUser(AbstractUser):
    fullName = models.CharField(
        verbose_name="ФИО", max_length=120, null=True, blank=True
    )
    hashSnils = models.CharField(
        verbose_name="HSNILS", max_length=32, null=True, blank=True
    )
    preferred_username = models.CharField(
        verbose_name="AdLogin", max_length=120, null=True, blank=True
    )
    departmentNumber = models.IntegerField(
        verbose_name="Организационная единица", null=True, blank=True
    )

    groups = models.ManyToManyField(
        "auth.Group",
        related_name="customuser_set",
        blank=True,
        help_text="Группы, к которым принадлежит этот пользователь. Пользователь получит все разрешения, "
        "предоставленные каждой из их групп.",
        verbose_name="Группы",
    )

    def __str__(self):
        return self.username


class Laboratory(models.Model):
    name = models.CharField(
        max_length=100,
        verbose_name="Аббревиатура",
        help_text="Краткое название лаборатории (аббревиатура)",
        db_index=True,
    )
    full_name = models.CharField(
        max_length=255,
        verbose_name="Полное название",
        help_text="Полное название лаборатории",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    is_deleted = models.BooleanField(default=False, verbose_name="Удалено")
    deleted_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Дата удаления"
    )

    class Meta:
        verbose_name = "Лаборатория"
        verbose_name_plural = "Лаборатории"
        ordering = ("name",)
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.full_name}"

    def clean(self):
        if self.name:
            self.name = self.name.strip()
        if self.full_name:
            self.full_name = self.full_name.strip()

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def mark_as_deleted(self):
        now = timezone.now()
        self.is_deleted = True
        self.deleted_at = now
        self.departments.all().update(is_deleted=True, deleted_at=now)
        self.save()


class Department(models.Model):
    laboratory = models.ForeignKey(
        Laboratory,
        on_delete=models.CASCADE,
        related_name="departments",
        verbose_name="Лаборатория",
        help_text="Лаборатория, к которой относится подразделение",
        db_index=True,
    )
    name = models.CharField(
        max_length=100,
        verbose_name="Название",
        help_text="Название подразделения",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    is_deleted = models.BooleanField(default=False, verbose_name="Удалено")
    deleted_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Дата удаления"
    )

    class Meta:
        verbose_name = "Подразделение"
        verbose_name_plural = "Подразделения"
        ordering = ("laboratory", "name")
        indexes = [
            models.Index(fields=["laboratory", "name"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
        ]

    def __str__(self):
        return f"{self.laboratory.name} - {self.name}"

    def clean(self):
        if self.name:
            self.name = self.name.strip()

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class ResearchObject(models.Model):
    class ObjectType(models.TextChoices):
        OIL_PRODUCTS = "oil_products", "Нефтепродукты"
        CONDENSATE = "condensate", "Конденсат"

    type = models.CharField(
        max_length=20,
        choices=ObjectType.choices,
        verbose_name="Тип объекта исследования",
        help_text="Выберите тип объекта исследования",
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    laboratory = models.ForeignKey(
        Laboratory,
        on_delete=models.CASCADE,
        related_name="research_objects",
        verbose_name="Лаборатория",
        help_text="Лаборатория, проводящая исследование",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="research_objects",
        verbose_name="Подразделение",
        help_text="Подразделение, проводящее исследование",
        null=True,
        blank=True,
    )
    research_methods = models.ManyToManyField(
        "ResearchMethod",
        related_name="research_objects",
        verbose_name="Методы исследования",
        help_text="Методы исследования, привязанные к объекту",
        through="ResearchObjectMethod",
    )
    is_deleted = models.BooleanField(default=False, verbose_name="Удалено")
    deleted_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Дата удаления"
    )

    class Meta:
        verbose_name = "Объект исследования"
        verbose_name_plural = "Объекты исследования"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["type"]),
            models.Index(fields=["laboratory"]),
            models.Index(fields=["department"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        department_name = f" - {self.department.name}" if self.department else ""
        return f"{self.get_type_display()} - {self.laboratory.name}{department_name}"

    def clean(self):
        if self.department and self.department.laboratory != self.laboratory:
            raise ValidationError(
                {
                    "department": "Подразделение должно принадлежать выбранной лаборатории"
                }
            )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def mark_as_deleted(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()


class ResearchObjectMethod(models.Model):
    research_object = models.ForeignKey(
        ResearchObject,
        on_delete=models.CASCADE,
        verbose_name="Объект исследования",
    )
    research_method = models.ForeignKey(
        "ResearchMethod",
        on_delete=models.CASCADE,
        verbose_name="Метод исследования",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Активен",
        help_text="Указывает, отображается ли метод на странице",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Дата обновления",
    )

    class Meta:
        verbose_name = "Связь объекта исследования с методом"
        verbose_name_plural = "Связи объектов исследования с методами"
        unique_together = ("research_object", "research_method")
        ordering = ("created_at",)


def get_default_convergence_conditions():
    return {"formulas": [{"formula": "", "convergence_value": "satisfactory"}]}


class ResearchMethod(models.Model):
    class RoundingType(models.TextChoices):
        DECIMAL = "decimal", "До десятичного знака"
        SIGNIFICANT = "significant", "До значащей цифры"
        RANGE = "range", "Диапазонная"

    name = models.CharField(
        max_length=255,
        verbose_name="Наименование",
        help_text="Наименование метода исследования",
        db_index=True,
    )
    formula = models.CharField(
        max_length=255,
        verbose_name="Формула",
        help_text="Формула для расчета",
    )
    measurement_error = models.JSONField(
        verbose_name="Погрешность измерения",
        help_text="Фиксированное значение, формула или условия для расчета погрешности",
        default=dict,
    )
    unit = models.CharField(
        max_length=20,
        verbose_name="Единица измерения",
        help_text="Единица измерения результата",
    )
    measurement_method = models.CharField(
        max_length=255,
        verbose_name="Метод измерения",
        help_text="Используемый метод измерения",
    )
    nd_code = models.CharField(
        max_length=255,
        verbose_name="Шифр НД",
        help_text="Шифр нормативной документации",
    )
    nd_name = models.CharField(
        max_length=255,
        verbose_name="Наименование НД",
        help_text="Наименование нормативной документации",
    )
    input_data = models.JSONField(
        verbose_name="Входные данные",
        help_text="Структура входных данных для расчета",
        default=dict,
    )
    intermediate_data = models.JSONField(
        verbose_name="Промежуточные данные",
        help_text="Структура промежуточных данных для расчета",
        default=dict,
    )
    convergence_conditions = models.JSONField(
        verbose_name="Условия сходимости",
        help_text="Формулы и значения для проверки условий сходимости",
        default=get_default_convergence_conditions,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Дата обновления",
    )
    is_deleted = models.BooleanField(
        default=False,
        verbose_name="Удалено",
        db_index=True,
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата удаления",
    )
    rounding_type = models.CharField(
        max_length=20,
        choices=RoundingType.choices,
        verbose_name="Тип округления",
        help_text="Способ округления результата",
        db_index=True,
    )
    rounding_decimal = models.IntegerField(
        verbose_name="Количество знаков округления",
        help_text="Количество десятичных знаков или значащих цифр для округления",
    )
    parallel_count = models.IntegerField(
        verbose_name="Количество параллелей",
        help_text="Количество параллельных расчетов (0 - один расчет)",
        default=0,
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Активен",
        help_text="Указывает, активен ли метод исследования",
        db_index=True,
    )
    is_group_member = models.BooleanField(
        default=False,
        verbose_name="Является частью группы",
        help_text="Указывает, входит ли метод в группу или является самостоятельным",
    )

    class Meta:
        verbose_name = "Метод исследования"
        verbose_name_plural = "Методы исследования"
        ordering = ("name",)
        indexes = [
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.nd_code})"

    def mark_as_deleted(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()


class ResearchMethodGroup(models.Model):
    name = models.CharField(
        max_length=255,
        verbose_name="Наименование группы",
        help_text="Наименование группы методов исследования",
        db_index=True,
    )
    methods = models.ManyToManyField(
        ResearchMethod,
        related_name="groups",
        verbose_name="Методы исследования",
        help_text="Методы исследования в группе",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Дата обновления",
    )
    is_deleted = models.BooleanField(
        default=False,
        verbose_name="Удалено",
        db_index=True,
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата удаления",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Активна",
        help_text="Указывает, активна ли группа",
        db_index=True,
    )

    class Meta:
        verbose_name = "Группа методов исследования"
        verbose_name_plural = "Группы методов исследования"
        ordering = ("name",)
        indexes = [
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return self.name

    def mark_as_deleted(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()


class Calculation(models.Model):
    class Convergence(models.TextChoices):
        SATISFACTORY = "satisfactory", "Удовлетворительно"
        UNSATISFACTORY = "unsatisfactory", "Неудовлетворительно"
        ABSENCE = "absence", "Отсутствие"
        TRACES = "traces", "Следы"

    input_data = models.JSONField(
        verbose_name="Входные данные",
        help_text="Входные данные для расчета",
        default=dict,
    )
    intermediate_calculations = models.JSONField(
        verbose_name="Промежуточные расчеты",
        help_text="Результаты промежуточных вычислений",
        default=dict,
    )
    result = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        verbose_name="Результат",
        help_text="Итоговый результат расчета",
    )
    convergence = models.CharField(
        max_length=20,
        choices=Convergence.choices,
        verbose_name="Сходимость",
        help_text="Оценка сходимости результата",
    )
    measurement_error = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        verbose_name="Погрешность измерения",
        help_text="Погрешность измерения результата",
    )
    research_object_type = models.ForeignKey(
        ResearchObject,
        on_delete=models.PROTECT,
        related_name="calculations",
        verbose_name="Тип объекта исследования",
        help_text="Тип объекта, для которого производится расчет",
    )
    laboratory = models.ForeignKey(
        Laboratory,
        on_delete=models.CASCADE,
        related_name="calculations",
        verbose_name="Лаборатория",
        help_text="Лаборатория, проводящая расчет",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="calculations",
        verbose_name="Подразделение",
        help_text="Подразделение, проводящее расчет",
        null=True,
        blank=True,
    )
    research_method = models.ForeignKey(
        ResearchMethod,
        on_delete=models.PROTECT,
        related_name="calculations",
        verbose_name="Метод исследования",
        help_text="Метод исследования, используемый для расчета",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    is_deleted = models.BooleanField(
        default=False,
        verbose_name="Удалено",
        db_index=True,
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата удаления",
    )

    class Meta:
        verbose_name = "Расчет"
        verbose_name_plural = "Расчеты"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["convergence"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["laboratory"]),
            models.Index(fields=["department"]),
            models.Index(fields=["research_object_type"]),
            models.Index(fields=["research_method"]),
        ]

    def __str__(self):
        department_info = f" ({self.department.name})" if self.department else ""
        return f"Расчет {self.id} - {self.research_object_type.get_type_display()} - {self.laboratory.name}{department_info}"

    def clean(self):
        if self.department and self.department.laboratory != self.laboratory:
            raise ValidationError(
                {
                    "department": "Подразделение должно принадлежать выбранной лаборатории"
                }
            )

    def _round_to_significant_figures(self, number, significant_figures):
        if number == 0:
            return 0

        from decimal import Decimal

        d = Decimal(str(float(number)))

        # Получаем строковое представление числа в экспоненциальной форм и убираем незначащие нули
        str_num = f"{d:E}"
        mantissa, exp = str_num.split("E")
        exp = int(exp)

        mantissa = mantissa.replace(".", "").rstrip("0")

        if len(mantissa) > significant_figures:
            mantissa = str(round(int(mantissa[: significant_figures + 1]) / 10))

        # Добавляем нули, если не хватает значащих цифр
        mantissa = mantissa.ljust(significant_figures, "0")

        # Восстанавливаем десятичную точку
        if exp >= 0:
            if exp + 1 >= len(mantissa):
                result = Decimal(mantissa + "0" * (exp + 1 - len(mantissa)))
            else:
                result = Decimal(mantissa[: exp + 1] + "." + mantissa[exp + 1 :])
        else:
            result = Decimal("0." + "0" * (-exp - 1) + mantissa)

        return result

    def _get_decimal_places(self, number):
        """
        Определяет количество знаков после запятой в числе.
        Сохраняет незначащие нули в конце.

        Например:
        12.345 -> 3
        12.100 -> 3
        0.120 -> 3
        12.0 -> 1
        """
        from decimal import Decimal

        str_num = str(Decimal(str(float(number))))

        # Если в числе нет десятичной точки, знаков после запятой нет
        if "." not in str_num:
            return 0

        # Возвращаем количество знаков после точки, включая незначащие нули
        return len(str_num.split(".")[1])

    def round_result(self):
        """
        Округляет результат и погрешность измерения согласно настройкам метода исследования.
        """
        if not self.result:
            return

        if self.research_method.rounding_type == ResearchMethod.RoundingType.DECIMAL:
            self.result = round(self.result, self.research_method.rounding_decimal)
        else:
            self.result = self._round_to_significant_figures(
                self.result, self.research_method.rounding_decimal
            )

        result_decimal_places = self._get_decimal_places(self.result)

        if self.measurement_error is not None:
            self.measurement_error = round(
                self.measurement_error, result_decimal_places
            )

    def save(self, *args, **kwargs):
        self.clean()
        self.round_result()
        super().save(*args, **kwargs)

    def mark_as_deleted(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()
