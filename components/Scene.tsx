
import React, { useMemo, useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useTexture, Text, Html, useGLTF, useProgress } from '@react-three/drei';
import { useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { ConfiguratorState, Material, Position2D } from '../types';
import { MATERIALS } from '../constants';
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

// Глобальный кэш текстур для предотвращения повторной загрузки
const textureCache = new Map<string, THREE.Texture>();

// Функция для получения текстуры из кэша или загрузки новой
const getCachedTexture = (url: string): Promise<THREE.Texture | null> => {
  return new Promise((resolve) => {
    // Проверяем кэш
    if (textureCache.has(url)) {
      resolve(textureCache.get(url)!);
      return;
    }
    
    // Загружаем новую текстуру
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (texture) => {
        // Настройка текстуры для оптимальной производительности
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        
        // Сохраняем в кэш
        textureCache.set(url, texture);
        resolve(texture);
      },
      undefined,
      (error) => {
        console.warn(`Не удалось загрузить текстуру ${url}:`, error);
        resolve(null);
      }
    );
  });
};

// Максимально оптимизированный компонент материалов
const PBRMaterial = React.memo(({ material, highlight }: { material: Material; highlight?: boolean }) => {
  const materialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  
  // Мемоизированный маппинг материалов к папкам текстур
  const textureConfig = useMemo(() => ({
    'm1': {folder: 'gabbo', normalExt: 'png', hasZero: false},
    'm2': {folder: 'Jalgis', normalExt: 'jpg', hasZero: false},
    'm3': {folder: 'Jeltau', normalExt: 'jpg', hasZero: false},
    'm4': {folder: 'Kapustinski', normalExt: 'jpg', hasZero: false},
    'm5': {folder: 'Rombak', normalExt: 'png', hasZero: false}
  }), []);
  
  const config = textureConfig[material.id] || textureConfig['m1'];
  const textureFolder = config.folder;
  const normalSuffix = config.hasZero ? '0_Normal' : '_Normal';
  
  // Асинхронная загрузка текстур с кэшированием
  const [textures, setTextures] = useState<{
    color: THREE.Texture | null;
    normal: THREE.Texture | null;
    roughness: THREE.Texture | null;
  }>({ color: null, normal: null, roughness: null });
  
  // Загрузка текстур один раз при смене материала
  useEffect(() => {
    let isCancelled = false;
    
    const loadAllTextures = async () => {
      try {
        // Параллельная загрузка всех текстур
        const [colorTex, normalTex, roughnessTex] = await Promise.all([
          getCachedTexture(`./textures/${textureFolder}/${textureFolder}_Color.jpg`),
          getCachedTexture(`./textures/${textureFolder}/${textureFolder}${normalSuffix}.${config.normalExt}`),
          getCachedTexture(`./textures/${textureFolder}/${textureFolder}_Roughness.jpg`)
        ]);
        
        // Только если компонент еще смонтирован
        if (!isCancelled) {
          setTextures({
            color: colorTex,
            normal: normalTex,
            roughness: roughnessTex
          });
        }
      } catch (error) {
        console.error('Ошибка загрузки текстур:', error);
      }
    };
    
    loadAllTextures();
    
    return () => {
      isCancelled = true;
    };
  }, [textureFolder, normalSuffix, config.normalExt]);
  
  // Переиспользуем существующий материал или создаем новый
  if (!materialRef.current) {
    const baseParams: any = {
      color: highlight ? "#3b82f6" : material.color,
      roughness: material.roughness,
      metalness: material.metalness,
      clearcoat: material.clearcoat || 0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.5,
      envMapIntensity: highlight ? 1.5 : 0.6,
      emissive: highlight ? "#3b82f6" : "#000000",
      emissiveIntensity: highlight ? 0.2 : 0
    };
    
    // Добавляем доступные текстуры при создании
    if (textures.color) baseParams.map = textures.color;
    if (textures.normal) {
      baseParams.normalMap = textures.normal;
      baseParams.normalScale = new THREE.Vector2(1, 1);
    }
    if (textures.roughness) baseParams.roughnessMap = textures.roughness;
    
    materialRef.current = new THREE.MeshPhysicalMaterial(baseParams);
  }

  // Быстрое обновление материала без ререндеров
  useLayoutEffect(() => {
    if (materialRef.current) {
      const mat = materialRef.current;
      
      // Мгновенное обновление всех свойств
      mat.color.setStyle(highlight ? "#3b82f6" : material.color);
      mat.roughness = material.roughness;
      mat.metalness = material.metalness;
      mat.clearcoat = material.clearcoat || 0;
      mat.emissive.setStyle(highlight ? "#3b82f6" : "#000000");
      mat.emissiveIntensity = highlight ? 0.3 : 0;
      
      // Мгновенное обновление текстур с проверкой наличия
      mat.map = textures.color || null;
      mat.normalMap = textures.normal || null;
      mat.roughnessMap = textures.roughness || null;
      
      // Отключаем normalScale если нет normal map
      if (!textures.normal) {
        mat.normalScale = new THREE.Vector2(0, 0);
      } else {
        mat.normalScale = new THREE.Vector2(1, 1);
      }
      
      mat.needsUpdate = true;
    }
  }, [textures.color, textures.normal, textures.roughness, material, highlight]);

  return <primitive object={materialRef.current} />;
});




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

