import jsPDF from 'jspdf';
import { ConfiguratorState } from '../types';
import { INTER_FONT_BASE64 } from '../assets/fonts/inter-base64';

// Используем кастомный шрифт Inter из отдельного файла

export const exportToPDF = async (config: ConfiguratorState, canvasElement: HTMLCanvasElement | null) => {
  try {
    // First create screenshot without UI elements
    const cleanScreenshot = await captureCleanScreenshot(canvasElement);
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Добавляем кастомный шрифт Inter из base64
    if (INTER_FONT_BASE64 && INTER_FONT_BASE64.trim() !== '') {
      try {
        // Извлекаем base64 данные
        const base64Data = INTER_FONT_BASE64.replace(/data:font\/[^;]+;base64,/, '');
        
        // @ts-ignore
        doc.addFileToVFS('Inter-Regular.ttf', base64Data);
        // @ts-ignore
        doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
        doc.setFont('Inter');
      } catch (fontError) {
        console.warn('Ошибка загрузки шрифта Inter:', fontError);
        doc.setFont('helvetica');
      }
    } else {
      doc.setFont('helvetica');
    }

    // Отступы
    const margin = 15;
    let currentY = margin;
    const pageWidth = 210;
    const pageHeight = 297;

    // Сначала добавляем изображение
    if (cleanScreenshot) {
      try {
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (cleanScreenshot.height * imgWidth) / cleanScreenshot.width;
        
        // Если изображение не помещается на странице - новая страница
        if (currentY + imgHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }
        
        doc.addImage(cleanScreenshot.data, 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 10;
        
        // Image caption
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('Configuration Visualization', margin, currentY);
        currentY += 15;
        
        // Разделительная линия
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 12;
      } catch (imageError) {
        console.warn('Ошибка добавления изображения:', imageError);
      }
    }

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Memorial Complex Configuration', margin, currentY);
    currentY += 15;

    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${new Date().toLocaleDateString('en-US')} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, margin, currentY);
    currentY += 12;

    // Разделительная линия
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 12;

    // Main Parameters
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Main Parameters:', margin, currentY);
    currentY += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Site Dimensions
    doc.text(`Site Size: ${config.siteWidth} × ${config.siteLength} cm`, margin + 5, currentY);
    currentY += 8;

    // Plinth Dimensions
    doc.text(`Plinth Size: ${config.plinthWidth} × ${config.plinthLength} cm`, margin + 5, currentY);
    currentY += 8;

    // Flowerbed Dimensions
    doc.text(`Flowerbed Size: ${config.flowerbedWidth} × ${config.flowerbedLength} cm`, margin + 5, currentY);
    currentY += 12;

    // Materials
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Materials:', margin, currentY);
    currentY += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Materials list
    const materials = [
      { name: 'Stella', material: config.stellaMaterial },
      { name: 'Plinth', material: config.plinthMaterial },
      { name: 'Base', material: config.baseMaterial },
      { name: 'Flowerbed', material: config.flowerbedMaterial },
      { name: 'Fence', material: config.fenceMaterial }
    ];

    materials.forEach(({ name, material }) => {
      if (material) {
        doc.text(`${name}: ${material.name}`, margin + 5, currentY);
        currentY += 8;
      }
    });

    currentY += 8;

    // Components
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Components:', margin, currentY);
    currentY += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Components list
    const components = [
      { name: 'Stella', item: config.stella },
      { name: 'Plinth', item: config.plinth },
      { name: 'Base', item: config.base },
      { name: 'Flowerbed', item: config.flowerbed },
      { name: 'Fence', item: config.fence }
    ];

    components.forEach(({ name, item }) => {
      const itemName = item ? item.name : 'Not Selected';
      doc.text(`${name}: ${itemName}`, margin + 5, currentY);
      currentY += 8;
    });

    currentY += 8;

    // Additional Elements
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Additional Elements:', margin, currentY);
    currentY += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    doc.text(`Vases: ${config.extras.vases.length} pcs`, margin + 5, currentY);
    currentY += 8;
    doc.text(`Tables: ${config.extras.tables.length} pcs`, margin + 5, currentY);
    currentY += 8;
    doc.text(`Benches: ${config.extras.benches.length} pcs`, margin + 5, currentY);
    currentY += 12;

    // Inscription
    if (config.inscription || config.portraitUrl) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Inscription:', margin, currentY);
      currentY += 12;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      if (config.inscription) {
        const lines = doc.splitTextToSize(config.inscription, pageWidth - 2 * margin - 10);
        doc.text(lines, margin + 5, currentY);
        currentY += lines.length * 6 + 8;
      }

      if (config.portraitUrl) {
        doc.text('Portrait: uploaded', margin + 5, currentY);
        currentY += 8;
      }
      currentY += 4;
    }



    // Финальная информация
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = margin;
    } else {
      currentY += 10;
    }
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by Eternity 3D Configurator', margin, pageHeight - 15);
    doc.text(`Version: 1.0`, pageWidth - margin - 40, pageHeight - 15);

    // Сохранение файла
    const fileName = `memorial-configuration-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
    doc.save(fileName);

    return true;
  } catch (error) {
    throw error;
  }
};

// Function to create clean screenshot without UI elements
const captureCleanScreenshot = async (canvasElement: HTMLCanvasElement | null): Promise<{data: string, width: number, height: number} | null> => {
  if (!canvasElement) return null;
  
  try {
    // Временно скрываем UI элементы
    const uiElements = document.querySelectorAll('.gizmo-helper, .MuiBackdrop-root, .backdrop-blur, [class*="gizmo"]');
    const hiddenElements: HTMLElement[] = [];
    
    // Скрываем элементы
    uiElements.forEach(el => {
      const element = el as HTMLElement;
      if (element.style.display !== 'none') {
        element.style.display = 'none';
        hiddenElements.push(element);
      }
    });
    
    // Ждем немного чтобы изменения применились
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Take screenshot
    const imgData = canvasElement.toDataURL('image/png', 1.0);
    
    // Восстанавливаем элементы
    hiddenElements.forEach(el => {
      el.style.display = '';
    });
    
    return {
      data: imgData,
      width: canvasElement.width,
      height: canvasElement.height
    };
  } catch (error) {
    console.warn('Error creating clean screenshot:', error);
    return null;
  }
};

export const getCanvasElement = (): HTMLCanvasElement | null => {
  const canvases = document.querySelectorAll('canvas');
  
  // Ищем canvas с атрибутами Three.js
  for (let i = 0; i < canvases.length; i++) {
    const canvas = canvases[i] as HTMLCanvasElement;
    
    // Проверяем, что это не служебный canvas (например, для эффектов)
    if (
      canvas.style.position !== 'fixed' && 
      !canvas.classList.contains('backdrop-blur') &&
      !canvas.closest('.backdrop-blur') &&
      canvas.width > 100 &&
      canvas.height > 100
    ) {
      return canvas;
    }
  }
  
  // Если не нашли специфичный, возвращаем первый подходящий
  return canvases[0] as HTMLCanvasElement || null;
};