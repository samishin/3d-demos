
import React, { useState, useCallback, useEffect } from 'react';
import { ConfiguratorState } from './types';
import { MATERIALS, STELLAS, BASES, FLOWERBEDS, FENCES, PLINTHS } from './constants';
import Viewer from './components/Viewer';
import Sidebar from './components/UI/Sidebar';
import Preloader from './components/UI/Preloader';
import ErrorBoundary from './components/ErrorBoundary';
import { Settings2, Ruler, Image as ImageIcon } from 'lucide-react';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
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
    monumentPos: { x: 0, y: 0 }, // Монумент может быть у любого края основания
    viewMode: '3d',
    showDimensions: true,
    cameraZoom: 1,
    showEnvironmentBackground: false,
    
    stellaMaterial: MATERIALS[0],
    baseMaterial: MATERIALS[0],
    flowerbedMaterial: MATERIALS[0],
    fenceMaterial: MATERIALS[0],
    plinthMaterial: MATERIALS[0],
    
    stella: STELLAS[0],
    base: BASES[0],
    fence: null,
    flowerbed: FLOWERBEDS[0],
    plinth: PLINTHS[0],
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
      const BASE_DEPTH = 40;
      
      // Фиксированные размеры цветника
      const FIXED_FLOWERBED_WIDTH = 100;
      const FIXED_FLOWERBED_LENGTH = 120;

      if (updates.plinthWidth !== undefined) {
        next.siteWidth = Math.max(next.siteWidth, updates.plinthWidth + 100);
      }
      if (updates.plinthLength !== undefined) {
        next.siteLength = Math.max(next.siteLength, updates.plinthLength + 100);
      }

      if (updates.siteWidth !== undefined) {
        next.siteWidth = Math.max(updates.siteWidth, next.plinthWidth + 100);
      }
      if (updates.siteLength !== undefined) {
        next.siteLength = Math.max(updates.siteLength, next.plinthLength + 100);
      }

      // Цветник всегда имеет фиксированные размеры
      next.flowerbedWidth = FIXED_FLOWERBED_WIDTH;
      next.flowerbedLength = FIXED_FLOWERBED_LENGTH;

      const swLimit = (next.siteWidth - next.plinthWidth) / 2;
      const slLimit = (next.siteLength - next.plinthLength) / 2;
      next.plinthPos.x = Math.max(-swLimit, Math.min(swLimit, next.plinthPos.x));
      next.plinthPos.y = Math.max(-slLimit, Math.min(slLimit, next.plinthPos.y));

      const mwLimit = (next.plinthWidth - Math.max(next.flowerbedWidth, 100)) / 2;
      next.monumentPos.x = Math.max(-mwLimit, Math.min(mwLimit, next.monumentPos.x));

      return next;
    });
  }, []);

  const toggleViewMode = () => updateConfig({ viewMode: config.viewMode === '3d' ? '2d' : '3d' });
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  return (
    <>
      {isLoading && <Preloader />}
      
      <div className="flex h-screen w-screen bg-gray-50 overflow-hidden font-sans">
      <main className="flex-1 relative h-full transition-all duration-500 overflow-hidden">
        <ErrorBoundary>
          <Viewer config={config} onUpdate={updateConfig} isUIVisible={true} />
        </ErrorBoundary>
        
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
          
          <button
            onClick={() => updateConfig({ showEnvironmentBackground: !config.showEnvironmentBackground })}
            className={`p-3 rounded-[4px] shadow-xl transition-all hover:scale-105 active:scale-95 ${
              config.showEnvironmentBackground 
                ? 'bg-blue-600 text-white border border-blue-500' 
                : 'bg-white text-gray-400 border border-gray-100 hover:text-blue-600'
            }`}
            title={config.showEnvironmentBackground ? 'Скрыть окружение' : 'Показать окружение'}
          >
            <ImageIcon size={16} />
          </button>
        </div>

        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="absolute top-6 right-6 p-4 rounded-[4px] shadow-2xl transition-all z-50 flex items-center gap-3 group bg-white text-gray-900 border border-gray-100 hover:bg-gray-50 hover:scale-105"
          >
            <Settings2 size={18} className="group-hover:rotate-90 transition-transform duration-500" />
            <span className="text-[10px] font-black uppercase tracking-widest pr-1">Меню</span>
          </button>
        )}

      </main>

      <aside 
        className={`h-full bg-white border-l border-gray-100 transition-all duration-500 overflow-hidden relative ${
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
