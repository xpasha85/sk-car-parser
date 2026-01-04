import { useState, useEffect, useMemo } from 'react';
import { api } from './api/client';
import type { Car, Destination, BatchHistoryItem, ProcessItem } from './types';
import { Terminal } from './components/Terminal';
import { CarTable } from './components/CarTable';
import { HistoryPanel } from './components/HistoryPanel';
import { Search, Send, Loader2, Lock, Filter, X } from 'lucide-react'; 

function App() {
  // --- STATE ---
  const [token, setToken] = useState<string | null>(localStorage.getItem('sk_token'));
  const [inputPass, setInputPass] = useState('');
  
  // Data
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestIndex, setSelectedDestIndex] = useState<string>('0');
  
  // Parser Logic
  const [auctionId, setAuctionId] = useState('');
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filters State
  const [lotFrom, setLotFrom] = useState('');
  const [lotTo, setLotTo] = useState('');
  // ИЗМЕНЕНИЕ: Теперь это массив строк для множественного выбора
  const [selectedYears, setSelectedYears] = useState<string[]>([]);

  // History & Logs
  const [history, setHistory] = useState<BatchHistoryItem[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cleaningId, setCleaningId] = useState<string | null>(null);

  // --- EFFECTS ---
  useEffect(() => {
    if (token) {
      loadDestinations();
      fetchHistory();
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // --- FILTER LOGIC ---
  const availableYears = useMemo(() => {
    const years = cars.map(c => c.carYtiw);
    return Array.from(new Set(years)).sort().reverse();
  }, [cars]);

  const filteredCars = useMemo(() => {
    return cars.filter(car => {
      // Фильтр по лоту
      const lotNum = parseInt(car.paucXhbtNo);
      if (lotFrom && !isNaN(parseInt(lotFrom)) && lotNum < parseInt(lotFrom)) return false;
      if (lotTo && !isNaN(parseInt(lotTo)) && lotNum > parseInt(lotTo)) return false;

      // ИЗМЕНЕНИЕ: Фильтр по годам (Множественный)
      // Если выбран хотя бы один год И текущий год машины НЕ в списке выбранных -> скрываем
      if (selectedYears.length > 0 && !selectedYears.includes(car.carYtiw)) return false;

      return true;
    });
  }, [cars, lotFrom, lotTo, selectedYears]);

  // Хендлер для клика по году (Добавить/Убрать)
  const toggleYearFilter = (year: string) => {
    setSelectedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year) // Если был - убираем
        : [...prev, year]              // Если не было - добавляем
    );
  };

  // --- API CALLS ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        localStorage.setItem('sk_token', inputPass);
        await api.get('/check-auth', { headers: { Authorization: `Bearer ${inputPass}` } });
        setToken(inputPass);
    } catch (err) { alert('Неверный пароль'); localStorage.removeItem('sk_token'); }
  };
  
  const loadDestinations = async () => { try { const res = await api.get('/destinations'); setDestinations(res.data); if (res.data.length > 0) setSelectedDestIndex('0'); } catch (e) {} };
  const fetchHistory = async () => { try { const res = await api.get('/history'); setHistory(res.data); } catch (e) {} };
  const fetchLogs = async () => { try { const res = await api.get('/logs'); if (res.data.logs) setLogs(res.data.logs); } catch (e) {} };
  
  const handlePreview = async () => { 
    if(!auctionId) return; 
    setLoading(true); 
    try { 
      const res = await api.get(`/auction/preview?sche_id=${auctionId}`); 
      setCars(res.data); 
      setSelectedIds([]); 
      // Сброс фильтров
      setLotFrom(''); setLotTo(''); setSelectedYears([]);
    } catch(e){ alert('Ошибка'); } finally { setLoading(false); } 
  };

  const generateCaption = (car: Car): string => {
    return `🆔 ${car.paucXhbtNo}   🚘 ${car.carEnNm} (${car.carYtiw})`;
  };

  const handleProcess = async () => {
    if (selectedIds.length === 0) return alert('Выберите машины!');
    const dest = destinations[Number(selectedDestIndex)];
    if (!dest) return alert('Выберите получателя!');

    setProcessing(true);
    const batchId = Date.now().toString();

    const items: ProcessItem[] = selectedIds.map(id => {
      const car = cars.find(c => c.uscrId === id);
      if (!car) throw new Error('Car not found');
      return { id: car.uscrId, caption: generateCaption(car) };
    });

    try {
      await api.post('/process', {
        items: items,
        target_chat_id: dest.id,
        message_thread_id: dest.message_thread_id,
        batch_id: batchId,
        destination_name: dest.name
      });
      setTimeout(() => fetchHistory(), 1000);
    } catch (e) { alert('Ошибка запуска'); } finally { setProcessing(false); }
  };

  const handleCleanup = async (batchId: string) => {
    if (!confirm('Удалить эти сообщения из Телеграм?')) return;
    setCleaningId(batchId);
    try { await api.post('/cleanup', { batch_id: batchId }); await fetchHistory(); } catch (e) { alert('Ошибка при удалении'); } finally { setCleaningId(null); }
  };

  const handleGlobalCleanup = async () => {
    if (!confirm('ВНИМАНИЕ: Это удалит ВСЕ сообщения бота.')) return;
    if (!confirm('Вы точно уверены?')) return;
    try { await api.post('/cleanup-all'); alert('Очистка запущена.'); setHistory([]); } catch (e) { alert('Ошибка'); }
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  
  const toggleAll = () => {
    const allFilteredIds = filteredCars.map(c => c.uscrId);
    const isAllFilteredSelected = allFilteredIds.every(id => selectedIds.includes(id));

    if (isAllFilteredSelected) {
      setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      const newIds = [...selectedIds];
      allFilteredIds.forEach(id => { if (!newIds.includes(id)) newIds.push(id); });
      setSelectedIds(newIds);
    }
  };
  
  const resetFilters = () => {
    setLotFrom('');
    setLotTo('');
    setSelectedYears([]);
  };

  // --- RENDER ---
  if (!token) return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-96">
          <div className="flex justify-center mb-4 text-blue-600"><Lock size={48} /></div>
          <h2 className="text-xl font-bold text-center mb-6">SK Parser Access</h2>
          <input type="password" placeholder="Пароль" className="w-full border p-3 rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none" value={inputPass} onChange={e => setInputPass(e.target.value)}/>
          <button className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 font-bold">Войти</button>
        </form>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row gap-4 justify-between bg-white p-6 rounded-lg shadow-sm items-center">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Garanin Co." className="h-10 w-auto" onError={(e) => e.currentTarget.style.display = 'none'} />
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                SK Car Parser v2.4 <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">beta</span>
              </h1>
              <p className="text-gray-500 text-sm">Парсер фото аукциона SKCar для Garanin Co.</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <input 
                type="text" placeholder="ID аукциона (2500000365)" 
                className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
                value={auctionId} onChange={e => setAuctionId(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
            <button 
              onClick={handlePreview} disabled={loading}
              className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-black transition flex items-center gap-2 font-medium"
            >
              {loading ? <Loader2 className="animate-spin" size={18}/> : <Search size={18} />}
              Загрузить
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Controls Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
               {/* Top Row: Count & Actions */}
               <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <span className="font-bold text-gray-700">
                    Всего: {filteredCars.length} | Выбрано: {selectedIds.length}
                  </span>
                  
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <select 
                      className="border p-2 rounded bg-gray-50 min-w-[200px] outline-none focus:border-blue-500"
                      value={selectedDestIndex}
                      onChange={e => setSelectedDestIndex(e.target.value)}
                    >
                      {destinations.map((d, index) => (
                        <option key={index} value={index}>{d.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleProcess}
                      disabled={processing || selectedIds.length === 0}
                      className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition flex items-center justify-center gap-2 font-bold shadow-lg disabled:opacity-50"
                    >
                      {processing ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                      Отправить
                    </button>
                  </div>
               </div>

               {/* Filters Row */}
               {cars.length > 0 && (
                 <div className="border-t pt-3 flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mr-2">
                       <Filter size={16} />
                       <span>Фильтр:</span>
                    </div>
                    
                    {/* Лоты */}
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" placeholder="Лот от" 
                        className="border rounded px-2 py-1 w-20 text-sm outline-none focus:border-blue-500"
                        value={lotFrom} onChange={e => setLotFrom(e.target.value)}
                      />
                      <span className="text-gray-300">-</span>
                      <input 
                        type="number" placeholder="Лот до" 
                        className="border rounded px-2 py-1 w-20 text-sm outline-none focus:border-blue-500"
                        value={lotTo} onChange={e => setLotTo(e.target.value)}
                      />
                    </div>

                    <div className="h-6 w-px bg-gray-300 mx-2"></div>

                    {/* Года (Множественный выбор - Кнопки) */}
                    <div className="flex flex-wrap gap-1">
                      {availableYears.map(year => {
                        const isSelected = selectedYears.includes(year);
                        return (
                          <button
                            key={year}
                            onClick={() => toggleYearFilter(year)}
                            className={`px-2 py-1 text-xs rounded border transition font-medium
                              ${isSelected 
                                ? 'bg-blue-600 text-white border-blue-600' 
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                              }`}
                          >
                            {year}
                          </button>
                        )
                      })}
                    </div>

                    {(lotFrom || lotTo || selectedYears.length > 0) && (
                      <button onClick={resetFilters} className="text-red-500 hover:bg-red-50 p-1 rounded transition ml-auto" title="Сбросить все">
                        <X size={18} />
                      </button>
                    )}
                 </div>
               )}
            </div>

            <CarTable cars={filteredCars} selectedIds={selectedIds} onToggle={toggleSelect} onToggleAll={toggleAll} />
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1 space-y-4">
             <div className="sticky top-6">
               <Terminal logs={logs} />
               <HistoryPanel 
                 history={history} 
                 onCleanup={handleCleanup}
                 onRefresh={fetchHistory}
                 onGlobalCleanup={handleGlobalCleanup}
                 cleaningId={cleaningId}
               />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;