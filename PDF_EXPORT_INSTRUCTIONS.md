# Инструкция по настройке PDF экспорта

## Требования к Canvas

Для корректной работы экспорта PDF необходимо настроить Canvas следующим образом:

```tsx
<Canvas 
  gl={{ 
    preserveDrawingBuffer: true  // Обязательно!
  }}
>
  {/* ваш контент */}
</Canvas>
```

## Настройка кастомного шрифта Inter

1. **Подготовка шрифта**:
   - Конвертируйте файл шрифта Inter в base64 формат
   - Можно использовать онлайн конвертеры или команду:
   ```bash
   base64 Inter-Regular.ttf > inter-base64.txt
   ```

2. **Добавление шрифта**:
   - Откройте файл: `/assets/fonts/inter-base64.ts`
   - Замените placeholder в переменной `INTER_FONT_BASE64` на ваш base64 код
   - Формат должен быть: `data:font/ttf;base64,YOUR_BASE64_DATA_HERE`

Пример:
```typescript
export const INTER_FONT_BASE64 = `
data:font/ttf;base64,AAEAAAASAQAABAAAR0RFRgAAAAQAAAA...
`;
```

## Как работает экспорт

1. **Захват изображения**: Используется `canvas.toDataURL()` для получения данных рендера
2. **Генерация PDF**: Библиотека jsPDF создает документ
3. **Шрифт**: Автоматически применяется кастомный шрифт Inter если доступен
4. **Содержимое**: 
   - Основные параметры конфигурации
   - Материалы и компоненты
   - Дополнительные элементы
   - Скриншот 3D сцены

## Использование

```typescript
import { exportToPDF, getCanvasElement } from './utils/pdfExporter';

// Получаем canvas элемент
const canvas = getCanvasElement();

// Экспортируем PDF
await exportToPDF(configuratorState, canvas);
```

## Особенности

- **Автоматический fallback**: Если шрифт не загрузился, используется Helvetica
- **Оптимизация размера**: Изображения масштабируются под размер A4
- **Мультистраничность**: Автоматическое создание новых страниц при необходимости
- **Качество**: Используется максимальное качество PNG (1.0)

## Troubleshooting

Если экспорт не работает:
1. Проверьте наличие `preserveDrawingBuffer: true` в Canvas
2. Убедитесь что шрифт в правильном формате base64
3. Проверьте консоль на ошибки загрузки шрифта