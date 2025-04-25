import json
import requests
from time import sleep


BASE_URL = "http://127.0.0.1:8000/api/research-methods/"  # Заменить на реальный URL

headers = {
    'Content-Type': 'application/json',
}

# Ккаждый метод в отдельном файле
method_files = [
    # '01.json',
    # '02.json',
    # '03.json',
    # '04.json',
    # '05.json',
    # '06.json',
    # '07.json',
    # '08.json',
    '09.json',
    '10.json',
    '11.json',
    '12.json',
    '13.json',
    '14.json',
    '15.json',
    '16.json'
]

def post_method(json_data):
    try:
        response = requests.post(BASE_URL, headers=headers, json=json_data)
        response.raise_for_status()
        print(f"Успешно добавлен метод: {json_data['name']}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Ошибка при добавлении метода {json_data['name']}: {str(e)}")
        return False

def main():
    for file_name in method_files:
        try:
            with open(file_name, 'r', encoding='utf-8') as file:
                method_data = json.load(file)
                
            success = post_method(method_data)
            
            if success:
                sleep(1)  # Пауза 1 секунда между успешными запросами
            else:
                sleep(5)  # Пауза 5 секунд при ошибке
                
        except FileNotFoundError:
            print(f"Файл не найден: {file_name}")
        except json.JSONDecodeError:
            print(f"Ошибка при парсинге JSON в файле: {file_name}")

if __name__ == "__main__":
    main()