import asyncio
from io import BytesIO
from typing import List, Optional
import httpx
from PIL import Image
from aiogram import Bot
from aiogram.types import InputMediaPhoto, BufferedInputFile, Message
from aiogram.exceptions import TelegramRetryAfter

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
    destination_name: str # <--- Принимаем имя
):    

    logger.info(f"🚀 Started batch {batch_id} for {len(items)} cars.")
    
    bot = Bot(token=settings.BOT_TOKEN)
    
    async with httpx.AsyncClient(timeout=15.0) as http_client:
        for index, item in enumerate(items, 1):
            try:
                car_id = item.id
                car_caption = item.caption

                logger.info(f"Processing car {index}/{len(items)} (ID: {car_id})...")
                
                # 1. Получаем список ссылок
                photo_urls = await fetch_car_photos(car_id)
                
                if not photo_urls:
                    logger.warning(f"⚠️ No photos found for car {car_id} (Skipping)")
                    continue
                
                logger.info(f"   📸 Found {len(photo_urls)} photos. Selecting top 10...")
                target_urls = photo_urls[:10]
                
                # 2. Скачиваем
                logger.info(f"   ⬇️ Downloading and resizing {len(target_urls)} images...")
                tasks = [download_and_resize(http_client, url) for url in target_urls]
                processed_images = await asyncio.gather(*tasks)
                valid_images = [img for img in processed_images if img is not None]
                
                if not valid_images:
                    logger.warning(f"❌ Failed to process images for {car_id}")
                    continue

                logger.info(f"   ✅ Prepared {len(valid_images)} images. Packing album...")

                # 3. Формируем альбом
                media_group = []
                for i, img_bytes in enumerate(valid_images):
                    input_file = BufferedInputFile(img_bytes, filename=f"car_{car_id}_{i}.jpg")
                    
                    caption_text = None
                    if i == 0:
                        caption_text = car_caption
                    
                    media_group.append(InputMediaPhoto(media=input_file, caption=caption_text))

                # 4. Отправляем
                logger.info(f"   📤 Sending album to Telegram...")
                sent_messages = await send_with_retry(
                    bot, 
                    target_chat_id, 
                    media_group, 
                    message_thread_id
                )
                
                # 5. Сохраняем в БД
                if sent_messages:
                    msg_ids = [m.message_id for m in sent_messages]
                    await save_message_ids(batch_id, target_chat_id, msg_ids, destination_name)

                logger.info(f"🎉 Car {car_id} DONE.")
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
                message_thread_id=message_thread_id
            )
            return msgs
        except TelegramRetryAfter as e:
            wait_time = e.retry_after
            logger.warning(f"Telegram Flood Limit! Sleeping for {wait_time}s...")
            await asyncio.sleep(wait_time)
        except Exception as e:
            logger.error(f"Telegram API Error: {e}")
            raise e
    return []