// Максимально оптимизированный компонент декоративных элементов
const Draggable: React.FC<DraggableProps> = React.memo(({ 
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
  
  // Мемоизированный расчет позиции хендла
  const getHandlePosition = useCallback((): [number, number, number] => {
    switch (objectType) {
      case 'vase':
        return [0, 0.3, 0];
      case 'table':
        return [0, 0.5, 0];
      case 'bench':
        return [0, 0.4, 0];
      default:
        return handleOffset as [number, number, number];
    }
  }, [objectType, handleOffset]);
  
  const actualHandleOffset = useMemo(() => getHandlePosition(), [getHandlePosition]);
  const planeIntersect = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -heightOffset), [heightOffset]);
  
  // Максимально оптимизированный useFrame с мемоизацией
  const frameHandler = useCallback(() => {
    if (!isDragging) return;

    const intersectPoint = new THREE.Vector3();
    if (raycaster.ray) {
      raycaster.ray.intersectPlane(planeIntersect, intersectPoint);
      
      // Оптимизированный clamp без дополнительных вызовов
      const halfWidth = size[0]/2;
      const halfLength = size[1]/2;
      const newX = Math.max(bounds.minX + halfWidth, Math.min(bounds.maxX - halfWidth, intersectPoint.x));
      const newZ = Math.max(bounds.minZ + halfLength, Math.min(bounds.maxZ - halfLength, intersectPoint.z));

      // Минимальная проверка изменений
      if (Math.abs(newX - position[0]) > 0.001 || Math.abs(newZ - position[2]) > 0.001) {
        onMove([newX, position[1], newZ]);
      }
    }
  }, [isDragging, raycaster, planeIntersect, bounds, size, position, onMove]);
  
  useFrame(frameHandler);

  const handleHandleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (activeId === null) {
      setActiveId(id);
    } else if (isDragging) {
      setActiveId(null);
    }
  }, [activeId, id, isDragging, setActiveId]);

  // Оптимизированные эффекты с правильными зависимостями
  useEffect(() => {
    if (!isDragging) return;
    const handleGlobalClick = () => setActiveId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [isDragging, setActiveId]);

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
});

