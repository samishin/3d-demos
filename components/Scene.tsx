
import React, { useMemo, useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useTexture, Text, Html, useGLTF, useProgress } from '@react-three/drei';
import { useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { ConfiguratorState, Material, Position2D } from '../types';
import { Move, Ruler } from 'lucide-react';

interface SceneProps {
  config: ConfiguratorState;
  onUpdate: (updates: Partial<ConfiguratorState>) => void;
  isUIVisible: boolean;
}

// Reusable Dimension Component
const DimensionLine = ({ 
  start, 
  end, 
  value, 
  color = "#3b82f6", 
  offset = 0.2, 
  horizontal = true,
  viewMode = "3d"
}: { 
  start: [number, number, number], 
  end: [number, number, number], 
  value: number, 
  color?: string,
  offset?: number,
  horizontal?: boolean,
  viewMode?: "2d" | "3d"
}) => {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end]);

  const center = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2 + (viewMode === "2d" ? 0.05 : 0.1),
    (start[2] + end[2]) / 2
  ];

  return (
    <group>
      <line>
        <bufferGeometry attach="geometry" onUpdate={self => self.setFromPoints(points)} />
        <lineBasicMaterial attach="material" color={color} linewidth={2} />
      </line>
      {/* Ticks - ориентация зависит от режима и направления */}
      <mesh position={start} rotation={[0, horizontal ? 0 : Math.PI/2, viewMode === "2d" ? -Math.PI/2 : 0]}>
        <boxGeometry args={[0.005, 0.05, 0.05]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={end} rotation={[0, horizontal ? 0 : Math.PI/2, viewMode === "2d" ? -Math.PI/2 : 0]}>
        <boxGeometry args={[0.005, 0.05, 0.05]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Text - разворачиваем в 2D режиме */}
      <group rotation={[viewMode === "2d" ? -Math.PI/2 : 0, 0, 0]}>
        <Text
          position={[center[0], center[1], center[2]]}
          fontSize={0.08}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          {`${Math.round(value)} см`}
        </Text>
      </group>
    </group>
  );
};

const PBRMaterial = ({ material, highlight }: { material: Material; highlight?: boolean }) => {
  const materialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  
  // Create material once and store in ref
  if (!materialRef.current) {
    materialRef.current = new THREE.MeshPhysicalMaterial({
      color: highlight ? "#3b82f6" : material.color,
      roughness: material.roughness,
      metalness: material.metalness,
      clearcoat: material.clearcoat || 0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.8,
      envMapIntensity: highlight ? 2.5 : 1.2,
      emissive: highlight ? "#3b82f6" : "#000000",
      emissiveIntensity: highlight ? 0.3 : 0
    });
  }

  // Update material properties when they change
  useEffect(() => {
    if (materialRef.current) {
      const mat = materialRef.current;
      mat.color.setStyle(highlight ? "#3b82f6" : material.color);
      mat.roughness = material.roughness;
      mat.metalness = material.metalness;
      mat.clearcoat = material.clearcoat || 0;
      mat.emissive.setStyle(highlight ? "#3b82f6" : "#000000");
      mat.emissiveIntensity = highlight ? 0.3 : 0;
      mat.needsUpdate = true;
    }
  }, [material.color, material.roughness, material.metalness, material.clearcoat, highlight]);

  return <primitive object={materialRef.current} />;
};

const GrassPlane = ({ width, length }: { width: number, length: number }) => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial color="#2a3d1d" roughness={1} />
    </mesh>
  );
};

interface DraggableProps {
  id: string;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  position: [number, number, number];
  onMove: (pos: [number, number, number]) => void;
  children: (isDragging: boolean) => React.ReactNode;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  size?: [number, number];
  heightOffset?: number;
  handleOffset?: [number, number, number];
  isUIVisible?: boolean;
  showDimensions?: boolean;
  objectType?: 'vase' | 'table' | 'bench' | 'default'; // Новый параметр для определения типа объекта
}

