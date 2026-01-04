from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from app.routers import api
from app.database import init_db  # <--- Импорт функции

# <--- ВОТ ЭТОЙ ЧАСТИ СКОРЕЕ ВСЕГО НЕ ХВАТАЕТ ИЛИ ОНА НЕ ПОДКЛЮЧЕНА
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Этот код выполняется при старте сервера
    await init_db()
    yield

# Обрати внимание на параметр lifespan
app = FastAPI(title="SK Car Parser MVP", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {"status": "ok", "message": "SK Parser Backend is running!"}

app.include_router(api.router)