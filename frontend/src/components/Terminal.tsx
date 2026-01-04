import { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';

interface Props {
  logs: string[];
}

export const Terminal = ({ logs }: Props) => {
  // Ссылка теперь указывает на контейнер с полосой прокрутки, а не на элемент в конце
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      // Используем scrollTo для внутреннего скролла контейнера.
      // Это НЕ влияет на скролл основной страницы.
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [logs]);

  return (
    <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm h-64 flex flex-col shadow-lg border border-gray-700">
      <div className="flex items-center gap-2 border-b border-gray-700 pb-2 mb-2 text-gray-400">
        <TerminalIcon size={16} />
        <span>Live Logs</span>
      </div>
      
      {/* Привязываем ref к самому контейнеру */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar"
      >
        {logs.length === 0 && (
          <span className="text-gray-600 italic">Waiting for process...</span>
        )}
        {logs.map((log, i) => (
          <div key={i} className="break-words">
            <span className="text-gray-500 mr-2">$</span>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};