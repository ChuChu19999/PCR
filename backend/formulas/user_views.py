from django.db import connections
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import UserSerializer


def get_user_role(hach_snils):
    """
    Получение роли пользователя по его hsnils
    """
    with connections["access_control"].cursor() as cursor:
        cursor.execute(
            """
            SELECT r.name
            FROM access_control.users_roles_systems urs
            JOIN access_control.roles r ON urs.role_id = r.id
            WHERE urs.user_hash=%s
            AND urs.is_active=TRUE
            AND urs.system_id = 8
            LIMIT 1;
        """,
            [hach_snils],
        )
        row = cursor.fetchone()
        return row[0] if row else None


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def list(self, request, *args, **kwargs):
        decoded_token = getattr(request, "decoded_token", None)
        if decoded_token is None:
            return Response({"error": "Invalid token"}, status=401)

        hash_snils = decoded_token.get("hashSnils")
        if not hash_snils:
            return Response({"error": "Hashsnils not found in token"}, status=400)

        user_role = get_user_role(hash_snils)

        is_staff = user_role == "editor"

        if not user_role:
            return Response({"error": "Access denied"}, status=403)

        response_data = {
            "personnelNumber": decoded_token.get("personnelNumber"),
            "departmentNumber": decoded_token.get("departmentNumber"),
            "fullName": decoded_token.get("fullName"),
            "preferred_username": decoded_token.get("preferred_username"),
            "email": decoded_token.get("email"),
            "hashSnils": decoded_token.get("hashSnils"),
            "is_staff": is_staff,
        }
        serializer = self.get_serializer(data=response_data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)