const Draggable: React.FC<DraggableProps> = ({ 
  id,
  activeId,
  setActiveId,
  position, 
  onMove, 
  children, 
  bounds, 
  size = [0.4, 0.4],
  heightOffset = 0,
  handleOffset = [0, 0.5, 0],
  isUIVisible = true,
  showDimensions = true,
  objectType = 'default'
}) => {
  const isDragging = activeId === id;
  const { raycaster, gl } = useThree();
  
  // Рассчитываем оптимальное положение стрелки в зависимости от типа объекта
  const getHandlePosition = (): [number, number, number] => {
    switch (objectType) {
      case 'vase':
        return [0, 0.3, 0]; // Для вазы - выше, так как она маленькая
      case 'table':
        return [0, 0.5, 0]; // Для столика - средняя высота
      case 'bench':
        return [0, 0.4, 0]; // Для лавочки - немного ниже столика
      default:
        return handleOffset; // Используем стандартное значение
    }
  };
  
  const actualHandleOffset = getHandlePosition();
  const planeIntersect = new THREE.Plane(new THREE.Vector3(0, 1, 0), -heightOffset);
  
  useFrame(() => {
    if (!isDragging) return;

    const intersectPoint = new THREE.Vector3();
    if (raycaster.ray) {
      raycaster.ray.intersectPlane(planeIntersect, intersectPoint);
      
      const newX = THREE.MathUtils.clamp(
        intersectPoint.x, 
        bounds.minX + size[0]/2, 
        bounds.maxX - size[0]/2
      );
      const newZ = THREE.MathUtils.clamp(
        intersectPoint.z, 
        bounds.minZ + size[1]/2, 
        bounds.maxZ - size[1]/2
      );

      if (Math.abs(newX - position[0]) > 0.001 || Math.abs(newZ - position[2]) > 0.001) {
        onMove([newX, position[1], newZ]);
      }
    }
  });

  const handleHandleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (activeId === null) {
      setActiveId(id);
    } else if (isDragging) {
      setActiveId(null);
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleGlobalClick = () => setActiveId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [isDragging]);

  useEffect(() => {
    gl.domElement.style.cursor = isDragging ? 'move' : 'default';
  }, [isDragging, gl]);

  return (
    <group position={[position[0], isDragging ? heightOffset + 0.1 : position[1], position[2]]}>
      {children(isDragging)}
      
      {showDimensions && (
        <group position={actualHandleOffset}>
          <Html center>
            <button 
              onClick={handleHandleClick}
              className={`p-2 rounded-[4px] shadow-2xl transition-all border-2 ${
                isDragging 
                  ? 'bg-blue-600 text-white border-blue-400 scale-125' 
                  : 'bg-white text-gray-400 border-gray-100 hover:text-blue-600 hover:scale-110 active:scale-90'
              }`}
              title={isDragging ? "Поставить" : "Переместить"}
            >
              <Move size={16} />
            </button>
          </Html>
        </group>
      )}

      {isDragging && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <planeGeometry args={[size[0] + 0.1, size[1] + 0.1]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  );
};

const StellaGeometry: React.FC<{ id: string; material: Material; highlight?: boolean; modelUrl?: string }> = React.memo(({ id, material, highlight = false, modelUrl = '' }) => {
  // Загружаем GLB модель если указана (с кэшированием по умолчанию)
  const gltfResult = modelUrl ? useGLTF(modelUrl) : { scene: null, animations: [], materials: [] };
  const { scene, animations, materials } = gltfResult;
  
  // Handle error separately since it's not always present in the return type
  const error = 'error' in gltfResult ? (gltfResult as any).error : null;
  
  if (error) {
    console.error('GLTF loading error:', error);
    // В случае ошибки используем программную геометрию
    modelUrl = '';
  }
  
  const geometry = useMemo(() => {
    // Если есть GLB модель - используем её
    if (scene) {
      // Возвращаем null, так как модель будет отрендерена отдельно
      return null;
    }
    
    // Иначе используем программную геометрию
    const depth = 0.1;
    let geom: THREE.BufferGeometry;

    if (id === 's5') {
      const shape = new THREE.Shape();
      shape.moveTo(0, -0.6);
      shape.bezierCurveTo(-0.7, -0.3, -0.8, 0.4, -0.4, 0.6);
      shape.bezierCurveTo(-0.2, 0.7, 0, 0.5, 0, 0.3);
      shape.bezierCurveTo(0, 0.5, 0.2, 0.7, 0.4, 0.6);
      shape.bezierCurveTo(0.8, 0.4, 0.7, -0.3, 0, -0.6);
      geom = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
    } else {
      const width = id === 's6' ? 1.4 : 0.8;
      const height = 1.2;
      if (id === 's2' || id === 's3') {
        const shape = new THREE.Shape();
        shape.moveTo(-width/2, -height/2);
        shape.lineTo(width/2, -height/2);
        shape.lineTo(width/2, height/2 - 0.2);
        if (id === 's2') shape.absarc(0, height/2 - 0.2, width/2, 0, Math.PI, false);
        else shape.bezierCurveTo(width/4, height/2 + 0.1, -width/4, height/2 - 0.3, -width/2, height/2 -0.1);
        shape.lineTo(-width/2, -height/2);
        geom = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01 });
      } else {
        geom = new THREE.BoxGeometry(width, height, depth);
      }
    }
    geom.computeBoundingBox();
    geom.center(); 
    return geom;
  }, [id, scene]);

  // Если есть GLB модель - рендерим её
  if (scene) {
    // Применяем материал ко всем мешам в сцене
    scene.traverse((child) => {
      if (child.isMesh) {
        // Создаем новый материал с нужным цветом
        child.material = new THREE.MeshPhysicalMaterial({
          color: material.color,
          roughness: material.roughness || 0.1,
          metalness: material.metalness || 0.0,
          clearcoat: material.clearcoat || 0.0,
          ...(highlight && { emissive: new THREE.Color(0.1, 0.1, 0.2) })
        });
      }
    });
    
    return (
      <group castShadow receiveShadow position={[0, 0, 0]}>
        <primitive 
          object={scene.clone()} 
          scale={[0.5, 0.5, 0.5]} // Значительно увеличиваем масштаб
          position={[0, 0, 0]}
        />
      </group>
    );
  }

  // Иначе рендерим программную геометрию
  return <mesh geometry={geometry} castShadow receiveShadow><PBRMaterial material={material} highlight={highlight} /></mesh>;
});

