import React, { useEffect } from 'react';
import { resourceManager } from '../../utils/resourceManager';
import { MATERIALS } from '../../constants';

// Компонент для предзагрузки всех текстур материалов
const TexturePreloader: React.FC<{ onLoadingComplete?: () => void }> = ({ onLoadingComplete }) => {
  useEffect(() => {
    const preloadTextures = async () => {
      console.log('Начинаю предзагрузку текстур...');
      
      // Собираем все пути к текстурам
      const textureUrls: string[] = [];
      
      // Жестко заданные пути к текстурам материалов
      const materialFolders = [
        'gabbo',      // m1
        'Jalgis',     // m2
        'Jeltau',     // m3
        'Kapustinski', // m4
        'Rombak'      // m5
      ];
      
      materialFolders.forEach(folder => {
        // Цветовая текстура
        textureUrls.push(`./textures/${folder}/${folder}_Color.jpg`);
        
        // Normal map (разные расширения)
        const normalExtensions = ['jpg', 'png'];
        normalExtensions.forEach(ext => {
          textureUrls.push(`./textures/${folder}/${folder}_Normal.${ext}`);
          textureUrls.push(`./textures/${folder}/${folder}0_Normal.${ext}`);
        });
        
        // Roughness map
        textureUrls.push(`./textures/${folder}/${folder}_Roughness.jpg`);
      });
      
      try {
        // Предзагружаем все текстуры
        const loadedTextures = await resourceManager.preloadTextures(textureUrls);
        const successfulLoads = loadedTextures.filter(tex => tex !== null).length;
        
        console.log(`Предзагрузка завершена: ${successfulLoads}/${textureUrls.length} текстур загружено`);
        
        // Уведомляем родительский компонент об окончании загрузки
        if (onLoadingComplete) {
          onLoadingComplete();
        }
      } catch (error) {
        console.warn('Ошибка при предзагрузке текстур:', error);
      }
    };
    
    preloadTextures();
  }, []);
  
  return null; // Невидимый компонент
};

export default TexturePreloader;