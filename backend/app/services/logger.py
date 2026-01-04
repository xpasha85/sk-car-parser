from collections import deque
from datetime import datetime

class MemoryLogger:
    def __init__(self, max_len=100):
        # deque автоматически удаляет старые записи, когда переполняется
        self.logs = deque(maxlen=max_len)

    def info(self, message: str):
        self._add("INFO", message)

    def error(self, message: str):
        self._add("ERROR", message)

    def warning(self, message: str):
        self._add("WARNING", message)

    def _add(self, level: str, message: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        entry = f"[{timestamp}] [{level}] {message}"
        print(entry) # Дублируем в консоль сервера
        self.logs.append(entry)

    def get_recent_logs(self):
        return list(self.logs)

# Создаем глобальный экземпляр логгера
logger = MemoryLogger()