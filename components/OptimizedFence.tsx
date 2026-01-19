import React, { useMemo } from 'react';
import * as THREE from 'three';
import PBRMaterial from './PBRMaterial';
import { Material } from '../types';

// Оптимизированный компонент секции ограды с LOD
const OptimizedFenceSection = React.memo(({ 
  start, 
  end, 
  vertical, 
  fenceId, 
  material, 
  height, 
  railThickness
}: { 
  start: [number, number]; 
  end: [number, number]; 
  vertical?: boolean;
  fenceId: string;
  material: Material;
  height: number;
  railThickness: number;
}) => {
  const dist = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
  const centerX = (start[0] + end[0]) / 2;
  const centerZ = (start[1] + end[1]) / 2;
  const rotation = vertical ? Math.PI / 2 : 0;
  
  // Упрощенная геометрия ограды с повторяющимися UV
  const fenceGeometry = useMemo(() => {
    const geometry = new THREE.BoxGeometry(dist, height, railThickness);
    
    // Настраиваем повторяющиеся UV координаты
    const uvAttribute = geometry.attributes.uv;
    const uvArray = uvAttribute.array as Float32Array;
    
    // Уменьшенный коэффициент повторения для ограды (1-2 раза на метр)
    const repeatX = Math.ceil(dist * 1.5); // Повторяем в 1.5 раза на метр длины
    const repeatY = Math.ceil(height * 1.5); // Повторяем в 1.5 раза на метр высоты
    
    // Обновляем UV координаты для всех вершин
    for (let i = 0; i < uvArray.length; i += 2) {
      uvArray[i] *= repeatX;     // U координата (горизонтальная)
      uvArray[i + 1] *= repeatY; // V координата (вертикальная)
    }
    
    uvAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }, [dist, height, railThickness]);
  
  return (
    <mesh 
      geometry={fenceGeometry} 
      position={[centerX, height / 2, centerZ]} 
      rotation={[0, rotation, 0]}
      castShadow={false}
      frustumCulled={true} // Включаем frustum culling для оград
    >
      <PBRMaterial material={material} />
    </mesh>
  );
});

// Оптимизированный компонент столбика
const OptimizedPillar = React.memo(({ 
  pos, 
  fenceId, 
  material, 
  height, 
  pillarThickness
}: { 
  pos: [number, number];
  fenceId: string;
  material: Material;
  height: number;
  pillarThickness: number;
}) => {
  const pillarWidth = fenceId === 'f4' ? 0.15 : pillarThickness;
  const pillarHeight = fenceId === 'f4' ? height + 0.15 : height + 0.05;
  
  // Простая геометрия столбика с повторяющимися UV
  const pillarGeometry = useMemo(() => {
    const geometry = new THREE.BoxGeometry(pillarWidth, pillarHeight, pillarWidth);
    
    // Настраиваем повторяющиеся UV координаты
    const uvAttribute = geometry.attributes.uv;
    const uvArray = uvAttribute.array as Float32Array;
    
    // Уменьшенный коэффициент повторения для столбиков ограды
    const repeatXY = Math.ceil(Math.max(pillarWidth, pillarHeight) * 1.5);
    
    // Обновляем UV координаты для всех вершин
    for (let i = 0; i < uvArray.length; i += 2) {
      uvArray[i] *= repeatXY;
      uvArray[i + 1] *= repeatXY;
    }
    
    uvAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }, [pillarWidth, pillarHeight]);
  
  return (
    <mesh 
      geometry={pillarGeometry}
      position={[pos[0], pillarHeight / 2, pos[1]]} 
      castShadow={false}
      frustumCulled={true}
    >
      <PBRMaterial material={material} />
    </mesh>
  );
});

// Главный компонент оптимизированной ограды
const OptimizedFenceGeometry = React.memo(({ 
  id, 
  material, 
  width, 
  length
}: { 
  id: string; 
  material: Material; 
  width: number; 
  length: number;
}) => {
  const height = 0.4;
  const pillarThickness = id === 'f2' ? 0.12 : 0.04;
  const railThickness = 0.02;
  const entranceWidth = 0.6;
  const sideHalf = width / 2;
  const lengthHalf = length / 2;
  
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
  
  return (
    <group position={[0, 0, 0]}>
      {/* Оптимизированные столбики */}
      {fenceData.pillars.map((pos, index) => (
        <OptimizedPillar 
          key={`pillar-${index}`}
          pos={[pos[0], pos[1]] as [number, number]}
          fenceId={id}
          material={material}
          height={height}
          pillarThickness={pillarThickness}
        />
      ))}
      
      {/* Оптимизированные секции */}
      {fenceData.sections.map((section, index) => (
        <OptimizedFenceSection
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

export default OptimizedFenceGeometry;