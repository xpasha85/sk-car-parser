# Используем легкий образ Python
FROM python:3.11-slim

# Отключаем создание .pyc файлов (мусор)
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Рабочая папка внутри контейнера
WORKDIR /app

# Сначала копируем зависимости (чтобы кэшировать этот шаг)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь код приложения
COPY . .

# Открываем порт 8000
EXPOSE 8000

# Запускаем сервер
# app.main:app означает: файл app/main.py, объект app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]