const BaseGeometry: React.FC<{ id: string; material: Material; stellaId?: string; width: number; depth: number; highlight?: boolean }> = ({ id, material, stellaId, width, depth, highlight = false }) => {
  const baseWidth = stellaId === 's6' ? Math.max(width, 1.6) : width;
  const height = id === 'b2' ? 0.4 : 0.2;
  if (id === 'b3') {
    return (
      <group>
        <mesh castShadow position={[0, 0.05, 0]}><boxGeometry args={[baseWidth + 0.2, 0.1, depth + 0.2]} /><PBRMaterial material={material} highlight={highlight} /></mesh>
        <mesh castShadow position={[0, 0.15, 0]}><boxGeometry args={[baseWidth, 0.1, depth]} /><PBRMaterial material={material} highlight={highlight} /></mesh>
      </group>
    );
  }
  return <mesh castShadow position={[0, height / 2, 0]}><boxGeometry args={[baseWidth, height, depth]} /><PBRMaterial material={material} highlight={highlight} /></mesh>;
};

const FlowerbedGeometry: React.FC<{ id: string; material: Material; width: number; length: number; highlight?: boolean }> = ({ id, material, width, length, highlight = false }) => {
  const h = 0.1;
  const t = 0.05;
  if (id === 'fb3') {
    return (
      <group>
         <mesh castShadow position={[0, h/2, length - t/2]}><boxGeometry args={[width, h, t]} /><PBRMaterial material={material} highlight={highlight} /></mesh>
         <mesh castShadow position={[width/2-t/2, h/2, length/2]}><boxGeometry args={[t, h, length]} /><PBRMaterial material={material} highlight={highlight} /></mesh>
         <mesh castShadow position={[-(width/2-t/2), h/2, length/2]}><boxGeometry args={[t, h, length]} /><PBRMaterial material={material} highlight={highlight} /></mesh>
         <mesh castShadow position={[0, h, length/2]}><boxGeometry args={[width-0.2, h, length-0.2]} /><PBRMaterial material={material} highlight={highlight} /></mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh castShadow position={[0, h/2, length - t/2]}><boxGeometry args={[width, h, t]} /><PBRMaterial material={material} highlight={highlight} /></mesh>
      <mesh castShadow position={[width/2-t/2, h/2, length/2]}><boxGeometry args={[t, h, length]} /><PBRMaterial material={material} highlight={highlight} /></mesh>
      <mesh castShadow position={[-(width/2-t/2), h/2, length/2]}><boxGeometry args={[t, h, length]} /><PBRMaterial material={material} highlight={highlight} /></mesh>
      {id === 'fb1' && <mesh castShadow position={[0, h/2, t/2]}><boxGeometry args={[width, h, t]} /><PBRMaterial material={material} highlight={highlight} /></mesh>}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, h * 0.4, length/2]}>
        <planeGeometry args={[width - t*2, length - t*2]} />
        <meshStandardMaterial color="#2d2015" />
      </mesh>
    </group>
  );
};

