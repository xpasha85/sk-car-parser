from pydantic_settings import BaseSettings
from typing import List, Dict
import json

class Settings(BaseSettings):
    # Пароль для доступа к API
    ADMIN_PASSWORD: str
    
    # Токен Телеграм бота (получишь у @BotFather)
    BOT_TOKEN: str = ""
    
    # Список получателей. Будем хранить как JSON-строку в .env
    # Пример: '[{"id": 12345, "name": "Admin"}, {"id": -999, "name": "Group"}]'
    DESTINATIONS_JSON: str = '[]'

    @property
    def destinations(self) -> List[Dict]:
        """Превращает строку JSON из .env в нормальный список Python"""
        try:
            return json.loads(self.DESTINATIONS_JSON)
        except json.JSONDecodeError:
            return []

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore" # Игнорировать лишние переменные
    }

settings = Settings()