import os
import shutil
from pathlib import Path
import datetime

def copy_project_to_txt():
    # Получаем путь к папке загрузок
    downloads_path = str(Path.home() / "Downloads")
    
    # Текущая директория проекта
    source_dir = os.getcwd()
    
    # Создаем имя новой папки с текущей датой
    current_date = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    project_name = os.path.basename(source_dir)
    target_dir = os.path.join(downloads_path, f"{project_name}_backup_{current_date}")
    
    # Создаем новую директорию
    os.makedirs(target_dir, exist_ok=True)
    
    # Игнорируемые директории и файлы
    ignore_dirs = {'.git', 'node_modules', 'venv', '__pycache__', '.pytest_cache'}
    ignore_extensions = {'.pyc', '.pyo', '.pyd', '.so', '.dll', '.exe'}
    
    # Список для хранения игнорируемых файлов
    ignored_files = []
    
    def should_ignore(path):
        parts = path.split(os.sep)
        is_ignored = any(part in ignore_dirs for part in parts) or \
                    any(path.endswith(ext) for ext in ignore_extensions)
        if is_ignored:
            ignored_files.append(path)
        return is_ignored
    
    def process_file(src_path, dst_path):
        # Создаем все родительские директории
        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        
        try:
            # Пробуем открыть файл как текстовый
            with open(src_path, 'r', encoding='utf-8') as src:
                content = src.read()
                # Добавляем .txt к имени файла
                txt_path = f"{dst_path}.txt"
                with open(txt_path, 'w', encoding='utf-8') as dst:
                    dst.write(content)
        except (UnicodeDecodeError, IOError):
            # Если файл бинарный, копируем его как есть
            txt_path = f"{dst_path}.binary.txt"
            with open(txt_path, 'w', encoding='utf-8') as dst:
                dst.write(f"[Binary file] Original path: {src_path}")
    
    # Копируем файлы
    for root, dirs, files in os.walk(source_dir):
        # Фильтруем игнорируемые директории
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        for file in files:
            src_path = os.path.join(root, file)
            if should_ignore(src_path):
                continue
                
            # Создаем относительный путь
            rel_path = os.path.relpath(src_path, source_dir)
            dst_path = os.path.join(target_dir, rel_path)
            
            process_file(src_path, dst_path)
    
    print(f"Проект успешно скопирован в: {target_dir}")
    
    # Выводим список проигнорированных файлов
    if ignored_files:
        print("\nСписок проигнорированных файлов:")
        for file in ignored_files:
            print(f"- {file}")
    
    return target_dir

if __name__ == "__main__":
    result_path = copy_project_to_txt() 