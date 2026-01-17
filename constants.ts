
import { Material, CatalogItem } from './types';

export const MATERIALS: Material[] = [
  { id: 'm1', name: 'Габбро-диабаз', color: '#121212', roughness: 0.03, metalness: 0.1, clearcoat: 1.0 },
  { id: 'm2', name: 'Лезниковский', color: '#4d1414', roughness: 0.05, metalness: 0.1, clearcoat: 0.8 },
  { id: 'm3', name: 'Покостовский', color: '#7a7a7a', roughness: 0.1, metalness: 0.0, clearcoat: 0.2 },
  { id: 'm4', name: 'Мрамор Коелга', color: '#e8e8e8', roughness: 0.15, metalness: 0.0, clearcoat: 0.5 },
  { id: 'm5', name: 'Матовый Бетон', color: '#888888', roughness: 0.9, metalness: 0.0 },
];

export const STELLAS: CatalogItem[] = [
  { id: 's1', name: 'Прямоугольная классика', previewUrl: '/image/stella/classic.jpg', modelUrl: '' },
  { id: 's2', name: 'Классическая арка', previewUrl: '/image/stella/arc.jpg', modelUrl: '' },
  { id: 's3', name: 'Волнистая грань', previewUrl: '/image/stella/vave.jpg', modelUrl: '' },
  { id: 's4', name: 'Pegasus', previewUrl: '/image/stella/pegasus-preview.jpg', modelUrl: '/models/stella/pegasus-171.glb' },
  { id: 's5', name: 'Форма "Сердце"', previewUrl: '/image/stella/heart.jpg', modelUrl: '' },
  { id: 's6', name: 'Двойная (Семейная)', previewUrl: '/image/stella/twins.jpg', modelUrl: '' },
];

export const BASES: CatalogItem[] = [
  { id: 'b1', name: 'Стандарт (низкая)', previewUrl: 'https://picsum.photos/200/200?random=5', modelUrl: '', type: 'standard' },
  { id: 'b2', name: 'Высокая массивная', previewUrl: 'https://picsum.photos/200/200?random=51', modelUrl: '', type: 'high' },
  { id: 'b3', name: 'Ступенчатая', previewUrl: 'https://picsum.photos/200/200?random=52', modelUrl: '', type: 'stepped' },
];

export const FLOWERBEDS: CatalogItem[] = [
  { id: 'fb1', name: 'Прямоугольник (закрытый)', previewUrl: 'https://picsum.photos/200/200?random=10', modelUrl: '', type: 'closed' },
  { id: 'fb2', name: 'Фигурный (открытый)', previewUrl: 'https://picsum.photos/200/200?random=11', modelUrl: '', type: 'open' },
  { id: 'fb3', name: 'Двойной ярус', previewUrl: 'https://picsum.photos/200/200?random=103', modelUrl: '', type: 'double' },
];

export const FENCES: CatalogItem[] = [
  { id: 'f1', name: 'Кованая классика', previewUrl: 'https://picsum.photos/200/200?random=7', modelUrl: '' },
  { id: 'f2', name: 'Гранитные столбики', previewUrl: 'https://picsum.photos/200/200?random=8', modelUrl: '' },
  { id: 'f3', name: 'Современный металл', previewUrl: 'https://picsum.photos/200/200?random=9', modelUrl: '' },
  { id: 'f4', name: 'Волна', previewUrl: 'https://picsum.photos/200/200?random=14', modelUrl: '' },
];

export const PLINTHS: CatalogItem[] = [
  { id: 'p1', name: 'Бетонная заливка', previewUrl: 'https://picsum.photos/200/200?random=12', modelUrl: '' },
  { id: 'p2', name: 'Гранитный борт', previewUrl: 'https://picsum.photos/200/200?random=13', modelUrl: '' },
];
