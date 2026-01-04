import { Trash2, History, RefreshCw, AlertTriangle } from 'lucide-react';
import type { BatchHistoryItem } from '../types';

interface Props {
  history: BatchHistoryItem[];
  onCleanup: (batchId: string) => void;
  onRefresh: () => void;
  onGlobalCleanup: () => void;
  cleaningId: string | null;
}

const formatTime = (dateString: string) => {
  if (!dateString) return '--:--';
  try {
    let parseString = dateString;
    if (!dateString.endsWith('Z') && !dateString.includes('+')) {
       parseString = dateString + 'Z';
    }
    return new Date(parseString).toLocaleString('ru-RU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
};

export const HistoryPanel = ({ history, onCleanup, onRefresh, onGlobalCleanup, cleaningId }: Props) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-6 flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-3 border-b pb-2">
        <div className="flex items-center gap-2 text-gray-700 font-bold">
          <History size={18} />
          <span>История рассылок</span>
        </div>
        <button onClick={onRefresh} className="text-gray-400 hover:text-blue-600 transition">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 mb-4">
        {history.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-sm italic">
            История пуста...
          </div>
        ) : (
          history.map((item) => (
            <div key={item.batch_id} className="flex justify-between items-center bg-gray-50 p-3 rounded border hover:bg-gray-100 transition">
              <div className="flex-1 min-w-0"> 
                <div className="flex items-center gap-2 mb-1">
                   <span className="font-bold text-gray-800 text-sm truncate" title={item.destination_name}>
                     {item.destination_name || "Неизвестный чат"}
                   </span>
                </div>
                <div className="text-xs text-gray-500 flex flex-wrap gap-2 items-center">
                  <span className="font-mono bg-gray-100 px-1 rounded text-[10px]">
                     #{item.batch_id.slice(-4)}
                  </span>
                  <span className="text-blue-600 font-medium">
                    {formatTime(item.created_at)}
                  </span>
                  {/* Заменили 'cars' на 'фото' */}
                  <span>• {item.count} фото</span>
                </div>
              </div>

              <button
                onClick={() => onCleanup(item.batch_id)}
                disabled={cleaningId === item.batch_id}
                className="p-2 ml-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition disabled:opacity-50 flex-shrink-0"
              >
                {cleaningId === item.batch_id ? (
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="border-t pt-3 mt-auto">
        <button 
          onClick={onGlobalCleanup}
          className="w-full flex items-center justify-center gap-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded border border-red-200 transition"
        >
          <AlertTriangle size={14} />
          Удалить отправленные сообщения
        </button>
      </div>
    </div>
  );
};