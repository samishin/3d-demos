import * as THREE from 'three';
import { useState, useEffect } from 'react';

// Интерфейс для отслеживания использования ресурсов
interface ResourceUsage {
  lastUsed: number;
  referenceCount: number;
  type: 'texture' | 'geometry' | 'material' | 'model';
}

// Система кэширования и автоматического освобождения ресурсов
class ResourceManager {
  private textureCache = new Map<string, THREE.Texture>();
  private modelCache = new Map<string, any>();
  private usageTracker = new Map<string, ResourceUsage>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Пороги для автоматической очистки (в миллисекундах)
  private readonly TEXTURE_CLEANUP_THRESHOLD = 30000; // 30 секунд
  private readonly MODEL_CLEANUP_THRESHOLD = 60000;   // 60 секунд
  
  constructor() {
    this.startCleanupTimer();
  }
  
  // Получение текстуры с кэшированием
  async getTexture(url: string, options?: { 
    wrapS?: THREE.Wrapping, 
    wrapT?: THREE.Wrapping,
    generateMipmaps?: boolean 
  }): Promise<THREE.Texture | null> {
    const cacheKey = `${url}-${JSON.stringify(options || {})}`;
    
    // Проверяем кэш
    if (this.textureCache.has(cacheKey)) {
      const texture = this.textureCache.get(cacheKey)!;
      this.updateUsage(cacheKey, 'texture');
      return texture;
    }
    
    try {
      const loader = new THREE.TextureLoader();
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
          url,
          (tex) => {
            // Оптимизируем текстуру
            tex.wrapS = options?.wrapS ?? THREE.RepeatWrapping;
            tex.wrapT = options?.wrapT ?? THREE.RepeatWrapping;
            tex.magFilter = THREE.LinearFilter;
            tex.minFilter = options?.generateMipmaps === false 
              ? THREE.LinearFilter 
              : THREE.LinearMipmapLinearFilter;
            tex.generateMipmaps = options?.generateMipmaps ?? true;
            tex.needsUpdate = true;
            
            resolve(tex);
          },
          undefined,
          reject
        );
      });
      
      // Сохраняем в кэш
      this.textureCache.set(cacheKey, texture);
      this.trackResource(cacheKey, 'texture');
      
      return texture;
    } catch (error) {
      console.warn(`Failed to load texture ${url}:`, error);
      return null;
    }
  }
  
  // Получение GLB модели с кэшированием
  async getModel(url: string): Promise<any> {
    if (this.modelCache.has(url)) {
      const model = this.modelCache.get(url);
      this.updateUsage(url, 'model');
      return model;
    }
    
    try {
      // Импортируем useGLTF динамически для избежания циклических зависимостей
      const { useGLTF } = await import('@react-three/drei');
      
      // Используем внутреннюю реализацию useGLTF
      const model = useGLTF(url);
      
      this.modelCache.set(url, model);
      this.trackResource(url, 'model');
      
      return model;
    } catch (error) {
      console.warn(`Failed to load model ${url}:`, error);
      return null;
    }
  }
  
  // Предзагрузка текстур
  preloadTextures(urls: string[]): Promise<(THREE.Texture | null)[]> {
    return Promise.all(urls.map(url => this.getTexture(url)));
  }
  
  // Предзагрузка моделей
  preloadModels(urls: string[]): Promise<any[]> {
    return Promise.all(urls.map(url => this.getModel(url)));
  }
  
  // Освобождение конкретного ресурса
  releaseResource(url: string): void {
    // Освобождаем текстуру
    if (this.textureCache.has(url)) {
      const texture = this.textureCache.get(url)!;
      texture.dispose();
      this.textureCache.delete(url);
    }
    
    // Освобождаем модель (метаданные)
    if (this.modelCache.has(url)) {
      this.modelCache.delete(url);
    }
    
    // Удаляем из трекера
    this.usageTracker.delete(url);
  }
  
  // Очистка неиспользуемых ресурсов
  cleanupUnusedResources(): void {
    const now = Date.now();
    const toRemove: string[] = [];
    
    this.usageTracker.forEach((usage, key) => {
      const threshold = usage.type === 'texture' 
        ? this.TEXTURE_CLEANUP_THRESHOLD 
        : this.MODEL_CLEANUP_THRESHOLD;
      
      if (now - usage.lastUsed > threshold && usage.referenceCount === 0) {
        toRemove.push(key);
      }
    });
    
    toRemove.forEach(key => {
      console.log(`Auto-cleaning unused resource: ${key}`);
      this.releaseResource(key);
    });
  }
  
  // Принудительная очистка всего кэша
  clearAll(): void {
    // Освобождаем все текстуры
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
    
    // Очищаем модели
    this.modelCache.clear();
    
    // Очищаем трекер
    this.usageTracker.clear();
    
    console.log('ResourceManager: All resources cleared');
  }
  
  // Внутренние методы трекинга
  private trackResource(key: string, type: ResourceUsage['type']): void {
    this.usageTracker.set(key, {
      lastUsed: Date.now(),
      referenceCount: 1,
      type
    });
  }
  
  private updateUsage(key: string, type: ResourceUsage['type']): void {
    const usage = this.usageTracker.get(key);
    if (usage) {
      usage.lastUsed = Date.now();
      usage.referenceCount++;
    } else {
      this.trackResource(key, type);
    }
  }
  
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupUnusedResources();
    }, 30000); // Проверяем каждые 30 секунд
  }
  
  // Остановка таймера очистки
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearAll();
  }
}

// Глобальный экземпляр менеджера ресурсов
export const resourceManager = new ResourceManager();

// Хуки для удобного использования в React компонентах
export const useTexture = (url: string, options?: any) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  useEffect(() => {
    if (!url) {
      setTexture(null);
      return;
    }
    
    resourceManager.getTexture(url, options).then(setTexture);
    
    return () => {
      // Не освобождаем сразу, пусть система сама решает
    };
  }, [url, options]);
  
  return texture;
};

// LOD система для сложных моделей
export class LODManager {
  private lods = new Map<string, THREE.LOD>();
  
  createLOD(modelUrl: string, distances: number[] = [10, 20, 50]): THREE.LOD | null {
    const lodKey = `${modelUrl}-${distances.join('-')}`;
    
    if (this.lods.has(lodKey)) {
      return this.lods.get(lodKey)!;
    }
    
    try {
      const lod = new THREE.LOD();
      
      // Загружаем полную модель
      resourceManager.getModel(modelUrl).then(model => {
        if (model?.scene) {
          const fullModel = model.scene.clone();
          lod.addLevel(fullModel, 0);
          
          // Создаем упрощенные версии (можно использовать DRACO сжатие)
          // Пока просто клонируем с пониженным качеством
          distances.forEach((distance, index) => {
            const simplified = fullModel.clone();
            // Здесь можно добавить упрощение геометрии
            lod.addLevel(simplified, distance);
          });
        }
      });
      
      this.lods.set(lodKey, lod);
      return lod;
    } catch (error) {
      console.warn(`Failed to create LOD for ${modelUrl}:`, error);
      return null;
    }
  }
  
  clearLODs(): void {
    this.lods.clear();
  }
}

export const lodManager = new LODManager();