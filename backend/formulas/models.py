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
        related_name="customuser_set",  # Уникальное имя для обратного доступа
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
            models.Index(fields=["is_deleted"]),
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

        if Laboratory.objects.filter(name=self.name).exclude(id=self.id).exists():
            raise ValidationError(
                {"name": "Лаборатория с таким названием уже существует"}
            )

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
        unique_together = (("laboratory", "name"),)
        indexes = [
            models.Index(fields=["laboratory", "name", "is_deleted"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
        ]

    def __str__(self):
        return f"{self.laboratory.name} - {self.name}"

    def clean(self):
        if self.name:
            self.name = self.name.strip()

        if (
            Department.objects.filter(laboratory=self.laboratory, name=self.name)
            .exclude(id=self.id)
            .exists()
        ):
            raise ValidationError(
                {
                    "name": "Подразделение с таким названием уже существует в данной лаборатории"
                }
            )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
