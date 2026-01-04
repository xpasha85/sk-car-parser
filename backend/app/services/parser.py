import httpx
from typing import List
from ..models import CarItem

# Базовые URL
BASE_API_URL = "https://export.skcarrental.com/skr/common/uscr-chnl-comm-bff/open/get/expt-pauc/car/list"
DETAIL_URL_TEMPLATE = "https://export.skcarrental.com/exptpauc/ExptPaucDetail/{sche_id}/{car_id}/1"
IMG_API_URL = "https://export.skcarrental.com/skr/common/uscr-chnl-comm-bff/open/get/expt-pauc/car-img"
BASE_IMG_HOST = "https://export.skcarrental.com/skr/common/comm-img-srvr"

# Headers обязательны
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://export.skcarrental.com/",
    "Origin": "https://export.skcarrental.com"
}

async def fetch_auction_list(sche_id: str) -> List[CarItem]:
    """
    Парсит список авто. Обрабатывает ошибки API (неверный ID).
    """
    clean_items = []
    limit = 100
    page_index = 0
    
    async with httpx.AsyncClient(timeout=30.0, headers=HEADERS) as client:
        while True:
            # Полный набор параметров
            params = {
                "langCd": "en",
                "uscrPaucScheId": sche_id,
                "srchInputText": "",
                "carGbnlist": "",
                "uscrMakrIdList": "",
                "minTrvlDist": "0",
                "maxTrvlDist": "9999999999",
                "minCarYtiw": "0",
                "maxCarYtiw": "9999",
                "sortOrdrCd": "A",
                "uscrAfcoId": "undefined",
                "chkBidYn": "",
                "irstCarYn": "N",
                "paucChnlCd": "X61501",
                "carNm": "",
                "limit": limit,
                "offset": page_index,
            }
            
            try:
                print(f"DEBUG: Requesting page {page_index} for {sche_id}...") 
                
                response = await client.get(BASE_API_URL, params=params)
                response.raise_for_status()
                data = response.json()
                
                # --- СТРОГАЯ ПРОВЕРКА ОТВЕТА ---
                res_code = data.get("result")
                api_code = data.get("code")
                body = data.get("body")
                msg = data.get("message")

                # Если хотя бы один параметр не ок — это ошибка
                if res_code != 0 or api_code != 0 or body is None:
                    if api_code == 20000:
                        print(f"⚠️ Auction ID {sche_id} not found or data is empty (Code 20000).")
                    else:
                        print(f"⚠️ API Error: Result={res_code}, Code={api_code}, Message='{msg}'")
                    
                    # Прерываем цикл, возвращаем то, что успели собрать (или пустоту)
                    break
                # -------------------------------
                
                total = body.get("total", 0)
                raw_list = body.get("list", [])
                
                print(f"DEBUG: Page {page_index} received {len(raw_list)} items. Total: {total}")

                if not raw_list:
                    break

                for item in raw_list:
                    c_id = item.get("uscrId")
                    if not c_id: continue

                    link = DETAIL_URL_TEMPLATE.format(sche_id=sche_id, car_id=c_id)
                    
                    car = CarItem(
                        uscrId=c_id,
                        uscrPaucScheId=item.get("uscrPaucScheId", sche_id),
                        paucXhbtNo=item.get("paucXhbtNo", "Unknown"),
                        carNo=item.get("carNo", ""),
                        carEnNm=item.get("carEnNm") or item.get("carNm", "No Name"),
                        carYtiw=item.get("carYtiw", ""),
                        vino=item.get("vino", ""),
                        link=link,
                        trvlDist=item.get("trvlDist", 0),
                        grade=item.get("aprGrad", "")
                    )
                    clean_items.append(car)
                
                if len(clean_items) >= total:
                    break
                
                if len(raw_list) < limit:
                    break
                
                page_index += 1
                
            except Exception as e:
                print(f"Parsing error at page {page_index}: {e}")
                break
                
    return clean_items

async def fetch_car_photos(car_id: str) -> List[str]:
    # Фото мы пока не трогали, они работали, но добавил headers на всякий случай
    async with httpx.AsyncClient(timeout=10.0, headers=HEADERS) as client:
        try:
            resp = await client.get(IMG_API_URL, params={"langCd": "en", "uscrId": car_id})
            data = resp.json()
            # Здесь тоже можно добавить строгую проверку, но для фото обычно body просто пустой
            if data.get("result") != 0 or not data.get("body"): 
                return []
                
            photos = []
            for img_data in data["body"]:
                partial_path = img_data.get("fileUadr")
                if partial_path:
                    photos.append(BASE_IMG_HOST + partial_path)
            return photos
        except Exception:
            return []