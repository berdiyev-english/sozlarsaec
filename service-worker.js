/* Bewords Service Worker - Offline Mode */
const CACHE_NAME = 'bewords-cache-v20';

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
  'app-photos/bob/instructor.png',
  'au/ui/intro.mp3',
  'au/ui/fall.mp3',
  'au/ui/pop.mp3',
  'au/ui/streak.mp3',
  'au/ui/open.mp3',
  'au/ui/incorrect.mp3',
  'au/ui/final.mp3',
  'au/ui/correct.mp3',
  'au/ui/animal.mp3',
  'au/ui/tap.mp3',
  'au/ui/coin.mp3',
  'au/ui/pop_baloon.mp3',
  'au/ui/new_record.mp3',
  'au/ui/ice_hit.mp3',
  'au/ui/plane.mp3',
  'au/ui/fire_break.mp3',
  'au/ui/new_level.mp3',
  'au/ui/new_level_pet.mp3',
  'au/ui/game_over.mp3',
];

// Белый список: только эти mp3 имеют право кешироваться в SW
const AUDIO_WHITELIST = [
  'intro.mp3',
  'fall.mp3',
  'pop.mp3',
  'streak.mp3',
  'open.mp3',
  'incorrect.mp3',
  'final.mp3',
  'correct.mp3',
  'animal.mp3',
  'tap.mp3',
  'coin.mp3',
  'pop_baloon.mp3',
  'new_record.mp3',
  'ice_hit.mp3',
  'plane.mp3',
  'fire_break.mp3',
  'new_level.mp3',
  'new_level_pet.mp3',
  'game_over.mp3',
];

// 1. Установка (Кешируем статику)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      // Каждый файл кешируется независимо — одна ошибка не роняет всё
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => cache.add(url))
      );
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

// 3. Перехват запросов
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Игнорируем не-GET запросы
  if (req.method !== 'GET') return;

  // --- АУДИО ---
  if (url.pathname.endsWith('.mp3')) {
    // mp3 вне белого списка — не трогаем (обычная сеть, без кеша SW)
    if (!AUDIO_WHITELIST.includes(url.pathname.split('/').pop())) return;

    // Cache First: сначала кеш, иначе скачиваем и докешируем
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((networkRes) => {
          if (networkRes.ok) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        });
      })
    );
    return;
  }

  // --- ОСТАЛЬНОЕ: Network First, then Cache ---
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes.ok && req.url.startsWith('http')) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req).then((cachedRes) => {
          if (cachedRes) return cachedRes;

          // Заглушка для картинок
          if (req.destination === 'image') {
            return caches.match('./app-photos/error/nophoto.jpg');
          }

          return null;
        });
      })
  );
});