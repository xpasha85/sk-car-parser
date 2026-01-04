import type { Car } from '../types';
import { ExternalLink, Check } from 'lucide-react'; // Импортируем Check вместо CheckCircle2

interface Props {
  cars: Car[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

export const CarTable = ({ cars, selectedIds, onToggle, onToggleAll }: Props) => {
  const isAllSelected = cars.length > 0 && selectedIds.length === cars.length;

  return (
    <>
      {/* --- DESKTOP VIEW (Таблица) --- */}
      <div className="hidden md:block overflow-x-auto border rounded-lg shadow-sm bg-white">
        <table className="w-full text-sm text-left">
          <thead className="text-gray-700 uppercase bg-gray-100">
            <tr>
              <th className="p-4 w-4">
                <input 
                  type="checkbox" 
                  checked={isAllSelected}
                  onChange={onToggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="p-4">Лот</th>
              <th className="p-4">Название</th>
              <th className="p-4">Год</th>
              <th className="p-4">Пробег</th>
              <th className="p-4">VIN (Last 4)</th>
              <th className="p-4 text-center">Сайт</th>
            </tr>
          </thead>
          <tbody>
            {cars.map((car) => (
              <tr 
                key={car.uscrId} 
                className={`border-b hover:bg-gray-50 cursor-pointer ${selectedIds.includes(car.uscrId) ? 'bg-blue-50' : ''}`}
                onClick={() => onToggle(car.uscrId)}
              >
                <td className="p-4 w-4">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(car.uscrId)}
                    readOnly
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                </td>
                <td className="p-4 font-bold text-gray-900">{car.paucXhbtNo}</td>
                <td className="p-4 font-medium text-gray-900">{car.carEnNm}</td>
                <td className="p-4">{car.carYtiw}</td>
                <td className="p-4">{car.trvlDist.toLocaleString()} km</td>
                <td className="p-4 font-mono font-bold text-gray-600">...{car.vino.slice(-4)}</td>
                <td className="p-4 text-center">
                  <a 
                    href={car.link} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-gray-400 hover:text-blue-600 inline-block transition p-1" 
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink size={18} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MOBILE VIEW (Карточки) --- */}
      <div className="md:hidden space-y-3 pb-24"> 
        
        {/* Кнопка "Выбрать все" */}
        {cars.length > 0 && (
            <div 
              onClick={onToggleAll}
              className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200 cursor-pointer active:bg-gray-50"
            >
               <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${isAllSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                  {isAllSelected && <Check size={14} className="text-white" />}
               </div>
               <span className="text-sm font-medium text-gray-700">Выбрать все ({cars.length})</span>
            </div>
        )}

        {cars.map((car) => {
          const isSelected = selectedIds.includes(car.uscrId);
          return (
            <div 
              key={car.uscrId}
              onClick={() => onToggle(car.uscrId)}
              className={`
                relative p-4 rounded-lg shadow-sm border transition-all active:scale-[0.99]
                ${isSelected ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-gray-200'}
              `}
            >
              {/* Верхняя часть: Чекбокс + Название */}
              <div className="flex items-start gap-3 mb-3">
                
                {/* Квадратный чекбокс */}
                <div className="pt-1 flex-shrink-0">
                   <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                      {isSelected && <Check size={14} className="text-white" />}
                   </div>
                </div>

                {/* Заголовок с отступом справа (pr-10), чтобы не наезжать на иконку */}
                <div className="pr-10">
                   <h3 className={`font-bold text-base leading-tight ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                     {car.carEnNm}
                   </h3>
                   <div className="text-sm text-gray-500 mt-1 font-medium">
                     {car.carYtiw} год
                   </div>
                </div>
              </div>

              {/* Разделитель */}
              <div className="h-px bg-gray-100 w-full mb-3" />

              {/* Нижняя часть */}
              <div className="flex justify-between items-center text-sm text-gray-600">
                 <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Лот</span>
                    <span className="font-mono font-bold text-gray-900">{car.paucXhbtNo}</span>
                 </div>
                 
                 <div className="flex flex-col text-center">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Пробег</span>
                    <span>{car.trvlDist.toLocaleString()} km</span>
                 </div>

                 <div className="flex flex-col text-right">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">VIN</span>
                    <span className="font-mono">...{car.vino.slice(-4)}</span>
                 </div>
              </div>

              {/* Иконка ссылки */}
              <a 
                href={car.link}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute top-3 right-3 p-2 text-gray-300 hover:text-blue-600 bg-white/50 rounded-full"
              >
                <ExternalLink size={20} />
              </a>
            </div>
          );
        })}
      </div>
    </>
  );
};