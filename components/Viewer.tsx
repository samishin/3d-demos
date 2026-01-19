
import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  MapControls, 
  Environment, 
  Grid,
  PerspectiveCamera,
  OrthographicCamera,
  GizmoHelper,
  GizmoViewport
} from '@react-three/drei';
import * as THREE from 'three';
import { ZoomIn, Plus, Minus } from 'lucide-react';
import Scene from './Scene';
import { ConfiguratorState } from '../types';

interface ViewerProps {
  config: ConfiguratorState;
  onUpdate: (updates: Partial<ConfiguratorState>) => void;
  isUIVisible: boolean;
}

const Viewer: React.FC<ViewerProps> = ({ config, onUpdate, isUIVisible }) => {
  const is3D = config.viewMode === '3d';
  const controlsRef = useRef<any>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.8, Math.min(3, config.cameraZoom + delta));
      
      if (Math.abs(newZoom - config.cameraZoom) > 0.01) {
        onUpdate({ cameraZoom: newZoom });
      }
    };
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [config.cameraZoom, onUpdate]);

  return (
    <div ref={canvasRef} className="relative w-full h-full">
      <Canvas 
        shadows 
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true
        }}
        camera={{ position: [0, 0, 0] }}
        className="w-full h-full"
      >
      <Suspense fallback={null}>
        {/* Set canvas background color */}
        <color attach="background" args={['#f3f4f6']} />
        
        {/* Custom HDR environment with toggleable background and ground */}
        <Environment
          files="/hdri/lilienstein_2k.hdr"
          background={config.showEnvironmentBackground}
          ground={config.showEnvironmentBackground ? { height: 1.1, radius: 300, scale: 50 } : undefined}
        />
              
        {/* Минимальное освещение для HDR - только базовый ambient */}
        <ambientLight intensity={1.4} />
              
        {/* Один направленный свет для легкого контраста */}
        <directionalLight 
          position={[5, 40, 5]} 
          intensity={1.3} 
        />
              

        
        {/* Переключение камер: Перспективная для 3D, Ортогональная для 2D плана */}
        {is3D ? (
          <PerspectiveCamera makeDefault position={[4, 4, 4]} fov={45 / config.cameraZoom} />
        ) : (
          <OrthographicCamera 
            makeDefault 
            position={[0, 10, 0]} 
            zoom={120 * config.cameraZoom} 
            near={0.1} 
            far={1000} 
          />
        )}

        <Scene config={config} onUpdate={onUpdate} isUIVisible={isUIVisible} />
        
        {is3D ? (
          <OrbitControls 
            ref={controlsRef}
            makeDefault 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2.1} 
            enablePan={true}
            enableZoom={false}
            dampingFactor={0.05}
          />
        ) : (
          <MapControls 
            ref={controlsRef}
            makeDefault 
            enableRotate={false} 
            enableZoom={false}
            screenSpacePanning={true}
            dampingFactor={0.05}
          />
        )}
        
        {/* Grid controlled by ruler toggle */}
        {config.showDimensions && (
          <Grid 
            infiniteGrid 
            fadeDistance={3000} 
            fadeStrength={80} 
            sectionColor="#aaaaaa" 
            cellColor="#dddddd"
            cellSize={1}
            sectionSize={50}
            sectionThickness={0.8}
            cellThickness={1}
          />
        )}
        
        {/* Gizmo для управления сценой */}
        {is3D && (
          <GizmoHelper
            alignment="bottom-right"
            margin={[80, 80]}
            renderPriority={1}
          >
            <GizmoViewport
              axisColors={['#ff5555', '#55ff55', '#5555ff']}
              labelColor="#ffffff"
            />
          </GizmoHelper>
        )}
        
      </Suspense>
    </Canvas>

    
    {/* Компактный зум контроль */}
    <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm p-2 rounded-[4px] shadow-xl border border-gray-100 z-20">
      <div className="flex flex-col gap-1">
        {/* Верхняя строка: иконка и процент */}
        <div className="flex items-center justify-center gap-2">
          <ZoomIn size={12} className="text-gray-500" />
          <span className="text-[8px] font-bold text-blue-600">
            {(config.cameraZoom * 100).toFixed(0)}%
          </span>
        </div>
        
        {/* Нижняя строка: кнопки и слайдер */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdate({ cameraZoom: Math.max(0.5, config.cameraZoom - 0.1) })}
            className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-[4px] text-gray-700 text-[10px] font-bold transition-all active:scale-90"
            title="Уменьшить зум"
          >
            <Minus size={10} />
          </button>
          
          <input 
            type="range" 
            min="0.8" 
            max="3" 
            step="0.1" 
            value={config.cameraZoom} 
            onChange={(e) => onUpdate({ cameraZoom: parseFloat(e.target.value) })} 
            className="flex-1 h-1 bg-gray-200 rounded-[4px] appearance-none accent-blue-600 cursor-pointer"
          />
          
          <button
            onClick={() => onUpdate({ cameraZoom: Math.min(3, config.cameraZoom + 0.1) })}
            className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-[4px] text-gray-700 text-[10px] font-bold transition-all active:scale-90"
            title="Увеличить зум"
          >
            <Plus size={10} />
          </button>
        </div>
      </div>
    </div>
  </div>
);
};

export default Viewer;
