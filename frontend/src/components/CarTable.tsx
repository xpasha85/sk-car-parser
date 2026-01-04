import type { Car } from '../types';
import { ExternalLink } from 'lucide-react'; // Импортируем иконку

interface Props {
  cars: Car[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

export const CarTable = ({ cars, selectedIds, onToggle, onToggleAll }: Props) => {
  const isAllSelected = cars.length > 0 && selectedIds.length === cars.length;

  return (
    <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
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
            {/* Колонка Фото убрана отсюда */}
            <th className="p-4">Название</th>
            <th className="p-4">Год</th>
            <th className="p-4">Пробег</th>
            <th className="p-4">VIN</th>
            <th className="p-4 text-center">Сайт</th> {/* Перенесена в конец */}
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
              {/* Ссылка убрана отсюда */}
              <td className="p-4 font-medium text-gray-900">{car.carEnNm}</td>
              <td className="p-4">{car.carYtiw}</td>
              <td className="p-4">{car.trvlDist.toLocaleString()} km</td>
              <td className="p-4 font-mono font-bold text-gray-600">
                 ...{car.vino.slice(-4)}
              </td>
              
              {/* Ссылка теперь в конце и в виде иконки */}
              <td className="p-4 text-center">
                <a 
                  href={car.link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-gray-400 hover:text-blue-600 inline-block transition p-1" 
                  onClick={e => e.stopPropagation()}
                  title="Открыть на сайте аукциона"
                >
                  <ExternalLink size={18} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};