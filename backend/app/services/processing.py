import asyncio
from io import BytesIO
from typing import List, Optional
import httpx
from PIL import Image
from aiogram import Bot
from aiogram.types import InputMediaPhoto, BufferedInputFile, Message
from aiogram.exceptions import TelegramRetryAfter, TelegramNetworkError
from aiogram.client.session.aiohttp import AiohttpSession  # <--- ВАЖНЫЙ ИМПОРТ

from ..config import settings
from ..models import CarRequestItem
from .parser import fetch_car_photos
from .logger import logger
from ..database import save_message_ids

async def process_batch(
    items: List[CarRequestItem], 
    target_chat_id: int, 
    message_thread_id: Optional[int], 
    batch_id: str,
    destination_name: str
):
    """
    Основная функция обработки с увеличенным таймаутом.
    """
    logger.info(f"🚀 Started batch {batch_id} to '{destination_name}'")
    
    # --- ИСПРАВЛЕНИЕ ТАЙМАУТА ---
    # Создаем сессию с таймаутом 120 секунд (2 минуты)
    # Это решит проблему "Request timeout error" при отправке 10 фото
    session = AiohttpSession(timeout=120)
    bot = Bot(token=settings.BOT_TOKEN, session=session)
    # ----------------------------
    
    async with httpx.AsyncClient(timeout=15.0) as http_client:
        for index, item in enumerate(items, 1):
            try:
                car_id = item.id
                car_caption = item.caption

                logger.info(f"Processing car {index}/{len(items)} (ID: {car_id})...")
                
                # 1. Ссылки
                photo_urls = await fetch_car_photos(car_id)
                if not photo_urls:
                    logger.warning(f"⚠️ No photos found for car {car_id}")
                    continue
                
                logger.info(f"   📸 Found {len(photo_urls)} photos. Selecting top 10...")
                target_urls = photo_urls[:10]
                
                # 2. Скачивание
                logger.info(f"   ⬇️ Downloading and resizing...")
                tasks = [download_and_resize(http_client, url) for url in target_urls]
                processed_images = await asyncio.gather(*tasks)
                valid_images = [img for img in processed_images if img is not None]
                
                if not valid_images:
                    logger.warning(f"❌ Failed to process images for {car_id}")
                    continue

                logger.info(f"   ✅ Prepared {len(valid_images)} images.")

                # 3. Альбом
                media_group = []
                for i, img_bytes in enumerate(valid_images):
                    input_file = BufferedInputFile(img_bytes, filename=f"car_{car_id}_{i}.jpg")
                    caption_text = car_caption if i == 0 else None
                    media_group.append(InputMediaPhoto(media=input_file, caption=caption_text))

                # 4. Отправка
                logger.info(f"   📤 Sending album to '{destination_name}'...")
                sent_messages = await send_with_retry(
                    bot, 
                    target_chat_id, 
                    media_group, 
                    message_thread_id
                )
                
                # 5. Сохранение
                if sent_messages:
                    msg_ids = [m.message_id for m in sent_messages]
                    await save_message_ids(batch_id, target_chat_id, msg_ids, destination_name)

                logger.info(f"🎉 Car {car_id} DONE.")
                # Пауза, чтобы не забивать канал
                await asyncio.sleep(2)

            except Exception as e:
                logger.error(f"CRITICAL ERROR on car {item.id}: {e}")
                import traceback
                traceback.print_exc()
                
    await bot.session.close()
    logger.info("🏁 Batch processing finished.")


async def download_and_resize(client: httpx.AsyncClient, url: str) -> bytes | None:
    try:
        resp = await client.get(url)
        if resp.status_code != 200: return None
        
        img_buffer = BytesIO(resp.content)
        with Image.open(img_buffer) as img:
            img = img.convert("RGB")
            img.thumbnail((1600, 1600))
            output = BytesIO()
            img.save(output, format="JPEG", quality=85, optimize=True)
            return output.getvalue()
    except Exception:
        return None

async def send_with_retry(
    bot: Bot, 
    chat_id: int, 
    media: List[InputMediaPhoto], 
    message_thread_id: Optional[int]
) -> List[Message]:
    max_retries = 3
    for attempt in range(max_retries):
        try:
            msgs = await bot.send_media_group(
                chat_id=chat_id, 
                media=media, 
                message_thread_id=message_thread_id,
                request_timeout=120 # Дублируем таймаут для надежности
            )
            return msgs
        except TelegramRetryAfter as e:
            wait_time = e.retry_after
            logger.warning(f"Telegram Flood Limit! Sleeping for {wait_time}s...")
            await asyncio.sleep(wait_time)
        except TelegramNetworkError as e:
             # Ловим проблемы с сетью отдельно
            logger.warning(f"Network error (attempt {attempt+1}/{max_retries}): {e}. Retrying...")
            await asyncio.sleep(5)
        except Exception as e:
            logger.error(f"Telegram API Error: {e}")
            # Если это не последний раз, пробуем еще
            if attempt < max_retries - 1:
                logger.warning(f"Retrying... ({attempt+1})")
                await asyncio.sleep(3)
            else:
                raise e
    return []