const FenceGeometry: React.FC<{ id: string; material: Material; width: number; length: number }> = ({ id, material, width, length }) => {
  const height = 0.4;
  const pillarThickness = id === 'f2' ? 0.12 : 0.04;
  const railThickness = 0.02;
  const entranceWidth = 0.6;
  const sideHalf = width / 2;
  const lengthHalf = length / 2;

  const FenceSection = ({ start, end, vertical }: { start: [number, number], end: [number, number], vertical?: boolean }) => {
    const dist = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
    const centerX = (start[0] + end[0]) / 2;
    const centerZ = (start[1] + end[1]) / 2;
    const rotation = vertical ? Math.PI / 2 : 0;
    
    // Реализация "волны" - массивная линия
    if (id === 'f4') {
      return (
        <group position={[centerX, height / 2, centerZ]} rotation={[0, rotation, 0]}>
          {/* Нижний рельс */}
          <mesh position={[0, -height/2 + railThickness, 0]} castShadow>
            <boxGeometry args={[dist, railThickness, railThickness]} />
            <PBRMaterial material={material} />
          </mesh>
          
          {/* Массивная волна (толстая линия) по центру */}
          <mesh 
            position={[0, 0, 0]} 
            castShadow
          >
            <boxGeometry args={[dist, 0.4, 0.08]} />
            <PBRMaterial material={material} />
          </mesh>
        </group>
      );
    }
    
    return (
      <group position={[centerX, height / 2, centerZ]} rotation={[0, rotation, 0]}>
        <mesh position={[0, height/2 - railThickness, 0]} castShadow><boxGeometry args={[dist, railThickness, railThickness]} /><PBRMaterial material={material} /></mesh>
        <mesh position={[0, -height/2 + railThickness, 0]} castShadow><boxGeometry args={[dist, railThickness, railThickness]} /><PBRMaterial material={material} /></mesh>
        {id === 'f1' && Array.from({ length: Math.floor(dist / 0.1) }).map((_, i) => (
          <mesh key={i} position={[(i * 0.1) - (dist / 2) + 0.05, 0, 0]} castShadow><cylinderGeometry args={[0.005, 0.005, height - railThickness * 2]} /><PBRMaterial material={material} /></mesh>
        ))}
        {id === 'f3' && [0, 0.1, -0.1].map((offset, i) => (
          <mesh key={i} position={[0, offset, 0]} castShadow><boxGeometry args={[dist, 0.01, 0.01]} /><PBRMaterial material={material} /></mesh>
        ))}
        {id === 'f2' && <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[dist, railThickness * 2, railThickness * 2]} /><PBRMaterial material={material} /></mesh>}
      </group>
    );
  };

  const Pillar = ({ pos }: { pos: [number, number] }) => {
    // Для ограды "волна" используем более массивные гранитные столбики
    const pillarWidth = id === 'f4' ? 0.15 : pillarThickness;
    const pillarHeight = id === 'f4' ? height + 0.15 : height + 0.05;
    
    return (
      <mesh position={[pos[0], pillarHeight / 2, pos[1]]} castShadow>
        <boxGeometry args={[pillarWidth, pillarHeight, pillarWidth]} />
        <PBRMaterial material={material} />
      </mesh>
    );
  };

  return (
    <group position={[0, 0, 0]}>
      <Pillar pos={[-sideHalf, -lengthHalf]} /><Pillar pos={[sideHalf, -lengthHalf]} /><Pillar pos={[-sideHalf, lengthHalf]} /><Pillar pos={[sideHalf, lengthHalf]} /><Pillar pos={[-entranceWidth/2, lengthHalf]} /><Pillar pos={[entranceWidth/2, lengthHalf]} />
      <FenceSection start={[-sideHalf, -lengthHalf]} end={[sideHalf, -lengthHalf]} /><FenceSection start={[-sideHalf, -lengthHalf]} end={[-sideHalf, lengthHalf]} vertical /><FenceSection start={[sideHalf, -lengthHalf]} end={[sideHalf, lengthHalf]} vertical /><FenceSection start={[-sideHalf, lengthHalf]} end={[-entranceWidth/2, lengthHalf]} /><FenceSection start={[entranceWidth/2, lengthHalf]} end={[sideHalf, lengthHalf]} />
    </group>
  );
};

