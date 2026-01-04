import { useState, useEffect, useMemo } from 'react';
import { api } from './api/client';
import type { Car, Destination, BatchHistoryItem, ProcessItem } from './types';
import { Terminal } from './components/Terminal';
import { CarTable } from './components/CarTable';
import { HistoryPanel } from './components/HistoryPanel';
import { Search, Send, Loader2, Lock, Filter, X, LayoutList, Activity } from 'lucide-react'; // Новые иконки

function App() {
  // --- STATE ---
  const [token, setToken] = useState<string | null>(localStorage.getItem('sk_token'));
  const [inputPass, setInputPass] = useState('');
  
  // Mobile Tabs State
  const [activeTab, setActiveTab] = useState<'search' | 'process'>('search');

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
  const [selectedYears, setSelectedYears] = useState<string[]>([]);

  // History & Logs
  const [history, setHistory] = useState<BatchHistoryItem[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cleaningId, setCleaningId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false); // Для мобильного аккордеона

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
      const lotNum = parseInt(car.paucXhbtNo);
      if (lotFrom && !isNaN(parseInt(lotFrom)) && lotNum < parseInt(lotFrom)) return false;
      if (lotTo && !isNaN(parseInt(lotTo)) && lotNum > parseInt(lotTo)) return false;
      if (selectedYears.length > 0 && !selectedYears.includes(car.carYtiw)) return false;
      return true;
    });
  }, [cars, lotFrom, lotTo, selectedYears]);

  const toggleYearFilter = (year: string) => {
    setSelectedYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
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
      setLotFrom(''); setLotTo(''); setSelectedYears([]);
      setActiveTab('search'); // При новой загрузке кидаем на поиск
    } catch(e){ alert('Ошибка'); } finally { setLoading(false); } 
  };

  const generateCaption = (car: Car): string => {
    return `🆔 ${car.paucXhbtNo}   🚘 ${car.carEnNm} (${car.carYtiw})`;
  };

  const handleProcess = async () => {
    if (selectedIds.length === 0) return alert('Выберите машины!');
    const dest = destinations[Number(selectedDestIndex)];
    if (!dest) return alert('Выберите получателя!');

    // Переключаем на вкладку процесса на мобильном
    setActiveTab('process');
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
  
  const resetFilters = () => { setLotFrom(''); setLotTo(''); setSelectedYears([]); };

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
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6 pt-2 md:pt-6 px-2 md:px-6"> {/* Отступы под мобилку */}
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        
        {/* HEADER */}
        <header className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
             
             {/* Logo & Title */}
             <div className="flex items-center gap-3">
               <img src="/logo.png" alt="Garanin Co." className="h-8 md:h-10 w-auto" onError={(e) => e.currentTarget.style.display = 'none'} />
               <div>
                 <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                   SK Parser v2.5 <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">beta</span>
                 </h1>
                 <p className="text-gray-500 text-xs md:text-sm hidden md:block">Парсер фото аукциона SKCar для Garanin Co.</p>
               </div>
             </div>

             {/* Desktop Search Area */}
             <div className={`hidden md:flex gap-2 items-center`}>
                <div className="relative">
                  <input 
                    type="text" placeholder="ID аукциона (e.g. 2500000365)" 
                    className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-80 shadow-sm text-sm" // w-80 ограничивает ширину
                    value={auctionId} onChange={e => setAuctionId(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                </div>
                <button 
                  onClick={handlePreview} disabled={loading}
                  className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-black transition flex items-center gap-2 font-medium shadow-sm text-sm h-[38px]"
                >
                  {loading ? <Loader2 className="animate-spin" size={18}/> : <Search size={18} />}
                  Загрузить
                </button>
             </div>

             {/* Mobile Tabs Switcher */}
             <div className="flex md:hidden bg-gray-100 p-1 rounded-lg w-full mt-2 md:mt-0">
                <button 
                  onClick={() => setActiveTab('search')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${activeTab === 'search' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                >
                  <LayoutList size={16} /> Поиск
                </button>
                <button 
                  onClick={() => setActiveTab('process')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${activeTab === 'process' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                >
                  <Activity size={16} /> Процесс
                </button>
             </div>
          </div>
          
          {/* Mobile Search Bar (Только для мобилки, на всю ширину) */}
          <div className={`flex gap-2 w-full mt-3 md:hidden ${activeTab === 'search' ? 'flex' : 'hidden'}`}>
            <div className="relative flex-1">
              <input 
                type="text" placeholder="ID аукциона" 
                className="pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full text-base"
                value={auctionId} onChange={e => setAuctionId(e.target.value)}
              />
              <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
            <button 
              onClick={handlePreview} disabled={loading}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-black transition flex items-center gap-2 font-medium"
            >
              {loading ? <Loader2 className="animate-spin" size={20}/> : <Search size={20} />}
            </button>
          </div>
        </header>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* --- LEFT PANEL (SEARCH & TABLE) --- */}
          <div className={`lg:col-span-2 space-y-4 ${activeTab === 'search' ? 'block' : 'hidden md:block'}`}>
            
            {/* Controls & Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
               {/* Desktop: Send Button (Hidden on Mobile, moved to Sticky Footer) */}
               <div className="hidden md:flex flex-col sm:flex-row justify-between items-center gap-4">
                  <span className="font-bold text-gray-700">
                    Всего: {filteredCars.length} | Выбрано: {selectedIds.length}
                  </span>
                  
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <select 
                      className="border p-2 rounded bg-gray-50 min-w-[200px] outline-none"
                      value={selectedDestIndex}
                      onChange={e => setSelectedDestIndex(e.target.value)}
                    >
                      {destinations.map((d, index) => <option key={index} value={index}>{d.name}</option>)}
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

               {/* Mobile: Filter Toggle */}
               <div className="md:hidden flex justify-between items-center">
                 <span className="text-sm font-medium text-gray-600">Всего авто: {filteredCars.length}</span>
                 <button onClick={() => setShowFilters(!showFilters)} className="text-blue-600 text-sm font-medium flex items-center gap-1">
                   <Filter size={16} /> {showFilters ? 'Скрыть фильтры' : 'Фильтры'}
                 </button>
               </div>

               {/* Filters Area (Responsive) */}
               {(cars.length > 0 && (showFilters || window.innerWidth >= 768)) && (
                 <div className={`border-t pt-3 flex flex-wrap gap-3 items-center ${showFilters ? 'block' : 'hidden md:flex'}`}>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mr-2 w-full md:w-auto">
                       <Filter size={16} />
                       <span className="hidden md:inline">Фильтр:</span>
                    </div>
                    
                    <div className="flex items-center gap-1 w-full md:w-auto">
                      <input 
                        type="number" placeholder="Лот от" 
                        className="border rounded px-2 py-2 md:py-1 w-1/2 md:w-20 text-sm outline-none"
                        value={lotFrom} onChange={e => setLotFrom(e.target.value)}
                      />
                      <span className="text-gray-300">-</span>
                      <input 
                        type="number" placeholder="Лот до" 
                        className="border rounded px-2 py-2 md:py-1 w-1/2 md:w-20 text-sm outline-none"
                        value={lotTo} onChange={e => setLotTo(e.target.value)}
                      />
                    </div>

                    <div className="h-px w-full md:h-6 md:w-px bg-gray-100 md:bg-gray-300 md:mx-2 my-2 md:my-0"></div>

                    <div className="flex flex-wrap gap-2 md:gap-1 w-full md:w-auto">
                      {availableYears.map(year => {
                        const isSelected = selectedYears.includes(year);
                        return (
                          <button
                            key={year}
                            onClick={() => toggleYearFilter(year)}
                            className={`px-3 py-1.5 md:py-1 text-xs rounded border transition font-medium flex-1 md:flex-none text-center
                              ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                          >
                            {year}
                          </button>
                        )
                      })}
                    </div>

                    {(lotFrom || lotTo || selectedYears.length > 0) && (
                      <button onClick={resetFilters} className="text-red-500 hover:bg-red-50 p-2 rounded transition ml-auto" title="Сбросить все">
                        <X size={18} />
                      </button>
                    )}
                 </div>
               )}
            </div>

            <CarTable cars={filteredCars} selectedIds={selectedIds} onToggle={toggleSelect} onToggleAll={toggleAll} />
          </div>

          {/* --- RIGHT PANEL (LOGS & HISTORY) --- */}
          <div className={`lg:col-span-1 space-y-4 ${activeTab === 'process' ? 'block' : 'hidden md:block'}`}>
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

        {/* --- MOBILE STICKY FOOTER (Only visible on mobile when cars selected) --- */}
        <div className={`md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-50 transition-transform duration-300 ${selectedIds.length > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
           <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-800">Выбрано: {selectedIds.length}</span>
              <button onClick={() => setSelectedIds([])} className="text-xs text-red-500 font-medium">Сбросить</button>
           </div>
           <div className="flex gap-2">
             <select 
                className="flex-1 border p-2.5 rounded-lg bg-gray-50 text-sm outline-none"
                value={selectedDestIndex}
                onChange={e => setSelectedDestIndex(e.target.value)}
              >
                {destinations.map((d, index) => <option key={index} value={index}>{d.name}</option>)}
              </select>
             <button 
                onClick={handleProcess}
                disabled={processing}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2"
             >
                {processing ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
             </button>
           </div>
        </div>

      </div>
    </div>
  );
}

export default App;