const StellaGeometry: React.FC<{ id: string; material: Material; highlight?: boolean; modelUrl?: string }> = React.memo(({ id, material, highlight = false, modelUrl = '' }) => {
  // Загружаем GLB модель если указана (с кэшированием по умолчанию)
  const gltfResult = modelUrl ? useGLTF(modelUrl) : { scene: null, animations: [], materials: [] };
  const { scene, animations, materials } = gltfResult;
  
  // Handle error separately since it's not always present in the return type
  const error = 'error' in gltfResult ? (gltfResult as any).error : null;
  
  if (error) {
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
      
      // === UV КООРДИНАТЫ ДЛЯ ФИГУРЫ "СЕРДЦЕ" (s5) ===
      // Здесь можно изменить UV координаты для текстурного наложения
      // geom.attributes.uv.array - массив UV координат
      // geom.attributes.uv needsUpdate = true после изменения
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
        
        // === UV КООРДИНАТЫ ДЛЯ АРОК (s2, s3) ===
        // Здесь можно изменить UV координаты для текстурного наложения
        // geom.attributes.uv.array - массив UV координат
        // geom.attributes.uv needsUpdate = true после изменения
      } else {
        geom = new THREE.BoxGeometry(width, height, depth);
        
        // === UV КООРДИНАТЫ ДЛЯ ПРЯМОУГОЛЬНЫХ СТЕЛ (s1, s6) ===
        // Здесь можно изменить UV координаты для текстурного наложения
        // geom.attributes.uv.array - массив UV координат
        // geom.attributes.uv needsUpdate = true после изменения
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
          envMapIntensity: highlight ? 1.5 : 0.6, // Пониженная интенсивность окружения
          ...(highlight && { emissive: new THREE.Color(0.1, 0.1, 0.2), emissiveIntensity: 0.2 })
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
        <meshStandardMaterial 
          color="#2d2015" 
          roughness={0.8}
          metalness={0.0}
          envMapIntensity={0.1}
        />
      </mesh>
    </group>
  );
};

// Оптимизированный компонент секции ограды с мемоизацией
const FenceSection = React.memo(({ start, end, vertical, fenceId, material, height, railThickness }: { 
  start: [number, number], 
  end: [number, number], 
  vertical?: boolean,
  fenceId: string,
  material: Material,
  height: number,
  railThickness: number
}) => {
  const dist = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
  const centerX = (start[0] + end[0]) / 2;
  const centerZ = (start[1] + end[1]) / 2;
  const rotation = vertical ? Math.PI / 2 : 0;
  
  // Максимальная оптимизация: один меш вместо множества
  const fenceGeometry = useMemo(() => {
    const group = new THREE.Group();
    
    // Создаем геометрию для всех элементов в одном меше
    const geometries: THREE.BufferGeometry[] = [];
    const positions: THREE.Vector3[] = [];
    
    // Основные рельсы
    const railGeo = new THREE.BoxGeometry(dist, railThickness, railThickness);
    
    // Верхний рельс
    geometries.push(railGeo.clone());
    positions.push(new THREE.Vector3(0, height/2 - railThickness, 0));
    
    // Нижний рельс
    geometries.push(railGeo.clone());
    positions.push(new THREE.Vector3(0, -height/2 + railThickness, 0));
    
    // Дополнительные элементы в зависимости от типа
    if (fenceId === 'f1') {
      // Кованая классика - ограниченное количество цилиндров
      const elementCount = Math.min(Math.floor(dist / 0.2), 15);
      const cylinderGeo = new THREE.CylinderGeometry(0.005, 0.005, height - railThickness * 2, 8);
      
      for (let i = 0; i < elementCount; i++) {
        geometries.push(cylinderGeo.clone());
        positions.push(new THREE.Vector3(
          (i * (dist / elementCount)) - (dist / 2) + (dist / elementCount / 2), 
          0, 
          0
        ));
      }
    } else if (fenceId === 'f3') {
      // Современный металл - три тонкие линии
      const lineGeo = new THREE.BoxGeometry(dist, 0.005, 0.005);
      [-0.05, 0, 0.05].forEach(offset => {
        geometries.push(lineGeo.clone());
        positions.push(new THREE.Vector3(0, offset, 0));
      });
    } else if (fenceId === 'f2') {
      // Гранитные столбики - сплошная балка
      const beamGeo = new THREE.BoxGeometry(dist, railThickness * 2, railThickness * 2);
      geometries.push(beamGeo);
      positions.push(new THREE.Vector3(0, 0, 0));
    } else if (fenceId === 'f4') {
      // Волна - массивная линия
      const waveGeo = new THREE.BoxGeometry(dist, 0.4, 0.08);
      geometries.push(waveGeo);
      positions.push(new THREE.Vector3(0, 0, 0));
    }
    
    // Объединяем все геометрии
    const mergedGeometry = new THREE.BufferGeometry();
    const mergedPositions: number[] = [];
    const mergedIndices: number[] = [];
    let indexOffset = 0;
    
    geometries.forEach((geo, i) => {
      const pos = geo.attributes.position.array as Float32Array;
      const position = positions[i];
      
      // Добавляем вершины с учетом позиции
      for (let j = 0; j < pos.length; j += 3) {
        mergedPositions.push(pos[j] + position.x, pos[j+1] + position.y, pos[j+2] + position.z);
      }
      
      // Добавляем индексы
      if (geo.index) {
        const indices = geo.index.array as Uint32Array;
        for (let j = 0; j < indices.length; j++) {
          mergedIndices.push(indices[j] + indexOffset);
        }
      } else {
        // Если нет индексов, создаем их
        for (let j = 0; j < pos.length / 3; j++) {
          mergedIndices.push(j + indexOffset);
        }
      }
      
      indexOffset += pos.length / 3;
    });
    
    mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(mergedPositions, 3));
    mergedGeometry.setIndex(mergedIndices);
    mergedGeometry.computeVertexNormals();
    
    return mergedGeometry;
  }, [fenceId, dist, height, railThickness]);
  
  return (
    <mesh 
      geometry={fenceGeometry} 
      position={[centerX, height / 2, centerZ]} 
      rotation={[0, rotation, 0]}
      castShadow={false} // Отключаем тени для производительности
    >
      <PBRMaterial material={material} />
    </mesh>
  );
});