const Scene: React.FC<SceneProps> = ({ config, onUpdate, isUIVisible }) => {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Предзагрузка GLB моделей для предотвращения "дергания"
  useGLTF.preload('/models/stella/pegasus-171.glb');

  const { 
    siteWidth, siteLength, plinthWidth, plinthLength, 
    flowerbedWidth, flowerbedLength, plinthPos, monumentPos,
    stella, base, flowerbed, plinth, fence,
    stellaMaterial, baseMaterial, flowerbedMaterial, plinthMaterial, fenceMaterial,
    extras, portraitUrl, inscription, inscriptionColor, inscriptionFontSize, showDimensions,
    viewMode
  } = config;

  const sw = siteWidth / 100; const sl = siteLength / 100;
  const pw = plinthWidth / 100; const pl = plinthLength / 100;
  const fbw = flowerbedWidth / 100; const fbl = flowerbedLength / 100;
  const baseDepth = 0.4; const baseWidth = 1.0;

  const siteBounds = useMemo(() => ({ minX: -sw/2, maxX: sw/2, minZ: -sl/2, maxZ: sl/2 }), [sw, sl]);
  const plinthBounds = useMemo(() => ({ minX: -pw/2, maxX: pw/2, minZ: -pl/2, maxZ: pl/2 }), [pw, pl]);

  // Updated URL to a stable Unsplash source for testing CORS, or use provided if it works.
  // The error "Could not load ... undefined" usually means CORS failure.
  const portraitTexture = useTexture(portraitUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop');
  
  // Debug texture loading
  useEffect(() => {
    if (portraitTexture && portraitTexture.image) {
      const img = portraitTexture.image as HTMLImageElement;
      console.log('Portrait texture loaded:', {
        url: portraitUrl,
        width: img.width,
        height: img.height,
        ready: img.complete
      });
    }
  }, [portraitTexture, portraitUrl]);
  
  const portraitSize = useMemo(() => {
    const img = portraitTexture.image as any;
    if (!img || !img.width || !img.height) return { width: 0.3, height: 0.4 };
    const imgAspect = img.width / img.height;
    let width = 0.3, height = 0.3 / imgAspect;
    if (height > 0.4) { height = 0.4; width = height * imgAspect; }
    if (width > 0.4) { width = 0.4; height = width / imgAspect; }
    return { width, height };
  }, [portraitTexture, portraitUrl]);

  // Улучшенный расчет границ текста для предотвращения выхода за края стелы
  const inscriptionLayout = useMemo(() => {
    let maxWidth = 0.45; 
    let yPos = -0.28; 

    if (stella?.id === 's6') {
      maxWidth = 1.0; 
      yPos = -0.25;
    } else if (stella?.id === 's5') {
      maxWidth = 0.35; 
      yPos = -0.15;
    } else if (stella?.id === 's2' || stella?.id === 's3') {
      maxWidth = 0.5;
      yPos = -0.32;
    } else {
      maxWidth = 0.55;
      yPos = -0.28;
    }
    
    return { maxWidth, yPos };
  }, [stella?.id]);

  const baseHeight = useMemo(() => base?.id === 'b2' ? 0.4 : 0.2, [base]);
  const stellaHalfHeight = 0.6;
  
  // Extract Image_ancor position from GLB model
  const imageAnchorPosition = useMemo(() => {
    if (stella?.modelUrl && stella.id === 's4') {
      // Load and parse the GLB model to find Image_ancor
      const gltf = useGLTF(stella.modelUrl);
      
      if (gltf.scene) {
        let anchorFound = false;
        let anchorPosition = { x: 0, y: 0.25, z: 0.075 }; // Default fallback
        
        // Log all object names in the model for debugging
        console.log('Scanning GLB model objects:');
        
        gltf.scene.traverse((child) => {
          // Log all named objects to see what's available
          if (child.name) {
            console.log('- Object:', child.name, '| Type:', child.type, '| Position:', child.position);
          }
          
          // Primary search: exact Image_ancor
          if (child.name && child.name.toLowerCase() === 'image_ancor') {
            console.log('✅ FOUND EXACT MATCH - Image_ancor object:', child.name, 'at position:', child.position);
            // Apply model scale factor (0.5) to convert local coords to world coords
            const scaleFactor = 0.5;
            anchorPosition = {
              x: child.position.x * scaleFactor,
              y: child.position.y * scaleFactor,
              z: child.position.z * scaleFactor
            };
            console.log('📏 Scaled position:', anchorPosition);
            anchorFound = true;
          }
          
          // Fuzzy search variations
          const nameLower = child.name?.toLowerCase() || '';
          
          // Look for combinations of image/photo/portrait + anchor/placeholder/spot
          if ((nameLower.includes('image') || nameLower.includes('photo') || nameLower.includes('portrait')) && 
              (nameLower.includes('anchor') || nameLower.includes('placeholder') || nameLower.includes('spot') || nameLower.includes('frame'))) {
            console.log('🎯 Found potential anchor object:', child.name, 'at position:', child.position);
            if (!anchorFound) { // Only use if exact match not found
              const scaleFactor = 0.5;
              anchorPosition = {
                x: child.position.x * scaleFactor,
                y: child.position.y * scaleFactor,
                z: child.position.z * scaleFactor
              };
              console.log('📏 Scaled backup position:', anchorPosition);
              anchorFound = true;
            }
          }
          
          // Look for any object that might be a face/front surface
          if (nameLower.includes('face') || nameLower.includes('front') || nameLower.includes('surface')) {
            console.log('🔍 Found face-related object:', child.name, 'at position:', child.position);
            if (!anchorFound) {
              const scaleFactor = 0.5;
              anchorPosition = {
                x: child.position.x * scaleFactor,
                y: child.position.y * scaleFactor,
                z: child.position.z * scaleFactor
              };
              console.log('📏 Scaled face position:', anchorPosition);
            }
          }
        });
        
        if (anchorFound) {
          console.log('🎯 Using Image_ancor position:', anchorPosition);
          console.log('📏 Photo size:', portraitSize);
          console.log('📐 World coordinates check - X:', anchorPosition.x, 'Y:', anchorPosition.y, 'Z:', anchorPosition.z);
          return anchorPosition;
        } else {
          console.log('Image_ancor not found, using default position');
        }
      }
    }
    
    return { x: 0, y: 0.25, z: 0.075 }; // Default position
  }, [stella]); 

  // Функция для расчета высоты поверхности в заданной точке
  const calculateSurfaceHeight = (x: number, y: number, plinthPos: Position2D, plinthWidth: number, plinthLength: number, siteBounds: any): number => {
    const pw = plinthWidth / 100;
    const pl = plinthLength / 100;
    
    // Проверяем, находится ли точка на цоколе
    const isInPlinth = (
      x >= plinthPos.x / 100 - pw/2 && 
      x <= plinthPos.x / 100 + pw/2 &&
      y >= plinthPos.y / 100 - pl/2 && 
      y <= plinthPos.y / 100 + pl/2
    );
    
    if (isInPlinth) {
      return 0.1; // Высота цоколя
    }
    
    // Если вне цоколя - на уровне земли
    return 0;
  };

  return (
    <group>
      <GrassPlane width={sw} length={sl} />

      {/* Site Dimensions */}
      {showDimensions && isUIVisible && (
        <group>
           <DimensionLine start={[-sw/2, 0, sl/2 + 0.2]} end={[sw/2, 0, sl/2 + 0.2]} value={siteWidth} color="#666" viewMode={viewMode} />
           <DimensionLine start={[sw/2 + 0.2, 0, -sl/2]} end={[sw/2 + 0.2, 0, sl/2]} value={siteLength} color="#666" horizontal={false} viewMode={viewMode} />
        </group>
      )}

      {fence && <FenceGeometry id={fence.id} material={fenceMaterial} width={sw} length={sl} />}

      <Draggable
        id="plinth"
        activeId={activeDragId}
        setActiveId={setActiveDragId}
        position={[plinthPos.x / 100, 0, plinthPos.y / 100]}
        bounds={siteBounds}
        size={[pw, pl]}
        onMove={(pos) => onUpdate({ plinthPos: { x: pos[0] * 100, y: pos[2] * 100 } })}
        handleOffset={[pw/2 + 0.2, 0.1, pl/2 + 0.2]}
        isUIVisible={isUIVisible}
        showDimensions={showDimensions}
      >
        {(isDraggingPlinth) => (
          <group>
            {plinth && (
              <mesh position={[0, 0.05, 0]} receiveShadow>
                <boxGeometry args={[pw, 0.1, pl]} />
                <PBRMaterial material={plinthMaterial} highlight={isDraggingPlinth} />
              </mesh>
            )}

            {/* Plinth Dimensions */}
            {showDimensions && plinth && isUIVisible && (
              <group position={[0, 0.1, 0]}>
                 <DimensionLine start={[-pw/2, 0, pl/2 + 0.1]} end={[pw/2, 0, pl/2 + 0.1]} value={plinthWidth} color="#3b82f6" viewMode={viewMode} />
                 <DimensionLine start={[pw/2 + 0.1, 0, -pl/2]} end={[pw/2 + 0.1, 0, pl/2]} value={plinthLength} color="#3b82f6" horizontal={false} viewMode={viewMode} />
              </group>
            )}

            <Draggable
              id="monument"
              activeId={activeDragId}
              setActiveId={setActiveDragId}
              position={[monumentPos.x / 100, 0.1, monumentPos.y / 100]}
              bounds={plinthBounds}
              size={[Math.max(fbw, 1.0), Math.min(baseDepth, fbl + baseDepth - 0.2)]}
              heightOffset={0.1}
              onMove={(pos) => onUpdate({ monumentPos: { x: pos[0] * 100, y: (pos[2] + (fbl + baseDepth - 0.2)/2) * 100 } })}
              handleOffset={[0, 1.5, -(fbl + baseDepth - 0.2)/2]}
              isUIVisible={isUIVisible}
              showDimensions={showDimensions}
            >
              {(isDraggingMon) => (
                <group position={[0, 0, -(fbl + baseDepth - 0.2)/2]}>
                  {base && (
                    <group>
                      <BaseGeometry id={base.id} material={baseMaterial} stellaId={stella?.id} width={baseWidth} depth={baseDepth} highlight={isDraggingMon} />
                      {stella && (
                        <group position={[0, baseHeight, 0]}>
                          <group position={[0, stellaHalfHeight, 0]}>
                            <StellaGeometry id={stella.id} material={stellaMaterial} highlight={isDraggingMon} modelUrl={stella.modelUrl} />
                            {/* Photo at Image_ancor position */}
                            <mesh position={[imageAnchorPosition.x, imageAnchorPosition.y, imageAnchorPosition.z]}>
                              <planeGeometry args={[portraitSize.width, portraitSize.height]} />
                              <meshStandardMaterial map={portraitTexture} transparent side={THREE.DoubleSide} />
                            </mesh>
                            {inscription && (
                              <Text 
                                position={[0, inscriptionLayout.yPos, imageAnchorPosition.z + 0.01]} 
                                fontSize={inscriptionFontSize} 
                                color={inscriptionColor} 
                                maxWidth={inscriptionLayout.maxWidth} 
                                textAlign="center" 
                                anchorX="center" 
                                anchorY="middle"
                                overflowWrap="break-word"
                                lineHeight={1.2}
                              >
                                {inscription}
                              </Text>
                            )}
                          </group>
                        </group>
                      )}
                      {flowerbed && (
                        <group position={[0, 0, baseDepth - 0.2]}>
                          <FlowerbedGeometry id={flowerbed.id} material={flowerbedMaterial} width={fbw} length={fbl} highlight={isDraggingMon} />
                          {/* Flowerbed Dimensions */}
                          {showDimensions && isUIVisible && (
                            <group position={[0, 0.1, fbl/2]}>
                              <DimensionLine start={[-fbw/2, 0, fbl/2 + 0.05]} end={[fbw/2, 0, fbl/2 + 0.05]} value={flowerbedWidth} color="#22c55e" viewMode={viewMode} />
                              <DimensionLine start={[fbw/2 + 0.05, 0, -fbl/2]} end={[fbw/2 + 0.05, 0, fbl/2]} value={flowerbedLength} color="#22c55e" horizontal={false} viewMode={viewMode} />
                            </group>
                          )}
                        </group>
                      )}
                    </group>
                  )}
                  {isDraggingMon && (
                    <mesh position={[0, -0.05, (fbl + baseDepth - 0.2)/2]} rotation={[-Math.PI/2, 0, 0]}>
                       <planeGeometry args={[Math.max(fbw, 1.0) + 0.2, Math.min(baseDepth, fbl + baseDepth - 0.2) + 0.2]} />
                       <meshBasicMaterial color="#3b82f6" transparent opacity={0.1} />
                    </mesh>
                  )}
                </group>
              )}
            </Draggable>
          </group>
        )}
      </Draggable>

      {extras.vases.map((v) => (
        // Определяем высоту вазы в зависимости от местоположения
        <Draggable 
          id={v.id} 
          activeId={activeDragId} 
          setActiveId={setActiveDragId} 
          key={v.id} 
          position={[v.x, calculateSurfaceHeight(v.x, v.y, plinthPos, plinthWidth, plinthLength, siteBounds) + 0.125, v.y]} 
          bounds={siteBounds} 
          size={[0.15, 0.15]} 
          heightOffset={0.1} 
          onMove={(pos) => onUpdate({ 
            extras: { 
              ...extras, 
              vases: extras.vases.map(item => 
                item.id === v.id ? { ...item, x: pos[0], y: pos[2] } : item
              ) 
            } 
          })} 
          isUIVisible={isUIVisible} 
          showDimensions={showDimensions}
          objectType="vase"
        >
          {(h) => <mesh castShadow><cylinderGeometry args={[0.07, 0.05, 0.25]} /><PBRMaterial material={stellaMaterial} highlight={h} /></mesh>}
        </Draggable>
      ))}
      {extras.tables.map((t) => (
        <Draggable 
          id={t.id} 
          activeId={activeDragId} 
          setActiveId={setActiveDragId} 
          key={t.id} 
          position={[t.x, calculateSurfaceHeight(t.x, t.y, plinthPos, plinthWidth, plinthLength, siteBounds), t.y]} 
          bounds={siteBounds} 
          size={[0.4, 0.4]} 
          heightOffset={0.1} 
          onMove={(pos) => onUpdate({ 
            extras: { 
              ...extras, 
              tables: extras.tables.map(item => 
                item.id === t.id ? { ...item, x: pos[0], y: pos[2] } : item
              ) 
            } 
          })} 
          isUIVisible={isUIVisible} 
          showDimensions={showDimensions}
          objectType="table"
        >
          {(h) => (
            <group>
              <mesh position={[0, 0.35, 0]} castShadow>
                <cylinderGeometry args={[0.25, 0.25, 0.05]} />
                <PBRMaterial material={baseMaterial} highlight={h} />
              </mesh>
              <mesh position={[0, 0.175, 0]} castShadow>
                <cylinderGeometry args={[0.03, 0.03, 0.35]} />
                <PBRMaterial material={baseMaterial} highlight={h} />
              </mesh>
            </group>
          )}
        </Draggable>
      ))}
      {extras.benches.map((b) => (
        <Draggable 
          id={b.id} 
          activeId={activeDragId} 
          setActiveId={setActiveDragId} 
          key={b.id} 
          position={[b.x, calculateSurfaceHeight(b.x, b.y, plinthPos, plinthWidth, plinthLength, siteBounds), b.y]} 
          bounds={siteBounds} 
          size={[0.8, 0.4]} 
          heightOffset={0.1} 
          onMove={(pos) => onUpdate({ 
            extras: { 
              ...extras, 
              benches: extras.benches.map(item => 
                item.id === b.id ? { ...item, x: pos[0], y: pos[2] } : item
              ) 
            } 
          })} 
          isUIVisible={isUIVisible} 
          showDimensions={showDimensions}
          objectType="bench"
        >
          {(h) => (
            <group>
              <mesh position={[0, 0.2, 0]} castShadow>
                <boxGeometry args={[0.8, 0.05, 0.3]} />
                <PBRMaterial material={baseMaterial} highlight={h} />
              </mesh>
              <mesh position={[-0.3, 0.1, 0]} castShadow>
                <boxGeometry args={[0.05, 0.2, 0.25]} />
                <PBRMaterial material={baseMaterial} highlight={h} />
              </mesh>
              <mesh position={[0.3, 0.1, 0]} castShadow>
                <boxGeometry args={[0.05, 0.2, 0.25]} />
                <PBRMaterial material={baseMaterial} highlight={h} />
              </mesh>
            </group>
          )}
        </Draggable>
      ))}
    </group>
  );
};

export default Scene;
