import jsPDF from 'jspdf';
import { ConfiguratorState } from '../types';
import { INTER_FONT_BASE64 } from '../assets/fonts/inter-base64';

// ============================================================================
// ТИПЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

type NamedValue = string | { name: string } | null | undefined;

const getDisplayName = (value: NamedValue): string => {
  if (!value) return 'Не выбрано';
  if (typeof value === 'string') return value;
  return value.name;
};

// ============================================================================

export const exportToPDF = async (
  config: ConfiguratorState,
  canvasElement: HTMLCanvasElement | null
) => {
  try {
    const screenshot = captureCanvas(canvasElement);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // === ШРИФТ ==============================================================
    try {
      if (INTER_FONT_BASE64?.trim()) {
        const base64 = INTER_FONT_BASE64.replace(/\s+/g, '');

        // @ts-ignore
        doc.addFileToVFS('Inter-Regular.ttf', base64);
        // @ts-ignore
        doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');

        doc.setFont('Inter', 'normal');
      } else {
        doc.setFont('helvetica', 'normal');
      }
    } catch {
      doc.setFont('helvetica', 'normal');
    }

    const margin = 15;
    let y = margin;
    const pageWidth = 210;
    const pageHeight = 297;

    // === ИЗОБРАЖЕНИЕ ========================================================
    if (screenshot) {
      const imgWidth = pageWidth - margin * 2;
      const imgHeight =
        (screenshot.height * imgWidth) / screenshot.width;

      if (y + imgHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      doc.addImage(
        screenshot.data,
        'PNG',
        margin,
        y,
        imgWidth,
        imgHeight
      );

      y += imgHeight + 10;

      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text('Визуализация конфигурации', margin, y);

      y += 10;
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;
    }

    // === ЗАГОЛОВОК ==========================================================
    doc.setFontSize(20);
    doc.setTextColor(0);
    doc.text('Конфигурация мемориального комплекса', margin, y);
    y += 14;

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(
      `Дата: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString(
        'ru-RU',
        { hour: '2-digit', minute: '2-digit' }
      )}`,
      margin,
      y
    );
    y += 12;

    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    // === МАТЕРИАЛЫ ==========================================================
    section(doc, 'Материалы', margin, y);
    y += 10;

    [
      ['Стела', config.stellaMaterial],
      ['Цоколь', config.plinthMaterial],
      ['Подставка', config.baseMaterial],
      ['Цветник', config.flowerbedMaterial],
      ['Ограда', config.fenceMaterial],
    ].forEach(([label, value]) => {
      y = row(doc, `${label}: ${getDisplayName(value)}`, margin, y);
    });

    y += 6;

    // === КОМПОНЕНТЫ =========================================================
    section(doc, 'Компоненты', margin, y);
    y += 10;

    [
      ['Стела', config.stella],
      ['Цоколь', config.plinth],
      ['Подставка', config.base],
      ['Цветник', config.flowerbed],
      ['Ограда', config.fence],
    ].forEach(([label, value]) => {
      y = row(doc, `${label}: ${getDisplayName(value)}`, margin, y);
    });

    // === ПОДВАЛ =============================================================
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Сгенерировано в Eternity 3D Configurator', margin, pageHeight - 15);

    doc.save(
      `konfiguratsiya-memoriala-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, '-')}.pdf`
    );

    return true;
  } catch (e) {
    throw e;
  }
};

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ВЕРСТКИ
// ============================================================================

const section = (doc: jsPDF, text: string, x: number, y: number) => {
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`${text}:`, x, y);
};

const row = (doc: jsPDF, text: string, x: number, y: number) => {
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(text, x + 5, y);
  return y + 8;
};

// ============================================================================
// СКРИНШОТ CANVAS
// ============================================================================

// Получение элемента canvas из DOM
export const getCanvasElement = (): HTMLCanvasElement | null => {
  return document.querySelector('canvas[data-engine]') as HTMLCanvasElement || null;
};

const captureCanvas = (
  canvas: HTMLCanvasElement | null
): { data: string; width: number; height: number } | null => {
  if (!canvas) return null;

  return {
    data: canvas.toDataURL('image/png', 1),
    width: canvas.width,
    height: canvas.height,
  };
};
