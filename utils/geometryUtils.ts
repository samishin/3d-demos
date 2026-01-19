import * as THREE from 'three';

// Универсальная функция для создания геометрий с повторяющимися UV координатами
export const createBoxGeometryWithUV = (
  width: number, 
  height: number, 
  depth: number,
  uvScale: number = 5 // Повторений на метр
): THREE.BoxGeometry => {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  
  // Получаем UV атрибут
  const uvAttribute = geometry.attributes.uv;
  const uvArray = uvAttribute.array as Float32Array;
  
  // Рассчитываем коэффициенты повторения для каждой оси
  const repeatX = Math.ceil(width * uvScale);
  const repeatY = Math.ceil(height * uvScale);
  const repeatZ = Math.ceil(depth * uvScale);
  
  // Обновляем UV координаты
  // UV маппинг в BoxGeometry: 
  // - faces 0,1: передняя/задняя (X,Y)
  // - faces 2,3: верхняя/нижняя (X,Z)  
  // - faces 4,5: левая/правая (Z,Y)
  
  for (let i = 0; i < uvArray.length; i += 2) {
    const faceIndex = Math.floor(i / 6); // 6 UV координат на грань
    
    if (faceIndex < 2) {
      // Передняя/задняя грани - масштабируем X,Y
      uvArray[i] *= repeatX;
      uvArray[i + 1] *= repeatY;
    } else if (faceIndex < 4) {
      // Верхняя/нижняя грани - масштабируем X,Z
      uvArray[i] *= repeatX;
      uvArray[i + 1] *= repeatZ;
    } else {
      // Боковые грани - масштабируем Z,Y
      uvArray[i] *= repeatZ;
      uvArray[i + 1] *= repeatY;
    }
  }
  
  uvAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  
  return geometry;
};

// Функция для создания цилиндрических геометрий с UV
export const createCylinderGeometryWithUV = (
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number = 8,
  uvScale: number = 5
): THREE.CylinderGeometry => {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
  
  const uvAttribute = geometry.attributes.uv;
  const uvArray = uvAttribute.array as Float32Array;
  
  const circumference = 2 * Math.PI * Math.max(radiusTop, radiusBottom);
  const repeatU = Math.ceil(circumference * uvScale);
  const repeatV = Math.ceil(height * uvScale);
  
  for (let i = 0; i < uvArray.length; i += 2) {
    uvArray[i] *= repeatU;     // По окружности
    uvArray[i + 1] *= repeatV; // По высоте
  }
  
  uvAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  
  return geometry;
};

// Функция для создания плоских геометрий с UV
export const createPlaneGeometryWithUV = (
  width: number,
  height: number,
  uvScale: number = 5
): THREE.PlaneGeometry => {
  const geometry = new THREE.PlaneGeometry(width, height);
  
  const uvAttribute = geometry.attributes.uv;
  const uvArray = uvAttribute.array as Float32Array;
  
  const repeatX = Math.ceil(width * uvScale);
  const repeatY = Math.ceil(height * uvScale);
  
  for (let i = 0; i < uvArray.length; i += 2) {
    uvArray[i] *= repeatX;
    uvArray[i + 1] *= repeatY;
  }
  
  uvAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  
  return geometry;
};

// Специализированная функция для основания с уменьшенным повторением UV
export const createPlinthGeometryWithUV = (
  width: number,
  height: number,
  depth: number
): THREE.BoxGeometry => {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  
  const uvAttribute = geometry.attributes.uv;
  const uvArray = uvAttribute.array as Float32Array;
  
  // Уменьшенный коэффициент повторения для основания (1-2 раза на метр)
  const uvScale = 1.5;
  const repeatX = Math.ceil(width * uvScale);
  const repeatY = Math.ceil(height * uvScale);
  const repeatZ = Math.ceil(depth * uvScale);
  
  for (let i = 0; i < uvArray.length; i += 2) {
    const faceIndex = Math.floor(i / 6);
    
    if (faceIndex < 2) {
      uvArray[i] *= repeatX;
      uvArray[i + 1] *= repeatY;
    } else if (faceIndex < 4) {
      uvArray[i] *= repeatX;
      uvArray[i + 1] *= repeatZ;
    } else {
      uvArray[i] *= repeatZ;
      uvArray[i + 1] *= repeatY;
    }
  }
  
  uvAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  
  return geometry;
};

// Специализированная функция для подставки с минимальным повторением UV
export const createBaseGeometryWithUV = (
  width: number,
  height: number,
  depth: number
): THREE.BoxGeometry => {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  
  const uvAttribute = geometry.attributes.uv;
  const uvArray = uvAttribute.array as Float32Array;
  
  // Очень маленький коэффициент повторения для подставки (0.5-1 раз на метр)
  const uvScale = 0.8;
  const repeatX = Math.ceil(width * uvScale);
  const repeatY = Math.ceil(height * uvScale);
  const repeatZ = Math.ceil(depth * uvScale);
  
  for (let i = 0; i < uvArray.length; i += 2) {
    const faceIndex = Math.floor(i / 6);
    
    if (faceIndex < 2) {
      uvArray[i] *= repeatX;
      uvArray[i + 1] *= repeatY;
    } else if (faceIndex < 4) {
      uvArray[i] *= repeatX;
      uvArray[i + 1] *= repeatZ;
    } else {
      uvArray[i] *= repeatZ;
      uvArray[i + 1] *= repeatY;
    }
  }
  
  uvAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  
  return geometry;
};

