export interface Car {
  uscrId: string;
  paucXhbtNo: string;
  carNo: string;
  carEnNm: string;
  carYtiw: string;
  vino: string;
  link: string;
  trvlDist: number;
  grade: string;
}

export interface Destination {
  id: number;
  name: string;
  message_thread_id?: number;
}

export interface LogsResponse {
  logs: string[];
}

export interface ProcessItem {
  id: string;
  caption: string;
}

// ОБНОВЛЕНО: payload для отправки
export interface ProcessRequest {
  items: ProcessItem[];
  target_chat_id: number;
  batch_id: string;
  message_thread_id?: number;
  destination_name: string; // <-- НОВОЕ (Обязательное)
}

// ОБНОВЛЕНО: элемент истории
export interface BatchHistoryItem {
  batch_id: string;
  created_at: string;
  count: number;
  destination_name: string; // <-- НОВОЕ (Приходит с бэка)
}