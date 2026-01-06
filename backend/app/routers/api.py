import re # <--- Добавили для регулярок
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from aiogram import Bot
from typing import List

from ..config import settings
from ..models import CarItem, ProcessRequest
from ..services.parser import fetch_auction_list
from ..services.processing import process_batch
from ..services.logger import logger
from ..database import (
    get_messages_by_batch, 
    delete_batch_record, 
    get_all_batches, 
    get_all_messages,
    clear_database
)

router = APIRouter(prefix="/api")
security = HTTPBearer()

# --- ЛОГИКА НОРМАЛИЗАЦИИ ID ---
def extract_auction_id(raw_input: str) -> str:
    """
    Вытаскивает чистый ID аукциона из мусора или ссылок.
    Поддерживает форматы:
    1. 2500000375 (Чистый ID)
    2. .../ExptPaucDetail/2500000375/SR25... (Ссылка на деталь)
    3. ...?uscrPaucScheId=2500000375&... (Ссылка с параметрами)
    """
    # 1. Очищаем от пробелов
    clean_val = raw_input.strip()
    
    # 2. Если это просто число — возвращаем сразу
    if clean_val.isdigit():
        return clean_val
    
    # 3. Пробуем найти ID в пути ссылки (ExptPaucDetail/ID)
    # Ищет ExptPaucDetail/ + (группа цифр)
    detail_match = re.search(r"ExptPaucDetail\/(\d+)", clean_val)
    if detail_match:
        return detail_match.group(1)
        
    # 4. Пробуем найти ID в параметрах (uscrPaucScheId=ID)
    param_match = re.search(r"uscrPaucScheId=(\d+)", clean_val)
    if param_match:
        return param_match.group(1)
    
    # 5. Если ничего не нашли, возвращаем как есть (пусть парсер сам ругается)
    return clean_val
# ------------------------------

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    if token != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid Token")
    return token

class CleanupRequest(BaseModel):
    batch_id: str

@router.get("/check-auth")
async def check_auth(token: str = Depends(verify_token)):
    return {"status": "authorized"}

@router.get("/auction/preview", response_model=List[CarItem])
async def get_auction_preview(sche_id: str, token: str = Depends(verify_token)):
    # --- ПРИМЕНЯЕМ ФИЛЬТР ТУТ ---
    clean_id = extract_auction_id(sche_id)
    
    if clean_id != sche_id:
        logger.info(f"User input normalized: '{sche_id}' -> '{clean_id}'")
    else:
        logger.info(f"User requested preview for auction: {clean_id}")
    # ----------------------------

    items = await fetch_auction_list(clean_id)
    logger.info(f"Found {len(items)} items for auction {clean_id}")
    return items

@router.post("/process")
async def start_processing(
    request: ProcessRequest, 
    background_tasks: BackgroundTasks,
    token: str = Depends(verify_token)
):
    if not request.items:
        return {"status": "error", "message": "No cars selected"}
    
    background_tasks.add_task(
        process_batch, 
        request.items,
        request.target_chat_id,
        request.message_thread_id,
        request.batch_id,
        request.destination_name
    )
    return {"status": "ok", "message": "Processing started"}

@router.post("/cleanup")
async def cleanup_messages(req: CleanupRequest, token: str = Depends(verify_token)):
    messages = await get_messages_by_batch(req.batch_id)
    if not messages:
        return {"status": "error", "message": "Batch not found or already deleted"}
    
    bot = Bot(token=settings.BOT_TOKEN)
    deleted_count = 0
    try:
        for chat_id, msg_id in messages:
            try:
                await bot.delete_message(chat_id=chat_id, message_id=msg_id)
                deleted_count += 1
            except Exception:
                pass
        await delete_batch_record(req.batch_id)
    finally:
        await bot.session.close()
    return {"status": "ok", "deleted_count": deleted_count}

@router.post("/cleanup-all")
async def cleanup_all_messages(background_tasks: BackgroundTasks, token: str = Depends(verify_token)):
    background_tasks.add_task(background_cleanup_all)
    return {"status": "ok", "message": "Global cleanup started"}

async def background_cleanup_all():
    logger.warning("☢️ GLOBAL CLEANUP STARTED")
    try:
        messages = await get_all_messages()
        if not messages:
            logger.info("Nothing to delete.")
            return

        bot = Bot(token=settings.BOT_TOKEN)
        for chat_id, msg_id in messages:
            try:
                await bot.delete_message(chat_id=chat_id, message_id=msg_id)
                await asyncio.sleep(0.05)
            except Exception:
                pass
        await bot.session.close()
        
        await clear_database()
        logger.info("☢️ Global cleanup finished. Database cleared.")
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")

@router.get("/history")
async def get_history(token: str = Depends(verify_token)):
    return await get_all_batches()

@router.get("/destinations")
async def get_destinations(token: str = Depends(verify_token)):
    return settings.destinations

@router.get("/logs")
async def get_logs(token: str = Depends(verify_token)):
    return {"logs": logger.get_recent_logs()}