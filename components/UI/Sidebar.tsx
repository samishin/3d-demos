
import React, { useState, useRef, useEffect } from 'react';
import { ConfiguratorState, Category, Material } from '../../types';
import { MATERIALS, STELLAS, BASES, FENCES, FLOWERBEDS, PLINTHS } from '../../constants';
import { exportToPDF, getCanvasElement } from '../../utils/pdfExporter';
import { 
  Maximize, Layers, Box, Grid3X3, Palette, Flower, 
  Fence as FenceIcon, PlusCircle, ChevronRight, X, 
  Image as ImageIcon, ArrowRight, Type, Download
} from 'lucide-react';

interface SidebarProps {
  config: ConfiguratorState;
  onUpdate: (updates: Partial<ConfiguratorState>) => void;
  onClose: () => void;
}

const MaterialPicker: React.FC<{ 
  selected: Material; 
  onSelect: (m: Material) => void;
  label?: string;
}> = ({ selected, onSelect, label = "Материал" }) => {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  
  // Загрузка превью материалов
  useEffect(() => {
    const loadPreviews = async () => {
      const textureConfig: Record<string, {folder: string}> = {
        'm1': {folder: 'gabbo'},
        'm2': {folder: 'Jalgis'},
        'm3': {folder: 'Jeltau'},
        'm4': {folder: 'Kapustinski'},
        'm5': {folder: 'Rombak'}
      };
      
      const newPreviews: Record<string, string> = {};
      
      for (const material of MATERIALS) {
        const config = textureConfig[material.id] || textureConfig['m1'];
        const folder = config.folder;
        
        try {
          // Пытаемся загрузить _Color.jpg файл
          const response = await fetch(`./textures/${folder}/${folder}_Color.jpg`);
          if (response.ok) {
            newPreviews[material.id] = `./textures/${folder}/${folder}_Color.jpg`;
          } else {
            // Если _Color.jpg не найден, используем цвет сплошной
            newPreviews[material.id] = material.color;
          }
        } catch (error) {
          // При ошибке используем цвет сплошной
          newPreviews[material.id] = material.color;
        }
      }
      
      setPreviews(newPreviews);
    };
    
    loadPreviews();
  }, []);
  
  return (
    <div className="bg-gray-50/50 p-4 rounded-[4px] border border-gray-100">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">{label}</label>
      <div className="flex flex-wrap gap-2">
        {MATERIALS.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            className={`w-12 h-12 rounded-[4px] border-2 transition-all transform active:scale-90 overflow-hidden ${
              selected.id === m.id ? 'border-blue-600 scale-110 shadow-lg' : 'border-transparent hover:border-gray-300'
            }`}
            title={m.name}
          >
            {previews[m.id] && previews[m.id].startsWith('./textures') ? (
              // Если это путь к текстуре - показываем изображение
              <img 
                src={previews[m.id]} 
                alt={m.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // При ошибке загрузки изображения показываем цвет
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div 
              className={`w-full h-full rounded-[4px] shadow-inner ${previews[m.id] && previews[m.id].startsWith('#') ? '' : 'hidden'}`}
              style={{ backgroundColor: previews[m.id] || m.color }} 
            />
          </button>
        ))}
      </div>
    </div>
  );
};

const ColorPicker: React.FC<{ 
  selected: string; 
  onSelect: (color: string) => void;
  label?: string;
}> = ({ selected, onSelect, label = "Цвет" }) => (
  <div className="bg-gray-50/50 p-4 rounded-[4px] border border-gray-100">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">{label}</label>
    <div className="flex flex-wrap gap-2">
      {MATERIALS.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m.color)}
          className={`w-8 h-8 rounded-[4px] border-2 transition-all transform active:scale-90 ${
            selected === m.color ? 'border-blue-600 scale-110 shadow-lg' : 'border-transparent hover:border-gray-300'
          }`}
          title={m.name}
        >
          <div className="w-full h-full rounded-[4px] shadow-inner" style={{ backgroundColor: m.color }} />
        </button>
      ))}
    </div>
  </div>
);