// Оптимизированный компонент столбика с мемоизацией
const Pillar = React.memo(({ pos, fenceId, material, height, pillarThickness }: { 
  pos: [number, number],
  fenceId: string,
  material: Material,
  height: number,
  pillarThickness: number
}) => {
  // Для ограды "волна" используем более массивные гранитные столбики
  const pillarWidth = fenceId === 'f4' ? 0.15 : pillarThickness;
  const pillarHeight = fenceId === 'f4' ? height + 0.15 : height + 0.05;
  
  // Оптимизированная геометрия столбика
  const pillarGeometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(pillarWidth, pillarHeight, pillarWidth);
    geo.computeBoundingBox();
    return geo;
  }, [pillarWidth, pillarHeight]);
  
  return (
    <mesh 
      geometry={pillarGeometry}
      position={[pos[0], pillarHeight / 2, pos[1]]} 
      castShadow={false} // Отключаем тени для производительности
    >
      <PBRMaterial material={material} />
    </mesh>
  );
});

const FenceGeometry: React.FC<{ id: string; material: Material; width: number; length: number }> = React.memo(({ id, material, width, length }) => {
  const height = 0.4;
  const pillarThickness = id === 'f2' ? 0.12 : 0.04;
  const railThickness = 0.02;
  const entranceWidth = 0.6;
  const sideHalf = width / 2;
  const lengthHalf = length / 2;

  // Максимальная оптимизация: предвычисляем все данные
  const fenceData = useMemo(() => {
    const pillars = [
      [-sideHalf, -lengthHalf],
      [sideHalf, -lengthHalf],
      [-sideHalf, lengthHalf],
      [sideHalf, lengthHalf],
      [-entranceWidth/2, lengthHalf],
      [entranceWidth/2, lengthHalf]
    ];
    
    const sections = [
      { start: [-sideHalf, -lengthHalf], end: [sideHalf, -lengthHalf] },
      { start: [-sideHalf, -lengthHalf], end: [-sideHalf, lengthHalf], vertical: true },
      { start: [sideHalf, -lengthHalf], end: [sideHalf, lengthHalf], vertical: true },
      { start: [-sideHalf, lengthHalf], end: [-entranceWidth/2, lengthHalf] },
      { start: [entranceWidth/2, lengthHalf], end: [sideHalf, lengthHalf] }
    ];
    
    return { pillars, sections };
  }, [sideHalf, lengthHalf, entranceWidth]);

  // Оптимизированный рендеринг - используем React.memo для каждого компонента
  return (
    <group position={[0, 0, 0]}>
      {/* Отрисовка столбиков */}
      {fenceData.pillars.map((pos, index) => (
        <Pillar 
          key={`pillar-${index}`}
          pos={[pos[0], pos[1]] as [number, number]}
          fenceId={id}
          material={material}
          height={height}
          pillarThickness={pillarThickness}
        />
      ))}
      
      {/* Отрисовка секций ограды */}
      {fenceData.sections.map((section, index) => (
        <FenceSection
          key={`section-${index}`}
          start={section.start as [number, number]}
          end={section.end as [number, number]}
          vertical={section.vertical}
          fenceId={id}
          material={material}
          height={height}
          railThickness={railThickness}
        />
      ))}
    </group>
  );
});

