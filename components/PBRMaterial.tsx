import React, { useMemo, useState, useRef, useEffect, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { resourceManager } from '../utils/resourceManager';
import { Material } from '../types';

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
        // Параллельная загрузка всех текстур через ResourceManager
        const [colorTex, normalTex, roughnessTex] = await Promise.all([
          resourceManager.getTexture(`./textures/${textureFolder}/${textureFolder}_Color.jpg`),
          resourceManager.getTexture(`./textures/${textureFolder}/${textureFolder}${normalSuffix}.${config.normalExt}`),
          resourceManager.getTexture(`./textures/${textureFolder}/${textureFolder}_Roughness.jpg`)
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
      color: highlight ? "#3b82f6" : "#808080", // Нейтральный серый без влияния на текстуры
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
      
      // Мгностенное обновление всех свойств
      // Без цветового влияния на текстуры
      mat.color.setStyle(highlight ? "#3b82f6" : "#808080");
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

export default PBRMaterial;