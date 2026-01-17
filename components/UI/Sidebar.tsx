
import React, { useState, useRef } from 'react';
import { ConfiguratorState, Category, Material } from '../../types';
import { MATERIALS, STELLAS, BASES, FENCES, FLOWERBEDS, PLINTHS } from '../../constants';
import { exportToPDF, getCanvasElement } from '../../utils/pdfExporter';
import { 
  Maximize, Layers, Box, Grid3X3, Palette, Flower, 
  Fence as FenceIcon, PlusCircle, ChevronRight, X, 
  Upload, Image as ImageIcon, ArrowRight, Move, Type, Ruler,
  Download
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
}> = ({ selected, onSelect, label = "Материал" }) => (
  <div className="bg-gray-50/50 p-4 rounded-[4px] border border-gray-100">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">{label}</label>
    <div className="flex flex-wrap gap-2">
      {MATERIALS.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m)}
          className={`w-8 h-8 rounded-[4px] border-2 transition-all transform active:scale-90 ${
            selected.id === m.id ? 'border-blue-600 scale-110 shadow-lg' : 'border-transparent hover:border-gray-300'
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
    { id: 'plinth', label: 'Цоколь', icon: Grid3X3 },
    { id: 'stella', label: 'Стела', icon: Box },
    { id: 'base', label: 'Подставка', icon: Layers },
    { id: 'flowerbed', label: 'Цветник', icon: Flower },
    { id: 'fence', label: 'Ограда', icon: FenceIcon },
    { id: 'extras', label: 'Декор', icon: PlusCircle },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create object URL for the uploaded file
      const url = URL.createObjectURL(file);
      console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
      onUpdate({ portraitUrl: url });
      
      // Clean up previous URL if it exists
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
      alert('Не удалось экспортировать в PDF. Попробуйте еще раз.');
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
                onClick={() => setActiveCategory(cat.id)}
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
                      <MaterialPicker selected={config.plinthMaterial} onSelect={(m) => onUpdate({ plinthMaterial: m })} label="Материал цоколя" />
                      
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
                        {PLINTHS.map(item => (
                          <button key={item.id} onClick={() => onUpdate({ plinth: item })} className={`p-4 rounded-[4px] border-2 transition-all ${config.plinth?.id === item.id ? 'border-blue-600 bg-blue-50/50' : 'border-gray-50 bg-white hover:border-gray-200'}`}>
                             <GrayPreviewSquare />
                             <span className="text-[9px] font-black uppercase text-gray-700 tracking-wider block text-center">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {cat.id === 'stella' && (
                    <div className="space-y-4">
                      <MaterialPicker selected={config.stellaMaterial} onSelect={(m) => onUpdate({ stellaMaterial: m })} label="Материал стелы" />
                      
                      <div className="bg-gray-50 p-4 rounded-[4px] border border-gray-100 flex flex-col gap-4">
                        <div className="flex gap-4">
                          <div onClick={() => fileInputRef.current?.click()} className="w-16 h-20 bg-white border-2 border-dashed border-gray-200 rounded-[4px] flex items-center justify-center cursor-pointer hover:border-blue-300 transition-all overflow-hidden shrink-0">
                            {config.portraitUrl ? <img src={config.portraitUrl} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-gray-300" />}
                          </div>
                          <textarea 
                            value={config.inscription || ''} 
                            onChange={(e) => onUpdate({ inscription: e.target.value })} 
                            className="flex-1 p-3 rounded-[4px] border border-gray-100 bg-white text-[11px] font-bold focus:ring-2 focus:ring-blue-100 focus:outline-none resize-none" 
                            rows={3} 
                            placeholder="Текст гравировки..." 
                          />
                          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
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
                            type="range" min="0.02" max="0.1" step="0.005" 
                            value={config.inscriptionFontSize} 
                            onChange={(e) => onUpdate({ inscriptionFontSize: parseFloat(e.target.value) })} 
                            className="w-full h-1 bg-gray-200 rounded-[4px] appearance-none accent-blue-600 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {STELLAS.map(item => (
                          <button key={item.id} onClick={() => onUpdate({ stella: item })} className={`p-2 rounded-[4px] border-2 transition-all ${config.stella?.id === item.id ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-gray-50 bg-white'}`}>
                            <div className="aspect-square bg-gray-100 rounded-[4px] mb-2 overflow-hidden flex items-center justify-center">
                               <img src={item.previewUrl} className="w-full h-full object-cover opacity-80" />
                            </div>
                            <span className="text-[8px] font-black uppercase block text-center truncate px-1 text-gray-600">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {cat.id === 'base' && (
                    <div className="space-y-4">
                       <MaterialPicker selected={config.baseMaterial} onSelect={(m) => onUpdate({ baseMaterial: m })} label="Материал подставки" />
                       <div className="grid grid-cols-2 gap-3">
                        {BASES.map(item => (
                          <button key={item.id} onClick={() => onUpdate({ base: item })} className={`p-4 rounded-2xl border-2 transition-all ${config.base?.id === item.id ? 'border-blue-600 bg-blue-50/50' : 'border-gray-50 bg-white'}`}>
                             <GrayPreviewSquare />
                             <span className="text-[9px] font-black uppercase text-gray-700 block text-center">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {cat.id === 'flowerbed' && (
                    <div className="space-y-6">
                      <MaterialPicker selected={config.flowerbedMaterial} onSelect={(m) => onUpdate({ flowerbedMaterial: m })} label="Материал цветника" />
                      
                      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ширина цветника</label>
                            <span className="text-[10px] font-bold text-blue-600">{config.flowerbedWidth} см</span>
                          </div>
                          <input 
                            type="range" min="40" max={config.plinthWidth} step="5" 
                            value={config.flowerbedWidth} 
                            onChange={(e) => onUpdate({ flowerbedWidth: parseInt(e.target.value) })} 
                            className="w-full h-1.5 bg-gray-200 rounded-[4px] appearance-none accent-blue-600 cursor-pointer"
                          />
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Длина цветника</label>
                            <span className="text-[10px] font-bold text-blue-600">{config.flowerbedLength} см</span>
                          </div>
                          <input 
                            type="range" min="40" max={config.plinthLength - 40} step="5" 
                            value={config.flowerbedLength} 
                            onChange={(e) => onUpdate({ flowerbedLength: parseInt(e.target.value) })} 
                            className="w-full h-1.5 bg-gray-200 rounded-[4px] appearance-none accent-blue-600 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => onUpdate({ flowerbed: null })} className={`aspect-square flex flex-col items-center justify-center rounded-[4px] border-2 transition-all ${config.flowerbed === null ? 'border-blue-600 bg-blue-50/50' : 'border-gray-50 bg-white'}`}>
                           <X size={20} className="text-gray-300 mb-2" />
                           <span className="text-[9px] font-black uppercase text-gray-400">Нет</span>
                        </button>
                        {FLOWERBEDS.map(item => (
                          <button key={item.id} onClick={() => onUpdate({ flowerbed: item })} className={`p-2 rounded-[4px] border-2 transition-all ${config.flowerbed?.id === item.id ? 'border-blue-600 bg-blue-50/50' : 'border-gray-50 bg-white'}`}>
                             <GrayPreviewSquare />
                             <span className="text-[8px] font-black uppercase text-gray-600 block text-center truncate px-1">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {cat.id === 'fence' && (
                    <div className="space-y-4">
                       <MaterialPicker selected={config.fenceMaterial} onSelect={(m) => onUpdate({ fenceMaterial: m })} label="Материал ограды" />
                       
                       <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => onUpdate({ fence: null })} className={`aspect-square flex flex-col items-center justify-center rounded-2xl border-2 transition-all ${config.fence === null ? 'border-blue-600 bg-blue-50/50' : 'border-gray-50 bg-white'}`}>
                           <X size={20} className="text-gray-300 mb-2" />
                           <span className="text-[9px] font-black uppercase text-gray-400">Нет</span>
                        </button>
                        {FENCES.map(item => (
                          <button key={item.id} onClick={() => onUpdate({ fence: item })} className={`p-2 rounded-[4px] border-2 transition-all ${config.fence?.id === item.id ? 'border-blue-600 bg-blue-50/50' : 'border-gray-50 bg-white'}`}>
                             <GrayPreviewSquare />
                             <span className="text-[8px] font-black uppercase text-gray-600 block text-center truncate px-1">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {cat.id === 'extras' && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-[4px] border border-gray-100">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-4 text-center">Аксессуары (перетаскиваются)</label>

                        <div className="space-y-2">
                          {config.extras.vases.map((v, i) => (
                            <div key={v.id} className="px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[8px] font-bold text-gray-500 flex items-center gap-2">
                              Ваза {i+1}
                              <button onClick={() => onUpdate({ extras: { ...config.extras, vases: config.extras.vases.filter(item => item.id !== v.id) } })} className="text-red-400 hover:text-red-600"><X size={10} /></button>
                            </div>
                          ))}
                          {config.extras.tables.map((t, i) => (
                            <div key={t.id} className="px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[8px] font-bold text-gray-500 flex items-center gap-2">
                              Столик {i+1}
                              <button onClick={() => onUpdate({ extras: { ...config.extras, tables: config.extras.tables.filter(item => item.id !== t.id) } })} className="text-red-400 hover:text-red-600"><X size={10} /></button>
                            </div>
                          ))}
                          {config.extras.benches.map((b, i) => (
                            <div key={b.id} className="px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[8px] font-bold text-gray-500 flex items-center gap-2">
                              Лавочка {i+1}
                              <button onClick={() => onUpdate({ extras: { ...config.extras, benches: config.extras.benches.filter(item => item.id !== b.id) } })} className="text-red-400 hover:text-red-600"><X size={10} /></button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <button 
                          onClick={() => {
                            const newVase = { id: `vase-${Date.now()}`, x: 0, y: 0 };
                            onUpdate({ extras: { ...config.extras, vases: [...config.extras.vases, newVase] } });
                          }}
                          className="w-full py-3 rounded-[4px] border-2 border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center"
                        >
                          <PlusCircle size={12} className="mr-2" />
                          Ваза
                        </button>
                        <button 
                          onClick={() => {
                            const newBench = { id: `bench-${Date.now()}`, x: -0.8, y: 0.8 };
                            onUpdate({ extras: { ...config.extras, benches: [...config.extras.benches, newBench] } });
                          }}
                          className="w-full py-3 rounded-[4px] border-2 border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center"
                        >
                          <PlusCircle size={12} className="mr-2" />
                          Лавочка
                        </button>
                        <button 
                          onClick={() => {
                            const newTable = { id: `table-${Date.now()}`, x: 0.8, y: 0.8 };
                            onUpdate({ extras: { ...config.extras, tables: [...config.extras.tables, newTable] } });
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
