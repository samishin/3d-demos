
import React, { useState, useCallback, useEffect } from 'react';
import { ConfiguratorState } from './types';
import { MATERIALS, STELLAS, BASES, FLOWERBEDS, FENCES, PLINTHS } from './constants';
import Viewer from './components/Viewer';
import Sidebar from './components/UI/Sidebar';
import Preloader from './components/UI/Preloader';
import { Settings2, ChevronLeft, ChevronRight, Eye, Ruler } from 'lucide-react';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Эмуляция загрузки приложения
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const [config, setConfig] = useState<ConfiguratorState>({
    siteWidth: 300,
    siteLength: 300,
    plinthWidth: 200,
    plinthLength: 200,
    flowerbedWidth: 100,
    flowerbedLength: 120,
    plinthPos: { x: 0, y: 0 },
    monumentPos: { x: 0, y: 0 }, // Монумент может быть у любого края цоколя
    viewMode: '3d',
    showDimensions: true,
    cameraZoom: 1,
    
    stellaMaterial: MATERIALS[0],
    baseMaterial: MATERIALS[0],
    flowerbedMaterial: MATERIALS[0],
    fenceMaterial: MATERIALS[0],
    plinthMaterial: MATERIALS[4],
    
    stella: STELLAS[0],
    base: BASES[0],
    fence: null,
    flowerbed: FLOWERBEDS[0],
    plinth: PLINTHS[0],
    // Using a reliable placeholder if the specific URL fails CORS. Users can still upload their own.
    portraitUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop',
    inscription: '',
    inscriptionColor: '#d4af37',
    inscriptionFontSize: 0.05,
    extras: {
      vases: [],
      tables: [],
      benches: [],
    }
  });

  const updateConfig = useCallback((updates: Partial<ConfiguratorState>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates };
      
      const BASE_DEPTH = 40; // см

      // 1. Участок должен быть на 100см больше цоколя (по 50см с каждой стороны)
      if (updates.plinthWidth !== undefined) {
        next.siteWidth = Math.max(next.siteWidth, updates.plinthWidth + 100);
        next.flowerbedWidth = Math.min(next.flowerbedWidth, updates.plinthWidth);
      }
      if (updates.plinthLength !== undefined) {
        next.siteLength = Math.max(next.siteLength, updates.plinthLength + 100);
        next.flowerbedLength = Math.min(next.flowerbedLength, updates.plinthLength - BASE_DEPTH);
      }

      if (updates.siteWidth !== undefined) {
        next.siteWidth = Math.max(updates.siteWidth, next.plinthWidth + 100);
      }
      if (updates.siteLength !== undefined) {
        next.siteLength = Math.max(updates.siteLength, next.plinthLength + 100);
      }

      // 2. Ограничения цветника относительно текущего цоколя
      if (updates.flowerbedWidth !== undefined) {
        next.flowerbedWidth = Math.min(updates.flowerbedWidth, next.plinthWidth);
      }
      if (updates.flowerbedLength !== undefined) {
        next.flowerbedLength = Math.min(updates.flowerbedLength, next.plinthLength - BASE_DEPTH);
      }

      // 3. Удержание позиций в границах при изменении размеров
      const swLimit = (next.siteWidth - next.plinthWidth) / 2;
      const slLimit = (next.siteLength - next.plinthLength) / 2;
      next.plinthPos.x = Math.max(-swLimit, Math.min(swLimit, next.plinthPos.x));
      next.plinthPos.y = Math.max(-slLimit, Math.min(slLimit, next.plinthPos.y));

      const totalMonumentLength = next.flowerbedLength + BASE_DEPTH;
      const mwLimit = (next.plinthWidth - Math.max(next.flowerbedWidth, 100)) / 2;
      // Убрано ограничение по Y - база может быть у края цоколя
      next.monumentPos.x = Math.max(-mwLimit, Math.min(mwLimit, next.monumentPos.x));
      // next.monumentPos.y не ограничен - может быть в любом месте по Y

      return next;
    });
  }, []);

  const toggleViewMode = () => {
    updateConfig({ viewMode: config.viewMode === '3d' ? '2d' : '3d' });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };



  return (
    <>
      {/* Прелоадер */}
      {isLoading && <Preloader />}
      
      <div className="flex h-screen w-screen bg-gray-50 overflow-hidden font-sans">
      {/* Главная область со сценой */}
      <main className="flex-1 relative h-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden">
        <Viewer config={config} onUpdate={updateConfig} isUIVisible={true} />
        
        {/* Кнопки управления в верхнем левом углу */}
        <div className="absolute top-6 left-6 flex items-center gap-3 z-10">
          <button 
            onClick={toggleViewMode}
            className={`px-6 py-3 rounded-[4px] shadow-xl font-bold text-[10px] tracking-[0.15em] transition-all hover:scale-105 active:scale-95 border uppercase ${
              config.viewMode === '3d' 
                ? 'bg-white text-gray-900 border-gray-100' 
                : 'bg-gray-900 text-white border-gray-800'
            }`}
          >
            {config.viewMode === '3d' ? '2D ПЛАН' : '3D ВИД'}
          </button>
          
          {/* Тумблер размеров на сцене - только иконка */}
          <button
            onClick={() => updateConfig({ showDimensions: !config.showDimensions })}
            className={`p-3 rounded-[4px] shadow-xl transition-all hover:scale-105 active:scale-95 ${
              config.showDimensions 
                ? 'bg-blue-600 text-white border border-blue-500' 
                : 'bg-white text-gray-400 border border-gray-100 hover:text-blue-600'
            }`}
            title={config.showDimensions ? 'Скрыть размеры' : 'Показать размеры'}
          >
            <Ruler size={16} />
          </button>
        </div>



        {/* Кнопка открытия меню (когда меню закрыто) */}
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="absolute top-6 right-6 p-4 rounded-[4px] shadow-2xl transition-all z-50 flex items-center gap-3 group bg-white text-gray-900 border border-gray-100 hover:bg-gray-50 hover:scale-105"
          >
            <Settings2 size={18} className="group-hover:rotate-90 transition-transform duration-500" />
            <span className="text-[10px] font-black uppercase tracking-widest pr-1">
              Меню
            </span>
          </button>
        )}

      </main>

      {/* Боковая панель (Flex-основа гарантирует, что канвас сожмется, а не перекроется) */}
      <aside 
        className={`h-full bg-white border-l border-gray-100 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden relative ${
          isSidebarOpen ? 'w-full sm:w-[420px] opacity-100 shadow-[-20px_0_40px_rgba(0,0,0,0.03)]' : 'w-0 opacity-0'
        }`}
      >
        <div className="w-full sm:w-[420px] h-full absolute top-0 right-0">
          <Sidebar 
            config={config} 
            onUpdate={updateConfig} 
            onClose={() => setIsSidebarOpen(false)} 
          />
        </div>
      </aside>
      
      {/* Затемнение только для мобильных, где меню занимает весь экран */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-30 sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
    </>
  );
};

export default App;
