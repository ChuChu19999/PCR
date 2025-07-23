import os
import functools
import requests
from dotenv import load_dotenv
import logging
import urllib3

load_dotenv()

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HR_API_URL = os.getenv("HR_API_URL")
HR_API_KEY = os.getenv("HR_API_KEY")

logger = logging.getLogger(__name__)


@functools.lru_cache(maxsize=512)
def get_employee_name(hash_md5: str) -> str:
    """Возвращает ФИО сотрудника по hashMd5 через HR-API."""
    if not hash_md5:
        return ""

    logger.debug(f"Запрашиваем ФИО сотрудника по hash {hash_md5}")

    try:
        resp = requests.get(
            f"{HR_API_URL}/api/Employee/by-hash/{hash_md5}",
            headers={"X-API-KEY": HR_API_KEY},
            timeout=3,
            verify=False,
        )
        if resp.ok:
            full_name = resp.json().get("fullName", "")
            logger.info("Получено ФИО сотрудника: hash=%s → '%s'", hash_md5, full_name)
            return full_name
        else:
            logger.warning(
                "HR-API вернул статус %s для hash %s: %s",
                resp.status_code,
                hash_md5,
                resp.text,
            )
    except Exception as e:
        logger.exception("Ошибка запроса HR-API для hash %s: %s", hash_md5, e)

    return ""