// Универсальный компонент для серых превью (кроме стелл)
const GrayPreviewSquare: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`aspect-square bg-gray-200 rounded-[4px] mb-2 flex items-center justify-center ${className}`}>
    <div className="w-3/4 h-3/4 bg-gray-300 rounded-[2px]" />
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ config, onUpdate, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('site');
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: { id: Category; label: string; icon: any }[] = [
    { id: 'site', label: 'Участок', icon: Maximize },
    { id: 'plinth', label: 'Основание', icon: Grid3X3 },
    { id: 'stella', label: 'Стела', icon: Box },
    { id: 'base', label: 'Подставка', icon: Layers },
    { id: 'flowerbed', label: 'Цветник', icon: Flower },
    { id: 'fence', label: 'Ограда', icon: FenceIcon },
    { id: 'extras', label: 'Декор', icon: PlusCircle },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onUpdate({ portraitUrl: url });
      
      if (config.portraitUrl && config.portraitUrl.startsWith('blob:')) {
        URL.revokeObjectURL(config.portraitUrl);
      }
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const canvas = getCanvasElement();
      await exportToPDF(config, canvas);
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      alert('Не удалось экспортировать в PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white selection:bg-blue-100 selection:text-blue-900">
      <div className="px-8 py-8 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-50">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase leading-none">ДЭМОС</h1>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">Version 1</p>
        </div>
        <button onClick={onClose} className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-[4px] transition-all">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <div key={cat.id}>
              <button
                onClick={() => setActiveCategory(isActive ? null : cat.id)}
                className={`w-full flex items-center justify-between px-6 py-4 rounded-[4px] transition-all duration-300 ${
                  isActive ? 'bg-gray-900 text-white shadow-xl' : 'hover:bg-gray-50 text-gray-500'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-[4px] ${isActive ? 'bg-white/10' : 'bg-gray-100'}`}>
                    <cat.icon size={18} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">{cat.label}</span>
                </div>
                <ChevronRight size={14} className={`transform transition-all ${isActive ? 'rotate-90' : ''}`} />
              </button>

              {isActive && (
                <div className="px-2 pb-6 pt-4 space-y-5 animate-in slide-in-from-top-2">
                  {cat.id === 'site' && (
                    <div className="space-y-6 bg-gray-50 p-6 rounded-[4px] border border-gray-100">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ширина участка</label>
                          <span className="text-[10px] font-bold text-blue-600">{config.siteWidth} см</span>
                        </div>
                        <input 
                          type="range" min={config.plinthWidth + 100} max="700" step="10" 
                          value={config.siteWidth} 
                          onChange={(e) => onUpdate({ siteWidth: parseInt(e.target.value) })} 
                          className="w-full h-1.5 bg-gray-200 rounded-[4px] appearance-none accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Длина участка</label>
                          <span className="text-[10px] font-bold text-blue-600">{config.siteLength} см</span>
                        </div>
                        <input 
                          type="range" min={config.plinthLength + 100} max="700" step="10" 
                          value={config.siteLength} 
                          onChange={(e) => onUpdate({ siteLength: parseInt(e.target.value) })} 
                          className="w-full h-1.5 bg-gray-200 rounded-[4px] appearance-none accent-blue-600 cursor-pointer"
                        />
                      </div>
                      

                    </div>
                  )}

                  {cat.id === 'plinth' && (
                    <div className="space-y-6">
                      <MaterialPicker selected={config.plinthMaterial} onSelect={(m) => onUpdate({ plinthMaterial: m })} label="Материал основания" />
                      
                      <div className="bg-gray-50 p-6 rounded-[4px] border border-gray-100 space-y-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ширина цоколя</label>
                            <span className="text-[10px] font-bold text-blue-600">{config.plinthWidth} см</span>
                          </div>
                          <input 
                            type="range" min="100" max="500" step="10" 
                            value={config.plinthWidth} 
                            onChange={(e) => onUpdate({ plinthWidth: parseInt(e.target.value) })} 
                            className="w-full h-1.5 bg-gray-200 rounded-[4px] appearance-none accent-blue-600 cursor-pointer"
                          />
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Длина цоколя</label>
                            <span className="text-[10px] font-bold text-blue-600">{config.plinthLength} см</span>
                          </div>
                          <input 
                            type="range" min="100" max="500" step="10" 
                            value={config.plinthLength} 
                            onChange={(e) => onUpdate({ plinthLength: parseInt(e.target.value) })} 
                            className="w-full h-1.5 bg-gray-200 rounded-[4px] appearance-none accent-blue-600 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => onUpdate({ plinth: null })}
                          className={`aspect-square flex flex-col items-center justify-center rounded-[4px] border-2 transition-all ${
                            config.plinth === null 
                              ? 'border-blue-600 bg-blue-50/50' 
                              : 'border-gray-50 bg-white'
                          }`}
                        >
                          <X size={20} className="text-gray-300 mb-2" />
                          <span className="text-[9px] font-black uppercase text-gray-400">Нет</span>
                        </button>
                        <button 
                          key="p1" 
                          onClick={() => onUpdate({ plinth: PLINTHS[0] })} 
                          className={`p-2 rounded-[4px] border-2 transition-all ${
                            config.plinth?.id === 'p1' 
                              ? 'border-blue-600 bg-blue-50/50' 
                              : 'border-gray-50 bg-white'
                          }`}
                        >
                          <GrayPreviewSquare />
                          <span className="text-[8px] font-black uppercase text-gray-600 block text-center truncate px-1">
                            Бетонная заливка
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {cat.id === 'stella' && (
                    <div className="space-y-4">
                      <MaterialPicker selected={config.stellaMaterial} onSelect={(m) => onUpdate({ stellaMaterial: m })} label="Материал стелы" />
                      
                      <div className="bg-gray-50 p-4 rounded-[4px] border border-gray-100 flex flex-col gap-4">
                        <div className="flex gap-4">
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-16 h-20 bg-white border-2 border-dashed border-gray-200 rounded-[4px] flex items-center justify-center cursor-pointer hover:border-blue-300 transition-all overflow-hidden shrink-0"
                          >
                            {config.portraitUrl ? (
                              <img src={config.portraitUrl} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={20} className="text-gray-300" />
                            )}
                          </div>
                          <textarea 
                            value={config.inscription || ''} 
                            onChange={(e) => onUpdate({ inscription: e.target.value })} 
                            className="flex-1 p-3 rounded-[4px] border border-gray-100 bg-white text-[11px] font-bold focus:ring-2 focus:ring-blue-100 focus:outline-none resize-none" 
                            rows={3} 
                            placeholder="Текст гравировки..." 
                          />
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            className="hidden" 
                          />
                        </div>
                        
                        <div className="space-y-3 px-1">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Type size={12} className="text-gray-400" />
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Размер шрифта</label>
                            </div>
                            <span className="text-[9px] font-bold text-blue-600">{Math.round(config.inscriptionFontSize * 1000)}</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.02" 
                            max="0.1" 
                            step="0.005" 
                            value={config.inscriptionFontSize} 
                            onChange={(e) => onUpdate({ inscriptionFontSize: parseFloat(e.target.value) })} 
                            className="w-full h-1 bg-gray-200 rounded-[4px] appearance-none accent-blue-600 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {STELLAS.map(item => (
                          <button 
                            key={item.id} 
                            onClick={() => onUpdate({ stella: item })}
                            className={`p-2 rounded-[4px] border-2 transition-all ${
                              config.stella?.id === item.id 
                                ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                                : 'border-gray-50 bg-white'
                            }`}
                          >
                            <div className="aspect-square bg-gray-100 rounded-[4px] mb-2 overflow-hidden flex items-center justify-center">
                              <img 
                                src={item.previewUrl} 
                                className="w-full h-full object-cover opacity-80" 
                                alt={item.name}
                              />
                            </div>
                            <span className="text-[8px] font-black uppercase block text-center truncate px-1 text-gray-600">
                              {item.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {cat.id === 'base' && (
                    <div className="space-y-4">
                      <MaterialPicker 
                        selected={config.baseMaterial} 
                        onSelect={(m) => onUpdate({ baseMaterial: m })} 
                        label="Материал подставки" 
                      />
                      <div className="grid grid-cols-2 gap-3">
                        {BASES.map(item => (
                          <button 
                            key={item.id} 
                            onClick={() => onUpdate({ base: item })}
                            className={`p-4 rounded-[4px] border-2 transition-all ${
                              config.base?.id === item.id 
                                ? 'border-blue-600 bg-blue-50/50' 
                                : 'border-gray-50 bg-white'
                            }`}
                          >
                            <GrayPreviewSquare />
                            <span className="text-[9px] font-black uppercase text-gray-700 block text-center">
                              {item.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {cat.id === 'flowerbed' && (
                    <div className="space-y-6">
                      <MaterialPicker selected={config.flowerbedMaterial} onSelect={(m) => onUpdate({ flowerbedMaterial: m })} label="Материал цветника" />
                      


                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => onUpdate({ flowerbed: null })}
                          className={`aspect-square flex flex-col items-center justify-center rounded-[4px] border-2 transition-all ${
                            config.flowerbed === null 
                              ? 'border-blue-600 bg-blue-50/50' 
                              : 'border-gray-50 bg-white'
                          }`}
                        >
                          <X size={20} className="text-gray-300 mb-2" />
                          <span className="text-[9px] font-black uppercase text-gray-400">Нет</span>
                        </button>
                        {FLOWERBEDS.map(item => (
                          <button 
                            key={item.id} 
                            onClick={() => onUpdate({ flowerbed: item })}
                            className={`p-2 rounded-[4px] border-2 transition-all ${
                              config.flowerbed?.id === item.id 
                                ? 'border-blue-600 bg-blue-50/50' 
                                : 'border-gray-50 bg-white'
                            }`}
                          >
                            <GrayPreviewSquare />
                            <span className="text-[8px] font-black uppercase text-gray-600 block text-center truncate px-1">
                              {item.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {cat.id === 'fence' && (
                    <div className="space-y-4">
                      <MaterialPicker 
                        selected={config.fenceMaterial} 
                        onSelect={(m) => onUpdate({ fenceMaterial: m })} 
                        label="Материал ограды" 
                      />
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => onUpdate({ fence: null })}
                          className={`aspect-square flex flex-col items-center justify-center rounded-[4px] border-2 transition-all ${
                            config.fence === null 
                              ? 'border-blue-600 bg-blue-50/50' 
                              : 'border-gray-50 bg-white'
                          }`}
                        >
                          <X size={20} className="text-gray-300 mb-2" />
                          <span className="text-[9px] font-black uppercase text-gray-400">Нет</span>
                        </button>
                        {FENCES.map(item => (
                          <button 
                            key={item.id} 
                            onClick={() => onUpdate({ fence: item })}
                            className={`p-2 rounded-[4px] border-2 transition-all ${
                              config.fence?.id === item.id 
                                ? 'border-blue-600 bg-blue-50/50' 
                                : 'border-gray-50 bg-white'
                            }`}
                          >
                            <GrayPreviewSquare />
                            <span className="text-[8px] font-black uppercase text-gray-600 block text-center truncate px-1">
                              {item.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {cat.id === 'extras' && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-[4px] border border-gray-100">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-4 text-center">Аксессуары (перетаскиваются)</label>

                        <div className="space-y-3">
                          {config.extras.vases.map((v, i) => (
                            <div key={v.id} className="bg-white border border-gray-100 rounded-[4px] p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black text-gray-500">Ваза {i+1}</span>
                                <button 
                                  onClick={() => onUpdate({ 
                                    extras: { 
                                      ...config.extras, 
                                      vases: config.extras.vases.filter(item => item.id !== v.id) 
                                    } 
                                  })}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                              <MaterialPicker 
                                selected={v.material} 
                                onSelect={(material) => onUpdate({
                                  extras: {
                                    ...config.extras,
                                    vases: config.extras.vases.map(item => 
                                      item.id === v.id ? { ...item, material } : item
                                    )
                                  }
                                })}
                                label="Материал вазы"
                              />
                            </div>
                          ))}
                          
                          {config.extras.tables.map((t, i) => (
                            <div key={t.id} className="bg-white border border-gray-100 rounded-[4px] p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black text-gray-500">Столик {i+1}</span>
                                <button 
                                  onClick={() => onUpdate({ 
                                    extras: { 
                                      ...config.extras, 
                                      tables: config.extras.tables.filter(item => item.id !== t.id) 
                                    } 
                                  })}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                              <MaterialPicker 
                                selected={t.material} 
                                onSelect={(material) => onUpdate({
                                  extras: {
                                    ...config.extras,
                                    tables: config.extras.tables.map(item => 
                                      item.id === t.id ? { ...item, material } : item
                                    )
                                  }
                                })}
                                label="Материал столика"
                              />
                            </div>
                          ))}
                          
                          {config.extras.benches.map((b, i) => (
                            <div key={b.id} className="bg-white border border-gray-100 rounded-[4px] p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black text-gray-500">Лавочка {i+1}</span>
                                <button 
                                  onClick={() => onUpdate({ 
                                    extras: { 
                                      ...config.extras, 
                                      benches: config.extras.benches.filter(item => item.id !== b.id) 
                                    } 
                                  })}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                              <MaterialPicker 
                                selected={b.material} 
                                onSelect={(material) => onUpdate({
                                  extras: {
                                    ...config.extras,
                                    benches: config.extras.benches.map(item => 
                                      item.id === b.id ? { ...item, material } : item
                                    )
                                  }
                                })}
                                label="Материал лавочки"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <button 
                          onClick={() => {
                            const newVase = { id: `vase-${Date.now()}`, x: 0, y: 0, material: MATERIALS[0] };
                            onUpdate({ 
                              extras: { 
                                ...config.extras, 
                                vases: [newVase, ...config.extras.vases] 
                              } 
                            });
                          }}
                          className="w-full py-3 rounded-[4px] border-2 border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center"
                        >
                          <PlusCircle size={12} className="mr-2" />
                          Ваза
                        </button>
                        <button 
                          onClick={() => {
                            const newBench = { id: `bench-${Date.now()}`, x: 0, y: 0, material: MATERIALS[0] };
                            onUpdate({ 
                              extras: { 
                                ...config.extras, 
                                benches: [newBench, ...config.extras.benches] 
                              } 
                            });
                          }}
                          className="w-full py-3 rounded-[4px] border-2 border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center"
                        >
                          <PlusCircle size={12} className="mr-2" />
                          Лавочка
                        </button>
                        <button 
                          onClick={() => {
                            const newTable = { id: `table-${Date.now()}`, x: 0, y: 0, material: MATERIALS[0] };
                            onUpdate({ 
                              extras: { 
                                ...config.extras, 
                                tables: [newTable, ...config.extras.tables] 
                              } 
                            });
                          }}
                          className="w-full py-3 rounded-[4px] border-2 border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center"
                        >
                          <PlusCircle size={12} className="mr-2" />
                          Столик
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-8 border-t bg-gray-50 space-y-3">
         <button 
           onClick={handleExport}
           disabled={isExporting}
           className={`w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[4px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-blue-100 transition-all active:scale-95 ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}`}
         >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Экспорт...
              </>
            ) : (
              <>
                <Download size={14} />
                Экспорт в PDF
              </>
            )}
         </button>
         
         <button className="w-full py-5 bg-gray-900 hover:bg-black text-white rounded-[4px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-gray-200 transition-all active:scale-95">
            Сохранить проект <ArrowRight size={14} />
         </button>
      </div>
    </div>
  );
};

export default Sidebar;
