import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ConfiguratorState } from '../types';

/**
 * Экспорт конфигурации в PDF
 */
export const exportToPDF = async (config: ConfiguratorState, canvasElement: HTMLCanvasElement | null) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Отступы
    const margin = 15;
    let currentY = margin;
    const pageWidth = 210;
    const pageHeight = 297;

    // Заголовок
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Конфигурация мемориального комплекса', margin, currentY);
    currentY += 15;

    // Подзаголовок
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Дата: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`, margin, currentY);
    currentY += 12;

    // Разделительная линия
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 12;

    // Основные параметры
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Основные параметры:', margin, currentY);
    currentY += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Размеры участка
    doc.text(`Размеры участка: ${config.siteWidth} × ${config.siteLength} см`, margin + 5, currentY);
    currentY += 8;

    // Размеры цоколя
    doc.text(`Размеры цоколя: ${config.plinthWidth} × ${config.plinthLength} см`, margin + 5, currentY);
    currentY += 8;

    // Размеры цветника
    doc.text(`Размеры цветника: ${config.flowerbedWidth} × ${config.flowerbedLength} см`, margin + 5, currentY);
    currentY += 12;

    // Материалы
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Материалы:', margin, currentY);
    currentY += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Список материалов
    const materials = [
      { name: 'Стела', material: config.stellaMaterial },
      { name: 'Цоколь', material: config.plinthMaterial },
      { name: 'Подставка', material: config.baseMaterial },
      { name: 'Цветник', material: config.flowerbedMaterial },
      { name: 'Ограда', material: config.fenceMaterial }
    ];

    materials.forEach(({ name, material }) => {
      if (material) {
        doc.text(`${name}: ${material.name}`, margin + 5, currentY);
        currentY += 8;
      }
    });

    currentY += 8;

    // Компоненты
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Компоненты:', margin, currentY);
    currentY += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Список компонентов
    const components = [
      { name: 'Стела', item: config.stella },
      { name: 'Цоколь', item: config.plinth },
      { name: 'Подставка', item: config.base },
      { name: 'Цветник', item: config.flowerbed },
      { name: 'Ограда', item: config.fence }
    ];

    components.forEach(({ name, item }) => {
      const itemName = item ? item.name : 'Не выбрано';
      doc.text(`${name}: ${itemName}`, margin + 5, currentY);
      currentY += 8;
    });

    currentY += 8;

    // Дополнительные элементы
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Дополнительные элементы:', margin, currentY);
    currentY += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    doc.text(`Вазы: ${config.extras.vases.length} шт.`, margin + 5, currentY);
    currentY += 8;
    doc.text(`Столики: ${config.extras.tables.length} шт.`, margin + 5, currentY);
    currentY += 8;
    doc.text(`Лавочки: ${config.extras.benches.length} шт.`, margin + 5, currentY);
    currentY += 12;

    // Гравировка
    if (config.inscription || config.portraitUrl) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Гравировка:', margin, currentY);
      currentY += 12;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      if (config.inscription) {
        const lines = doc.splitTextToSize(config.inscription, pageWidth - 2 * margin - 10);
        doc.text(lines, margin + 5, currentY);
        currentY += lines.length * 6 + 8;
      }

      if (config.portraitUrl) {
        doc.text('Портрет: загружен', margin + 5, currentY);
        currentY += 8;
      }
      currentY += 4;
    }

    // Разделительная линия перед изображением
    if (currentY > pageHeight - 80) {
      doc.addPage();
      currentY = margin;
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 12;
    }

    // Добавление скриншота сцены если доступен canvas
    if (canvasElement) {
      try {
        const canvas = await html2canvas(canvasElement, {
          useCORS: true,
          scale: 1.5,
          backgroundColor: '#f9fafb',
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Если изображение не помещается на странице - новая страница
        if (currentY + imgHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }

        doc.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 10;
        
        // Подпись к изображению
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('Визуализация конфигурации', margin, currentY);
      } catch (canvasError) {
        console.warn('Не удалось создать скриншот сцены:', canvasError);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text('Скриншот сцены недоступен', margin, currentY);
      }
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
    doc.text('Сгенерировано в Eternity 3D Configurator', margin, pageHeight - 15);
    doc.text(`Версия: 1.0`, pageWidth - margin - 40, pageHeight - 15);

    // Сохранение файла
    const fileName = `memorial-configuration-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
    doc.save(fileName);

    return true;
  } catch (error) {
    console.error('Ошибка при экспорте в PDF:', error);
    throw error;
  }
};

/**
 * Получение canvas элемента из Three.js сцены
 */
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