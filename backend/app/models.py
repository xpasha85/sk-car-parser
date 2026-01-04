from pydantic import BaseModel
from typing import List, Optional

class CarItem(BaseModel):
    uscrId: str
    uscrPaucScheId: str
    paucXhbtNo: str
    carNo: str
    carEnNm: str
    carYtiw: str
    vino: str
    link: str
    trvlDist: int
    grade: str

class CarRequestItem(BaseModel):
    id: str
    caption: str

class ProcessRequest(BaseModel):
    items: List[CarRequestItem]
    target_chat_id: int 
    message_thread_id: Optional[int] = None 
    batch_id: str
    destination_name: str  # <--- Теперь требуем имя канала