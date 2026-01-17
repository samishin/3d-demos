
export type Material = {
  id: string;
  name: string;
  color: string;
  roughness: number;
  metalness: number;
  clearcoat?: number;
};

export type CatalogItem = {
  id: string;
  name: string;
  previewUrl: string;
  modelUrl: string;
  type?: string; // для расширенной логики геометрии
};

export type Position2D = {
  x: number;
  y: number;
};

export type ConfiguratorState = {
  siteWidth: number;
  siteLength: number;
  plinthWidth: number;
  plinthLength: number;
  flowerbedWidth: number;
  flowerbedLength: number;
  plinthPos: Position2D;
  monumentPos: Position2D;
  viewMode: '2d' | '3d';
  showDimensions: boolean;
  cameraZoom: number;
  
  // Индивидуальные материалы
  stellaMaterial: Material;
  baseMaterial: Material;
  fenceMaterial: Material;
  flowerbedMaterial: Material;
  plinthMaterial: Material;
  
  stella: CatalogItem | null;
  base: CatalogItem | null;
  fence: CatalogItem | null;
  flowerbed: CatalogItem | null;
  plinth: CatalogItem | null;
  
  portraitUrl: string | null;
  inscription: string;
  inscriptionColor: string;
  inscriptionFontSize: number;
  
  extras: {
    vases: { id: string; x: number; y: number }[];
    tables: { id: string; x: number; y: number }[];
    benches: { id: string; x: number; y: number }[];
  };
};

export type Category = 'site' | 'plinth' | 'stella' | 'base' | 'flowerbed' | 'fence' | 'extras';
