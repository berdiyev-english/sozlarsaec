/* Bewords Service Worker - Offline Mode */
const CACHE_NAME = 'bewords-cache-v13';

// Список файлов, которые нужно сохранить СРАЗУ
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',  // Если есть внешний файл
  '/app.js',     // Твой основной скрипт (если он внешний)
  '/grammar.js',
  '/sentences-data.js',
  '/loading.gif',
  '/kitten.png',
  '/puppy.png',
  '/nophoto.jpg',
  '/m1.jpg',     // Закешируем хотя бы пару мотиваций
  '/m2.jpg',
  '/m3.jpg',
  '/m4.jpg',
  '/m5.jpg',
  '/panda.png',
  '/fox.png',
  '/penguin.png',
  '/rabbit.png',
  '/bob_in_spring.png'
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