// Специализированная функция для стеллы с увеличенным повторением UV
export const createStellaGeometryWithUV = (
  width: number,
  height: number,
  depth: number
): THREE.BoxGeometry => {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  
  const uvAttribute = geometry.attributes.uv;
  const uvArray = uvAttribute.array as Float32Array;
  
  // Умеренный коэффициент повторения для стеллы (3 раза на метр)
  const uvScale = 3;
  const repeatX = Math.ceil(width * uvScale);
  const repeatY = Math.ceil(height * uvScale);
  const repeatZ = Math.ceil(depth * uvScale);
  
  for (let i = 0; i < uvArray.length; i += 2) {
    const faceIndex = Math.floor(i / 6);
    
    if (faceIndex < 2) {
      uvArray[i] *= repeatX;
      uvArray[i + 1] *= repeatY;
    } else if (faceIndex < 4) {
      uvArray[i] *= repeatX;
      uvArray[i + 1] *= repeatZ;
    } else {
      uvArray[i] *= repeatZ;
      uvArray[i + 1] *= repeatY;
    }
  }
  
  uvAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  
  return geometry;
};

// Специализированные функции для декоративных элементов

// Вазы - среднее повторение (3-4 раза на метр)
export const createVaseGeometryWithUV = (
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number = 8
): THREE.CylinderGeometry => {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
  
  const uvAttribute = geometry.attributes.uv;
  const uvArray = uvAttribute.array as Float32Array;
  
  const circumference = 2 * Math.PI * Math.max(radiusTop, radiusBottom);
  const uvScale = 3.5; // Средний коэффициент для ваз
  const repeatU = Math.ceil(circumference * uvScale);
  const repeatV = Math.ceil(height * uvScale);
  
  for (let i = 0; i < uvArray.length; i += 2) {
    uvArray[i] *= repeatU;     // По окружности
    uvArray[i + 1] *= repeatV; // По высоте
  }
  
  uvAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  
  return geometry;
};

// Столики - уменьшенное повторение (1-2 раза на метр)
export const createTableTopGeometryWithUV = (
  radius: number,
  height: number,
  radialSegments: number = 8
): THREE.CylinderGeometry => {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, radialSegments);
  
  const uvAttribute = geometry.attributes.uv;
  const uvArray = uvAttribute.array as Float32Array;
  
  const circumference = 2 * Math.PI * radius;
  const uvScale = 1.5; // Низкий коэффициент для столешниц
  const repeatU = Math.ceil(circumference * uvScale);
  const repeatV = Math.ceil(height * uvScale);
  
  for (let i = 0; i < uvArray.length; i += 2) {
    uvArray[i] *= repeatU;     // По окружности
    uvArray[i + 1] *= repeatV; // По высоте
  }
  
  uvAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  
  return geometry;
};

// Ножки столиков/лавочек - очень маленькое повторение (0.5-1 раз на метр)
export const createLegGeometryWithUV = (
  radius: number,
  height: number,
  radialSegments: number = 8
): THREE.CylinderGeometry => {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, radialSegments);
  
  const uvAttribute = geometry.attributes.uv;
  const uvArray = uvAttribute.array as Float32Array;
  
  const circumference = 2 * Math.PI * radius;
  const uvScale = 0.8; // Очень низкий коэффициент для ножек
  const repeatU = Math.ceil(circumference * uvScale);
  const repeatV = Math.ceil(height * uvScale);
  
  for (let i = 0; i < uvArray.length; i += 2) {
    uvArray[i] *= repeatU;     // По окружности
    uvArray[i + 1] *= repeatV; // По высоте
  }
  
  uvAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  
  return geometry;
};

// Специализированная функция для ограды с уменьшенным повторением UV
export const createFenceGeometryWithUV = (
  width: number,
  height: number,
  depth: number
): THREE.BoxGeometry => {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  
  const uvAttribute = geometry.attributes.uv;
  const uvArray = uvAttribute.array as Float32Array;
  
  // Уменьшенный коэффициент повторения для ограды (1-2 раза на метр)
  const uvScale = 1.5;
  const repeatX = Math.ceil(width * uvScale);
  const repeatY = Math.ceil(height * uvScale);
  const repeatZ = Math.ceil(depth * uvScale);
  
  for (let i = 0; i < uvArray.length; i += 2) {
    const faceIndex = Math.floor(i / 6);
    
    if (faceIndex < 2) {
      uvArray[i] *= repeatX;
      uvArray[i + 1] *= repeatY;
    } else if (faceIndex < 4) {
      uvArray[i] *= repeatX;
      uvArray[i + 1] *= repeatZ;
    } else {
      uvArray[i] *= repeatZ;
      uvArray[i + 1] *= repeatY;
    }
  }
  
  uvAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  
  return geometry;
};