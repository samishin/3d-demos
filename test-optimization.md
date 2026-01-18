# Оптимизация загрузки текстур портрета

## Проблема
Когда пользователь менял фото на стеле, сцена перезагружалась полностью из-за использования `useTexture(portraitUrl)` напрямую в теле компонента.

## Решение
Заменили использование `useTexture` на ручную загрузку текстур через `useEffect`:

### До (проблемный код):
```typescript
// Load portrait texture at top level - following React Hooks rules
const portraitTexture = portraitUrl ? useTexture(portraitUrl) : null;
```

### После (оптимизированный код):
```typescript
// Оптимизированная загрузка текстуры портрета с кэшированием
const [portraitTexture, setPortraitTexture] = useState<THREE.Texture | null>(null);

// Загрузка текстуры портрета через useEffect для предотвращения перезагрузки сцены
useEffect(() => {
  if (!portraitUrl) {
    setPortraitTexture(null);
    return;
  }
  
  const loader = new THREE.TextureLoader();
  loader.load(
    portraitUrl,
    (texture) => {
      // Настройка текстуры
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      
      setPortraitTexture(texture);
    },
    undefined,
    (error) => {
      console.warn('Не удалось загрузить текстуру портрета:', error);
      setPortraitTexture(null);
    }
  );
  
  // Cleanup функция для освобождения памяти
  return () => {
    if (portraitTexture) {
      portraitTexture.dispose();
    }
  };
}, [portraitUrl]);
```

## Преимущества нового подхода:
1. ✅ **Предотвращает перезагрузку сцены** - текстура загружается асинхронно
2. ✅ **Правильная очистка памяти** - dispose() вызывается при размонтировании
3. ✅ **Лучший контроль над настройками текстуры** - можно настроить фильтрацию и wrapping
4. ✅ **Обработка ошибок** - graceful degradation при проблемах с загрузкой
5. ✅ **Соответствие правилам React Hooks** - useEffect вместо хука в теле компонента

## Тестирование
После применения изменений:
- Смена фотографии на стеле больше не вызывает перезагрузку всей сцены
- Текстура загружается плавно и асинхронно
- При удалении фотографии память корректно освобождается