const Scene: React.FC<SceneProps> = React.memo(({ config, onUpdate, isUIVisible }) => {
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

  // Оптимизированная загрузка текстуры портрета с кэшированием
  const [portraitTexture, setPortraitTexture] = useState<THREE.Texture | null>(null);
  
  // Загрузка текстуры портрета через useEffect для предотвращения перезагрузки сцены
  useEffect(() => {
    if (!portraitUrl) {
      setPortraitTexture(null);
      return;
    }
    
    const loader = new THREE.TextureLoader();
    loader.load(
      portraitUrl,
      (texture) => {
        // Настройка текстуры
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        
        setPortraitTexture(texture);
      },
      undefined,
      (error) => {
        console.warn('Не удалось загрузить текстуру портрета:', error);
        setPortraitTexture(null);
      }
    );
    
    // Cleanup функция для освобождения памяти
    return () => {
      if (portraitTexture) {
        portraitTexture.dispose();
      }
    };
  }, [portraitUrl]);
  
  const portraitSize = useMemo(() => {
    if (!portraitTexture || !portraitTexture.image) return { width: 0.3, height: 0.4 };
    const img = portraitTexture.image as any;
    if (!img || !img.width || !img.height) return { width: 0.3, height: 0.4 };
    const imgAspect = img.width / img.height;
    let width = 0.3, height = 0.3 / imgAspect;
    if (height > 0.4) { height = 0.4; width = height * imgAspect; }
    if (width > 0.4) { width = 0.4; height = width / imgAspect; }
    return { width, height };
  }, [portraitTexture]);

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
  
  // Load GLB model for stella s4 to extract Image_ancor position
  const gltfModel = stella?.modelUrl && stella.id === 's4' ? useGLTF(stella.modelUrl) : null;
  
  // Extract Image_ancor position from GLB model
  const imageAnchorPosition = useMemo(() => {
    if (gltfModel?.scene) {
      let anchorFound = false;
      let anchorPosition = { x: 0, y: 0.25, z: 0.075 }; // Default fallback
      
      // Log all object names in the model for debugging
      
      gltfModel.scene.traverse((child) => {
        // Log all named objects to see what's available
        if (child.name) {
        }
        
        // Primary search: exact Image_ancor
        if (child.name && child.name.toLowerCase() === 'image_ancor') {
          // Apply model scale factor (0.5) to convert local coords to world coords
          const scaleFactor = 0.5;
          anchorPosition = {
            x: child.position.x * scaleFactor,
            y: child.position.y * scaleFactor,
            z: child.position.z * scaleFactor
          };
          anchorFound = true;
        }
        
        // Fuzzy search variations
        const nameLower = child.name?.toLowerCase() || '';
        
        // Look for combinations of image/photo/portrait + anchor/placeholder/spot
        if ((nameLower.includes('image') || nameLower.includes('photo') || nameLower.includes('portrait')) && 
            (nameLower.includes('anchor') || nameLower.includes('placeholder') || nameLower.includes('spot') || nameLower.includes('frame'))) {
          if (!anchorFound) { // Only use if exact match not found
            const scaleFactor = 0.5;
            anchorPosition = {
              x: child.position.x * scaleFactor,
              y: child.position.y * scaleFactor,
              z: child.position.z * scaleFactor
            };
            anchorFound = true;
          }
        }
        
        // Look for any object that might be a face/front surface
        if (nameLower.includes('face') || nameLower.includes('front') || nameLower.includes('surface')) {
          if (!anchorFound) {
            const scaleFactor = 0.5;
            anchorPosition = {
              x: child.position.x * scaleFactor,
              y: child.position.y * scaleFactor,
              z: child.position.z * scaleFactor
            };
          }
        }
      });
      
      if (anchorFound) {
        return anchorPosition;
      } else {
      }
    }
    
    return { x: 0, y: 0.25, z: 0.075 }; // Default position
  }, [gltfModel]); 

  // Функция для расчета высоты поверхности в заданной точке
  const calculateSurfaceHeight = (x: number, y: number, plinthPos: Position2D, plinthWidth: number, plinthLength: number, siteBounds: any): number => {
    // Если основания нет (null) - все элементы на уровне земли
    if (plinth === null) {
      return 0;
    }
    
    const pw = plinthWidth / 100;
    const pl = plinthLength / 100;
    
    // Проверяем, находится ли точка на основании
    const isInPlinth = (
      x >= plinthPos.x / 100 - pw/2 && 
      x <= plinthPos.x / 100 + pw/2 &&
      y >= plinthPos.y / 100 - pl/2 && 
      y <= plinthPos.y / 100 + pl/2
    );
    
    if (isInPlinth) {
      return 0.1; // Высота основания
    }
    
    // Если вне основания - на уровне земли
    return 0;
  };

  // Максимально оптимизированная плоскость участка
  const GroundPlane = React.memo(({ width, length }: { width: number, length: number }) => {
    // Мемоизированная геометрия для предотвращения пересоздания
    const groundGeometry = useMemo(() => {
      const geo = new THREE.PlaneGeometry(width, length);
      geo.computeBoundingBox();
      return geo;
    }, [width, length]);
    
    return (
      <mesh 
        geometry={groundGeometry}
        receiveShadow 
        position={[0, -0.01, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        frustumCulled={false} // Отключаем frustum culling для плоскости
      >
        <meshStandardMaterial 
          color="#2a3d1d" 
          roughness={0.9} 
          metalness={0.0}
          envMapIntensity={0.1}
          flatShading={true} // Используем flat shading для производительности
        />
      </mesh>
    );
  });
  
  return (
    <group>

      {/* Site Dimensions */}
      {showDimensions && isUIVisible && (
        <group>
           <DimensionLine start={[-sw/2, 0, sl/2 + 0.2]} end={[sw/2, 0, sl/2 + 0.2]} value={siteWidth} color="#666" viewMode={viewMode} />
           <DimensionLine start={[sw/2 + 0.2, 0, -sl/2]} end={[sw/2 + 0.2, 0, sl/2]} value={siteLength} color="#666" horizontal={false} viewMode={viewMode} />
        </group>
      )}
      
      {/* Участок - плоскость земли */}
      <GroundPlane width={sw} length={sl} />

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
              position={[monumentPos.x / 100, plinth ? 0.1 : 0, monumentPos.y / 100]}
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
                            {/* Photo at Image_ancor position - only render when we have a portrait URL */}
                            {portraitUrl && portraitTexture && (
                              <mesh position={[imageAnchorPosition.x, imageAnchorPosition.y, imageAnchorPosition.z]}>
                                <planeGeometry args={[portraitSize.width, portraitSize.height]} />
                                <meshStandardMaterial map={portraitTexture} transparent side={THREE.DoubleSide} />
                              </mesh>
                            )}
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
            {(h) => (
              <mesh castShadow>
                <cylinderGeometry args={[0.07, 0.05, 0.25]} />
                <PBRMaterial material={v.material} highlight={h} />
              </mesh>
            )}
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
                  <PBRMaterial material={t.material} highlight={h} />
                </mesh>
                <mesh position={[0, 0.175, 0]} castShadow>
                  <cylinderGeometry args={[0.03, 0.03, 0.35]} />
                  <PBRMaterial material={t.material} highlight={h} />
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
                <PBRMaterial material={b.material} highlight={h} />
              </mesh>
              <mesh position={[-0.3, 0.1, 0]} castShadow>
                <boxGeometry args={[0.05, 0.2, 0.25]} />
                <PBRMaterial material={b.material} highlight={h} />
              </mesh>
              <mesh position={[0.3, 0.1, 0]} castShadow>
                <boxGeometry args={[0.05, 0.2, 0.25]} />
                <PBRMaterial material={b.material} highlight={h} />
              </mesh>
            </group>
          )}
        </Draggable>
      ))}
    </group>
  );
});

export default Scene;
