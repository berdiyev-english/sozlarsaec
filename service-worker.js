/* Bewords Service Worker - Offline Mode */
const CACHE_NAME = 'bewords-cache-v18';

// Список файлов, которые нужно сохранить СРАЗУ
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './grammar.js',
  './sentences-data.js',
  'app-photos/bob/loading.gif',
  'app-photos/pets/kitten.png',
  'app-photos/pets/puppy.png',
  'app-photos/pets/panda.png',
  'app-photos/pets/fox.png',
  'app-photos/pets/penguin.png',
  'app-photos/pets/rabbit.png',
  'app-photos/error/nophoto.jpg',
  'app-photos/motivation/m1.jpg',
  'app-photos/motivation/m2.jpg',
  'app-photos/motivation/m3.jpg',
  'app-photos/motivation/m4.jpg',
  'app-photos/motivation/m5.jpg',
  'app-photos/bob/Bob_loading.PNG',
  'app-photos/bob/instructor.png'
];

// 1. Установка (Кешируем статику)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      // Пытаемся скачать всё, но если что-то упадет - не страшно
      return cache.addAll(STATIC_ASSETS).catch(err => console.warn('Some assets failed to cache', err));
    })
  );
});

// 2. Активация (Чистим старые кеши)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Перехват запросов (Стратегия: Network First, then Cache)
// Мы сначала стучимся в интернет, если нет - берем из кеша.
// Для картинок/аудио лучше Stale-While-Revalidate, но это сложнее.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Игнорируем POST запросы и API (кроме картинок)
  if (req.method !== 'GET') return;

  // Аудио не кешируем принудительно (экономим место), браузер сам справится
  if (url.pathname.endsWith('.mp3')) return;

  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        // Если скачали успешно - обновляем кеш (для следующего раза)
        const resClone = networkRes.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (req.url.startsWith('http')) { // Кешируем только http/https
             cache.put(req, resClone);
          }
        });
        return networkRes;
      })
      .catch(() => {
        // Если интернета нет - идем в кеш
        return caches.match(req).then((cachedRes) => {
          if (cachedRes) return cachedRes;
          
          // Если и в кеше нет, и это картинка - отдаем заглушку
          if (req.destination === 'image') {
             return caches.match('/nophoto.jpg');
          }
          
          // Иначе всё плохо (оффлайн страница?)
          return null; 
        });
      })
  );
});
