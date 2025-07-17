from django.db import models, connection
from django.core.exceptions import ValidationError
from django.contrib.auth.models import AbstractUser
from django.utils import timezone, formats


class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    is_deleted = models.BooleanField(
        default=False, verbose_name="Удалено", db_index=True
    )
    deleted_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Дата удаления"
    )
    created_by = models.CharField(
        max_length=120, verbose_name="Создал", null=True, blank=True
    )
    updated_by = models.CharField(
        max_length=120, verbose_name="Изменил", null=True, blank=True
    )
    deleted_by = models.CharField(
        max_length=120, verbose_name="Удалил", null=True, blank=True
    )

    class Meta:
        abstract = True

    def mark_as_deleted(self, user=None):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        if user:
            self.deleted_by = (
                user.get("preferred_username")
                if isinstance(user, dict)
                else user.preferred_username
            )
        self.save()

    def save(self, *args, **kwargs):
        user = kwargs.pop("user", None)
        if user:
            if not self.pk:
                self.created_by = (
                    user.get("preferred_username")
                    if isinstance(user, dict)
                    else user.preferred_username
                )
            self.updated_by = (
                user.get("preferred_username")
                if isinstance(user, dict)
                else user.preferred_username
            )
        super().save(*args, **kwargs)


class CustomUser(AbstractUser):
    full_name = models.CharField(
        verbose_name="ФИО", max_length=120, null=True, blank=True
    )
    hsnils = models.CharField(
        verbose_name="HSNILS", max_length=32, null=True, blank=True
    )
    ad_login = models.CharField(
        verbose_name="AdLogin", max_length=120, null=True, blank=True
    )
    department_number = models.IntegerField(
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


class Laboratory(BaseModel):
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
    laboratory_location = models.CharField(
        max_length=255,
        verbose_name="Место осуществления лабораторной деятельности",
        help_text="Место осуществления лабораторной деятельности",
        null=True,
        blank=True,
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

    def mark_as_deleted(self, user=None):
        super().mark_as_deleted(user=user)
        self.departments.all().update(
            is_deleted=True,
            deleted_at=timezone.now(),
            deleted_by=user.preferred_username if user else None,
        )


class Department(BaseModel):
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
    laboratory_location = models.CharField(
        max_length=255,
        verbose_name="Место осуществления лабораторной деятельности",
        help_text="Место осуществления лабораторной деятельности",
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
        constraints = [
            models.UniqueConstraint(
                fields=["laboratory", "name"],
                condition=models.Q(is_deleted=False),
                name="unique_department_name_per_laboratory",
            )
        ]

    def __str__(self):
        return f"{self.laboratory.name} - {self.name}"

    def clean(self):
        if self.name:
            self.name = self.name.strip()

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class ResearchObject(BaseModel):
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

    class Meta:
        verbose_name = "Объект исследования"
        verbose_name_plural = "Объекты исследования"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["type"]),
            models.Index(fields=["laboratory"]),
            models.Index(fields=["department"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
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


class ResearchObjectMethod(BaseModel):
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
    sort_order = models.IntegerField(
        default=0,
        verbose_name="Порядок сортировки",
        help_text="Определяет порядок отображения метода в списке",
        db_index=True,
    )

    class Meta:
        verbose_name = "Связь объекта исследования с методом"
        verbose_name_plural = "Связи объектов исследования с методами"
        unique_together = ("research_object", "research_method")
        ordering = ("sort_order", "created_at")


def get_default_convergence_conditions():
    return {"formulas": [{"formula": "", "convergence_value": "satisfactory"}]}


class ResearchMethod(BaseModel):
    class RoundingType(models.TextChoices):
        DECIMAL = "decimal", "До десятичного знака"
        SIGNIFICANT = "significant", "До значащей цифры"

    class SampleType(models.TextChoices):
        ANY = "any", "Любой"
        OIL = "oil", "Нефть"
        CONDENSATE = "condensate", "Конденсат"

    name = models.CharField(
        max_length=255,
        verbose_name="Наименование",
        help_text="Наименование метода исследования",
        db_index=True,
    )
    sample_type = models.CharField(
        max_length=50,
        choices=SampleType.choices,
        default=SampleType.CONDENSATE,
        verbose_name="Тип пробы",
        help_text="Тип исследуемой пробы",
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
        verbose_name="Условия повторяемости",
        help_text="Формулы и значения для проверки условий повторяемости",
        default=get_default_convergence_conditions,
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
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.nd_code})"


class ResearchMethodGroup(BaseModel):
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
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
        ]

    def __str__(self):
        return self.name


class Sample(BaseModel):
    registration_number = models.CharField(
        max_length=50,
        verbose_name="Регистрационный номер",
        help_text="Регистрационный номер пробы",
    )
    test_object = models.CharField(
        max_length=255,
        verbose_name="Объект испытаний",
        help_text="Объект испытаний",
    )
    sampling_location_detail = models.CharField(
        max_length=255,
        verbose_name="Место отбора пробы",
        help_text="Место отбора пробы",
        null=True,
        blank=True,
    )
    sampling_date = models.DateField(
        verbose_name="Дата отбора пробы",
        help_text="Дата отбора пробы",
        null=True,
        blank=True,
    )
    receiving_date = models.DateField(
        verbose_name="Дата получения пробы",
        help_text="Дата получения пробы в лабораторию",
        null=True,
        blank=True,
    )
    protocol = models.ForeignKey(
        "Protocol",
        on_delete=models.CASCADE,
        related_name="samples",
        verbose_name="Протокол",
        help_text="Протокол, к которому привязана проба",
        null=True,
        blank=True,
    )
    laboratory = models.ForeignKey(
        Laboratory,
        on_delete=models.CASCADE,
        related_name="samples",
        verbose_name="Лаборатория",
        help_text="Лаборатория, к которой привязана проба",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="samples",
        verbose_name="Подразделение",
        help_text="Подразделение, к которому привязана проба",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Проба"
        verbose_name_plural = "Пробы"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["registration_number"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
            models.Index(fields=["laboratory"]),
            models.Index(fields=["department"]),
            models.Index(fields=["sampling_location_detail"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["registration_number", "laboratory", "department"],
                condition=models.Q(is_deleted=False),
                name="unique_sample_registration_number_per_lab_dept",
            ),
        ]

    def __str__(self):
        department_info = f" ({self.department.name})" if self.department else ""
        return f"Проба {self.registration_number} - {self.laboratory.name}{department_info}"

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


class Protocol(BaseModel):
    test_protocol_number = models.CharField(
        max_length=100,
        verbose_name="Номер протокола испытаний",
        help_text="Номер протокола испытаний",
        null=True,
        blank=True,
    )
    test_protocol_date = models.DateField(
        verbose_name="Дата протокола испытаний",
        help_text="Дата протокола испытаний",
        null=True,
        blank=True,
    )
    is_accredited = models.BooleanField(
        verbose_name="Аккредитован",
        help_text="Признак аккредитации протокола",
        default=False,
    )
    branch = models.CharField(
        max_length=20,
        verbose_name="Филиал",
        help_text="Филиал",
        null=True,
        blank=True,
    )
    phone = models.CharField(
        max_length=20,
        verbose_name="Телефон",
        help_text="Телефон",
        null=True,
        blank=True,
    )
    sampling_act_number = models.CharField(
        max_length=50,
        verbose_name="Номер акта отбора",
        help_text="Номер акта отбора пробы",
    )
    selection_conditions = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Условия отбора",
        help_text="JSON с условиями отбора и их значениями",
    )
    excel_template = models.ForeignKey(
        "ExcelTemplate",
        on_delete=models.SET_NULL,
        related_name="protocols",
        verbose_name="Шаблон протокола",
        help_text="Шаблон протокола для расчета",
        null=True,
        blank=True,
    )
    laboratory = models.ForeignKey(
        Laboratory,
        on_delete=models.CASCADE,
        related_name="protocols",
        verbose_name="Лаборатория",
        help_text="Лаборатория, к которой привязан протокол",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="protocols",
        verbose_name="Подразделение",
        help_text="Подразделение, к которому привязан протокол",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Протокол"
        verbose_name_plural = "Протоколы"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["test_protocol_number"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
            models.Index(fields=["laboratory"]),
            models.Index(fields=["department"]),
            models.Index(fields=["branch"]),
        ]

    def __str__(self):
        return f"Протокол {self.test_protocol_number}"


class Calculation(BaseModel):
    input_data = models.JSONField(
        verbose_name="Входные данные",
        help_text="Входные данные для расчета",
        default=dict,
    )
    equipment_data = models.JSONField(
        verbose_name="Данные об использованном оборудовании",
        help_text="Список ID приборов",
        default=list,
        null=True,
        blank=True,
    )
    result = models.CharField(
        max_length=255,
        verbose_name="Результат",
        help_text="Итоговый результат расчета (число или текстовое значение)",
    )
    executor = models.CharField(
        max_length=150,
        verbose_name="Исполнитель",
        help_text="ФИО исполнителя, производившего расчет",
        null=False,
        blank=False,
    )
    measurement_error = models.CharField(
        max_length=20,
        verbose_name="Погрешность измерения",
        help_text="Погрешность измерения результата в формате ±число",
        null=True,
        blank=True,
    )
    unit = models.CharField(
        max_length=20,
        verbose_name="Единица измерения",
        help_text="Единица измерения результата",
        null=True,
        blank=True,
    )
    laboratory_activity_date = models.DateField(
        verbose_name="Дата лабораторной деятельности",
        help_text="Дата проведения лабораторного исследования",
    )
    sample = models.ForeignKey(
        Sample,
        on_delete=models.CASCADE,
        related_name="calculations",
        verbose_name="Проба",
        help_text="Проба, для которой производится расчет",
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

    class Meta:
        verbose_name = "Расчет"
        verbose_name_plural = "Расчеты"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
            models.Index(fields=["laboratory"]),
            models.Index(fields=["department"]),
            models.Index(fields=["research_method"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["sample", "research_method"],
                condition=models.Q(is_deleted=False),
                name="unique_sample_method",
            )
        ]

    def __str__(self):
        department_info = f" ({self.department.name})" if self.department else ""
        return f"Расчет {self.id} - {self.research_method.name} - {self.laboratory.name}{department_info}"

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


class Equipment(BaseModel):
    class EquipmentType(models.TextChoices):
        MEASURING_INSTRUMENT = "measuring_instrument", "Средство измерения"
        TEST_EQUIPMENT = "test_equipment", "Испытательное оборудование"

    type = models.CharField(
        max_length=20,
        choices=EquipmentType.choices,
        verbose_name="Тип оборудования",
        help_text="Тип прибора или оборудования",
        db_index=True,
    )
    name = models.CharField(
        max_length=255,
        verbose_name="Наименование",
        help_text="Наименование прибора или оборудования",
        db_index=True,
    )
    serial_number = models.CharField(
        max_length=100,
        verbose_name="Заводской номер",
        help_text="Заводской номер прибора или оборудования",
    )
    verification_info = models.CharField(
        max_length=255,
        verbose_name="Сведения о результатах поверки",
        help_text="Сведения о результатах поверки",
    )
    verification_date = models.DateField(
        verbose_name="Дата поверки",
        help_text="Дата поверки",
    )
    verification_end_date = models.DateField(
        verbose_name="Дата окончания поверки",
        help_text="Дата окончания срока действия поверки",
    )
    laboratory = models.ForeignKey(
        Laboratory,
        on_delete=models.CASCADE,
        related_name="equipment",
        verbose_name="Лаборатория",
        help_text="Лаборатория, к которой привязан прибор",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="equipment",
        verbose_name="Подразделение",
        help_text="Подразделение, к которому привязан прибор",
        null=True,
        blank=True,
    )
    version = models.CharField(
        max_length=8,
        verbose_name="Версия",
        help_text="Версия прибора (например, v1)",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Активен",
        help_text="Указывает, является ли версия прибора активной",
        db_index=True,
    )

    class Meta:
        verbose_name = "Прибор"
        verbose_name_plural = "Приборы"
        ordering = ("name", "-version")
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
            models.Index(fields=["verification_end_date"]),
        ]

    def __str__(self):
        department_info = f" ({self.department.name})" if self.department else ""
        return f"{self.name} - {self.version} - {self.laboratory.name}{department_info}"

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

    @classmethod
    def get_next_version(cls, name):
        """
        Получает следующую версию для прибора с указанным именем.
        Например, если последняя версия v1, вернет v2.
        """
        latest = cls.objects.filter(name=name).order_by("-version").first()
        if not latest:
            return "v1"

        current_num = int(latest.version[1:])
        return f"v{current_num + 1}"

    def deactivate(self):
        """
        Деактивирует текущий прибор и возвращает следующую версию.
        """
        self.is_active = False
        self.save()
        return self.get_next_version(self.name)


class ExcelTemplate(BaseModel):
    name = models.CharField(
        max_length=100,
        verbose_name="Название шаблона",
        help_text="Введите название шаблона",
        db_index=True,
    )
    version = models.CharField(
        max_length=8,
        verbose_name="Версия",
        help_text="Версия шаблона (например, v1)",
    )
    file = models.BinaryField(
        verbose_name="xlsx файл",
        help_text="Файл шаблона в формате xlsx",
    )
    file_name = models.CharField(
        max_length=100,
        verbose_name="Имя файла",
        help_text="Оригинальное имя файла",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Активен",
        help_text="Указывает, является ли версия шаблона активной",
    )
    selection_conditions = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Условия отбора",
        help_text="JSON с условиями отбора и их единицами измерения",
    )
    accreditation_header_row = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Строка шапки аккредитации",
        help_text="Номер строки с шапкой аккредитации в шаблоне",
    )
    laboratory = models.ForeignKey(
        Laboratory,
        on_delete=models.CASCADE,
        related_name="excel_templates",
        verbose_name="Лаборатория",
        help_text="Лаборатория, к которой привязан шаблон",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="excel_templates",
        verbose_name="Подразделение",
        help_text="Подразделение, к которому привязан шаблон",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Шаблон Excel"
        verbose_name_plural = "Шаблоны Excel"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.version}"

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

    @classmethod
    def get_next_version(cls, name):
        """
        Получает следующую версию для шаблона с указанным именем.
        Например, если последняя версия v1, вернет v2.
        """
        latest = cls.objects.filter(name=name).order_by("-version").first()
        if not latest:
            return "v1"

        current_num = int(latest.version[1:])
        return f"v{current_num + 1}"

    def deactivate(self):
        """
        Деактивирует текущий шаблон и возвращает следующую версию.
        """
        self.is_active = False
        self.save()
        return self.get_next_version(self.name)
