import jwt
import requests
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import CustomUser
import logging

logger = logging.getLogger(__name__)


class CustomJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logger.error("Authorization header is missing")
            return None

        try:
            token = auth_header.split(" ")[1]
        except IndexError:
            logger.error("Invalid token format")
            raise AuthenticationFailed("Invalid token format")

        public_key_url = "https://kc.gd-urengoy.gazprom.ru/realms/GDU"
        try:
            response = requests.get(
                public_key_url, verify="/usr/local/share/ca-certificates/root.crt"
            )
            if response.status_code != 200:
                logger.error("Failed to retrieve public key")
                raise AuthenticationFailed("Failed to retrieve public key")

            public_key = response.json().get("public_key")
            if not public_key:
                logger.error("Public key is missing")
                raise AuthenticationFailed("Public key is missing")

            logger.info(f"Public key: {public_key}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            raise AuthenticationFailed("Request failed")

        try:
            decoded_token = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                options={"verify_signature": False},
            )
            logger.info(f"Decoded token: {decoded_token}")
            request.decoded_token = decoded_token
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid token: {e}")
            raise AuthenticationFailed("Invalid token")

        username = decoded_token.get("ad_login")
        if not username:
            logger.error("Username is missing in the token")
            raise AuthenticationFailed("Username is missing in the token")

        user, created = CustomUser.objects.get_or_create(username=username)
        return (user, None)
