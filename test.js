class EnglishWordsApp {
  constructor() {
      this.isAndroid = /android/i.test((navigator.userAgent || '').toLowerCase());
  this.loaderEl = null;
  this.loaderStart = 0;
  this.loaderMinMs = 0;
  this.loaderTimer = null;

  if (this.isAndroid) {
    const img = new Image();
    img.src = '/loading.gif'; // предварительная подгрузка Кота Боба
  }
    this.currentSection = 'about';
    this.currentLevel = null;
    this.currentCategory = null;
    this.learningWords = [];
    this.customWords = [];
    this.wordStats = {};
    this.weeklyProgress = [];
    this.currentMode = localStorage.getItem('currentMode') || 'quiz';
    this.currentPractice = localStorage.getItem('currentPractice') || 'scheduled';
    this.currentReviewIndex = 0;
    this.sentenceBuilderState = {
        currentSentence: null,
        assembledWords: [],
        correctOrder: [],
        score: 0,
        total: 0,
        availableLevels: new Set()
    };
    this.showFilter = 'all';
    this.gameQuizIntervals = {};
    this.audioCtx = null;
    this.initMedicalImageCache();

    // runtime flags
    this.lastFlashcardFrontWasRussian = false;
    this.currentAudio = null;
    this.currentAudioPromise = null;
    this.suppressAutoSpeakOnce = false;
    
    this.loadData();
    this.muted = JSON.parse(localStorage.getItem('app_muted') || 'false');
        // Глобальная скорость озвучки (0.5–1.5)
    this.audioRate = parseFloat(localStorage.getItem('audio_rate') || '1');
    if (isNaN(this.audioRate) || this.audioRate < 0.5 || this.audioRate > 1.5) {
      this.audioRate = 1;
    }
    
    this.srsConfig = {
        dailyNew: 30,
        dailyReview: 150,
        activePool: 200,
        learningSteps: [
            10 * 60 * 1000,
            60 * 60 * 1000,
            4 * 60 * 60 * 1000
        ],
        graduateToDays: [1, 6],
        minEase: 1.3
    };
    
    this.srsDay = this.loadSrsDay();
    this.migrateStatsSchema();
    
    this.initializeUI();
    this.renderProgress();
    this.syncModePracticeToggles();
    this.installAudioUnlocker();
    this.preloadAiChat();
    
    // Запуск проверки после инициализации
    setTimeout(() => {
        this.checkAndShowFirstRunOrMotivation();
    }, 1000);
  }

  // Далее идут все ваши методы...
checkAndShowFirstRunOrMotivation() {
    try {
        const firstRunDone = localStorage.getItem('first_run_completed') === '1';
        
        console.log('Checking first run status:', firstRunDone);
        
        if (!firstRunDone) {
            // Первый запуск - показываем презентацию
            console.log('First run - showing tour');
            setTimeout(() => {
                this.showFirstRunTour();
            }, 300);
        } else {
            // Не первый запуск - показываем мотивацию (она сама проверит, нужно ли)
            console.log('Not first run - checking daily motivation');
            this.maybeShowDailyMotivation();
        }
    } catch (e) {
        console.error('Error in checkAndShowFirstRunOrMotivation:', e);
    }
}

  // =========================
  // Helpers: language & audio
  // =========================
  isRussian(text) { return /[а-яё]/i.test(text || ''); }
  isEnglish(text) { return /[a-z]/i.test(text || ''); }
  isMultiWord(text) { if (!text) return false; return /\s/.test(String(text).trim()); }
  getEnglishDisplay(wordObj) {
    if (!wordObj) return '';
    if (wordObj.forms && Array.isArray(wordObj.forms) && wordObj.forms.length > 0) {
      return wordObj.forms.join(' → ');
    }
    return wordObj.word;
  }
  getBaseEnglish(wordObj) {
    if (!wordObj) return '';
    return (wordObj.forms && wordObj.forms.length > 0) ? wordObj.forms[0] : wordObj.word;
  }
  isIrregularWord(wordObj) { return wordObj && wordObj.level === 'IRREGULARS'; }
  shouldAutoPronounce(wordObj) { return !this.isIrregularWord(wordObj); }

  delay(ms) { return new Promise(res => setTimeout(res, ms)); }
  async waitForCurrentAudioToFinish() {
    const p = this.currentAudioPromise;
    if (p && typeof p.then === 'function') { try { await p; } catch {} }
  }

  cleanWordForAudio(raw) {
    if (!raw) return '';
    const w = String(raw).toLowerCase().trim();
    const basic = w
      .replace(/[\/]+/g, ' ')
      .replace(/[^a-z\s'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return basic;
  }
  sanitizeForSpeech(raw) {
    if (!raw) return '';
    return String(raw)
      .toLowerCase()
      .replace(/→/g, ' ')
      .replace(/[\/]+/g, ' ')
      .replace(/[^a-z\s'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  buildAudioCandidates(baseWord) {
    const cleaned = this.cleanWordForAudio(baseWord);
    if (!cleaned) return [];
    const noSpace = cleaned.replace(/\s+/g, '');
    const firstToken = cleaned.split(' ')[0];
    const uniq = [];
    [cleaned, noSpace, firstToken].forEach(c => { if (c && !uniq.includes(c)) uniq.push(c); });
    return uniq;
  }
  
  buildAudioUrl(wordCandidate, region = 'us') {
    const clean = (wordCandidate || '').toLowerCase();
    return `https://wooordhunt.ru/data/sound/sow/${region}/${clean}.mp3`;
  }
  
    // ==========================================================
  // NEW AUDIO LOGIC: PREPOSITIONS, IDIOMS, PHRASAL (NO TTS)
  // ==========================================================

  // --- 1. ПРЕДЛОГИ (Prepositions) ---
  // Имя файла: "at" -> "at", "run into" -> "run_into"
  buildPrepositionFileName(phrase) {
    if (!phrase) return '';
    return String(phrase)
      .toLowerCase()
      .replace(/[^a-z\s]/g, '') // Убираем спецсимволы
      .trim()
      .replace(/\s+/g, '_');    // Пробелы в подчеркивания
  }

  // URL: bewords.ru/au/prepositions/us/at.mp3
  buildPrepositionAudioUrl(fileName, region) {
    const r = region === 'uk' ? 'uk' : 'us'; // Поддержка обоих регионов
    return `https://bewords.ru/au/prepositions/${r}/${fileName}.mp3`;
  }

  async playPrepositionAudio(phrase, region) {
    const file = this.buildPrepositionFileName(phrase);
    if (!file) return false;
    
    const url = this.buildPrepositionAudioUrl(file, region);
    
    try {
      await this.playMp3Url(url);
      return true;
    } catch (e) {
      // TTS ОТКЛЮЧЕН: если файла нет, будет тишина
      console.log('Preposition audio missing:', url);
      return false; 
    }
  }

  // --- 2. ФРАЗОВЫЕ ГЛАГОЛЫ (Phrasal Verbs) ---
  buildPhrasalFileName(phrase) {
    if (!phrase) return '';
    return String(phrase)
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
  }

  // URL: bewords.ru/au/phrasal/us/look_up.mp3 (всегда US)
  buildPhrasalAudioUrl(fileName) {
    return `https://bewords.ru/au/phrasal/us/${fileName}.mp3`;
  }

  async playPhrasalAudio(phrase) {
    const file = this.buildPhrasalFileName(phrase);
    if (!file) return false;
    
    const url = this.buildPhrasalAudioUrl(file);
    
    try {
      await this.playMp3Url(url);
      return true;
    } catch (e) {
      console.log('Phrasal audio missing:', url);
      return false;
    }
  }

  // --- 3. ИДИОМЫ (Idioms) ---
  buildIdiomFileName(phrase) {
    if (!phrase) return '';
    return String(phrase)
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
  }

  // URL: bewords.ru/au/idioms/us/break_a_leg.mp3 (всегда US)
  buildIdiomAudioUrl(fileName) {
    return `https://bewords.ru/au/idioms/us/${fileName}.mp3`;
  }

  async playIdiomAudio(phrase) {
    const file = this.buildIdiomFileName(phrase);
    if (!file) return false;
    
    const url = this.buildIdiomAudioUrl(file);
    
    try {
      await this.playMp3Url(url);
      return true;
    } catch (e) {
      console.log('Idiom audio missing:', url);
      return false;
    }
  }

  // --- ГЛАВНЫЙ МЕТОД (Маршрутизатор аудио) ---
  // Вызывается отовсюду: из списков, карточек, квизов и игрового шлюза
  async playWord(word, forms = null, region = null, level = null) {
    if (typeof forms === 'string') { forms = [forms]; }
    const regionPref = (region === 'uk' || region === 'us') ? region : 'us';

    // A. ПРЕДЛОГИ
    if (level === 'PREPOSITIONS') {
      await this.playPrepositionAudio(word, regionPref);
      return;
    }

    // B. ИДИОМЫ
    if (level === 'IDIOMS') {
      await this.playIdiomAudio(word);
      return;
    }

    // C. ФРАЗОВЫЕ ГЛАГОЛЫ
    if (level === 'PHRASAL_VERBS') {
      await this.playPhrasalAudio(word);
      return;
    }

    // D. СТАНДАРТНАЯ ЛОГИКА (Для A1-C2 и остальных)
    
    // Если слово состоит из частей через слэш (read/reading)
    if ((!forms || !Array.isArray(forms) || forms.length === 0) &&
        typeof word === 'string' && word.includes('/')) {
      const parts = word.split('/').map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        await this.playFormsSequence(parts, regionPref);
        return;
      }
    }

    // Если переданы формы (go -> went -> gone)
    if (forms && Array.isArray(forms) && forms.length) {
      await this.playFormsSequence(forms, regionPref);
      return;
    }

    // Если это фраза (но не спец. категория), используем TTS
    if (this.isMultiWord(word)) {
      await this.playPhraseTTS(word, regionPref);
      return;
    }

    // Обычное одиночное слово (Wooordhunt)
    await this.playSingleWordMp3(word, regionPref);
  }
  
  stopCurrentAudio() {
    try {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.src = '';
        this.currentAudio = null;
      }
      if (window && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch {}
  }
  // MP3 play that resolves when playback finishes (no overlap)
playMp3Url(url) {
  if (this.muted) return Promise.resolve(false);
    const p = new Promise((resolve, reject) => {
      try {
        this.stopCurrentAudio();
        
        // Создаем аудио с предзагрузкой
        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = 1.0;
        audio.playbackRate = this.audioRate || 1;
        
        this.currentAudio = audio;

        let endedOrFailed = false;
        const cleanup = () => {
          if (endedOrFailed) return;
          endedOrFailed = true;
          try { 
            audio.onended = null; 
            audio.onerror = null; 
            audio.oncanplaythrough = null;
            audio.onloadeddata = null;
          } catch {}
        };

        // Добавляем обработчик загрузки данных
        audio.onloadeddata = () => {
          // Разблокируем контекст если нужно
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
          }
        };

        audio.oncanplaythrough = () => {
          // Небольшая задержка для стабильности на мобильных
          setTimeout(() => {
            audio.play().then(() => {
              // Успешно начали воспроизведение
            }).catch(err => { 
              cleanup(); 
              reject(err); 
            });
          }, 50);
        };
        
        audio.onended = () => { 
          cleanup(); 
          resolve(true); 
        };
        
        audio.onerror = () => { 
          cleanup(); 
          reject(new Error('Audio error')); 
        };

        // Устанавливаем src после всех обработчиков
        audio.src = url;
        audio.load();

        // Увеличиваем таймаут для мобильных устройств
        setTimeout(() => {
          if (!endedOrFailed) { 
            try { audio.pause(); } catch {} 
            cleanup(); 
            reject(new Error('Audio timeout')); 
          }
        }, 20000);
        
      } catch (e) { 
        reject(e); 
      }
    });

    this.currentAudioPromise = p.finally(() => {
      if (this.currentAudioPromise === p) this.currentAudioPromise = null;
    });

    return p;
}

  async ensureVoicesLoaded(timeoutMs = 1500) {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.getVoices().length > 0) return;
    await new Promise(resolve => {
      const t = setTimeout(resolve, timeoutMs);
      const handler = () => { clearTimeout(t); window.speechSynthesis.removeEventListener('voiceschanged', handler); resolve(); };
      window.speechSynthesis.addEventListener('voiceschanged', handler);
    });
  }
  
syncModePracticeToggles() {
  const mode = this.currentMode;
  const practice = this.currentPractice;
  
  // Синхронизируем кнопки режимов
  document.querySelectorAll('.mode-btn').forEach(b => {
    const btnMode = b.getAttribute('data-mode');
    b.classList.toggle('active', btnMode === mode);
  });
  
  // Синхронизируем кнопки практики
  document.querySelectorAll('.practice-btn').forEach(b => {
    const btnPractice = b.getAttribute('data-practice');
    b.classList.toggle('active', btnPractice === practice);
  });
}
  pickPreferredGoogleVoice(region = 'us') {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    const lc = s => (s || '').toLowerCase();
    const isOnline = v => v && v.localService === false;
    const namePrefsUK = ['google uk english male','google uk english','google english uk male','google en-gb'];
    const namePrefsUS = ['google us english','google en-us','google english us'];
    const langCheckUK = v => lc(v.lang).startsWith('en-gb');
    const langCheckUS = v => lc(v.lang).startsWith('en-us') || lc(v.lang) === 'en';
    const tryPick = (nameList, langCheck) => {
      for (const pref of nameList) {
        const found = voices.find(v => isOnline(v) && lc(v.name).includes(pref));
        if (found) return found;
      }
      const onlineByLang = voices.find(v => isOnline(v) && langCheck(v));
      if (onlineByLang) return onlineByLang;
      const anyByLang = voices.find(v => langCheck(v));
      if (anyByLang) return anyByLang;
      const anyEnOnline = voices.find(v => isOnline(v) && lc(v.lang).startsWith('en'));
      if (anyEnOnline) return anyEnOnline;
      const anyEn = voices.find(v => lc(v.lang).startsWith('en'));
      return anyEn || voices[0] || null;
    };
    return region === 'uk' ? tryPick(namePrefsUK, langCheckUK) : tryPick(namePrefsUS, langCheckUS);
  }
  async playPhraseTTS(text, region = 'us') {
    if (this.muted) return false;
    const phrase = this.sanitizeForSpeech(text);
    if (!phrase) return false;
    if (!('speechSynthesis' in window)) return false;

    await this.ensureVoicesLoaded();
    const voice = this.pickPreferredGoogleVoice(region === 'uk' ? 'uk' : 'us');

    const baseRate = region === 'uk' ? 0.9 : 0.8;
    const globalRate = this.audioRate || 1;
    const rate = Math.min(2, Math.max(0.3, baseRate * globalRate));
    const pitch = 1;

    const p = new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(phrase);
      if (voice) { u.voice = voice; if (voice.lang) u.lang = voice.lang; } else { u.lang = region === 'uk' ? 'en-GB' : 'en-US'; }
      u.rate = rate;
      u.pitch = pitch;
      u.onend = resolve;
      u.onerror = resolve;

      try { window.speechSynthesis.cancel(); } catch {}
      window.speechSynthesis.speak(u);
    });

    this.currentAudioPromise = p.finally(() => {
      if (this.currentAudioPromise === p) this.currentAudioPromise = null;
    });

    await p;
    return true;
  }

  async playSingleWordMp3(word, regionPreferred = 'us') {
    if (typeof word === 'string' && word.includes('/')) {
      const parts = word.split('/').map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        for (const part of parts) {
          await this._playSingleTokenMp3Only(part, regionPreferred);
          await this.delay(200);
        }
        return true;
      }
    }
    return this._playSingleTokenMp3Only(word, regionPreferred);
  }
  async _playSingleTokenMp3Only(word, regionPreferred = 'us') {
    const candidates = this.buildAudioCandidates(word);
    if (candidates.length === 0) return false;
    const tryRegions = regionPreferred === 'uk' ? ['uk', 'us'] : ['us', 'uk'];

    for (const cand of candidates) {
      for (const region of tryRegions) {
        try {
          await this.playMp3Url(this.buildAudioUrl(cand, region));
          return true;
        } catch (e) {}
      }
    }
    return false;
  }

  async playFormsSequence(forms, regionPreferred = 'us') {
    if (!forms || !forms.length) return false;
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      await this.playSingleWordMp3(form, regionPreferred);
      await this.delay(200);
    }
    return true;
  }
    

  // =========================
  // Image helpers
  // =========================

// Главный метод получения URL изображения
async getPrimaryImageUrl(wordObj) {
  // Проверяем, является ли это медицинской категорией
  if (wordObj.level === 'MEDICAL' || wordObj.category === 'MEDICAL') {
    // Сразу пытаемся получить медицинское изображение
    const medicalImage = await this.getMedicalImageUrl(wordObj);
    if (medicalImage && medicalImage.url) {
      return medicalImage.url;
    }
    // Если не нашли медицинское изображение, возвращаем fallback
    return this.getFallbackImageUrl();
  }
  
  // Для остальных категорий используем существующую логику
  const base = (this.getBaseEnglish(wordObj) || '').toLowerCase().trim();
  return `https://britlex.ru/images/${encodeURIComponent(base)}.jpg`;
}

getFallbackImageUrl() {
  const randomNum = Math.floor(Math.random() * 100) + 1;
  return `/${randomNum}.jpg`;
}

handleMotivationImageError(img) {
  const index = parseInt(img.dataset.index || '1');
  const fallbackIndex = ((index % 61) || 61);
  img.src = `/m${fallbackIndex}.jpg`;
}

// Упрощенный handleImageError
async handleImageError(imgEl) {
  // Если уже пробовали fallback
  if (imgEl.dataset.fallbackTried) {
    imgEl.onerror = null;
    imgEl.src = '/nophoto.jpg';
    return;
  }
  
  
  
  // Пытаемся найти контекст слова
  const card = imgEl.closest('.word-card, .flashcard, .quiz-container');
  if (card) {
    const level = card.querySelector('.word-level')?.textContent?.trim();
    const wordText = card.querySelector('.word-text, .flashcard-title, .quiz-question')?.textContent?.trim();
    
    // Если это медицинское слово, пробуем еще раз
    if (level === 'MEDICAL') {
      const wordObj = this.findWordObject(wordText, level);
      if (wordObj) {
        const medicalImage = await this.getMedicalImageUrl(wordObj);
        if (medicalImage && medicalImage.url && medicalImage.url !== imgEl.src) {
          imgEl.src = medicalImage.url;
          imgEl.dataset.imageSource = medicalImage.source;
          imgEl.classList.add('medical-image');
          return;
        }
      }
    }
  }
  
  // Используем fallback
  imgEl.dataset.fallbackTried = '1';
  imgEl.src = this.getFallbackImageUrl();
}

// Упрощенный поиск объекта слова
findWordObject(wordText, level) {
  if (!wordText) return null;
  
  // Очищаем текст от лишних символов
  const cleanText = wordText.trim().toLowerCase();
  
  // Ищем в learningWords
  let found = this.learningWords.find(w => {
    const wordLower = (w.word || '').toLowerCase();
    const englishLower = (this.getEnglishDisplay(w) || '').toLowerCase();
    return (wordLower === cleanText || englishLower === cleanText) && 
           (!level || w.level === level);
  });
  
  if (found) return found;
  
  // Ищем в базе данных
  if (level && oxfordWordsDatabase[level]) {
    found = oxfordWordsDatabase[level].find(w => {
      const wordLower = (w.word || '').toLowerCase();
      const englishLower = (this.getEnglishDisplay(w) || '').toLowerCase();
      return wordLower === cleanText || englishLower === cleanText;
    });
  }
  
  return found;
}

// Упрощенный метод получения медицинского изображения
async getMedicalImageUrl(wordObj) {
  if (!wordObj) return null;
  
  this.initMedicalImageCache();
  
  const word = (this.getBaseEnglish(wordObj) || wordObj.word || '').toLowerCase().trim();
  const cacheKey = `medical_${word}`;
  
  // Проверяем кеш
  if (this.medicalImageCache.has(cacheKey)) {
    return this.medicalImageCache.get(cacheKey);
  }
  
  // Прямое соответствие для известных медицинских терминов
  const directMedicalImages = {
    'heart': 'https://smart.servier.com/wp-content/uploads/2016/10/coeur.png',
    'brain': 'https://smart.servier.com/wp-content/uploads/2016/10/cerveau.png',
    'lungs': 'https://smart.servier.com/wp-content/uploads/2016/10/poumon_01.png',
    'liver': 'https://smart.servier.com/wp-content/uploads/2016/10/foie.png',
    'kidney': 'https://smart.servier.com/wp-content/uploads/2016/10/rein.png',
    'stomach': 'https://smart.servier.com/wp-content/uploads/2016/10/estomac.png',
    'eye': 'https://smart.servier.com/wp-content/uploads/2016/10/oeil.png',
    'spine': 'https://smart.servier.com/wp-content/uploads/2016/10/colonne_01.png',
    'large intestine': 'https://smart.servier.com/wp-content/uploads/2016/10/gros_intestin.png',
    'small intestine': 'https://smart.servier.com/wp-content/uploads/2016/10/intestin_grele.png',
    'pancreas': 'https://smart.servier.com/wp-content/uploads/2016/10/pancreas.png',
    'skull': 'https://smart.servier.com/wp-content/uploads/2016/10/crane_01.png',
    'tooth': 'https://smart.servier.com/wp-content/uploads/2016/10/dent.png',
    'neuron': 'https://smart.servier.com/wp-content/uploads/2016/10/neurone.png',
    'dna': 'https://smart.servier.com/wp-content/uploads/2016/10/adn.png',
    'blood': 'https://smart.servier.com/wp-content/uploads/2016/10/sang.png',
    'bone': 'https://smart.servier.com/wp-content/uploads/2016/10/os.png',
    'muscle': 'https://smart.servier.com/wp-content/uploads/2016/10/muscle.png',
    'nerve': 'https://smart.servier.com/wp-content/uploads/2016/10/nerf.png',
    'artery': 'https://smart.servier.com/wp-content/uploads/2016/10/artere.png',
    'vein': 'https://smart.servier.com/wp-content/uploads/2016/10/veine.png',
    'skeleton': 'https://smart.servier.com/wp-content/uploads/2016/10/squelette.png',
    'cell': 'https://smart.servier.com/wp-content/uploads/2016/10/cellule.png',
    'bacteria': 'https://smart.servier.com/wp-content/uploads/2016/10/bacterie.png',
    'virus': 'https://smart.servier.com/wp-content/uploads/2016/10/virus.png'
  };
  
  // Проверяем прямое соответствие
  if (directMedicalImages[word]) {
    const imageUrl = directMedicalImages[word];
    const available = await this.checkImageAvailability(imageUrl);
    
    if (available) {
      const result = { url: imageUrl, source: 'Servier Medical Art' };
      this.medicalImageCache.set(cacheKey, result);
      this.saveMedicalImageCache();
      return result;
    }
  }
  
  // Пробуем варианты написания
  const searchTerms = this.prepareMedicalSearchTerms(word);
  
  for (const term of searchTerms) {
    const urls = [
      `https://smart.servier.com/wp-content/uploads/2016/10/${term}.png`,
      `https://smart.servier.com/wp-content/uploads/2017/01/${term}.png`,
    ];
    
    for (const url of urls) {
      const available = await this.checkImageAvailability(url);
      if (available) {
        const result = { url: url, source: 'Servier Medical Art' };
        this.medicalImageCache.set(cacheKey, result);
        this.saveMedicalImageCache();
        return result;
      }
    }
  }
  
  // Возвращаем null если не нашли
  return null;
}

// Упрощенная проверка доступности изображения
checkImageAvailability(url, timeout = 3000) {
  return new Promise((resolve) => {
    const img = new Image();
    let timeoutId;
    
    const cleanup = () => {
      clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
    };
    
    img.onload = () => {
      cleanup();
      resolve(true);
    };
    
    img.onerror = () => {
      cleanup();
      resolve(false);
    };
    
    timeoutId = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeout);
    
    img.src = url;
  });
}

// Упрощенная подготовка поисковых терминов
prepareMedicalSearchTerms(word) {
  const terms = [];
  const base = word.toLowerCase().trim();
  
  // Базовый термин
  terms.push(base);
  
  // Варианты с подчеркиванием и дефисом
  if (base.includes(' ')) {
    terms.push(base.replace(/\s+/g, '_'));
    terms.push(base.replace(/\s+/g, '-'));
  }
  
  // Французские эквиваленты для Servier
  const frenchMap = {
    'heart': 'coeur',
    'brain': 'cerveau',
    'lungs': 'poumon',
    'liver': 'foie',
    'kidney': 'rein',
    'stomach': 'estomac',
    'eye': 'oeil',
    'spine': 'colonne',
    'large intestine': 'gros_intestin',
    'small intestine': 'intestin_grele',
    'pancreas': 'pancreas',
    'skull': 'crane',
    'tooth': 'dent',
    'neuron': 'neurone',
    'dna': 'adn',
    'blood': 'sang',
    'bone': 'os',
    'muscle': 'muscle',
    'nerve': 'nerf',
    'artery': 'artere',
    'vein': 'veine'
  };
  
  if (frenchMap[base]) {
    terms.push(frenchMap[base]);
  }
  
  return terms;
}

// Инициализация кеша
initMedicalImageCache() {
  if (!this.medicalImageCache) {
    this.medicalImageCache = new Map();
    try {
      const saved = localStorage.getItem('medicalImageCache');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([key, value]) => {
          this.medicalImageCache.set(key, value);
        });
      }
    } catch (e) {
      console.warn('Failed to load medical image cache:', e);
    }
  }
}

// Сохранение кеша
saveMedicalImageCache() {
  try {
    const cacheObj = {};
    this.medicalImageCache.forEach((value, key) => {
      cacheObj[key] = value;
    });
    localStorage.setItem('medicalImageCache', JSON.stringify(cacheObj));
  } catch (e) {
    console.warn('Failed to save medical image cache:', e);
  }
}

  // =========================
  // Initialize UI and events
  // =========================

initializeUI() {
    // Hide level selectors in "New words" section
    const newLevelSel = document.getElementById('newLevel');
    if (newLevelSel) { 
        const grp = newLevelSel.closest('.form-group') || newLevelSel.parentElement; 
        if (grp) grp.style.display = 'none'; 
        else newLevelSel.style.display = 'none'; 
    }
    const bulkLevelSel = document.getElementById('bulkLevel');
    if (bulkLevelSel) { 
        const grp2 = bulkLevelSel.closest('.form-group') || bulkLevelSel.parentElement; 
        if (grp2) grp2.style.display = 'none'; 
        else bulkLevelSel.style.display = 'none'; 
    }

    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.addEventListener('click', () => this.showSettingsModal());

    // Support button
    const supportBtn = document.getElementById('supportBtn');
    if (supportBtn) supportBtn.addEventListener('click', () => this.showSupportModal());

    // Navigation buttons
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const section = e.currentTarget.getAttribute('data-section');
        if (section) this.switchSection(section);
      });
    });

    // Level cards
document.querySelectorAll('.level-card[data-level]').forEach(card => {
card.addEventListener('click', (e) => {
const level = e.currentTarget.getAttribute('data-level');
if (level) {
this.showLevelWords(level);
}
});
});
    // Category cards
    document.querySelectorAll('.level-card[data-category]').forEach(card => {
      card.addEventListener('click', (e) => {
        // Если карточка "скоро" — не реагируем на клик
        if (e.currentTarget.classList.contains('coming-soon')) return;

        const cat = e.currentTarget.getAttribute('data-category');
        if (!cat) return;
if (cat === 'ADDED') {
  this.showAddedWordsCategory();
} else if (cat === 'STUDY_NOW') {
  this.showStudyNowWords();        // пункт 2 ниже
} else {
  this.showCategoryWords(cat);
}
      });
    });

    // Back to levels
    const backBtn = document.getElementById('backToLevels');
    if (backBtn) backBtn.addEventListener('click', () => this.backToLevels());

    // Add word button (manual)
    const addWordBtn = document.getElementById('addWordBtn');
    if (addWordBtn) addWordBtn.addEventListener('click', () => this.addSingleWord());

    // Bulk add button
    const bulkAddBtn = document.getElementById('bulkAddBtn');
    if (bulkAddBtn) bulkAddBtn.addEventListener('click', () => this.bulkAddWords());
    
// Переключение форм загрузки
const tabSingle = document.getElementById('uploadTabSingle');
const tabBulk = document.getElementById('uploadTabBulk');
const singleForm = document.getElementById('singleAddForm');
const bulkForm = document.getElementById('bulkAddForm');
const singleHelp = document.getElementById('singleHelp');
const bulkHelp = document.getElementById('bulkHelp');

function showUploadTab(tab) {
if (!tabSingle || !tabBulk || !singleForm || !bulkForm) return;
tabSingle.classList.toggle('active', tab === 'single');
tabBulk.classList.toggle('active', tab === 'bulk');
singleForm.style.display = tab === 'single' ? '' : 'none';
bulkForm.style.display = tab === 'bulk' ? '' : 'none';
if (singleHelp) singleHelp.style.display = tab === 'single' ? '' : 'none';
if (bulkHelp) bulkHelp.style.display = tab === 'bulk' ? '' : 'none';
}
if (tabSingle && tabBulk) {
tabSingle.addEventListener('click', () => showUploadTab('single'));
tabBulk.addEventListener('click', () => showUploadTab('bulk'));
showUploadTab('single'); // по умолчанию
}

    // Mode toggle buttons - ВАЖНО!
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const mode = e.currentTarget.getAttribute('data-mode');
        if (!mode) return;
        
        this.currentMode = mode;
        localStorage.setItem('currentMode', this.currentMode);
        
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        const practiceToggle = document.querySelector('.practice-toggle');
        if (practiceToggle) {
          if (mode === 'trainer') {
            practiceToggle.style.display = 'none';
          } else {
            practiceToggle.style.display = 'flex';
            if (this.currentPractice === 'list') {
              this.currentPractice = 'scheduled';
              localStorage.setItem('currentPractice', 'scheduled');
              document.querySelectorAll('.practice-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-practice') === 'scheduled');
              });
            }
          }
        }
        
        this.suppressAutoSpeakOnce = true;
        this.renderLearningSection();
      });
    });

    // Practice toggle buttons - ВАЖНО!
    document.querySelectorAll('.practice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const practice = e.currentTarget.getAttribute('data-practice');
        if (!practice) return;
        
        if (practice === 'list') {
          // Открываем попап со всеми словами вместо смены режима
          this.showLearningWordsPopup();

          // Подсветим «Список» пока открыт попап
          document.querySelectorAll('.practice-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          return;
        }
        
        this.currentPractice = practice;
        localStorage.setItem('currentPractice', practice);
        
        document.querySelectorAll('.practice-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        this.currentReviewIndex = 0;
        if (practice === 'endless') {
          localStorage.removeItem('currentSession');
        }
        
        this.suppressAutoSpeakOnce = true;
        this.renderLearningSection();
      });
    });

    // Bulk Toggle button
    const bulkToggle = document.getElementById('bulkToggleBtn');
    if (bulkToggle) {
      bulkToggle.addEventListener('click', () => {
        const wantRemove = bulkToggle.dataset.state === 'all-added';
        if (wantRemove) this.removeAllLevelWords();
        else this.addAllLevelWords();
      });
    }

    // Game buttons
    const surfBtn = document.getElementById('surfStartBtn');
    if (surfBtn) surfBtn.addEventListener('click', () => this.showQuizGateForGame('Subway', 'subway.html'));
    
    const doodleBtn = document.getElementById('doodleStartBtn');
    if (doodleBtn) doodleBtn.addEventListener('click', () => this.showQuizGateForGame('Flying Bird', 'doodle-jump.html'));
    
    const game2048Btn = document.getElementById('game2048StartBtn');
    if (game2048Btn) game2048Btn.addEventListener('click', () => this.showQuizGateForGame('2048', '2048.html'));
    
    const rocketBtn = document.getElementById('rocketStartBtn');
    if (rocketBtn) rocketBtn.addEventListener('click', () => this.showQuizGateForGame('Panda', 'rocket-soccer.html'));
    
    const ninjaBtn = document.getElementById('ninjaStartBtn');
    if (ninjaBtn) ninjaBtn.addEventListener('click', () => this.showQuizGateForGame('ninja', 'ninja.html'));
    
    const catalogBtn = document.getElementById('catalogStartBtn');
    if (catalogBtn) catalogBtn.addEventListener('click', () => this.showQuizGateForGame('Geo-Dash', 'dash.html'));
    
    const learningLamp = document.getElementById('learningHelpLamp');
if (learningLamp) {
  learningLamp.addEventListener('click', () => this.showLearningHelpModal());
}

    this.updateLevelCounts();
    this.renderLearningSection();
    this.renderCustomWords();
    
    setTimeout(() => {
      document.querySelectorAll('.mode-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-mode') === this.currentMode);
      });
      document.querySelectorAll('.practice-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-practice') === this.currentPractice);
      });
    }, 100);
    this.ensureAutoDictButton();
    window.onAddToStudy = (payload) => this.handleTranslatorAdd(payload);
}

ensureAutoDictButton() {
  try {
    const container = document.querySelector('#levels #wordsContainer');
    if (!container) return;

    const header = container.querySelector('.words-header');

    // Если список ещё не открыт — убираем кнопку, если висит
    if (!header) {
      document.querySelectorAll('#levels .auto-dict-top, #levels .auto-dict-inline')
        .forEach(n => n.remove());
      return;
    }

    // Если уже есть кнопка — выходим
    if (document.getElementById('autoDictStartBtn')) return;

    // На всякий случай удалим старый "нижний" вариант, если он оставался
    document.querySelectorAll('#levels .auto-dict-inline').forEach(n => n.remove());

    // Создаем верхний блок и вставляем ПЕРЕД .words-header
    const wrap = document.createElement('div');
    wrap.className = 'auto-dict-top';

    const btn = document.createElement('button');
    btn.id = 'autoDictStartBtn';
    btn.className = 'btn auto-dict-btn';
    btn.innerHTML = '<i class="fas fa-magic"></i> Подобрать словарь под тебя';
    btn.addEventListener('click', () => this.showAutoDictionaryTest());

wrap.appendChild(btn);
container.insertBefore(wrap, header);
  } catch (e) {
    console.warn('ensureAutoDictButton error:', e);
  }
}

  // Daily Motivation once per day
  
maybeShowDailyMotivation(callback) {
    try {
        const firstDone = localStorage.getItem('first_run_completed') === '1';
        if (!firstDone) {
            console.log('First run not completed - skipping motivation');
            if (callback && typeof callback === 'function') {
                callback();
            }
            return;
        }

        const today = new Date().toDateString();
        const lastShown = localStorage.getItem('motivation_last_shown');
        
        console.log('Checking daily motivation - today:', today, 'last shown:', lastShown);
        
        if (lastShown !== today) {
            // Показываем мотивацию
            setTimeout(() => {
                this.showMotivationPopup(() => {
                    localStorage.setItem('motivation_last_shown', today);
                    if (callback && typeof callback === 'function') {
                        callback();
                    }
                });
            }, 600);
        } else {
            // Мотивация уже была сегодня
            console.log('Motivation already shown today');
            if (callback && typeof callback === 'function') {
                callback();
            }
        }
    } catch (e) {
        console.error('Error in maybeShowDailyMotivation:', e);
        if (callback && typeof callback === 'function') {
            callback();
        }
    }
}

  // Unlock audio on first user gesture (PWA fix)
installAudioUnlocker() {
    let unlocked = false;
    
    const unlock = async () => {
        if (unlocked) return;
        
        try {
            // Создаем или восстанавливаем AudioContext
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) {
                if (!this.audioCtx) {
                    this.audioCtx = new AC();
                }
                if (this.audioCtx.state === 'suspended') {
                    await this.audioCtx.resume();
                }
                
                // Создаем пустой буфер для полной разблокировки
                const buffer = this.audioCtx.createBuffer(1, 1, 22050);
                const source = this.audioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(this.audioCtx.destination);
                source.start(0);
            }
            
            // Проигрываем беззвучное аудио для разблокировки HTML5 Audio
            const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
            silentAudio.volume = 0.1;
            await silentAudio.play().catch(() => {});
            
            // Разблокировка speechSynthesis
            if ('speechSynthesis' in window) {
                try { 
                    window.speechSynthesis.cancel(); 
                } catch {}
            }
            
            unlocked = true;
            console.log('Audio context unlocked successfully');
            
        } catch (e) {
            console.warn('Audio unlock partial success:', e);
        }
        
        // Удаляем слушатели после разблокировки
        if (unlocked) {
            document.removeEventListener('touchstart', unlock, true);
            document.removeEventListener('touchend', unlock, true);
            document.removeEventListener('click', unlock, true);
            document.removeEventListener('pointerdown', unlock, true);
        }
    };
    
    // Вешаем на множество событий для лучшей совместимости с iOS
    document.addEventListener('touchstart', unlock, true);
    document.addEventListener('touchend', unlock, true);
    document.addEventListener('click', unlock, true);
    document.addEventListener('pointerdown', unlock, true);
}
  
maybeRunFirstTour() {
    try {
        // Проверяем готовность DOM
        if (!document.body || document.readyState !== 'complete') {
            // Если DOM не готов, ждем
            window.addEventListener('load', () => {
                this.maybeRunFirstTour();
            });
            return;
        }
        
        const done = localStorage.getItem('first_run_completed') === '1';
        if (done) return;
        
        // Закрываем баннер установки если он показан
        const banner = document.getElementById('appInstallBanner');
        if (banner && banner.classList.contains('show')) {
            banner.classList.remove('show');
            document.body.classList.remove('banner-shown');
        }
        
        setTimeout(() => this.showFirstRunTour(), 300);
    } catch (e) {
        console.error('Error in maybeRunFirstTour:', e);
    }
}

showFirstRunTour() {
    const highlight = (section) => {
        this.clearNavHighlights();
        if (!section) return;
        const btn = document.querySelector(`.bottom-nav .nav-item[data-section="${section}"]`);
        if (btn) btn.classList.add('nav-highlight');
    };
    
    this.clearNavHighlights = () => {
        document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('nav-highlight'));
    };

    const slides = [
        {
            key: 'welcome',
            title: 'Добро пожаловать!',
            image: 'hello.gif',
            html: `
                <div style="text-align:left;color:var(--text-primary);line-height:1.55;font-size:15px;">
                    <div style="font-weight:800;margin-bottom:8px;">Добро пожаловать в лучшее приложение для повышения словарного запаса!</div>
                    <p style="margin:0 0 8px 0;">Bewords.ru — приложение, созданное одним человеком, чтобы у вас было всё для удобного изучения.</p>
                    <p style="margin:0 0 8px 0;">Приложение полностью бесплатное и без рекламы. Если понравится — поделитесь с друзьями или поддержите донатом через кнопку «♥».</p>
                </div>
            `,
            spotlight: null
        },
        {
            key: 'levels',
            title: 'Уровни',
            image: '1.gif',
            html: `<p>Здесь вы можете добавлять слова в свой словарь для изучения — из уровней и тематических категорий.</p>`,
            spotlight: 'levels'
        },
        {
            key: 'learning',
            title: 'Изучаю',
            image: '2.gif',
            html: `<p>Практикуйте слова в 2 режимах: <strong>Quiz</strong> и <strong>Flashcards</strong>. Система учитывает интервалы повторения.</p>`,
            spotlight: 'learning'
        },
        {
            key: 'new-words',
            title: 'Новые',
            image: '3.gif',
            html: `<p>Добавляйте свои слова и фразы. После добавления они сразу попадут в ваш словарь.</p>`,
            spotlight: 'new-words'
        },
        {
            key: 'progress',
            title: 'Прогресс',
            image: '4.gif',
            html: `<p>Отслеживайте прогресс: сколько повторений вы сделали и как продвигаетесь по уровням.</p>`,
            spotlight: 'progress'
        },
        {
            key: 'games',
            title: 'Игры',
            image: '5.gif',
            html: `<p>Играйте и одновременно учите слова. Чтобы запустить игру, ответьте правильно 3 раза в quiz.</p>`,
            spotlight: 'games'
        },
        {
            key: 'ai-chat',
            title: 'AI Chat',
            image: '6.gif',
            html: `<p>Спросите у бота на основе ChatGPT любой вопрос по английскому — доступен 24/7.</p>`,
            spotlight: 'ai-chat'
        }
    ];

    let index = 0;
    const overlay = document.createElement('div');
    overlay.id = 'firstRunTour';
overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.85);display:flex;align-items:flex-end;justify-content:center;';

    const panel = document.createElement('div');
    panel.style.cssText = 'width:100%;background:var(--bg-primary);border-top-left-radius:16px;border-top-right-radius:16px;box-shadow:0 -8px 30px rgba(0,0,0,.25);padding:16px 16px 12px 16px;max-height:85vh;overflow-y:auto;';
    overlay.appendChild(panel);

    let startX = 0;
    overlay.addEventListener('touchstart', (e) => {
        startX = e.changedTouches[0].clientX;
    }, { passive: true });
    
    overlay.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        const dx = endX - startX;
        if (Math.abs(dx) > 60) {
            if (dx < 0) goNext();
            else goPrev();
        }
    }, { passive: true });

    const render = () => {
        const s = slides[index];
        highlight(s.spotlight);

        panel.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div style="font-weight:900;color:var(--text-primary);font-size:18px;">${s.title}</div>
                <div style="display:flex;gap:6px;">${slides.map((_, i) => `<span style="width:8px;height:8px;border-radius:50%;background:${i === index ? '#6366f1' : '#cbd5e1'};display:inline-block;"></span>`).join('')}</div>
            </div>
            ${s.image ? `<div style="text-align:center;margin:12px 0;"><img src="/${s.image}" alt="${s.title}" style="max-width:100%;height:auto;max-height:200px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div>` : ''}
            <div style="color:var(--text-secondary);">${s.html}</div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px;">
                <button class="btn btn-secondary" ${index === 0 ? 'disabled' : ''} data-tour="prev">Назад</button>
                <button class="btn btn-primary" data-tour="next">${index === slides.length - 1 ? 'Готово' : 'Далее'}</button>
            </div>
        `;

        panel.querySelector('[data-tour="prev"]').onclick = () => goPrev();
        panel.querySelector('[data-tour="next"]').onclick = () => goNext();
    };

const finish = () => {
    this.clearNavHighlights();
    try {
        localStorage.setItem('first_run_completed', '1');
    } catch {}
    overlay.remove();
    
    // После презентации показываем мотивацию
    setTimeout(() => {
        this.maybeShowDailyMotivation();
    }, 500);
};

    const goPrev = () => {
        if (index > 0) {
            index--;
            render();
        }
    };
    
    const goNext = () => {
        if (index < slides.length - 1) {
            index++;
            render();
        } else {
            finish();
        }
    };

    document.body.appendChild(overlay);
    render();
}


  // Preload AI chat iframe eagerly (no lazy)
  preloadAiChat() {
    const iframe = document.getElementById('aiChatFrame');
    if (iframe) {
      try { iframe.loading = 'eager'; } catch {}
      // ensure not recreated anywhere else
    }
  }

  // =========
  // Storage
  // =========
  loadData() {
    try {
      this.learningWords = JSON.parse(localStorage.getItem('learningWords') || '[]');
      this.customWords = JSON.parse(localStorage.getItem('customWords') || '[]');
      this.wordStats = JSON.parse(localStorage.getItem('wordStats') || '{}');
      this.weeklyProgress = JSON.parse(localStorage.getItem('weeklyProgress') || '[]');
    } catch (e) {
      console.error('Error loading data:', e);
      this.learningWords = [];
      this.customWords = [];
      this.wordStats = {};
      this.weeklyProgress = [];
    }
  }
  saveData() {
    try {
      localStorage.setItem('learningWords', JSON.stringify(this.learningWords));
      localStorage.setItem('customWords', JSON.stringify(this.customWords));
      localStorage.setItem('wordStats', JSON.stringify(this.wordStats));
      localStorage.setItem('weeklyProgress', JSON.stringify(this.weeklyProgress));
    } catch (e) { console.error('Error saving data:', e); }
  }

  // =========
  // Theme
  // =========
toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}
  
  toggleSound(btnEl) {
  this.muted = !this.muted;
  localStorage.setItem('app_muted', JSON.stringify(this.muted));
  
  if (btnEl) {
    const icon = btnEl.querySelector('i');
    if (icon) {
      icon.className = this.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    }
    btnEl.innerHTML = `
      <i class="fas fa-${this.muted ? 'volume-mute' : 'volume-up'}"></i> 
      ${this.muted ? 'Включить звук' : 'Отключить звук'}
    `;
  }
  
  this.showNotification(this.muted ? 'Звук отключен' : 'Звук включен', 'info');
}

  // =========
  // Support
  // =========
  showSupportModal() {
    const modal = document.createElement('div');
    modal.className = 'support-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
      <div class="support-modal-content" style="background:var(--bg-primary);border-radius:16px;padding:30px;max-width:500px;width:100%;box-shadow:var(--shadow-lg);">
        <h2 style="margin-bottom:15px;color:var(--text-primary);">❤️ Поддержать проект</h2>
        <p style="margin-bottom:15px;color:var(--text-secondary);">Это бесплатный сервис без рекламы, который создан с любовью к изучению английского языка. </p>
         <p style="margin-bottom:15px;color:var(--text-secondary);">Проект может развиваться и существовать благодаря вашим донатам.</p>
        <p style="margin-bottom:15px;color:var(--text-secondary);">Если вам понравилось мое приложение и оно помогает вам учить английский, не забудьте помочь проекту!</p>
        <p style="margin-bottom:20px;color:var(--text-secondary);"><strong>Об авторе:</strong><br>Приложение создано Бердиевым Абдуррахимом - Аспирантом педагогических наук</p> 
        <a href="https://pay.cloudtips.ru/p/8f56d7d3" target="_blank" class="btn btn-primary" style="text-decoration:none;display:inline-block;margin-right:10px;margin-bottom:10px;">
          <i class="fas fa-heart"></i> Поддержать проект
        </a>
        <button class="btn btn-secondary" data-testid="support-close" onclick="this.closest('.support-modal').remove()">Закрыть</button>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }
  
  showLearningHelpModal() {
  const overlay = document.createElement('div');
  overlay.className = 'grammar-modal show';
  overlay.innerHTML = `
    <div class="grammar-modal-content">
      <div class="grammar-modal-header">
        <div class="grammar-modal-title">
          <span>📚</span>
          <span>Как работают режимы практики</span>
        </div>
        <button class="grammar-close-btn" aria-label="Закрыть">&times;</button>
      </div>
      <div class="grammar-modal-body">
        <div class="grammar-section">
          <div class="grammar-section-title">
            <i class="fas fa-bullseye"></i>
            <span>Заучивание</span>
          </div>
          <p>
            Подходит для изучения новых слов. Система даёт ограниченный пул (около 40 слов)
            и постепенно добавляет новые, когда вы отвечаете правильно. Добавили 500 слов?
            Не страшно — сначала увидите ~20, потом ещё 10, ещё 10 и т.д.
          </p>
        </div>
        <div class="grammar-section">
          <div class="grammar-section-title">
            <i class="fas fa-redo"></i>
            <span>Повторение</span>
          </div>
          <p>
            Показывает все незавершённые слова по кругу. Удобно, если хотите просто «погонять» всю
            лексику без ограничений.
          </p>
        </div>
        <div class="grammar-section">
          <div class="grammar-section-title">
            <i class="fas fa-list"></i>
            <span>Список</span>
          </div>
          <p>
            Открывает полный список слов, которые вы учите. Отсюда можно удалять слова, слушать
            озвучку и редактировать переводы.
          </p>
        </div>
        <div class="grammar-tip">
          <div class="grammar-tip-title">💡 Совет</div>
          <p>
            Начинайте с режима <strong>Заучивание</strong>, чтобы не перегружать память. Когда слова
            стали знакомыми — переходите в <strong>Повторение</strong>.
          </p>
        </div>
      </div>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('grammar-close-btn')) {
      overlay.remove();
    }
  });
  document.body.appendChild(overlay);
}

// =========
// Info (О приложении)
// =========
showInfoModal() { 
  const modal = document.createElement('div'); 
  modal.className = 'info-modal'; 
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;'; 
  modal.innerHTML = `
    <div class="info-modal-content" style="background:var(--bg-primary);border-radius:16px;padding:30px;max-width:800px;width:100%;box-shadow:var(--shadow-lg);max-height:90vh;overflow-y:auto;"> 
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"> 
        <h2 style="margin:0;color:var(--text-primary);">О приложении</h2> 
        <button data-testid="info-close" onclick="this.closest('.info-modal').remove()" style="background:transparent;border:none;font-size:24px;cursor:pointer;color:var(--text-secondary);width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:all 0.2s;"> 
          <i class="fas fa-times"></i> 
        </button> 
      </div> 
      ${this.getAboutContentHtml()} 
      <div style="margin-top:20px;text-align:center;"> 
        <button class="btn btn-secondary" onclick="this.closest('.info-modal').remove()">Закрыть</button> 
      </div> 
    </div>
  `; 
  modal.addEventListener('click', (e) => { 
    if (e.target === modal) modal.remove(); 
  }); 
  document.body.appendChild(modal); 
}

getAboutContentHtml() { 
  return `
    <div class="about-content"> 
      <div class="feature-card" style="background:var(--bg-secondary);padding:20px;border-radius:12px;margin-bottom:15px;"> 
        <div class="feature-icon" style="width:60px;height:60px;background:#7c3aed;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:10px;"> 
          <i class="fas fa-graduation-cap" style="color:white;"></i> 
        </div> 
        <h3 style="margin-bottom:8px;color:var(--text-primary);">Изучение по уровням</h3> 
        <p style="color:var(--text-secondary);margin:0;">Структурированное изучение английских слов от начального до продвинутого уровня (A1–C2)</p> 
      </div> 
      <div class="feature-card" style="background:var(--bg-secondary);padding:20px;border-radius:12px;margin-bottom:15px;"> 
        <div class="feature-icon" style="width:60px;height:60px;background:#7c3aed;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:10px;"> 
          <i class="fas fa-volume-up" style="color:white;"></i> 
        </div> 
        <h3 style="margin-bottom:8px;color:var(--text-primary);">Произношение</h3> 
        <p style="color:var(--text-secondary);margin:0;">Прослушивание правильного произношения слов (британский и американский акценты)</p> 
      </div> 
      <div class="feature-card" style="background:var(--bg-secondary);padding:20px;border-radius:12px;margin-bottom:15px;"> 
        <div class="feature-icon" style="width:60px;height:60px;background:#7c3aed;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:10px;"> 
          <i class="fas fa-gamepad" style="color:white;"></i> 
        </div> 
        <h3 style="margin-bottom:8px;color:var(--text-primary);">Учите английские слова играя в игры</h3> 
        <p style="color:var(--text-secondary);margin:0;">Играйте в разные увлекательные игры! Спустя время у вас будет появляться quiz, на который нужно ответить правильно, чтобы продолжить играть.</p> 
      </div> 
      <div class="feature-card" style="background:var(--bg-secondary);padding:20px;border-radius:12px;margin-bottom:15px;"> 
        <div class="feature-icon" style="width:60px;height:60px;background:#7c3aed;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:10px;"> 
          <i class="fas fa-laugh-beam" style="color:white;"></i> 
        </div> 
        <h3 style="margin-bottom:8px;color:var(--text-primary);">Позитивная атмосфера обучения</h3> 
        <p style="color:var(--text-secondary);margin:0;">Добавлены смешные картинки и мемы для мотивации и интереса.</p> 
      </div> 
      <div class="feature-card" style="background:var(--bg-secondary);padding:20px;border-radius:12px;margin-bottom:15px;"> 
        <div class="feature-icon" style="width:60px;height:60px;background:#7c3aed;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:10px;"> 
          <i class="fas fa-chart-line" style="color:white;"></i> 
        </div> 
        <h3 style="margin-bottom:8px;color:var(--text-primary);">Отслеживание прогресса</h3> 
        <p style="color:var(--text-secondary);margin:0;">Учет изученных слов и прогресс по уровням</p> 
      </div> 
      <div class="author-info" style="background:var(--bg-secondary);padding:20px;border-radius:12px;border-left:4px solid #7c3aed;"> 
        <h3 style="margin-bottom:8px;color:var(--text-primary);">Об авторе методики</h3> 
        <p style="color:var(--text-secondary);margin-bottom:12px;">Приложение создано на основе методики <strong>Абдуррахима Бердиева</strong>.</p> 
        <a href="https://berdiyev-eng.ru" target="_blank" class="author-link btn btn-primary" style="text-decoration:none;display:inline-block;"> 
          <i class="fas fa-external-link-alt"></i> Узнать больше об авторе 
        </a> 
      </div> 
    </div>
  `; 
}

// =========
// Settings Modal
// =========

showSettingsModal() { 
  const modal = document.createElement('div'); 
  modal.className = 'settings-modal'; 
  modal.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:20px;'; 
  modal.innerHTML = `
    <div class="settings-content" style="background:var(--bg-primary);border-radius:16px;padding:20px;max-width:520px;width:100%;box-shadow:var(--shadow-lg);"> 
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;"> 
        <h2 style="margin:0;color:var(--text-primary)">Настройки</h2> 
        <button class="btn btn-secondary settings-close-btn" data-testid="settings-close">
          <i class="fas fa-times"></i>
        </button> 
      </div> 
      <div id="settingsMenu"> 
        <button class="btn btn-primary settings-about-btn" data-testid="settings-about" style="width:100%;margin-bottom:10px;">
          <i class="fas fa-info-circle"></i> О приложении
        </button> 
        <button class="btn btn-primary settings-theme-btn" data-testid="settings-theme" style="width:100%;margin-bottom:10px;">
          <i class="fas fa-adjust"></i> Переключить тему
        </button> 
        <button class="btn btn-primary settings-audio-btn" data-testid="settings-audio" style="width:100%;margin-bottom:10px;">
          <i class="fas fa-volume-up"></i> Настройки аудио
        </button>
        <button class="btn btn-primary settings-install-btn" data-testid="settings-install" style="width:100%;margin-bottom:10px;">
          <i class="fas fa-download"></i> Установка приложения
        </button> 
      </div>
      <div id="settingsInnerPage" style="display:none;"></div>
      <div id="installGuide" style="display:none;"></div>
    </div>
  `; 
  
  document.body.appendChild(modal);
  
  // Добавляем обработчики через addEventListener
  const closeBtn = modal.querySelector('.settings-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.remove());
  }
  
  const aboutBtn = modal.querySelector('.settings-about-btn');
  if (aboutBtn) {
    aboutBtn.addEventListener('click', () => this.openAboutInSettings(aboutBtn));
  }
  
  const themeBtn = modal.querySelector('.settings-theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      this.toggleTheme();
      this.showNotification('Тема изменена!', 'success');
    });
  }
  
  const audioBtn = modal.querySelector('.settings-audio-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => this.openAudioSettingsInSettings(audioBtn));
  }
  
  const installBtn = modal.querySelector('.settings-install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', () => this.openInstallGuideInSettings(installBtn));
  }
  
  // Закрытие по клику на overlay
  modal.addEventListener('click', (e) => { 
    if (e.target === modal) modal.remove(); 
  }); 
}

openInstallGuideInSettings(btnEl) {
    const wrap = btnEl.closest('.settings-content');
    if (!wrap) return;
    
    const menu = wrap.querySelector('#settingsMenu');
    const guide = wrap.querySelector('#installGuide');
    if (!guide || !menu) return;
    
    menu.style.display = 'none';
    wrap.querySelector('#settingsInnerPage').style.display = 'none';
    guide.style.display = 'block';
    
    guide.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <h3 style="margin:0;color:var(--text-primary)">Инструкция по установке</h3>
            <button class="btn btn-secondary install-guide-back-btn">
              <i class="fas fa-arrow-left"></i> Назад
            </button>
        </div>
        <div style="border:1px solid var(--border-color);border-radius:12px;overflow:hidden;height:60vh;">
            <iframe src="app.html" style="width:100%;height:100%;border:0;background:var(--bg-secondary);" title="Инструкция по установке"></iframe>
        </div>
    `;
    
    // Добавляем обработчик для кнопки "Назад"
    const backBtn = guide.querySelector('.install-guide-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        guide.style.display = 'none';
        menu.style.display = 'block';
      });
    }
}

openAboutInSettings(btnEl) { 
  const wrap = btnEl.closest('.settings-content'); 
  if (!wrap) return;

  const menu = wrap.querySelector('#settingsMenu');
  const inner = wrap.querySelector('#settingsInnerPage');
  const guide = wrap.querySelector('#installGuide');
  if (!menu || !inner) return;

  menu.style.display = 'none';
  if (guide) guide.style.display = 'none';
  inner.style.display = 'block';

  inner.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <h3 style="margin:0;color:var(--text-primary)">О приложении</h3>
      <button class="btn btn-secondary" data-testid="settings-about-back-btn" onclick="
        const p=this.closest('.settings-content');
        p.querySelector('#settingsInnerPage').style.display='none';
        p.querySelector('#settingsMenu').style.display='block';
      ">
        <i class="fas fa-arrow-left"></i> Назад
      </button>
    </div>
    <div style="max-height:60vh;overflow:auto;border:1px solid var(--border-color);border-radius:12px;padding:14px;background:var(--bg-secondary);" data-testid="settings-about-content">
      ${this.getAboutContentHtml()}
    </div>
  `;
}

openAudioSettingsInSettings(btnEl) {
  const wrap = btnEl.closest('.settings-content');
  if (!wrap) return;

  const menu = wrap.querySelector('#settingsMenu');
  const inner = wrap.querySelector('#settingsInnerPage');
  const guide = wrap.querySelector('#installGuide');
  if (!menu || !inner) return;

  menu.style.display = 'none';
  if (guide) guide.style.display = 'none';
  inner.style.display = 'block';

  const rate = this.audioRate || 1;
  const muted = this.muted;

  inner.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <h3 style="margin:0;color:var(--text-primary)">Настройки аудио</h3>
      <button class="btn btn-secondary" data-testid="settings-audio-back-btn">
        <i class="fas fa-arrow-left"></i> Назад
      </button>
    </div>
    <div style="max-height:60vh;overflow:auto;border:1px solid var(--border-color);border-radius:12px;padding:14px;background:var(--bg-secondary);" data-testid="settings-audio-content">
      <div style="margin-bottom:16px;">
        <h4 style="margin:0 0 6px;color:var(--text-primary);">Скорость воспроизведения</h4>
        <p style="margin:0 0 10px;color:var(--text-secondary);font-size:0.85rem;">
          Настройте, насколько медленно или быстро будут озвучиваться слова и предложения.
        </p>
        <input type="range"
               id="audioRateSlider"
               min="0.5"
               max="1.5"
               step="0.1"
               value="${rate.toFixed(1)}"
               style="width:100%;">
        <div style="margin-top:6px;font-size:0.85rem;color:var(--text-secondary);">
          Текущая скорость: <strong><span id="audioRateValue">${rate.toFixed(1)}</span>x</strong>
        </div>
      </div>
      <div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:8px;">
        <h4 style="margin:0 0 6px;color:var(--text-primary);">Звук</h4>
        <p style="margin:0 0 10px;color:var(--text-secondary);font-size:0.85rem;">
          Вы можете временно полностью выключить звук в приложении.
        </p>
        <button class="btn btn-primary" id="audioMuteToggleBtn">
          <i class="fas fa-${muted ? 'volume-mute' : 'volume-up'}"></i>
          ${muted ? 'Включить звук' : 'Отключить звук'}
        </button>
      </div>
    </div>
  `;

  const backBtn = inner.querySelector('[data-testid="settings-audio-back-btn"]');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      inner.style.display = 'none';
      menu.style.display = 'block';
    });
  }

  const slider = inner.querySelector('#audioRateSlider');
  const valueEl = inner.querySelector('#audioRateValue');
  if (slider && valueEl) {
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value) || 1;
      this.audioRate = Math.min(1.5, Math.max(0.5, v));
      localStorage.setItem('audio_rate', String(this.audioRate));
      valueEl.textContent = this.audioRate.toFixed(1);
    });
  }

  const muteBtn = inner.querySelector('#audioMuteToggleBtn');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      this.toggleSound(muteBtn);
    });
  }
}

  // =========
  // Sections
  // =========
switchSection(section) {
    // Простой скролл без анимации для мобильных
    window.scrollTo(0, 0);

    this.currentSection = section;
    this.stopCurrentAudio();

    // ДОБАВИТЬ эти строки для исправления багов отображения
    document.querySelectorAll('.content-section').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none'; // ДОБАВИТЬ
    });
    
    const targetSection = document.getElementById(section);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block'; // ДОБАВИТЬ
    }

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-section="${section}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    if (section === 'levels') {
      this.backToLevels();
      this.updateLevelCounts(); // ДОБАВИТЬ
      setTimeout(() => this.ensureAutoDictButton(), 0);
    }
    
    if (section === 'learning') {
      // Синхронизация кнопок режима
      setTimeout(() => {
        document.querySelectorAll('.mode-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-mode') === this.currentMode);
        });
        document.querySelectorAll('.practice-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-practice') === this.currentPractice);
        });
        
        // Скрываем practice toggle для тренажера
        const practiceToggle = document.querySelector('.practice-toggle');
        if (practiceToggle) {
          if (this.currentMode === 'trainer') {
            // Для тренажера оставляем видимыми
          } else {
            practiceToggle.style.display = 'flex';
          }
        }
      }, 50);
      this.renderLearningSection();
    }
    
    
    if (section === 'progress') this.renderProgress();
    
    if (section === 'new-words') {
      const newLevelSel = document.getElementById('newLevel');
      if (newLevelSel) { 
        const grp = newLevelSel.closest('.form-group') || newLevelSel.parentElement; 
        if (grp) grp.style.display = 'none'; 
        else newLevelSel.style.display = 'none'; 
      }
      const bulkLevelSel = document.getElementById('bulkLevel');
      if (bulkLevelSel) { 
        const grp2 = bulkLevelSel.closest('.form-group') || bulkLevelSel.parentElement; 
        if (grp2) grp2.style.display = 'none'; 
        else bulkLevelSel.style.display = 'none'; 
      }
      this.renderCustomWords();
    }
    // Инициализируем обработчики переводчика (делегирование кликов)
if (typeof window.initBewordsTranslator === 'function') {
setTimeout(() => window.initBewordsTranslator(), 0);
}
}

  // =========
  // Levels & Categories
  // =========
    updateLevelCounts() {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    levels.forEach(level => {
      const words = oxfordWordsDatabase[level] || [];
      const countEl = document.querySelector(`[data-level="${level}"] .word-count`);
      if (countEl) countEl.textContent = `${words.length} слов`;
    });

    // Обычные категории
    const setCatCount = (catKey, selector) => {
      const words = oxfordWordsDatabase[catKey] || [];
      const countEl = document.querySelector(`${selector} .word-count`);
      if (countEl) countEl.textContent = `${words.length} слов`;
    };

    setCatCount('IRREGULARS', '[data-category="IRREGULARS"]');
    setCatCount('PHRASAL_VERBS', '[data-category="PHRASAL_VERBS"]');
    setCatCount('IDIOMS', '[data-category="IDIOMS"]');
    setCatCount('PREPOSITIONS', '[data-category="PREPOSITIONS"]');
    setCatCount('MEDICAL', '[data-category="MEDICAL"]');

    const addedCard = document.querySelector('[data-category="ADDED"] .word-count');
    if (addedCard) addedCard.textContent = `${this.customWords.length} слов`;

    // Экзамены — если нет слов, делаем карточку "coming soon"
    const setExamCount = (key) => {
      const words = oxfordWordsDatabase[key] || [];
      const card = document.querySelector(`.level-card[data-category="${key}"]`);
      const countEl = card ? card.querySelector('.word-count') : null;
      if (!card || !countEl) return;
      
      if (words.length === 0) {
        countEl.textContent = 'Скоро';
        card.classList.add('coming-soon');
      } else {
        countEl.textContent = `${words.length} слов`;
        card.classList.remove('coming-soon');
      }
    };

    ['EGE','OGE','IELTS','TOEFL','PROVERBS','IT','BUSINESS','LEGAL'].forEach(setExamCount);
  }

toggleLevelsIndexVisibility(showIndex) {
  const levelsSection = document.getElementById('levels');
  if (!levelsSection) return;

  // Вешаем/снимаем класс режима списка
  levelsSection.classList.toggle('list-open', !showIndex);

  // Показ/скрытие контейнера со словами
  const wordsContainer = document.getElementById('wordsContainer');
  if (wordsContainer) {
    wordsContainer.classList.toggle('hidden', showIndex);
  }

  // Дополнительно: прячем любые заголовки "Слова по уровням" / "Категории"
  // на случай если у них другие классы
  const hideByText = ['слова по уровням', 'категории'];
  levelsSection.querySelectorAll('h1,h2,h3,h4').forEach(h => {
    const t = (h.textContent || '').trim().toLowerCase();
    const match = hideByText.some(x => t.includes(x));
    if (match) {
      h.style.display = showIndex ? '' : 'none';
    }
  });
}

jumpToTopStrict(attempts = 3) {
  try {
    const main = document.querySelector('.main-content');
    const prev = main ? main.style.scrollBehavior : '';
    if (main) main.style.scrollBehavior = 'auto';

    const doScroll = () => {
      if (main) main.scrollTop = 0;
      // страхуемся на всякий случай
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    doScroll(); // сразу
    let n = 1;
    const again = () => {
      if (n++ >= attempts) {
        if (main) main.style.scrollBehavior = prev;
        return;
      }
      requestAnimationFrame(() => {
        doScroll();
        setTimeout(again, 0);
      });
    };
    again();
  } catch (e) {}
}

scrollMainToTop() {
  // Прокрутка главного контейнера контента
  const main = document.querySelector('.main-content');
  if (main) {
    main.scrollTop = 0; // мгновенно, без анимации
  } else {
    // фолбэк
    window.scrollTo(0, 0);
  }
}

showLevelWords(level) {
  this.stopCurrentAudio();
  this.currentLevel = level;
  this.currentCategory = null;

  const words = oxfordWordsDatabase[level] || [];
  const container = document.getElementById('wordsContainer');
  const title = document.getElementById('currentLevelTitle');
  const wordsList = document.getElementById('wordsList');

  // Если слов очень много — используем ленивую загрузку по 250
  if (words.length > 250) {
    this.showLevelWordsLazy(level);
    return;
  }

  if (typeof this.toggleLevelsIndexVisibility === 'function') {
    this.toggleLevelsIndexVisibility(false);
  }
  if (container) container.classList.remove('hidden');

  if (title) title.textContent = `${level} - ${words.length} слов`;

  if (wordsList) {
    wordsList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Загрузка...</div>';

    if (this.isAndroid) {
      this.showGlobalLoader('Кот Боб загружает для вас этот список...', 1500);
    }

        requestAnimationFrame(() => {
      const fragment = document.createDocumentFragment();
      const tempDiv = document.createElement('div');

      // Генерируем HTML (без изменений)
      tempDiv.innerHTML = words.map(word => this.createWordCard(word, level)).join('');

      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }

      wordsList.innerHTML = '';
      wordsList.appendChild(fragment);

      this.installWordsListDelegatedHandlers();

      // === ВАЖНОЕ ИСПРАВЛЕНИЕ ===
      // Вызываем обновление кнопки с небольшой задержкой, чтобы данные точно "устоялись"
      setTimeout(() => {
          this.updateBulkToggleButton();
      }, 50); 
      // ===========================

      if (typeof this.ensureAutoDictButton === 'function') {
        this.ensureAutoDictButton();
      }

      if (this.isAndroid) {
        this.hideGlobalLoader();
      }
    });
  }

  this.jumpToTopStrict();
}

showCategoryWords(category) {
  this.stopCurrentAudio();
  this.currentCategory = category;
  this.currentLevel = null;

  const words = oxfordWordsDatabase[category] || [];
  const container = document.getElementById('wordsContainer');
  const title = document.getElementById('currentLevelTitle');
  const wordsList = document.getElementById('wordsList');

  // Для очень больших списков категорий — лениво
  if (words.length > 250) {
    this.showLevelWordsLazy(category);
    return;
  }

  if (typeof this.toggleLevelsIndexVisibility === 'function') {
    this.toggleLevelsIndexVisibility(false);
  }
  if (container) container.classList.remove('hidden');

  const categoryName =
    category === 'IRREGULARS' ? 'Неправильные глаголы' :
    category === 'PHRASAL_VERBS' ? 'Фразовые глаголы' :
    category === 'IDIOMS' ? 'Идиомы' :
    category === 'PROVERBS' ? 'Пословицы и поговорки' :
    category === 'MEDICAL' ? 'Медицинский английский' :
    category === 'PREPOSITIONS' ? 'Предлоги' :
    'Категория';

  if (title) title.textContent = `${categoryName} - ${words.length} слов`;

  if (wordsList) {
    wordsList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Загрузка...</div>';

    if (this.isAndroid) {
      this.showGlobalLoader('Кот Боб загружает для вас этот список...', 1500);
    }

    requestAnimationFrame(() => {
      const fragment = document.createDocumentFragment();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = words.map(word => this.createWordCard(word, category)).join('');

      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }

      wordsList.innerHTML = '';
      wordsList.appendChild(fragment);

      this.installWordsListDelegatedHandlers();
      setTimeout(() => {
          this.updateBulkToggleButton();
      }, 50);

      if (typeof this.ensureAutoDictButton === 'function') {
        this.ensureAutoDictButton();
      }

      if (this.isAndroid) {
        this.hideGlobalLoader();
      }
    });
  }

  this.jumpToTopStrict();
}

// Ленивая загрузка для больших списков (>250 слов)
showLevelWordsLazy(level) {
  const words = oxfordWordsDatabase[level] || [];
  const BATCH_SIZE = 250;

  // Если слов мало - обычный рендеринг
  if (words.length <= BATCH_SIZE) {
    this.showLevelWords(level);
    return;
  }

  this.stopCurrentAudio();
  this.currentLevel = level;
  this.currentCategory = null;

  const container = document.getElementById('wordsContainer');
  const title = document.getElementById('currentLevelTitle');
  const wordsList = document.getElementById('wordsList');

  if (typeof this.toggleLevelsIndexVisibility === 'function') {
    this.toggleLevelsIndexVisibility(false);
  }
  if (container) container.classList.remove('hidden');
  if (title) title.textContent = `${level} - ${words.length} слов (загрузка...)`;

  if (wordsList) {
    if (this.isAndroid) {
      this.showGlobalLoader('Кот Боб загружает для вас эту страницу...', 2000);
    }

    wordsList.innerHTML = words.slice(0, BATCH_SIZE)
      .map(w => this.createWordCard(w, level))
      .join('');
      
      // кнопка подобрать там и сям
this.installWordsListDelegatedHandlers();
      setTimeout(() => {
          this.updateBulkToggleButton();
      }, 100); 

// Гарантируем появление кнопки, даже если рендер занял время
requestAnimationFrame(() => {
  if (typeof this.ensureAutoDictButton === 'function') {
    this.ensureAutoDictButton();
  }
});

      let loaded = BATCH_SIZE;

    if (this.isAndroid) {
      this.hideGlobalLoader();
    }

    // Если загрузили не всё — настраиваем дозагрузку
    if (loaded < words.length) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          // 1. Убираем старый "датчик"
          const oldSentinel = document.getElementById('lazy-sentinel');
          if (oldSentinel) {
            observer.unobserve(oldSentinel);
            oldSentinel.remove();
          }

          // 2. Показываем лоадер (если Android)
          if (this.isAndroid) {
            this.showGlobalLoader('Кот Боб загружает ещё слова...', 1500);
          }

          // 3. Грузим следующую порцию
          const nextBatch = words.slice(loaded, loaded + BATCH_SIZE)
            .map(w => this.createWordCard(w, level))
            .join('');
          
          wordsList.insertAdjacentHTML('beforeend', nextBatch);
          loaded += BATCH_SIZE;
          this.updateBulkToggleButton();

          if (title) {
            title.textContent = `${level} - Загружено ${Math.min(loaded, words.length)}/${words.length} слов`;
          }

          // 4. Прячем лоадер
          if (this.isAndroid) {
            this.hideGlobalLoader();
          }

          // 5. Если остались ещё слова — добавляем новый "датчик" в самый низ
          if (loaded < words.length) {
            const newSentinel = document.createElement('div');
            newSentinel.style.height = '40px';
            newSentinel.id = 'lazy-sentinel';
            wordsList.appendChild(newSentinel);
            observer.observe(newSentinel);
          }
        }
      }, { rootMargin: '400px' });

      // Создаем самый первый "датчик"
      const s = document.createElement('div');
      s.style.height = '40px';
      s.id = 'lazy-sentinel';
      wordsList.appendChild(s);
      observer.observe(s);
    }
  }
  this.jumpToTopStrict();
}

backToLevels() {
  this.stopCurrentAudio();

  this.toggleLevelsIndexVisibility(true);

  this.currentLevel = null;
  this.currentCategory = null;

  // Удаляем CTA, если он вставлен
  document.querySelectorAll('#levels .auto-dict-top, #levels .auto-dict-inline')
    .forEach(n => n.remove());
}
 // =========
  // Auto Dictionary (Levels page) — NEW TEST UI
  // =========


showAutoDictionaryTest() {
  // Build overlay container styled per provided design
  const overlay = document.createElement('div');
  overlay.id = 'autoDictOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1000003;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);display:flex;align-items:center;justify-content:center;padding:10px;';

  const container = document.createElement('div');
  container.className = 'container';
  container.style.cssText = 'background:white;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:100%;width:100%;padding:20px;';

  // Styles injection (scoped via ids/classes used below)
  const style = document.createElement('style');
  style.textContent = `
    #autoDictOverlay h1 { color:#333;text-align:center;margin-bottom:10px;font-size:22px; }
    #autoDictOverlay .subtitle { text-align:center;color:#666;margin-bottom:20px;font-size:14px; }
    #autoDictOverlay .progress-bar{width:100%;height:8px;background:#e0e0e0;border-radius:10px;margin-bottom:20px;overflow:hidden;}
    #autoDictOverlay .progress-fill{height:100%;background:linear-gradient(90deg,#667eea 0%,#764ba2 100%);width:0%;transition:width .3s ease;}
    #autoDictOverlay .question-counter{text-align:center;color:#666;margin-bottom:15px;font-weight:600;font-size:16px;}
    #autoDictOverlay .question-card{background:#f8f9fa;padding:20px;border-radius:15px;margin-bottom:20px;}
    #autoDictOverlay .word{font-size:24px;font-weight:bold;color:#333;text-align:center;margin-bottom:20px;word-break:break-word;}
    #autoDictOverlay .options{display:grid;gap:12px;}
    #autoDictOverlay .option-btn{background:white;border:2px solid #e0e0e0;padding:15px;border-radius:10px;cursor:pointer;transition:all .3s ease;font-size:14px;text-align:left;color:#333;min-height:50px;display:flex;align-items:center;justify-content:flex-start;}
    #autoDictOverlay .option-btn:hover{border-color:#667eea;background:#f0f4ff;transform:translateX(5px);}
    #autoDictOverlay .option-btn.correct{background:#10b981;color:white;border-color:#10b981;}
    #autoDictOverlay .option-btn.incorrect{background:#ef4444;color:white;border-color:#ef4444;}
    #autoDictOverlay .control-buttons{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:10px;}
    #autoDictOverlay .btn{padding:12px 20px;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;transition:all .3s ease;flex:1;max-width:200px;}
    #autoDictOverlay .btn-primary{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;}
    #autoDictOverlay .btn-secondary{background:#f3f4f6;color:#666;}
    #autoDictOverlay .btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(102,126,234,.3);}
    #autoDictOverlay .btn-secondary:hover{background:#e5e7eb;}
    #autoDictOverlay .btn:disabled{opacity:.5;cursor:not-allowed;}
    #autoDictOverlay .result-card{text-align:center;padding:20px;}
    #autoDictOverlay .level-badge{display:inline-block;padding:12px 25px;border-radius:50px;font-size:20px;font-weight:bold;margin:15px 0;color:white;}
    #autoDictOverlay .level-A1{background:linear-gradient(135deg,#84fab0 0%,#8fd3f4 100%);}
    #autoDictOverlay .level-A2{background:linear-gradient(135deg,#a1c4fd 0%,#c2e9fb 100%);}
    #autoDictOverlay .level-B1{background:linear-gradient(135deg,#fbc2eb 0%,#a6c1ee 100%);}
    #autoDictOverlay .level-B2{background:linear-gradient(135deg,#fdcbf1 0%,#e6dee9 100%);}
    #autoDictOverlay .level-C1{background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);}
    #autoDictOverlay .level-C2{background:linear-gradient(135deg,#4facfe 0%,#00f2fe 100%);}
    #autoDictOverlay .level-description{color:#666;font-size:16px;margin:15px 0;line-height:1.5;}
    #autoDictOverlay .stats{background:#f8f9fa;padding:15px;border-radius:15px;margin:15px 0;}
    #autoDictOverlay .stat-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e0e0e0;font-size:14px;}
    #autoDictOverlay .stat-row:last-child{border-bottom:none;}
    #autoDictOverlay .stat-label{color:#666;font-weight:600;}
    #autoDictOverlay .stat-value{color:#333;font-weight:bold;}
    #autoDictOverlay .start-screen{text-align:center;padding:15px;}
    #autoDictOverlay .start-screen h2{color:#333;margin-bottom:15px;font-size:18px;}
    #autoDictOverlay .start-screen ul{text-align:left;max-width:300px;margin:15px auto;color:#666;line-height:1.5;font-size:13px;}
    #autoDictOverlay .start-screen li{margin-bottom:8px;}
    #autoDictOverlay .start-screen .btn{margin-top:10px;}
    #autoDictOverlay .back-btn { position: absolute; top: 15px; left: 15px; background: #f3f4f6; color: #666; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 5px; }
    #autoDictOverlay .back-btn:hover { background: #e5e7eb; }
    .acc-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:700;}
.acc-none{background:#e5e7eb;color:#374151;}
.acc-good{background:#d1fae5;color:#065f46;}
.acc-mid{background:#fef3c7;color:#92400e;}
.acc-bad{background:#fee2e2;color:#991b1b;}
.word-meta{margin-top:6px;color:var(--text-secondary);}
    @media (max-width:480px){
      #autoDictOverlay .container{padding:15px;}
      #autoDictOverlay h1{font-size:18px;}
      #autoDictOverlay .word{font-size:20px;}
      #autoDictOverlay .option-btn{padding:12px;font-size:13px;min-height:45px;}
      #autoDictOverlay .btn{padding:10px 15px;font-size:14px;max-width:100%;}
      #autoDictOverlay .start-screen ul{font-size:12px;max-width:250px;}
    }
    @media (max-width:320px){
      #autoDictOverlay .option-btn{padding:10px;font-size:12px;min-height:40px;}
      #autoDictOverlay .btn{padding:8px 12px;font-size:13px;}
    }
    /* Стили для виджета Ачивок */
.achievements-widget {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 15px;
  margin-bottom: 14px;
}
.ach-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
}
.ach-title { font-weight: 800; color: var(--text-primary); font-size: 16px; }
.ach-streak { 
  background: #fff3cd; color: #856404; padding: 4px 8px; 
  border-radius: 8px; font-weight: 700; font-size: 12px; display: flex; align-items: center; gap: 5px; 
}
.ach-streak i { color: #ffc107; }
.ach-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px; }
.ach-item { 
  background: var(--bg-primary); border: 1px solid var(--border-color); 
  border-radius: 10px; padding: 10px 5px; text-align: center; opacity: 0.5; filter: grayscale(1); transition: all 0.3s;
}
.ach-item.unlocked { opacity: 1; filter: grayscale(0); border-color: #fbbf24; background: linear-gradient(180deg, var(--bg-primary) 0%, #fffbeb 100%); }
.ach-icon { font-size: 24px; margin-bottom: 5px; display: block; }
.ach-name { font-size: 10px; font-weight: 700; color: var(--text-secondary); line-height: 1.2; }
.daily-goal-box { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color); }
.goal-label { font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; justify-content: space-between; margin-bottom: 6px; }
.goal-bar-track { height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden; }
.goal-bar-fill { height: 100%; background: var(--success-color); transition: width 0.5s ease; }
  `;
  overlay.appendChild(style);

  // App node
  const appWrap = document.createElement('div');
  appWrap.id = 'autoTestApp';
  appWrap.innerHTML = `
    <button class="back-btn" id="backBtnTest">
      <i class="fas fa-arrow-left"></i> Назад
    </button>
    
    <div id="startScreen" class="start-screen">
      <h1>📚 Тест на определение словарного запаса</h1>
      <p class="subtitle">Английский язык A1 - C2</p>
      <div style="margin:15px 0;">
        <h2>Как проходить тест:</h2>
        <ul>
          <li>✓ Вам будут показаны слова разной сложности</li>
          <li>✓ Выберите правильный перевод из предложенных вариантов</li>
          <li>✓ Если не знаете слово - нажмите "Не знаю"</li>
          <li>✓ Тест состоит из 40 вопросов</li>
          <li>✓ Результат определит ваш точный уровень</li>
          <li>✓ Будьте честны для получения точного результата!</li>
          <li>✓ После прохождения теста, система автоматически соберет за вас словарный запас для изучения!</li>
        </ul>
      </div>
      <div class="control-buttons">
        <button class="btn btn-secondary" id="closeTestBtn">Закрыть</button>
        <button class="btn btn-primary" id="startBtn">Начать тест</button>
      </div>
    </div>

    <div id="testScreen" style="display:none;">
      <h1>📚 Тест словарного запаса</h1>
      <p class="subtitle">Выберите правильный перевод слова</p>
      <div class="progress-bar"><div class="progress-fill" id="progressBar"></div></div>
      <div class="question-counter" id="questionCounter"></div>
      <div class="question-card">
        <div class="word" id="wordDisplay"></div>
        <div class="options" id="optionsContainer"></div>
      </div>
      <div class="control-buttons">
        <button class="btn btn-secondary" id="dontKnowBtn">❌ Не знаю</button>
        <button class="btn btn-primary" id="nextBtn" disabled>Далее →</button>
      </div>
    </div>

    <div id="resultScreen" style="display:none;">
      <div class="result-card">
        <h1>🎉 Тест завершен!</h1>
        <p class="subtitle">Вот ваш результат:</p>
        <div class="level-badge" id="levelBadge"></div>
        <div class="level-description" id="levelDescription"></div>
        <div class="stats">
          <div class="stat-row"><span class="stat-label">Всего вопросов:</span><span class="stat-value" id="totalQuestions"></span></div>
          <div class="stat-row"><span class="stat-label">Правильных ответов:</span><span class="stat-value" id="correctAnswers"></span></div>
          <div class="stat-row"><span class="stat-label">Точность:</span><span class="stat-value" id="accuracy"></span></div>
          <div class="stat-row"><span class="stat-label">Примерный словарный запас:</span><span class="stat-value" id="vocabSize"></span></div>
        </div>
        <div class="control-buttons">
          <button class="btn btn-secondary" id="restartBtn">Пройти тест заново</button>
          <button class="btn btn-primary" id="applyDictBtn">Собрать словарь автоматически</button>
          <button class="btn btn-secondary" id="closeResultBtn">Закрыть</button>
        </div>
      </div>
    </div>
  `;

  // Append nodes
  container.appendChild(appWrap);
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  // Local state for test
  const wordDatabase = [
    // A1.1 - Weak A1 (basic words)
    { word: "cat", translation: "кошка", level: "A1.1", options: ["собака", "кошка", "птица", "рыба"] },
    { word: "book", translation: "книга", level: "A1.1", options: ["ручка", "книга", "стол", "стул"] },
    { word: "water", translation: "вода", level: "A1.1", options: ["еда", "вода", "молоко", "сок"] },
    { word: "house", translation: "дом", level: "A1.1", options: ["дом", "машина", "дерево", "парк"] },
    { word: "family", translation: "семья", level: "A1.1", options: ["друзья", "семья", "соседи", "коллеги"] },
    { word: "happy", translation: "счастливый", level: "A1.1", options: ["грустный", "злой", "счастливый", "уставший"] },
    { word: "work", translation: "работа", level: "A1.1", options: ["игра", "отдых", "работа", "учеба"] },
    { word: "food", translation: "еда", level: "A1.1", options: ["напиток", "еда", "одежда", "мебель"] },
    { word: "day", translation: "день", level: "A1.1", options: ["ночь", "день", "месяц", "год"] },
    { word: "time", translation: "время", level: "A1.1", options: ["время", "место", "день", "час"] },
    
    // A1.2 - Strong A1 or Weak A2 (intermediate basic words)
    { word: "weather", translation: "погода", level: "A1.2", options: ["время", "погода", "сезон", "климат"] },
    { word: "expensive", translation: "дорогой", level: "A1.2", options: ["дешевый", "дорогой", "старый", "новый"] },
    { word: "journey", translation: "путешествие", level: "A1.2", options: ["прогулка", "поездка", "путешествие", "экскурсия"] },
    { word: "neighbor", translation: "сосед", level: "A1.2", options: ["друг", "родственник", "сосед", "коллега"] },
    { word: "create", translation: "создавать", level: "A1.2", options: ["разрушать", "создавать", "менять", "копировать"] },
    { word: "opinion", translation: "мнение", level: "A1.2", options: ["факт", "мнение", "правда", "ложь"] },
    { word: "discover", translation: "открывать", level: "A1.2", options: ["закрывать", "прятать", "открывать", "терять"] },
    { word: "prepare", translation: "готовить", level: "A1.2", options: ["готовить", "убирать", "мыть", "резать"] },
    { word: "difficult", translation: "трудный", level: "A1.2", options: ["легкий", "трудный", "сложный", "простой"] },
    { word: "important", translation: "важный", level: "A1.2", options: ["важный", "малый", "большой", "маленький"] },
    
    // A2.1 - Strong A2 or Weak B1 (intermediate words)
    { word: "achievement", translation: "достижение", level: "A2.1", options: ["провал", "попытка", "достижение", "цель"] },
    { word: "beneficial", translation: "полезный", level: "A2.1", options: ["вредный", "нейтральный", "полезный", "опасный"] },
    { word: "contribute", translation: "вносить вклад", level: "A2.1", options: ["забирать", "вносить вклад", "отказываться", "игнорировать"] },
    { word: "evidence", translation: "доказательство", level: "A2.1", options: ["догадка", "доказательство", "предположение", "слух"] },
    { word: "anxiety", translation: "тревога", level: "A2.1", options: ["радость", "спокойствие", "тревога", "скука"] },
    { word: "decline", translation: "снижаться", level: "A2.1", options: ["расти", "снижаться", "оставаться", "колебаться"] },
    { word: "enthusiasm", translation: "энтузиазм", level: "A2.1", options: ["апатия", "энтузиазм", "страх", "злость"] },
    { word: "obvious", translation: "очевидный", level: "A2.1", options: ["скрытый", "очевидный", "сложный", "простой"] },
    { word: "anticipate", translation: "предвидеть", level: "A2.1", options: ["игнорировать", "предвидеть", "забывать", "отрицать"] },
    { word: "coherent", translation: "связный", level: "A2.1", options: ["хаотичный", "связный", "простой", "сложный"] },
    
    // A2.2 - Strong B1 or Weak B2 (advanced intermediate words)
    { word: "deteriorate", translation: "ухудшаться", level: "A2.2", options: ["улучшаться", "ухудшаться", "стабилизироваться", "изменяться"] },
    { word: "incentive", translation: "стимул", level: "A2.2", options: ["препятствие", "стимул", "результат", "процесс"] },
    { word: "ambiguous", translation: "неоднозначный", level: "A2.2", options: ["ясный", "неоднозначный", "простой", "прямой"] },
    { word: "condemn", translation: "осуждать", level: "A2.2", options: ["хвалить", "осуждать", "игнорировать", "принимать"] },
    { word: "diligent", translation: "усердный", level: "A2.2", options: ["ленивый", "усердный", "быстрый", "медленный"] },
    { word: "resilient", translation: "устойчивый", level: "A2.2", options: ["хрупкий", "устойчивый", "слабый", "твердый"] },
    { word: "alleviate", translation: "облегчать", level: "A2.2", options: ["усиливать", "облегчать", "вызывать", "избегать"] },
    { word: "convoluted", translation: "запутанный", level: "A2.2", options: ["простой", "прямой", "запутанный", "ясный"] },
    { word: "meticulous", translation: "дотошный", level: "A2.2", options: ["небрежный", "дотошный", "быстрый", "медленный"] },
    { word: "pervasive", translation: "всепроникающий", level: "A2.2", options: ["редкий", "всепроникающий", "локальный", "временный"] },
    
    // B1.1 - Strong B1 or Weak B2 (upper intermediate words)
    { word: "complacent", translation: "самодовольный", level: "B1.1", options: ["беспокойный", "самодовольный", "скромный", "нервный"] },
    { word: "eloquent", translation: "красноречивый", level: "B1.1", options: ["косноязычный", "красноречивый", "тихий", "громкий"] },
    { word: "pragmatic", translation: "прагматичный", level: "B1.1", options: ["идеалистичный", "прагматичный", "мечтательный", "романтичный"] },
    { word: "scrutinize", translation: "тщательно изучать", level: "B1.1", options: ["игнорировать", "бегло просматривать", "тщательно изучать", "пропускать"] },
    { word: "obfuscate", translation: "затуманивать", level: "B1.1", options: ["прояснять", "затуманивать", "объяснять", "упрощать"] },
    { word: "ubiquitous", translation: "вездесущий", level: "B1.1", options: ["редкий", "вездесущий", "отсутствующий", "единичный"] },
    { word: "vicarious", translation: "косвенный", level: "B1.1", options: ["прямой", "косвенный", "личный", "открытый"] },
    { word: "nebulous", translation: "туманный", level: "B1.1", options: ["четкий", "туманный", "яркий", "точный"] },
    { word: "ephemeral", translation: "эфемерный", level: "B1.1", options: ["вечный", "эфемерный", "долгий", "постоянный"] },
    { word: "inscrutable", translation: "загадочный", level: "B1.1", options: ["понятный", "простой", "загадочный", "открытый"] },
    
    // B1.2 - Strong B2 or Weak C1 (advanced upper intermediate)
    { word: "surreptitious", translation: "тайный", level: "B1.2", options: ["открытый", "тайный", "публичный", "явный"] },
    { word: "zeitgeist", translation: "дух времени", level: "B1.2", options: ["прошлое", "дух времени", "будущее", "настоящее"] },
    { word: "reverberate", translation: "отражаться", level: "B1.2", options: ["отражаться", "затихать", "вспыхивать", "разбиваться"] },
    { word: "quintessential", translation: "сущностный", level: "B1.2", options: ["внешний", "сущностный", "важный", "незначительный"] },
    { word: "ephemeral", translation: "эфемерный", level: "B1.2", options: ["вечный", "эфемерный", "долгий", "постоянный"] },
    { word: "mellifluous", translation: "медовый", level: "B1.2", options: ["резкий", "медовый", "простой", "громкий"] },
    { word: "pragmatic", translation: "прагматичный", level: "B1.2", options: ["идеалистичный", "прагматичный", "мечтательный", "романтичный"] },
    { word: "serendipity", translation: "счастливое совпадение", level: "B1.2", options: ["несчастье", "счастливое совпадение", "случайность", "противоречие"] },
    { word: "ubiquitous", translation: "вездесущий", level: "B1.2", options: ["редкий", "вездесущий", "отсутствующий", "единичный"] },
    { word: "nebulous", translation: "туманный", level: "B1.2", options: ["четкий", "туманный", "яркий", "точный"] },
    
    // B2.1 - Strong C1 or Weak C2 (advanced words)
    { word: "reverberate", translation: "отражаться", level: "B2.1", options: ["отражаться", "затихать", "вспыхивать", "разбиваться"] },
    { word: "quintessential", translation: "сущностный", level: "B2.1", options: ["внешний", "сущностный", "важный", "незначительный"] },
    { word: "mellifluous", translation: "медовый", level: "B2.1", options: ["резкий", "медовый", "простой", "громкий"] },
    { word: "serendipity", translation: "счастливое совпадение", level: "B2.1", options: ["несчастье", "счастливое совпадение", "случайность", "противоречие"] },
    { word: "surreptitious", translation: "тайный", level: "B2.1", options: ["открытый", "тайный", "публичный", "явный"] },
    { word: "zeitgeist", translation: "дух времени", level: "B2.1", options: ["прошлое", "дух времени", "будущее", "настоящее"] },
    { word: "reverberate", translation: "отражаться", level: "B2.1", options: ["отражаться", "затихать", "вспыхивать", "разбиваться"] },
    { word: "quintessential", translation: "сущностный", level: "B2.1", options: ["внешний", "сущностный", "важный", "незначительный"] },
    { word: "mellifluous", translation: "медовый", level: "B2.1", options: ["резкий", "медовый", "простой", "громкий"] },
    { word: "serendipity", translation: "счастливое совпадение", level: "B2.1", options: ["несчастье", "счастливое совпадение", "случайность", "противоречие"] },
    
    // B2.2 - Strong C2 (proficiency level)
    { word: "reverberate", translation: "отражаться", level: "B2.2", options: ["отражаться", "затихать", "вспыхивать", "разбиваться"] },
    { word: "quintessential", translation: "сущностный", level: "B2.2", options: ["внешний", "сущностный", "важный", "незначительный"] },
    { word: "mellifluous", translation: "медовый", level: "B2.2", options: ["резкий", "медовый", "простой", "громкий"] },
    { word: "serendipity", translation: "счастливое совпадение", level: "B2.2", options: ["несчастье", "счастливое совпадение", "случайность", "противоречие"] },
    { word: "surreptitious", translation: "тайный", level: "B2.2", options: ["открытый", "тайный", "публичный", "явный"] },
    { word: "zeitgeist", translation: "дух времени", level: "B2.2", options: ["прошлое", "дух времени", "будущее", "настоящее"] },
    { word: "reverberate", translation: "отражаться", level: "B2.2", options: ["отражаться", "затихать", "вспыхивать", "разбиваться"] },
    { word: "quintessential", translation: "сущностный", level: "B2.2", options: ["внешний", "сущностный", "важный", "незначительный"] },
    { word: "mellifluous", translation: "медовый", level: "B2.2", options: ["резкий", "медовый", "простой", "громкий"] },
    { word: "serendipity", translation: "счастливое совпадение", level: "B2.2", options: ["несчастье", "счастливое совпадение", "случайность", "противоречие"] }
  ];

  const levelDescriptions = {
    "A1.1": { 
      title:"A1.1 - Слабый A1", 
      description:"Вы знаете самые базовые слова. Продолжайте изучать основную лексику повседневного общения.", 
      vocabSize:"300-500 слов" 
    },
    "A1.2": { 
      title:"A1.2 - Сильный A1 или слабый A2", 
      description:"Вы знаете базовую лексику. Можете понимать простые фразы о себе и семье.", 
      vocabSize:"500-800 слов" 
    },
    "A2.1": { 
      title:"A2.1 - Сильный A2 или слабый B1", 
      description:"Вы понимаете выражения на повседневные темы. Можете общаться в простых бытовых ситуациях.", 
      vocabSize:"800-1200 слов" 
    },
    "A2.2": { 
      title:"A2.2 - Сильный B1 или слабый B2", 
      description:"Вы можете описывать свой опыт, события и планы. Понимаете основные идеи простых текстов.", 
      vocabSize:"1200-1800 слов" 
    },
    "B1.1": { 
      title:"B1.1 - Сильный B1 или слабый B2", 
      description:"Вы понимаете основные идеи на знакомые темы. Можете справиться с большинством ситуаций в поездках.", 
      vocabSize:"1800-2500 слов" 
    },
    "B1.2": { 
      title:"B1.2 - Сильный B2 или слабый C1", 
      description:"Вы можете описывать опыт, события, мечты и амбиции. Способны обосновать свое мнение.", 
      vocabSize:"2500-3200 слов" 
    },
    "B2.1": { 
      title:"B2.1 - Сильный C1 или слабый C2", 
      description:"Вы понимаете сложные тексты на конкретные и абстрактные темы. Можете свободно общаться с носителями.", 
      vocabSize:"3200-4000 слов" 
    },
    "B2.2": { 
      title:"B2.2 - Сильный C2", 
      description:"Вы владеете языком на уровне образованного носителя. Можете выражаться спонтанно, очень бегло и точно.", 
      vocabSize:"4000+ слов" 
    }
  };

  let currentQuestion = 0;
  let correctCount = 0;
  let totalQuestions = 40;
  let answers = [];
  let selectedAnswer = null;
  let testQuestions = [];
  const el = (id) => appWrap.querySelector('#' + id);

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const levels12 = ["A1.1","A1.2","A2.1","A2.2","B1.1","B1.2","B2.1","B2.2"];

  const startTest = () => {
    el('startScreen').style.display = 'none';
    el('testScreen').style.display = 'block';

    testQuestions = [];
    const questionsPerLevel = Math.floor(totalQuestions / levels12.length);

    levels12.forEach(level => {
      const levelWords = wordDatabase.filter(w => w.level === level);
      const selected = shuffleArray(levelWords).slice(0, questionsPerLevel);
      testQuestions.push(...selected);
    });

    while (testQuestions.length < totalQuestions) {
      const randomWord = wordDatabase[Math.floor(Math.random() * wordDatabase.length)];
      if (!testQuestions.includes(randomWord)) testQuestions.push(randomWord);
    }

    testQuestions = shuffleArray(testQuestions).slice(0, totalQuestions);
    showQuestion();
  };

  const showQuestion = () => {
    if (currentQuestion >= totalQuestions) {
      showResults();
      return;
    }
    const q = testQuestions[currentQuestion];
    selectedAnswer = null;

    const progress = (currentQuestion / totalQuestions) * 100;
    el('progressBar').style.width = progress + '%';
    el('questionCounter').textContent = `Вопрос ${currentQuestion + 1} из ${totalQuestions}`;

    el('wordDisplay').textContent = q.word;

    const optionsContainer = el('optionsContainer');
    optionsContainer.innerHTML = '';
    const shuffledOptions = shuffleArray(q.options);

    shuffledOptions.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = option;
      btn.onclick = () => selectAnswer(option, q.translation);
      optionsContainer.appendChild(btn);
    });

    el('nextBtn').disabled = true;
  };

  const selectAnswer = (selected, correct) => {
    if (selectedAnswer !== null) return;
    selectedAnswer = selected;
    const isCorrect = selected === correct;
    if (isCorrect) correctCount++;

    answers.push({
      question: currentQuestion,
      selected, correct, isCorrect,
      level: testQuestions[currentQuestion].level
    });

    const buttons = appWrap.querySelectorAll('.option-btn');
    buttons.forEach(b => {
      if (b.textContent === correct) {
        b.classList.add('correct');
      } else if (b.textContent === selected) {
        b.classList.add('incorrect');
      }
      b.style.pointerEvents = 'none';
    });

    el('nextBtn').disabled = false;
  };

  const dontKnow = () => {
    if (selectedAnswer !== null) return;
    const q = testQuestions[currentQuestion];
    selectedAnswer = "don't know";

    answers.push({
      question: currentQuestion,
      selected: null,
      correct: q.translation,
      isCorrect: false,
      level: q.level
    });

    const buttons = appWrap.querySelectorAll('.option-btn');
    buttons.forEach(b => {
      if (b.textContent === q.translation) {
        b.classList.add('correct');
      }
      b.style.pointerEvents = 'none';
    });

    el('nextBtn').disabled = false;
  };

  const nextQuestion = () => {
    currentQuestion++;
    showQuestion();
  };

  const calculateLevel = () => {
    const levelStats = {};
    levels12.forEach(level => { levelStats[level] = { correct:0, total:0 }; });

    answers.forEach(a => {
      levelStats[a.level].total++;
      if (a.isCorrect) levelStats[a.level].correct++;
    });

    let finalLevel = "A1.1";
    for (let i = 0; i < levels12.length; i++) {
      const level = levels12[i];
      const stats = levelStats[level];
      if (stats.total > 0) {
        const percentage = (stats.correct / stats.total) * 100;
        if (percentage >= 60) {
          finalLevel = level;
        } else {
          break;
        }
      }
    }
    return finalLevel;
  };

  const showResults = () => {
    el('testScreen').style.display = 'none';
    el('resultScreen').style.display = 'block';

    const level = calculateLevel();
    const accuracy = Math.round((correctCount / totalQuestions) * 100);
    const info = levelDescriptions[level];

    const mainLevel = level.substring(0,2);
    const badge = el('levelBadge');
    badge.textContent = info.title;
    badge.className = `level-badge level-${mainLevel}`;

    el('levelDescription').textContent = info.description;
    el('totalQuestions').textContent = totalQuestions;
    el('correctAnswers').textContent = correctCount;
    el('accuracy').textContent = accuracy + '%';
    el('vocabSize').textContent = info.vocabSize;

// Bind auto dictionary apply
el('applyDictBtn').onclick = async () => {
  // Передаем базовый уровень (A1, A2, etc) и детальный (A1.1, A1.2, etc)
  await this.buildAutoDictionary(mainLevel, level);  //
  overlay.remove();
};
  };

  const restartTest = () => {
    currentQuestion = 0;
    correctCount = 0;
    answers = [];
    selectedAnswer = null;
    testQuestions = [];
    el('resultScreen').style.display = 'none';
    el('startScreen').style.display = 'block';
  };

  // Wire buttons
  el('startBtn').onclick = startTest;
  el('closeTestBtn').onclick = () => overlay.remove();
  el('backBtnTest').onclick = () => overlay.remove();
  el('dontKnowBtn').onclick = dontKnow;
  el('nextBtn').onclick = nextQuestion;
  el('restartBtn').onclick = restartTest;
  el('closeResultBtn').onclick = () => overlay.remove();
}


async buildAutoDictionary(detectedLevel, detailedLevel) {
  // Build from detected base level and include categories based on user's proficiency
  const toAdd = [];

  const addFromArray = (arr, levelTag) => {
    (arr || []).forEach(w => {
      toAdd.push({ ...w, level: levelTag, forms: w.forms || null });
    });
  };

  // Level categorization logic:
  // .1 = weak (слабый), .2 = strong (сильный)
  
  if (detailedLevel === "A1.1") {
    // Слабый A1 → только A1
    addFromArray(oxfordWordsDatabase['A1'] || [], 'A1');
    
  } else if (detailedLevel === "A1.2" || detailedLevel === "A2.1") {
    // Сильный A1 ИЛИ слабый A2 → только A2
    addFromArray(oxfordWordsDatabase['A2'] || [], 'A2');
    
  } else if (detailedLevel === "A2.2" || detailedLevel === "B1.1") {
    // Сильный A2 ИЛИ слабый B1 → только B1 + фразовые глаголы
    addFromArray(oxfordWordsDatabase['B1'] || [], 'B1');
    addFromArray(oxfordWordsDatabase['PHRASAL_VERBS'] || [], 'PHRASAL_VERBS');
    
  } else if (detailedLevel === "B1.2" || detailedLevel === "B2.1") {
    // Сильный B1 ИЛИ слабый B2 → только B2 + фразовые глаголы + идиомы
    addFromArray(oxfordWordsDatabase['B2'] || [], 'B2');
    addFromArray(oxfordWordsDatabase['PHRASAL_VERBS'] || [], 'PHRASAL_VERBS');
    addFromArray(oxfordWordsDatabase['IDIOMS'] || [], 'IDIOMS');
    
  } else if (detailedLevel === "B2.2" || detailedLevel === "C1.1") {
    // Сильный B2 ИЛИ слабый C1 → только C1 + идиомы
    addFromArray(oxfordWordsDatabase['C1'] || [], 'C1');
    addFromArray(oxfordWordsDatabase['IDIOMS'] || [], 'IDIOMS');
    
  } else if (detailedLevel === "C1.2" || detailedLevel === "C2.1" || detailedLevel === "C2.2") {
    // Сильный C1 ИЛИ любой C2 (слабый, сильный) → только C2
    addFromArray(oxfordWordsDatabase['C2'] || [], 'C2');
    
  } else {
    // Default case - если уровень не распознан
    addFromArray(oxfordWordsDatabase[detectedLevel] || [], detectedLevel);
    addFromArray(oxfordWordsDatabase['IRREGULARS'] || [], 'IRREGULARS');
    addFromArray(oxfordWordsDatabase['PHRASAL_VERBS'] || [], 'PHRASAL_VERBS');
    addFromArray(oxfordWordsDatabase['IDIOMS'] || [], 'IDIOMS');
  }

  let addedCount = 0;
  toAdd.forEach(word => {
    const exists = this.learningWords.some(w => w.word === word.word && w.level === word.level);
    if (!exists) {
      this.learningWords.push({
        word: word.word,
        translation: word.translation,
        level: word.level,
        forms: word.forms || null,
        isLearned: false,
        addedAt: Date.now()
      });
      this.initializeWordStats(word.word);
      addedCount++;
    }
  });

  if (addedCount > 0) {
    this.saveData();
    this.updateLevelCounts();
    this.suppressAutoSpeakOnce = true;
    this.showNotification(`Готово! Добавлено ${addedCount} слов по уровню ${detectedLevel}`, 'success');
    if (this.currentSection === 'learning') this.renderLearningSection();
  } else {
    this.showNotification('Подходящие новые слова не найдены (возможно, уже добавлены)', 'info');
  }
}

  // =========
  // Bulk toggle (Добавить все / Удалить все)
  // =========
  
  updateBulkToggleButton() {
    const btn = document.getElementById('bulkToggleBtn');
    if (!btn) return;

    const source = this.currentLevel || this.currentCategory;
    
    // 1. Для "Мои слова" (ADDED) кнопка не нужна (или всегда неактивна)
    if (!source || source === 'ADDED') {
      this._setBulkButtonState(btn, 'add', 'Учить все', true);
      return;
    }

    // Берем базу
    const dbWords = oxfordWordsDatabase[source] || [];
    if (dbWords.length === 0) {
      this._setBulkButtonState(btn, 'add', 'Учить все', true);
      return;
    }

    // 2. БЫСТРАЯ ПРОВЕРКА ПО КОЛИЧЕСТВУ
    // Считаем, сколько слов этого уровня есть у пользователя
    const userCount = this.learningWords.reduce((acc, w) => {
      return (w.level === source) ? acc + 1 : acc;
    }, 0);

    // Если у пользователя слов столько же или больше, чем в базе -> Считаем, что ВСЕ ДОБАВЛЕНО.
    // Это решает проблему "одного битого слова", из-за которого кнопка глючила.
    if (userCount >= dbWords.length) {
      this._setBulkButtonState(btn, 'remove', 'Удалить все', false);
      return;
    }

    // 3. ЕСЛИ КОЛИЧЕСТВО НЕ СОВПАЛО -> ТОЧНАЯ ПРОВЕРКА ЧЕРЕЗ SET (Очень быстрая)
    // Создаем набор "ключей" слов пользователя для мгновенного поиска: "cat"
    const userWordsSet = new Set();
    for (let i = 0; i < this.learningWords.length; i++) {
      const w = this.learningWords[i];
      if (w.level === source) {
        userWordsSet.add(w.word.toLowerCase().trim());
      }
    }

    // Проверяем, есть ли каждое слово из базы в наборе пользователя
    const allAdded = dbWords.every(dbW => {
      // Пропускаем пустые, если есть
      if (!dbW.word) return true; 
      return userWordsSet.has(dbW.word.toLowerCase().trim());
    });

    if (allAdded) {
      this._setBulkButtonState(btn, 'remove', 'Удалить все', false);
    } else {
      this._setBulkButtonState(btn, 'add', 'Учить все', false);
    }
  }

  // Вспомогательный метод для смены вида кнопки
  _setBulkButtonState(btn, type, text, disabled) {
    btn.textContent = text;
    btn.title = text;
    btn.disabled = disabled;
    
    if (type === 'remove') {
      btn.classList.remove('add');
      btn.classList.add('remove');
      btn.dataset.state = 'all-added';
    } else {
      btn.classList.remove('remove');
      btn.classList.add('add');
      btn.dataset.state = 'not-all';
    }
  }
  
  // ==================== SENTENCE BUILDER METHODS ====================

getAvailableLevelsFromWords() {
  const levels = new Set();
  
  this.learningWords.forEach(word => {
    if (word.level) {
      // Проверяем стандартные уровни A1-C2
      if (/^[ABC]\d$/.test(word.level)) {
        levels.add(word.level);
      } 
      // Проверяем категории
      else if (word.level === 'MEDICAL') {
        levels.add('MEDICAL');
      }
      // ДОБАВЬТЕ ЭТУ ПРОВЕРКУ:
      else if (word.level === 'PREPOSITIONS') {
        levels.add('PREPOSITIONS');
      }
      // Можно добавить и другие категории при необходимости:
      else if (word.level === 'IRREGULARS') {
        levels.add('IRREGULARS');
      }
      else if (word.level === 'PHRASAL_VERBS') {
        levels.add('PHRASAL_VERBS');
      }
      else if (word.level === 'IDIOMS') {
        levels.add('IDIOMS');
      }
      else if (word.level === 'PROVERBS') {
      levels.add('PROVERBS');
      }
    }
  });
  
  return levels;
}

loadSentencesForLevels() {
  const availableLevels = this.getAvailableLevelsFromWords();
  let sentences = [];
  
  if (availableLevels.size === 0) {
    return [];
  }
  
  availableLevels.forEach(level => {
    if (window.sentencesByLevel && window.sentencesByLevel[level]) {
      sentences = sentences.concat(
        window.sentencesByLevel[level].map(s => ({...s, level}))
      );
    }
  });
  
  return sentences;
}

renderSentenceBuilder() {
  const sentences = this.loadSentencesForLevels();
  
  if (sentences.length === 0) {
    return `
      <div class="empty-state">
        <i class="fas fa-book-open"></i>
        <h3>Для вас пока нет подходящих упражнений</h3>
        <p>Добавьте слова из готовых списков в разделе «Списки» или воспользуйтесь другим режимом практики (Quiz, Флешкарточки).</p>
        <button class="btn btn-primary" onclick="app.switchSection('levels')">
          Перейти к спискам слов
        </button>
      </div>
    `;
  }
  
  if (!this.sentenceBuilderState.currentSentence) {
    this.sentenceBuilderState.currentSentence = sentences[Math.floor(Math.random() * sentences.length)];
    this.sentenceBuilderState.assembledWords = [];
    this.sentenceBuilderState.correctOrder = this.sentenceBuilderState.currentSentence.en.split(' ');
  }
  
  const state = this.sentenceBuilderState;
  const shuffledWords = [...state.correctOrder].sort(() => Math.random() - 0.5);
  
  const container = document.getElementById('learningWordsList');
  if (!container) return '';
  
  // Очищаем контейнер и создаем элементы через DOM
  container.innerHTML = `
    <div class="sentence-builder-container">
      <div class="sentence-instruction">
        <div class="sentence-instruction-icon">✏️</div>
        <div class="sentence-instruction-text">Переведите на английский</div>
        <div class="grammar-lamp pulse" id="grammarLampBtn" title="Грамматическая подсказка">💡</div>
      </div>
      
      <div class="russian-sentence-box">
        <span class="russian-text">${state.currentSentence.ru}</span>
        <span class="sentence-level-badge level-${state.currentSentence.level}">${state.currentSentence.level}</span>
      </div>
      
      <div class="sentence-answer-area ${state.assembledWords.length > 0 ? 'has-content' : ''}" id="sentenceAnswerArea">
        <div class="assembled-sentence" id="assembledSentence">
          ${state.assembledWords.map(w => w.split('_')[0]).join(' ')}
        </div>
      </div>
      
      <div class="sentence-hint">${this.getSentenceHint()}</div>
      
      <div class="sentence-word-pool" id="sentenceWordPool">
        ${shuffledWords.map((word, index) => {
          const wordKey = `${word}_${index}`;
          const isUsed = state.assembledWords.some(w => w === wordKey);
          return `
            <button class="sentence-word ${isUsed ? 'used' : ''}" 
                    data-word="${this.safeAttr(word)}"
                    data-index="${index}"
                    ${isUsed ? 'disabled' : ''}>
              ${word}
            </button>
          `;
        }).join('')}
      </div>
      
      <div class="sentence-controls">
        <button class="sentence-control-btn sentence-clear-btn" id="sentenceClearBtn">
          🔄 Сбросить
        </button>
        <button class="sentence-control-btn sentence-skip-btn" id="sentenceSkipBtn">
          ⏭️ Пропустить
        </button>
      </div>
      
      <button class="sentence-check-btn" 
              ${state.assembledWords.length === 0 ? 'disabled' : ''}
              id="sentenceCheckBtn">
        Проверить
      </button>
      
      <div class="sentence-feedback" id="sentenceFeedback" style="display: none;"></div>
    </div>
  `;
  
  // Добавляем обработчики событий через addEventListener
  setTimeout(() => {
    // Кнопки слов
    const wordButtons = container.querySelectorAll('.sentence-word');
    wordButtons.forEach(btn => {
      if (!btn.disabled) {
        btn.addEventListener('click', () => {
          const word = btn.getAttribute('data-word');
          const index = parseInt(btn.getAttribute('data-index'));
          this.selectSentenceWord(word, index);
        });
      }
    });
    
    // Кнопка грамматики
    const grammarBtn = container.querySelector('#grammarLampBtn');
    if (grammarBtn) {
      grammarBtn.addEventListener('click', () => this.showSentenceGrammarModal());
    }
    
    // Кнопка очистки
    const clearBtn = container.querySelector('#sentenceClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSentence());
    }
    
    // Кнопка пропуска
    const skipBtn = container.querySelector('#sentenceSkipBtn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.skipSentence());
    }
    
    // Кнопка проверки
    const checkBtn = container.querySelector('#sentenceCheckBtn');
    if (checkBtn) {
      checkBtn.addEventListener('click', () => this.checkSentence());
    }
  }, 0);
  
  return ''; // Возвращаем пустую строку, так как уже заполнили innerHTML
}

selectSentenceWord(word, index) {
  const state = this.sentenceBuilderState;
  const wordKey = `${word}_${index}`;
  
  // Уже использовано это конкретное слово
  if (state.assembledWords.some(w => w === wordKey)) return;

  // Проверяем, какое слово должно быть следующим по порядку
  const nextPos = state.assembledWords.length;
  const expected = (state.correctOrder[nextPos] || '').toLowerCase().trim();
  const clicked = (word || '').toLowerCase().trim();

  // Если слово не то, которое ожидается — не добавляем, только даём лёгкую "ошибку"
  if (clicked !== expected) {
    const answerArea = document.getElementById('sentenceAnswerArea');
    if (answerArea) {
      answerArea.classList.add('incorrect');
      setTimeout(() => answerArea.classList.remove('incorrect'), 300);
    }
    return;
  }
  
  // Сюда попадаем только если слово правильное по порядку
  state.assembledWords.push(wordKey);
  
  // Обновляем отображение собранного предложения
  const assembledDiv = document.getElementById('assembledSentence');
  if (assembledDiv) {
    assembledDiv.textContent = state.assembledWords.map(w => w.split('_')[0]).join(' ');
  }
  
  // Помечаем кнопку как использованную
  const container = document.getElementById('learningWordsList');
  if (container) {
    const button = container.querySelector(`[data-index="${index}"][data-word="${this.safeAttr(word)}"]`);
    if (button) {
      button.classList.add('used');
      button.disabled = true;
    }
  }
  
  // Активируем кнопку проверки
  const checkBtn = document.getElementById('sentenceCheckBtn');
  if (checkBtn) {
    checkBtn.disabled = false;
  }
  
  // Добавляем стиль к области ответа
  const answerArea = document.getElementById('sentenceAnswerArea');
  if (answerArea) {
    answerArea.classList.add('has-content');
  }
  
  // Озвучиваем слово (если нужно)
  try {
    this.playSingleWordMp3(word, 'us').catch(err => {
      console.log('Audio playback failed:', err);
    });
  } catch (e) {
    console.log('Audio error:', e);
  }
  
  // Автоматическая проверка, если все слова использованы
  if (state.assembledWords.length === state.correctOrder.length) {
    setTimeout(() => this.checkSentence(), 500);
  }
}

clearSentence() {
  this.sentenceBuilderState.assembledWords = [];
  
  // Очищаем отображение
  const assembledDiv = document.getElementById('assembledSentence');
  if (assembledDiv) {
    assembledDiv.textContent = '';
  }
  
  // Возвращаем все кнопки в исходное состояние
  document.querySelectorAll('.sentence-word').forEach(btn => {
    btn.classList.remove('used');
    btn.disabled = false;
  });
  
  // Деактивируем кнопку проверки
  const checkBtn = document.getElementById('sentenceCheckBtn');
  if (checkBtn) {
    checkBtn.disabled = true;
  }
  
  // Убираем стиль у области ответа
  const answerArea = document.getElementById('sentenceAnswerArea');
  if (answerArea) {
    answerArea.classList.remove('has-content');
  }
}

skipSentence() {
  const sentences = this.loadSentencesForLevels();
  if (sentences.length > 0) {
    this.sentenceBuilderState.currentSentence = sentences[Math.floor(Math.random() * sentences.length)];
    this.sentenceBuilderState.assembledWords = [];
    this.sentenceBuilderState.correctOrder = this.sentenceBuilderState.currentSentence.en.split(' ');
  }
  this.renderLearningSection();
}

checkSentence() {
  const state = this.sentenceBuilderState;
  const userAnswer = state.assembledWords.map(w => w.split('_')[0]).join(' ').toLowerCase();
  const correctAnswer = state.correctOrder.join(' ').toLowerCase();
  
  const isCorrect = userAnswer === correctAnswer;
  const feedback = document.getElementById('sentenceFeedback');
  this.incrementTrainerCounters({ correct: isCorrect });
this.recordDailyProgress();
  
  if (feedback) {
    if (isCorrect) {
      state.score++;
      feedback.className = 'sentence-feedback correct';
      feedback.innerHTML = '✅ Отлично! Правильный ответ!';
      
      setTimeout(() => {
        this.skipSentence();
      }, 2000);
    } else {
      feedback.className = 'sentence-feedback incorrect';
      feedback.innerHTML = `❌ Неправильно!<br>Правильный ответ: <strong>${state.correctOrder.join(' ')}</strong>`;
    }
    
    feedback.style.display = 'block';
    state.total++;
  }
}

getSentenceHint() {
  const sentence = this.sentenceBuilderState.currentSentence;
  if (!sentence) return '';
  
  const en = sentence.en.toLowerCase();
  
  if (en.includes('?')) {
    if (/^(do|does|did|will|can|should|must)/.test(en)) {
      return 'Вопрос: Auxiliary/Modal + Subject + Verb...?';
    } else if (/^(what|where|when|why|how|who)/.test(en)) {
      return 'Специальный вопрос: Wh-word + Auxiliary + Subject + Verb...?';
    }
  } else if (en.includes("n't") || en.includes("not")) {
    return 'Отрицание: Subject + Auxiliary + not + Verb...';
  } else {
    return 'Утверждение: Subject + Verb (+ Object)';
  }
  
  return '';
}

playSentenceSound() {
  const state = this.sentenceBuilderState;
  if (!state.currentSentence) return;
  
  this.playPhraseTTS(state.currentSentence.en, 'us');
}

showSentenceGrammarModal() {
  const modal = document.createElement('div');
  modal.className = 'grammar-modal show';
  modal.innerHTML = `
    <div class="grammar-modal-content">
      <div class="grammar-modal-header">
        <div class="grammar-modal-title">
          <span>📚</span>
          <span>Грамматическая подсказка</span>
        </div>
        <button class="grammar-close-btn" onclick="this.closest('.grammar-modal').remove()">&times;</button>
      </div>
      <div class="grammar-modal-body">
        <div style="margin-bottom: 20px;">
          <h3 style="color: #58CC02;">📝 Структура английского предложения</h3>
          <p style="margin-top: 10px;"><strong>Утверждение:</strong> Subject + Verb (+ Object)</p>
          <div style="background: #F7F7F7; padding: 10px; border-radius: 8px; margin: 10px 0;">
            <div style="color: #1CB0F6; font-weight: bold;">I read books</div>
            <div style="color: #777; font-size: 14px;">Я читаю книги</div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #58CC02;">❓ Вопросы</h3>
          <p style="margin-top: 10px;"><strong>Общий вопрос:</strong> Do/Does + Subject + Verb?</p>
          <div style="background: #F7F7F7; padding: 10px; border-radius: 8px; margin: 10px 0;">
            <div style="color: #1CB0F6; font-weight: bold;">Do you speak English?</div>
            <div style="color: #777; font-size: 14px;">Ты говоришь по-английски?</div>
          </div>
          <p style="margin-top: 10px;"><strong>Специальный вопрос:</strong> Wh-word + do/does + Subject + Verb?</p>
          <div style="background: #F7F7F7; padding: 10px; border-radius: 8px; margin: 10px 0;">
            <div style="color: #1CB0F6; font-weight: bold;">Where do you work?</div>
            <div style="color: #777; font-size: 14px;">Где ты работаешь?</div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #58CC02;">❌ Отрицание</h3>
          <p style="margin-top: 10px;"><strong>Структура:</strong> Subject + don't/doesn't + Verb</p>
          <div style="background: #F7F7F7; padding: 10px; border-radius: 8px; margin: 10px 0;">
            <div style="color: #1CB0F6; font-weight: bold;">I don't understand</div>
            <div style="color: #777; font-size: 14px;">Я не понимаю</div>
          </div>
        </div>
        
        <div style="background: #FFF9E6; border: 1px solid #FFD700; border-radius: 10px; padding: 15px;">
          <h4 style="color: #FF9500;">💡 Важно помнить:</h4>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>В 3-м лице ед. числа (he/she/it) глагол получает окончание -s</li>
            <li>Do используется с I, you, we, they</li>
            <li>Does используется с he, she, it</li>
            <li>После didn't всегда базовая форма глагола</li>
          </ul>
        </div>
      </div>
    </div>
  `;
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  document.body.appendChild(modal);
}

incrementTrainerCounters({ correct = false } = {}) {
  try {
    const today = new Date().toDateString();

    if (!Array.isArray(this.weeklyProgress)) {
      this.weeklyProgress = [];
    }
    let day = this.weeklyProgress.find(d => d.date === today);
    if (!day) {
      day = { date: today, count: 0, trainerRepeats: 0, trainerCorrect: 0 };
      this.weeklyProgress.push(day);
    }
    if (typeof day.count !== 'number') day.count = 0;
    if (typeof day.trainerRepeats !== 'number') day.trainerRepeats = 0;
    if (typeof day.trainerCorrect !== 'number') day.trainerCorrect = 0;

    day.trainerRepeats += 1;
    if (correct) day.trainerCorrect += 1;

    this.saveData();

    if (this.currentSection === 'progress' && typeof this.renderProgress === 'function') {
      this.renderProgress();
    }
  } catch (e) {
    console.warn('incrementTrainerCounters error:', e);
  }
}

// ==================== END SENTENCE BUILDER ====================

  // =========
  // Word cards
  // =========
// --- В app.js (Часть 2) ЗАМЕНИТЕ createWordCard НА ЭТО: ---

  createWordCard(wordObj, level) {
      const isInLearning = this.learningWords.some(w => w.word === wordObj.word && w.level === level);

      let displayText = wordObj.word;
      if (wordObj.forms && wordObj.forms.length > 0) {
        displayText = wordObj.forms.join(' → ');
      }

      const cardId = `card-${wordObj.word.replace(/[^a-z0-9]/gi, '_')}-${level}`;

      // НОВАЯ HTML СТРУКТУРА (КОМПАКТНАЯ)
      return `
        <div class="word-card" id="${cardId}" data-word="${this.safeAttr(wordObj.word)}" data-level="${this.safeAttr(level)}">
          
          <!-- ЛЕВАЯ КОЛОНКА -->
          <div class="word-info-wrapper">
             <div class="word-text">${displayText}</div>
             <div class="word-translation">${wordObj.translation}</div>
          </div>

          <!-- ПРАВАЯ КОЛОНКА (Кнопки скрыты в .word-header в старом CSS, здесь выносим их явно или используем display:contents в CSS) -->
          <div class="word-actions">
             <button class="action-btn play-btn sound-us-btn" data-word-text="${this.safeAttr(wordObj.word)}" data-forms='${wordObj.forms ? JSON.stringify(wordObj.forms) : 'null'}' title="US">
                <i class="fas fa-volume-up"></i>
             </button>
             <button class="action-btn play-btn sound-uk-btn" data-word-text="${this.safeAttr(wordObj.word)}" data-forms='${wordObj.forms ? JSON.stringify(wordObj.forms) : 'null'}' title="UK">
                <i class="fas fa-headphones"></i>
             </button>
             ${isInLearning ?
               `<button class="action-text-btn remove word-remove-btn" data-word-text="${this.safeAttr(wordObj.word)}" data-level="${this.safeAttr(level)}" title="Удалить из изучаемых">
                  <!-- Текст скрыт CSS, иконка через ::after -->
               </button>` :
               `<button class="action-text-btn add word-add-btn" data-word-text="${this.safeAttr(wordObj.word)}" data-translation="${this.safeAttr(wordObj.translation)}" data-level="${this.safeAttr(level)}" data-forms='${wordObj.forms ? JSON.stringify(wordObj.forms) : 'null'}' title="Добавить в изучаемые">
                  <!-- Текст скрыт CSS, иконка через ::after -->
               </button>`
             }
          </div>
        </div>
      `;
  }

installWordsListDelegatedHandlers() {
  const list = document.getElementById('wordsList');
  if (!list) return;
  // Чтобы не навешивать повторно
  if (list.dataset.delegated === '1') return;

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.sound-us-btn, .sound-uk-btn, .word-add-btn, .word-remove-btn');
    if (!btn) return;

    // Определяем уровень/категорию из карточки
    const card = btn.closest('.word-card');
    const cardLevel = card ? card.getAttribute('data-level') : null;

    // Звук US/UK
    if (btn.classList.contains('sound-us-btn') || btn.classList.contains('sound-uk-btn')) {
      const wordText = btn.getAttribute('data-word-text');
      const formsStr = btn.getAttribute('data-forms');
      let forms = null;
      if (formsStr && formsStr !== 'null') {
        try { forms = JSON.parse(formsStr); } catch {}
      }
      const region = btn.classList.contains('sound-uk-btn') ? 'uk' : 'us';
      this.playWord(wordText, forms, region, cardLevel); // <- ПЕРЕДАЁМ level
      return;
    }

    // Добавить слово
    if (btn.classList.contains('word-add-btn')) {
      const wordText = btn.getAttribute('data-word-text');
      const translation = btn.getAttribute('data-translation');
      const level = btn.getAttribute('data-level');
      const formsStr = btn.getAttribute('data-forms');
      let forms = null;
      if (formsStr && formsStr !== 'null') { try { forms = JSON.parse(formsStr); } catch {} }
      this.addWordToLearning(wordText, translation, level, forms);
      return;
    }

    // Удалить слово
    if (btn.classList.contains('word-remove-btn')) {
      const wordText = btn.getAttribute('data-word-text');
      const level = btn.getAttribute('data-level');
      this.removeWordFromLearning(wordText, level);
      return;
    }
  });

  list.dataset.delegated = '1';
}

safeAttr(str) { 
    if (!str) return ''; 
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); 
}

  // =========
  // Learning list (add/remove with instant UI swap)
  // =========
  addWordToLearning(word, translation, level, forms = null) {
    this.stopCurrentAudio();

    const existingWord = this.learningWords.find(w => w.word === word && w.level === level);
    if (!existingWord) {
      const newWord = { word, translation, level, forms: forms || null, isLearned: false, addedAt: Date.now() };
      this.learningWords.push(newWord);
      this.initializeWordStats(word);
      this.saveData();
      this.swapCardButtonToRemove(word, level);
      this.updateLevelCounts();
      this.updateBulkToggleButton();
      this.showNotification(`Слово "${word}" добавлено в изучаемые!`, 'success');

      if (this.currentSection === 'learning') {
        this.suppressAutoSpeakOnce = true;
        this.renderLearningSection();
      }
    } else {
      this.showNotification(`Слово "${word}" уже в изучаемых`, 'info');
    }
  }
  removeWordFromLearning(word, level) {
    this.stopCurrentAudio();

    const index = this.learningWords.findIndex(w => w.word === word && w.level === level);
    if (index !== -1) {
      this.learningWords.splice(index, 1);
      this.saveData();

      this.swapCardButtonToAdd(word, level);
      this.updateLevelCounts();
      this.updateBulkToggleButton();
      this.showNotification(`Слово "${word}" удалено из изучаемых`, 'success');

      if (this.currentSection === 'learning') {
        this.suppressAutoSpeakOnce = true;
        this.renderLearningSection();
      }
    }
  }
  swapCardButtonToRemove(word, level) {
    const selWord = (CSS && CSS.escape) ? CSS.escape(word) : word;
    const selLevel = (CSS && CSS.escape) ? CSS.escape(level) : level;
    const card = document.querySelector(`.word-card[data-word="${selWord}"][data-level="${selLevel}"]`);
    if (!card) { if (this.currentLevel === level) this.showLevelWords(this.currentLevel); if (this.currentCategory === level) this.showCategoryWords(this.currentCategory); return; }
    const actions = card.querySelector('.word-actions');
    if (!actions) return;
    actions.innerHTML = `
      <button class="action-btn play-btn" title="US" onclick="app.playWord('${this.safeAttr(word)}', null, 'us')"><i class="fas fa-volume-up"></i></button>
      <button class="action-btn play-btn" title="UK" onclick="app.playWord('${this.safeAttr(word)}', null, 'uk')"><i class="fas fa-headphones"></i></button>
      <button class="action-text-btn remove" data-testid="word-remove-btn" onclick="app.removeWordFromLearning('${this.safeAttr(word)}', '${this.safeAttr(level)}')" title="Удалить из изучаемых">Удалить</button>
    `;
  }
  swapCardButtonToAdd(word, level) {
    const selWord = (CSS && CSS.escape) ? CSS.escape(word) : word;
    const selLevel = (CSS && CSS.escape) ? CSS.escape(level) : level;
    const card = document.querySelector(`.word-card[data-word="${selWord}"][data-level="${selLevel}"]`);
    if (!card) { if (this.currentLevel === level) this.showLevelWords(this.currentLevel); if (this.currentCategory === level) this.showCategoryWords(this.currentCategory); return; }
    const actions = card.querySelector('.word-actions');
    if (!actions) return;
    const translation = card.querySelector('.word-translation')?.textContent || '';
    actions.innerHTML = `
      <button class="action-btn play-btn" title="US" onclick="app.playWord('${this.safeAttr(word)}', null, 'us')"><i class="fas fa-volume-up"></i></button>
      <button class="action-btn play-btn" title="UK" onclick="app.playWord('${this.safeAttr(word)}', null, 'uk')"><i class="fas fa-headphones"></i></button>
      <button class="action-text-btn add" data-testid="word-add-btn" onclick="app.addWordToLearning('${this.safeAttr(word)}', '${this.safeAttr(translation)}', '${this.safeAttr(level)}', null)" title="Добавить в изучаемые">Учить</button>
    `;
  }

  addAllLevelWords() {
    this.stopCurrentAudio();

    const source = this.currentLevel || this.currentCategory;
    if (!source) return;
    if (source === 'ADDED') {
      this.showNotification('Для категории «Добавленные слова» массовое добавление не доступно', 'info');
      return;
    }

    const words = oxfordWordsDatabase[source] || [];
    let addedCount = 0;

    words.forEach(word => {
      const exists = this.learningWords.some(w => w.word === word.word && w.level === source);
      if (!exists) {
        this.learningWords.push({
          word: word.word,
          translation: word.translation,
          level: source,
          forms: word.forms || null,
          isLearned: false,
          addedAt: Date.now()
        });
        this.initializeWordStats(word.word);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      this.saveData();
      this.updateLevelCounts();
      this.updateBulkToggleButton();
      this.showNotification(`Добавлено ${addedCount} слов в изучаемые!`, 'success');
      this.currentLevel ? this.showLevelWords(this.currentLevel) : this.showCategoryWords(this.currentCategory);

      if (this.currentSection === 'learning') {
        this.suppressAutoSpeakOnce = true;
        this.renderLearningSection();
      }
    } else {
      this.showNotification('Все слова уже добавлены', 'info');
    }
  }
  removeAllLevelWords() {
    this.stopCurrentAudio();

    const source = this.currentLevel || this.currentCategory;
    if (!source) return;

    const initialLength = this.learningWords.length;
    this.learningWords = this.learningWords.filter(w => w.level !== source);
    const removedCount = initialLength - this.learningWords.length;

    if (removedCount > 0) {
      this.saveData();
      this.updateLevelCounts();
      this.updateBulkToggleButton();
      this.showNotification(`Удалено ${removedCount} слов из изучаемых`, 'success');
      this.currentLevel ? this.showLevelWords(this.currentLevel) : this.showCategoryWords(this.currentCategory);

      if (this.currentSection === 'learning') {
        this.suppressAutoSpeakOnce = true;
        this.renderLearningSection();
      }
    }
  }
  
getWordAccuracy(word) {
  const s = this.wordStats[word];
  if (!s) return null;

  const score = typeof s.accScore === 'number' ? s.accScore : 0;
  const pct = Math.max(0, Math.min(100, score * 10)); // 0..100 шагом 10

  const total = s.totalAnswers || (s.correct + s.incorrect) || 0;
  if (total === 0 && pct === 0) return null; // совсем нет данных — не показываем

  return {
    pct: Math.round(pct),
    total,
    correct: s.correct || 0,
    incorrect: s.incorrect || 0
  };
}

getAccuracyBadgeHtml(word) {
  const acc = this.getWordAccuracy(word);
  if (!acc) return '<span class="acc-badge acc-none" title="нет данных">—</span>';
  const cls = acc.pct >= 85 ? 'acc-good' : acc.pct >= 60 ? 'acc-mid' : 'acc-bad';
  return `<span class="acc-badge ${cls}" title="${acc.correct}/${acc.total}">${acc.pct}%</span>`;
}

initializeWordStats(word) {
if (!this.wordStats[word]) {
  this.wordStats[word] = {
    correct: 0,
    incorrect: 0,
    lastReview: null,
    nextReview: Date.now(),
    difficulty: 0, // 0..5
    ef: 2.5, // ease factor (SM-2)
    reps: 0,
    lapses: 0,
    interval: 0,
    phase: 'learning',
    step: 0,
    firstSeenAt: null,
    totalAnswers: 0,
    totalTimeMs: 0,
    accScore: 0 // 0..10 — наш новый счётчик точности
  };
} else {
  const s = this.wordStats[word];
  if (s.ef == null) s.ef = 2.5;
  if (s.reps == null) s.reps = 0;
  if (s.lapses == null) s.lapses = 0;
  if (s.interval == null) s.interval = 0;
  if (!s.phase) s.phase = 'learning';
  if (s.step == null) s.step = 0;
  if (s.firstSeenAt == null) s.firstSeenAt = null;
  if (s.totalAnswers == null) s.totalAnswers = 0;
  if (s.totalTimeMs == null) s.totalTimeMs = 0;
  if (s.accScore == null) s.accScore = 0; // чтобы старые данные тоже получили поле
}
}

migrateStatsSchema() {
(this.learningWords || []).forEach(w => this.initializeWordStats(w.word));
this.saveData();
}

loadSrsDay() {
try {
const today = new Date().toDateString();
const raw = JSON.parse(localStorage.getItem('srsDayV1') || 'null');
if (!raw || raw.date !== today) {
const fresh = { date: today, newIntroduced: [], answered: 0 };
localStorage.setItem('srsDayV1', JSON.stringify(fresh));
return fresh;
}
return raw;
} catch {
const fresh = { date: new Date().toDateString(), newIntroduced: [], answered: 0 };
localStorage.setItem('srsDayV1', JSON.stringify(fresh));
return fresh;
}
}
saveSrsDay() {
try { localStorage.setItem('srsDayV1', JSON.stringify(this.srsDay)); } catch {}
}
resetSrsDayIfNeeded() {
const today = new Date().toDateString();
if (!this.srsDay || this.srsDay.date !== today) {
this.srsDay = { date: today, newIntroduced: [], answered: 0 };
this.saveSrsDay();
}
}

  // =========
  // Add words (manual and bulk) -> ADDED category
  // =========
  
// Добавление из переводчика (EN + RU -> уровень ADDED)
async handleTranslatorAdd(payload) {
try {
const en = (payload?.term || '').trim();
const ru = (payload?.meta?.ru || '').trim();
if (!en) { this.showNotification('Не удалось определить английское слово','warning'); return; }
if (!ru) { this.showNotification('Не удалось определить перевод на русский','warning'); return; }

// В customWords (для списка), если ещё нет
const existsCustom = this.customWords.some(w => w.word.toLowerCase() === en.toLowerCase());
if (!existsCustom) {
  this.customWords.push({ word: en, translation: ru, level: 'ADDED', forms: null, isCustom: true, addedAt: Date.now() });
}

// В learningWords как ADDED (если ещё нет)
const existsLearn = this.learningWords.some(w => w.word.toLowerCase() === en.toLowerCase() && w.level === 'ADDED');
if (!existsLearn) {
  this.learningWords.push({ word: en, translation: ru, level: 'ADDED', forms: null, isCustom: true, isLearned: false, addedAt: Date.now() });
  this.initializeWordStats(en);
}

this.saveData();
this.updateLevelCounts();
this.showNotification(`Добавлено в изучение: ${en}`, 'success');

if (this.currentSection === 'learning') {
  this.suppressAutoSpeakOnce = true;
  this.renderLearningSection();
}
if (document.getElementById('customWords')) {
  this.renderCustomWords();
}
} catch (e) {
console.error('handleTranslatorAdd error', e);
this.showNotification('Не удалось добавить. Попробуйте ещё раз','warning');
}
}
  
  addSingleWord() {
    this.stopCurrentAudio();

    const wordInput = document.getElementById('newWord');
    const translationInput = document.getElementById('newTranslation');

    if (!wordInput || !translationInput) return;

    const word = wordInput.value.trim();
    const translation = translationInput.value.trim();
    const level = 'ADDED';

    if (!word || !translation) {
      this.showNotification('Заполните все поля!', 'warning');
      return;
    }

    const newWord = {
      word,
      translation,
      level,
      forms: null,
      isCustom: true,
      addedAt: Date.now()
    };

    const exists = this.customWords.some(w => w.word.toLowerCase() === word.toLowerCase());
    if (!exists) this.customWords.push(newWord);

    const existsLearn = this.learningWords.some(w => w.word.toLowerCase() === word.toLowerCase() && w.level === level);
    if (!existsLearn) this.learningWords.push({ ...newWord, isLearned: false });

    this.initializeWordStats(word);
    this.saveData();
    this.updateLevelCounts();

    wordInput.value = '';
    translationInput.value = '';

    this.showNotification(`Слово "${word}" добавлено в «Добавленные слова»!`, 'success');
    this.renderCustomWords();

    if (this.currentSection === 'learning') {
      this.suppressAutoSpeakOnce = true;
      this.renderLearningSection();
    }
  }

  bulkAddWords() {
    this.stopCurrentAudio();

    const textarea = document.getElementById('bulkTextarea');
    if (!textarea) return;

    const text = textarea.value.trim();
    const level = 'ADDED';
    if (!text) {
      this.showNotification('Введите слова для добавления!', 'warning');
      return;
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let addedCount = 0;

    const seen = new Set(this.customWords.map(w => `${w.word.toLowerCase()}`));
    const seenLearn = new Set(this.learningWords.map(w => `${w.level}::${w.word.toLowerCase()}`));

    lines.forEach(line => {
      const parts = line.split(/\s*[-—:|\t]\s*/);
      if (parts.length < 2) return;

      const left = parts[0].trim();
      const translation = parts.slice(1).join(' - ').trim();
      if (!left || !translation) return;

      let word = left;
      let forms = null;
      if (left.includes('→') || left.includes(',')) {
        const rawForms = left.includes('→') ? left.split('→') : left.split(',');
        const cleanedForms = rawForms.map(f => f.trim()).filter(Boolean);
        if (cleanedForms.length >= 2) {
          forms = cleanedForms;
          word = cleanedForms[0];
        }
      }

      const customKey = `${word.toLowerCase()}`;
      if (!seen.has(customKey)) {
        const newWord = { word, translation, level, forms, isCustom: true, addedAt: Date.now() };
        this.customWords.push(newWord);
        seen.add(customKey);
      }
      const learnKey = `${level}::${word.toLowerCase()}`;
      if (!seenLearn.has(learnKey)) {
        this.learningWords.push({ word, translation, level, forms, isCustom: true, addedAt: Date.now(), isLearned: false });
        seenLearn.add(learnKey);
        this.initializeWordStats(word);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      this.saveData();
      this.updateLevelCounts();
      textarea.value = '';
      this.showNotification(`Добавлено ${addedCount} слов в «Добавленные слова»!`, 'success');
      this.renderCustomWords();

      if (this.currentSection === 'learning') {
        this.suppressAutoSpeakOnce = true;
        this.renderLearningSection();
      }
    } else {
      this.showNotification('Новые слова не найдены (возможны дубли)', 'info');
    }
  }
  
  attachCustomWordsListeners() {
    const container = document.getElementById('customWords');
    if (!container) return;

    // Обработчики для кнопок звука US
    container.querySelectorAll('.custom-sound-us-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wordText = btn.getAttribute('data-word-text');
        const formsStr = btn.getAttribute('data-forms');
        let forms = null;
        
        if (formsStr && formsStr !== 'null') {
          try {
            forms = JSON.parse(formsStr);
          } catch (e) {
            console.log('Forms parse error:', e);
          }
        }
        
        this.playWord(wordText, forms, 'us');
      });
    });

    // Обработчики для кнопок звука UK
    container.querySelectorAll('.custom-sound-uk-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wordText = btn.getAttribute('data-word-text');
        const formsStr = btn.getAttribute('data-forms');
        let forms = null;
        
        if (formsStr && formsStr !== 'null') {
          try {
            forms = JSON.parse(formsStr);
          } catch (e) {
            console.log('Forms parse error:', e);
          }
        }
        
        this.playWord(wordText, forms, 'uk');
      });
    });

    // Обработчики для кнопок удаления ???
    container.querySelectorAll('.custom-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wordText = btn.getAttribute('data-word-text');
        this.deleteCustomWord(wordText);
      });
    });
}

  // --- В app.js (Часть 2) ЗАМЕНИТЕ renderCustomWords НА ЭТО: ---

  renderCustomWords() {
    const container = document.getElementById('customWords'); // или 'newWordsList'
    // Проверка обоих ID, так как в HTML может быть по-разному
    const list = container || document.getElementById('newWordsList');
    
    if (!list) return;

    if (this.customWords.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-plus-circle"></i>
          <h3>Нет добавленных слов</h3>
        </div>
      `;
      return;
    }

    list.innerHTML = this.customWords.map(word => `
      <div class="word-card custom-word-card" data-word="${this.safeAttr(word.word)}">
        
        <!-- ЛЕВАЯ КОЛОНКА -->
        <div class="word-info-wrapper">
           <div class="word-text">${this.getEnglishDisplay(word)}</div>
           <div class="word-translation">${word.translation}</div>
        </div>

        <!-- ПРАВАЯ КОЛОНКА -->
        <div class="word-actions">
           <button class="action-btn play-btn custom-sound-us-btn" data-word-text="${this.safeAttr(word.word)}" data-forms='${word.forms ? JSON.stringify(word.forms) : 'null'}' title="US">
              <i class="fas fa-volume-up"></i>
           </button>
           <button class="action-btn play-btn custom-sound-uk-btn" data-word-text="${this.safeAttr(word.word)}" data-forms='${word.forms ? JSON.stringify(word.forms) : 'null'}' title="UK">
              <i class="fas fa-headphones"></i>
           </button>
           <button class="action-btn remove-btn custom-delete-btn" data-word-text="${this.safeAttr(word.word)}" title="Удалить навсегда">
              <i class="fas fa-trash"></i>
           </button>
        </div>
      </div>
    `).join('');
    
    this.attachCustomWordsListeners();
  }
  
  deleteCustomWord(word) {
    this.stopCurrentAudio();
    this.customWords = this.customWords.filter(w => w.word !== word);
    this.learningWords = this.learningWords.filter(w => !(w.word === word && w.level === 'ADDED'));
    this.saveData();
    this.updateLevelCounts();
    this.showNotification(`Слово "${word}" удалено`, 'success');
    this.renderCustomWords();

    if (this.currentSection === 'learning') {
      this.suppressAutoSpeakOnce = true;
      this.renderLearningSection();
    }
  }

  // =========
  // Learning UI
  // =========
renderLearningSection() {
  const container = document.getElementById('learningWordsList');
  const countEl = document.getElementById('learningCount');
  if (!container) return;

  if (countEl) countEl.textContent = `${this.learningWords.length} слов`;

  // Проверяем пустой список
  if (this.learningWords.length === 0 && this.currentMode !== 'trainer') {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-book-open"></i>
        <h3>Добавьте слова из "Списка слов", чтобы практиковаться</h3>
      </div>
    `;
    return;
  }

  // Рендерим в зависимости от режима
  if (this.currentMode === 'trainer') {
    // ДЛЯ ТРЕНАЖЕРА НЕ ИСПОЛЬЗУЕМ innerHTML =
    this.renderSentenceBuilder(); // Метод сам заполняет container
  } else if (this.currentMode === 'flashcards') {
    this.renderFlashcards();
  } else if (this.currentMode === 'quiz') {
    this.renderQuiz();
  } else {
    this.renderQuiz();
  }
}

insertAutoDictionaryButtonInLearning(containerEl) {
  try {
    if (!containerEl) return;
    if (containerEl.querySelector('#autoDictInlineBtn')) return;

    const wrap = document.createElement('div');
    wrap.className = 'auto-dict-inline';
    wrap.style.cssText = 'display:flex;justify-content:center;margin:12px 0;';

    const btn = document.createElement('button');
    btn.id = 'autoDictInlineBtn';
    btn.className = 'btn btn-primary';
    btn.style.fontWeight = '700';
    btn.innerHTML = '<i class="fas fa-magic"></i> Подобрать словарь под тебя';
    btn.addEventListener('click', () => this.showAutoDictionaryTest());

    wrap.appendChild(btn);
    containerEl.insertAdjacentElement('afterbegin', wrap);
  } catch (e) {
    console.warn('insertAutoDictionaryButtonInLearning error:', e);
  }
}
// Добавить новые методы для переключения режимов
switchLearningMode(mode) {
  this.currentMode = mode;
  localStorage.setItem('currentMode', mode);
  this.suppressAutoSpeakOnce = true;
  this.renderLearningSection();
}

switchPracticeMode(practice) {
  this.currentPractice = practice;
  localStorage.setItem('currentPractice', practice);
  this.currentReviewIndex = 0;
  if (practice === 'endless') {
    localStorage.removeItem('currentSession');
  }
  this.suppressAutoSpeakOnce = true;
  this.renderLearningSection();
}

  // =========
  // Motivation UI (popup)
  // =========
  insertMotivationButton(containerEl) {
    if (!containerEl) return;
    if (containerEl.querySelector('#motivationBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'motivationBtn';
    btn.className = 'btn btn-primary';
    btn.textContent = 'ПОЛУЧИТЬ ЗАРЯД МОТИВАЦИИ 💪';
    btn.style.cssText = 'font-weight:700;margin-bottom:14px;';
    btn.setAttribute('data-testid', 'motivation-btn');
    btn.addEventListener('click', () => this.showMotivationPopup());

    containerEl.insertAdjacentElement('afterbegin', btn);
  }
  showMotivationPopup(onClose) {
    const overlay = document.createElement('div');
    overlay.id = 'motivationOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:1000002;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:20px;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-primary);border-radius:16px;padding:16px;max-width:800px;width:90%;max-height:90vh;box-shadow:var(--shadow-lg);display:flex;flex-direction:column;gap:12px;';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;';

    const title = document.createElement('div');
    title.textContent = 'ТВОЯ МОТИВАЦИЯ НА СЕГОДНЯ :';
    title.style.cssText = 'font-weight:900;font-size:18px;color:var(--text-primary);';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-secondary';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = () => {
        overlay.remove();
        if (onClose && typeof onClose === 'function') {
            onClose();
        }
    };

    header.appendChild(title);
    header.appendChild(closeBtn);

    const n = Math.floor(Math.random() * 61) + 1;
    const imgWrap = document.createElement('div');
    imgWrap.style.cssText = 'width:100%;display:flex;align-items:center;justify-content:center;';

    const img = document.createElement('img');
    img.alt = 'motivation';
    img.src = `/m${n}.jpg`;
    img.setAttribute('data-index', String(n));
    img.style.cssText = 'max-width:100%;max-height:70vh;height:auto;object-fit:contain;display:block;border-radius:10px;';
    img.onerror = () => this.handleMotivationImageError(img);

    imgWrap.appendChild(img);

    modal.appendChild(header);
    modal.appendChild(imgWrap);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => { 
        if (e.target === overlay) {
            overlay.remove();
            if (onClose && typeof onClose === 'function') {
                onClose();
            }
        }
    });
}

  // =========
  // Flashcards / Quiz / List (unchanged core except autoplay rules)
  // =========
renderFlashcards() {
    const container = document.getElementById('learningWordsList');
    this._questionStart = Date.now();
    if (!container) return;
    
    // === ДОБАВИТЬ ЭТО ===
if (this.currentPractice === 'scheduled') {
  const session = JSON.parse(localStorage.getItem('currentSession') || '{}');
  // Берем индекс из сессии, если он там есть
  if (typeof session.currentIndex === 'number') {
    this.currentReviewIndex = session.currentIndex;
  }
}
// ====================

    const wordsToReview = this.getWordsToReview();
    if (wordsToReview.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <h3>Все слова повторены!</h3>
          <p>Отличная работа! Возвращайтесь позже для новых повторений</p>
        </div>
      `;
      return;
    }

    const word = wordsToReview[this.currentReviewIndex % wordsToReview.length];

    let displayWord = this.getEnglishDisplay(word);
    this.lastFlashcardFrontWasRussian = this.isRussian(displayWord);

    container.innerHTML = `
      <div class="flashcard" data-testid="flashcard">
        <img src="/nophoto.jpg" alt="flashcard" class="flashcard-image" data-loading="true">
        <div class="flashcard-body">
          <h3 class="flashcard-title">
            ${displayWord} ${this.getAccuracyBadgeHtml(word.word)}
            <span class="sound-actions">
              <button class="mini-btn flashcard-sound-us" data-word="${this.safeAttr(word.word)}" title="US">
                <i class="fas fa-volume-up"></i>
              </button>
              <button class="mini-btn flashcard-sound-uk" data-word="${this.safeAttr(word.word)}" title="UK">
                <i class="fas fa-headphones"></i>
              </button>
            </span>
          </h3>
          <p class="flashcard-subtitle">Нажмите, чтобы увидеть перевод</p>
          <div class="flashcard-answer hidden" id="flashcardAnswer">
            <div class="review-translation">${word.translation}</div>
          </div>
          <div class="card-actions">
            <button class="btn btn-primary" id="showAnswerBtn" data-testid="flashcard-show-answer">
              <i class="fas fa-eye"></i> Показать ответ
            </button>
          </div>
          <div class="answer-buttons hidden" id="answerButtons">
            <button class="btn btn-danger" id="flashcardWrongBtn" data-testid="flashcard-wrong">
              <i class="fas fa-times"></i> Не знал
            </button>
            <button class="btn btn-success" id="flashcardCorrectBtn" data-testid="flashcard-correct">
              <i class="fas fa-check"></i> Знал
            </button>
          </div>
        </div>
      </div>
      <div style="text-align:center;margin-top:15px;color:var(--text-secondary);">
        Карточка ${this.currentReviewIndex + 1} из ${wordsToReview.length}
      </div>
    `;
    
    // Загрузка изображения
    this.getPrimaryImageUrl(word).then(imageUrl => {
      const img = container.querySelector('.flashcard-image');
      if (img) {
        img.src = imageUrl;
        img.onerror = () => this.handleImageError(img);
        img.removeAttribute('data-loading');
        if (word.level === 'MEDICAL') {
          img.classList.add('medical-image');
        }
      }
    });

    // Добавляем обработчики через addEventListener
    setTimeout(() => {
      // Кнопки звука
      const soundUsBtn = container.querySelector('.flashcard-sound-us');
      const soundUkBtn = container.querySelector('.flashcard-sound-uk');
      
      if (soundUsBtn) {
        soundUsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.playWord(word.word, word.forms, 'us', word.level);
        });
      }
      
      if (soundUkBtn) {
        soundUkBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.playWord(word.word, word.forms, 'uk', word.level);
        });
      }
      
      // Кнопка показа ответа
      const showBtn = container.querySelector('#showAnswerBtn');
      if (showBtn) {
        showBtn.addEventListener('click', () => this.showFlashcardAnswer());
      }
      
      // Кнопка воспроизведения
      const playBtn = container.querySelector('#playFlashcardBtn');
      if (playBtn) {
        playBtn.addEventListener('click', () => this.playCurrentWord());
      }
      
      // Кнопки ответов
      const wrongBtn = container.querySelector('#flashcardWrongBtn');
      const correctBtn = container.querySelector('#flashcardCorrectBtn');
      
      if (wrongBtn) {
        wrongBtn.addEventListener('click', () => this.answerFlashcard(false));
      }
      
      if (correctBtn) {
        correctBtn.addEventListener('click', () => this.answerFlashcard(true));
      }
    }, 0);

    // Автоматическое произношение
    if (!this.lastFlashcardFrontWasRussian && !this.suppressAutoSpeakOnce && this.currentSection === 'learning' && this.shouldAutoPronounce(word)) {
      setTimeout(() => {
        this.playWord(word.word, word.forms, 'us', word.level);
      }, 250);
    }
    this.suppressAutoSpeakOnce = false;
}
  showFlashcardAnswer() {
    const answer = document.getElementById('flashcardAnswer');
    const showBtn = document.getElementById('showAnswerBtn');
    const playBtn = document.getElementById('playFlashcardBtn');
    const answerBtns = document.getElementById('answerButtons');

    if (answer) answer.classList.remove('hidden');
    if (showBtn) showBtn.classList.add('hidden');
    if (playBtn) playBtn.classList.remove('hidden');
    if (answerBtns) answerBtns.classList.remove('hidden');

    if (this.lastFlashcardFrontWasRussian && this.currentSection === 'learning') {
      const wordsToReview = this.getWordsToReview();
      const word = wordsToReview[this.currentReviewIndex % wordsToReview.length];
      if (this.shouldAutoPronounce(word)) {
        setTimeout(() => {
          this.playWord(word.word, word.forms, 'us', word.level);
        }, 200);
      }
    }
  }
    playCurrentWord() {
    const wordsToReview = this.getWordsToReview();
    const word = wordsToReview[this.currentReviewIndex % wordsToReview.length];
    this.playWord(word.word, word.forms, 'us', word.level);
  }
  async answerFlashcard(correct) {
    await this.waitForCurrentAudioToFinish();

    const wordsToReview = this.getWordsToReview();
    const word = wordsToReview[this.currentReviewIndex % wordsToReview.length];

    const rt = this._questionStart ? (Date.now() - this._questionStart) : null;
this.updateWordStats(word.word, correct, rt);
    this.recordDailyProgress();

    this.currentReviewIndex++;

    if (this.currentReviewIndex >= wordsToReview.length && this.currentPractice === 'scheduled') {
      this.currentReviewIndex = 0;
      this.showNotification('Отличная работа! Все слова повторены!', 'success');
    }

    this.renderFlashcards();
  }

  renderQuiz() {
     if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    const container = document.getElementById('learningWordsList');
    this._questionStart = Date.now();
    if (!container) return;
    
    // === ДОБАВИТЬ ЭТО ===
if (this.currentPractice === 'scheduled') {
  const session = JSON.parse(localStorage.getItem('currentSession') || '{}');
  // Берем индекс из сессии, если он там есть
  if (typeof session.currentIndex === 'number') {
    this.currentReviewIndex = session.currentIndex;
  }
}
// ====================

    const wordsToReview = this.getWordsToReview();
    if (wordsToReview.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <h3>Все слова повторены!</h3>
          <p>Отличная работа! Возвращайтесь позже для новых повторений</p>
        </div>
      `;
      return;
    }

    const word = wordsToReview[this.currentReviewIndex % wordsToReview.length];

    const direction = Math.random() < 0.5 ? 'EN_RU' : 'RU_EN';
    const questionText = direction === 'EN_RU' ? this.getEnglishDisplay(word) : word.translation;
    const correctAnswer = direction === 'EN_RU' ? word.translation : this.getEnglishDisplay(word);

    const options = this.buildQuizOptions(word, direction);
    const shuffled = this.shuffle(options);

    container.innerHTML = `
      <div class="quiz-container" data-testid="quiz-container">
        <img src="/nophoto.jpg" alt="quiz" class="quiz-image" data-loading="true">
        <span class="word-level" style="display:none">${word.level}</span>
        <div class="quiz-question">
          ${questionText} ${this.getAccuracyBadgeHtml(word.word)}
          <span class="sound-actions" style="margin-left:8px;">
            <button class="mini-btn quiz-sound-us" data-word="${this.safeAttr(word.word)}" title="US">
              <i class="fas fa-volume-up"></i>
            </button>
            <button class="mini-btn quiz-sound-uk" data-word="${this.safeAttr(word.word)}" title="UK">
              <i class="fas fa-headphones"></i>
            </button>
          </span>
        </div>
        <div class="quiz-sub">Выберите правильный перевод</div>
        <div class="quiz-options" id="quizOptions">
          ${shuffled.map(opt => {
            const isEnglishOpt = this.isEnglish(opt) && !this.isRussian(opt);
            const baseForSound = opt.split('→')[0].trim();
            const soundBtns = isEnglishOpt ? `
              <span class="option-sound">
                <button class="mini-btn option-sound-us" data-word="${this.safeAttr(baseForSound)}" title="US">
                  <i class="fas fa-volume-up"></i>
                </button>
                <button class="mini-btn option-sound-uk" data-word="${this.safeAttr(baseForSound)}" title="UK">
                  <i class="fas fa-headphones"></i>
                </button>
              </span>
            ` : '';
            return `
              <div class="quiz-option" data-answer="${this.safeAttr(opt)}">
                <div class="quiz-option-inner">
                  <span>${opt}</span>
                  ${soundBtns}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="text-align:center;margin-top:15px;color:var(--text-secondary);">
          Вопрос ${this.currentReviewIndex + 1} из ${wordsToReview.length}
        </div>
      </div>
    `;
    
    // Загрузка изображения
    this.getPrimaryImageUrl(word).then(imageUrl => {
      const img = container.querySelector('.quiz-image');
      if (img) {
        img.src = imageUrl;
        img.onerror = () => this.handleImageError(img);
        img.removeAttribute('data-loading');
        if (word.level === 'MEDICAL') {
          img.classList.add('medical-image');
        }
      }
    });

    // Добавляем обработчики через addEventListener
    setTimeout(() => {
      // Кнопки звука для вопроса
      const soundUsBtn = container.querySelector('.quiz-sound-us');
      const soundUkBtn = container.querySelector('.quiz-sound-uk');
      
      if (soundUsBtn) {
        soundUsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const w = soundUsBtn.getAttribute('data-word');
          this.playWord(w, word.forms, 'us', word.level);
        });
      }
      if (soundUkBtn) {
        soundUkBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const w = soundUkBtn.getAttribute('data-word');
          this.playWord(w, word.forms, 'uk', word.level);
        });
      }
      
      // Кнопки звука для опций
      container.querySelectorAll('.option-sound-us').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const w = btn.getAttribute('data-word');
          this.playSingleWordMp3(w, 'us');
        });
      });
      
      container.querySelectorAll('.option-sound-uk').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const w = btn.getAttribute('data-word');
          this.playSingleWordMp3(w, 'uk');
        });
      });
      
      // Обработчики для выбора ответа
      container.querySelectorAll('.quiz-option').forEach(opt => {
        opt.addEventListener('click', () => {
          const selected = opt.getAttribute('data-answer');
          this.selectQuizOption(selected, correctAnswer, word.word, direction);
        });
      });
    }, 0);

    // Автоматическое произношение
    if (direction === 'EN_RU' && !this.suppressAutoSpeakOnce && this.currentSection === 'learning' && this.shouldAutoPronounce(word)) {
      setTimeout(() => {
        this.playWord(word.word, word.forms, 'us', word.level);
      }, 200);
    }
    this.suppressAutoSpeakOnce = false;
}

  quizPlayQuestion(word, forms, region) { this.playWord(word, forms, region || 'us'); }

  buildQuizOptions(word, direction) {
    const correctAnswer = direction === 'EN_RU' ? word.translation : this.getEnglishDisplay(word);
    const options = [correctAnswer];

    const allWords = [...this.learningWords];
    const shuffled = this.shuffle(allWords);

    for (let w of shuffled) {
      if (w.word !== word.word) {
        const wrongOption = direction === 'EN_RU' ? w.translation : this.getEnglishDisplay(w);
        if (!options.includes(wrongOption)) { options.push(wrongOption); }
      }
      if (options.length >= 4) break;
    }

    if (options.length < 4) {
      const allLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const allCats = ['IRREGULARS', 'PHRASAL_VERBS', 'IDIOMS' , 'MEDICAL','PROVERBS'];
      for (let level of allLevels) {
        const levelWords = (oxfordWordsDatabase[level] || []);
        const shuffledLevel = this.shuffle(levelWords);
        for (let w of shuffledLevel) {
          const wrongOption = direction === 'EN_RU' ? w.translation : (w.forms && w.forms.length ? w.forms.join(' → ') : w.word);
          if (!options.includes(wrongOption)) { options.push(wrongOption); }
          if (options.length >= 4) break;
        }
        if (options.length >= 4) break;
      }
      for (let cat of allCats) {
        if (options.length >= 4) break;
        const catWords = (oxfordWordsDatabase[cat] || []);
        const shuffledCat = this.shuffle(catWords);
        for (let w of shuffledCat) {
          const wrongOption = direction === 'EN_RU' ? w.translation : (w.forms && w.forms.length ? w.forms.join(' → ') : w.word);
          if (!options.includes(wrongOption)) options.push(wrongOption);
          if (options.length >= 4) break;
        }
      }
    }

    return options.slice(0, 4);
  }

  async selectQuizOption(selected, correct, wordToPlay, direction) {
    const isCorrect = selected === correct;
    const options = document.querySelectorAll('.quiz-option');

    options.forEach(opt => {
      opt.style.pointerEvents = 'none';
      const answer = opt.getAttribute('data-answer');
      if (answer === selected) { opt.classList.add(isCorrect ? 'correct' : 'wrong'); }
      if (answer === correct && !isCorrect) { opt.classList.add('correct'); }
    });
     const rt = this._questionStart ? (Date.now() - this._questionStart) : null;
this.updateWordStats(wordToPlay, isCorrect, rt);
    this.recordDailyProgress();

    const wordsToReview = this.getWordsToReview();
    const wordObj = wordsToReview.find(w => w.word === wordToPlay);

    await this.waitForCurrentAudioToFinish();

    await this.waitForCurrentAudioToFinish();

    if (direction === 'RU_EN' && this.currentSection === 'learning' && this.shouldAutoPronounce(wordObj)) {
      await this.delay(200);
      if (wordObj) {
        await this.playWord(wordObj.word, wordObj.forms, 'us', wordObj.level);
      } else {
        await this.playSingleWordMp3(wordToPlay, 'us');
      }
    } else {
      await this.delay(600);
    }

    this.currentReviewIndex++;
    
    if (this.currentPractice === 'scheduled') {
  const session = JSON.parse(localStorage.getItem('currentSession') || '{}');
  session.currentIndex = this.currentReviewIndex; // Сохраняем позицию
  localStorage.setItem('currentSession', JSON.stringify(session));
}
    
    if (this.currentReviewIndex >= wordsToReview.length && this.currentPractice === 'scheduled') {
      this.currentReviewIndex = 0;
      this.showNotification('Quiz завершен! Отличная работа!', 'success');
    }
    this.renderQuiz();
  }

// --- ЗАМЕНИТЬ renderWordsList ЦЕЛИКОМ ---
renderWordsList() {
  const container = document.getElementById('learningWordsList');
  if (!container) return;

  const wordsToShow = this.currentPractice === 'endless' ? 
    this.learningWords.filter(w => !w.isLearned) : 
    this.getWordsToReview();

  if (wordsToShow.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-check-circle"></i>
        <h3>Нет слов для отображения</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = wordsToShow.map(word => {
    const displayWord = this.getEnglishDisplay(word);
    const accuracyBadge = this.getAccuracyBadgeHtml(word.word);
    // ВАЖНО: Передаем data-level в кнопки
    return `
      <div class="word-card ${word.isLearned ? 'learned' : ''}">
        <div class="word-header">
          <div class="word-text">${displayWord} ${accuracyBadge}</div>
          <div class="word-actions">
            <button class="action-btn play-btn list-sound-us" 
                    data-word="${this.safeAttr(word.word)}"
                    data-level="${this.safeAttr(word.level)}" 
                    data-forms='${word.forms ? JSON.stringify(word.forms) : 'null'}'
                    title="US">
              <i class="fas fa-volume-up"></i>
            </button>
            <button class="action-btn play-btn list-sound-uk" 
                    data-word="${this.safeAttr(word.word)}"
                    data-level="${this.safeAttr(word.level)}"
                    data-forms='${word.forms ? JSON.stringify(word.forms) : 'null'}'
                    title="UK">
              <i class="fas fa-headphones"></i>
            </button>
            <button class="action-btn ${word.isLearned ? 'add-btn' : 'remove-btn'} list-toggle-learned"
                    data-word="${this.safeAttr(word.word)}"
                    title="${word.isLearned ? 'Вернуть в изучение' : 'Отметить выученным'}">
              <i class="fas fa-${word.isLearned ? 'undo' : 'check'}"></i>
            </button>
          </div>
        </div>
        <div class="word-translation">${word.translation}</div>
        <span class="word-level">${word.level}</span>
      </div>
    `;
  }).join('');
  
  // Добавляем обработчики
  this.attachWordsListHandlers();
}
// Добавьте новый метод:
attachWordsListHandlers() {
  const container = document.getElementById('learningWordsList');
  if (!container) return;
  
  // Кнопки звука US
  container.querySelectorAll('.list-sound-us').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const word = btn.getAttribute('data-word');
      const formsStr = btn.getAttribute('data-forms');
      // БЕРЕМ УРОВЕНЬ ПРЯМО ИЗ КНОПКИ
      const level = btn.getAttribute('data-level'); 
      
      let forms = null;
      if (formsStr && formsStr !== 'null') {
        try { forms = JSON.parse(formsStr); } catch {}
      }
      
      this.playWord(word, forms, 'us', level);
    });
  });
  
  // Кнопки звука UK
  container.querySelectorAll('.list-sound-uk').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const word = btn.getAttribute('data-word');
      const formsStr = btn.getAttribute('data-forms');
      // БЕРЕМ УРОВЕНЬ ПРЯМО ИЗ КНОПКИ
      const level = btn.getAttribute('data-level');
      
      let forms = null;
      if (formsStr && formsStr !== 'null') {
        try { forms = JSON.parse(formsStr); } catch {}
      }
      
      this.playWord(word, forms, 'uk', level);
    });
  });
  
  // Кнопки toggle learned
  container.querySelectorAll('.list-toggle-learned').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const word = btn.getAttribute('data-word');
      this.toggleWordLearned(word);
    });
  });
}
// Pop up список слов

  showLearningWordsPopup() {
    // Удалим старый попап, если он есть
    const existing = document.getElementById('learningWordsPopup');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'learningWordsPopup';
    overlay.className = 'words-popup-overlay';

    const box = document.createElement('div');
    box.className = 'words-popup';

    const header = document.createElement('div');
    header.className = 'words-popup-header';
    header.innerHTML = `
      <div class="words-popup-title">
        <h3>Все слова</h3>
        <p>${this.learningWords.length} слов в изучении</p>
      </div>
      <button class="btn btn-secondary words-popup-close-btn">
        <i class="fas fa-arrow-left"></i> Назад
      </button>
    `;

    // Формируем фильтр по уровням / категориям
    const levelsSet = new Set(this.learningWords.map(w => w.level || ''));
    levelsSet.delete('');
    const levels = Array.from(levelsSet).sort();

    const filterRow = document.createElement('div');
    filterRow.className = 'words-popup-filters';
let optionsHtml = `
  <option value="ALL">Все уровни / категории</option>
  <option value="STUDY_NOW">Режим заучивание</option>
`;
levels.forEach(l => {
  optionsHtml += `<option value="${this.safeAttr(l)}">${l}</option>`;
});
    filterRow.innerHTML = `
      <label>
        Уровень:
        <select id="wordsPopupFilter">${optionsHtml}</select>
      </label>
      <span class="words-popup-hint">
        Нажмите на корзину, чтобы удалить слово. Нажмите на карандаш, чтобы изменить перевод.
      </span>
    `;

    const list = document.createElement('div');
    list.id = 'wordsPopupList';
    list.className = 'words-popup-list';

box.appendChild(header);
box.appendChild(filterRow);
box.appendChild(list);
overlay.appendChild(box);
document.body.appendChild(overlay);

// Если слов очень много — показываем кота Боба при открытии
if ((this.learningWords || []).length > 500) {
  this.showGlobalLoader('Кот Боб загружает для вас список слов...', 2000);
}

// Первичный рендер
this.renderLearningWordsPopupList('ALL');

// Спрячем лоадер после первой отрисовки
if ((this.learningWords || []).length > 500) {
  this.hideGlobalLoader();
}

    const close = () => {
      overlay.remove();
      // Возвращаем режим "Заучивание" (scheduled)
      this.currentPractice = 'scheduled';
      localStorage.setItem('currentPractice', 'scheduled');
      // Подсветка кнопок практики
      document.querySelectorAll('.practice-btn').forEach(b => {
        const p = b.getAttribute('data-practice');
        b.classList.toggle('active', p === 'scheduled');
      });
      // Перерисовать блок "Изучаю"
      this.suppressAutoSpeakOnce = true;
      this.renderLearningSection();
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    const closeBtn = header.querySelector('.words-popup-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', close);

    const filterSelect = filterRow.querySelector('#wordsPopupFilter');
    if (filterSelect) {
      filterSelect.addEventListener('change', () => {
        this.renderLearningWordsPopupList(filterSelect.value || 'ALL');
      });
    }

    // Делегирование кликов внутри списка
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.popup-sound-us, .popup-sound-uk, .popup-edit-btn, .popup-delete-btn');
      if (!btn) return;
      
      const word = btn.getAttribute('data-word');
      const level = btn.getAttribute('data-level'); // <-- Получаем уровень
      if (!word) return;

      if (btn.classList.contains('popup-sound-us') || btn.classList.contains('popup-sound-uk')) {
        const formsStr = btn.getAttribute('data-forms');
        let forms = null;
        if (formsStr && formsStr !== 'null') {
          try { forms = JSON.parse(formsStr); } catch {}
        }
        const region = btn.classList.contains('popup-sound-uk') ? 'uk' : 'us';
        
        // ИСПРАВЛЕНИЕ: Передаем 'level' четвертым аргументом!
        this.playWord(word, forms, region, level);

      } else if (btn.classList.contains('popup-delete-btn')) {
        this.removeWordFromLearning(word, level);
        const card = btn.closest('.word-card');
        if (card) card.remove();

        // обновим счётчик в заголовке
        const titleCount = header.querySelector('.words-popup-title p');
        if (titleCount) {
          titleCount.textContent = `${this.learningWords.length} слов в изучении`;
        }

      } else if (btn.classList.contains('popup-edit-btn')) {
        this.editLearningWord(word, level, () => {
          this.renderLearningWordsPopupList(filterSelect ? filterSelect.value : 'ALL');
        });
      }
    }, true);
  }

  renderLearningWordsPopupList(filterLevel = 'ALL') {
  const list = document.getElementById('wordsPopupList');
  if (!list) return;

  let words;

  if (filterLevel === 'STUDY_NOW') {
    // берём только слова из текущего пула "заучивание"
    const prevPractice = this.currentPractice;
    this.currentPractice = 'scheduled';
    words = this.getWordsToReview().slice();
    this.currentPractice = prevPractice;
  } else {
    words = this.learningWords.slice();
    if (filterLevel && filterLevel !== 'ALL') {
      words = words.filter(w => (w.level || '') === filterLevel);
    }
  }

  if (words.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>Нет слов для отображения</h3>
        <p>Попробуйте выбрать другой уровень или добавьте слова из раздела "Списки".</p>
      </div>
    `;
    return;
  }

  // Сортируем по уровню, затем по слову
  words.sort((a,b) => {
    const la = (a.level || '').localeCompare(b.level || '');
    if (la !== 0) return la;
    return (a.word || '').localeCompare(b.word || '');
  });

  const BATCH_SIZE = 100;           // максимум 100 слов за раз
  const total = words.length;
  let rendered = 0;

  list.innerHTML = '';              // очищаем список

  // ВАЖНО: если много слов — показываем Боба и здесь тоже
  if (this.isAndroid || total > 500) {
    this.showGlobalLoader('Кот Боб загружает для вас список слов...', 2000);
  }

  const renderBatch = () => {
    const slice = words.slice(rendered, rendered + BATCH_SIZE);
    if (!slice.length) return;

    const html = slice.map(w => {
        const display = this.getEnglishDisplay(w);
        const accBadge = this.getAccuracyBadgeHtml(w.word);
        const formsJson = w.forms ? JSON.stringify(w.forms).replace(/"/g, '&quot;') : 'null';
        
        // === НОВЫЙ КОМПАКТНЫЙ HTML ===
        return `
          <div class="word-card word-card-compact popup-word-card" data-word="${this.safeAttr(w.word)}" data-level="${this.safeAttr(w.level)}">
            
            <!-- ЛЕВАЯ КОЛОНКА: ТЕКСТ -->
            <div class="word-info-col">
              <div class="word-text-row">
                ${display} 
                ${accBadge}
                <span class="tiny-level-badge">${w.level}</span>
              </div>
              <div class="word-trans-row">
                ${w.translation}
              </div>
            </div>

            <!-- ПРАВАЯ КОЛОНКА: КНОПКИ -->
            <div class="word-actions-row">
              <button class="action-btn play-btn popup-sound-us"
                      data-word="${this.safeAttr(w.word)}"
                      data-forms='${formsJson}'
                      data-level="${this.safeAttr(w.level)}"
                      title="US">
                <i class="fas fa-volume-up"></i>
              </button>
              <button class="action-btn play-btn popup-sound-uk"
                      data-word="${this.safeAttr(w.word)}"
                      data-forms='${formsJson}'
                      data-level="${this.safeAttr(w.level)}"
                      title="UK">
                <i class="fas fa-headphones"></i>
              </button>
              <button class="action-btn popup-edit-btn"
                      data-word="${this.safeAttr(w.word)}"
                      data-level="${this.safeAttr(w.level)}">
                <i class="fas fa-pen"></i>
              </button>
              <button class="action-btn remove-btn popup-delete-btn"
                      data-word="${this.safeAttr(w.word)}"
                      data-level="${this.safeAttr(w.level)}">
                <i class="fas fa-trash"></i>
              </button>
            </div>

          </div>
        `;
        // ==============================
      }).join('');

    list.insertAdjacentHTML('beforeend', html);
    rendered += slice.length;
  };

  // Рендерим первую порцию
  renderBatch();

  // Прячем лоадер после первой партии
  if (this.isAndroid || total > 500) {
    this.hideGlobalLoader();
  }

  if (rendered < total) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        // 1. Удаляем старый "датчик"
        const oldS = document.getElementById('words-popup-sentinel');
        if (oldS) {
          observer.unobserve(oldS);
          oldS.remove();
        }

        // 2. Анимация
        if (this.isAndroid || total > 500) {
          this.showGlobalLoader('Кот Боб загружает ещё слова...', 1500);
        }

        // 3. Рендер следующей пачки
        renderBatch();

        // 4. Скрываем анимацию
        if (this.isAndroid || total > 500) {
          this.hideGlobalLoader();
        }

        // 5. Новый датчик, если ещё есть слова
        if (rendered < total) {
          const newS = document.createElement('div');
          newS.style.height = '40px';
          newS.id = 'words-popup-sentinel';
          list.appendChild(newS);
          observer.observe(newS);
        }
      }
    }, { 
      root: list,         // Скроллим внутри попапа
      rootMargin: '400px' // Грузим заранее
    });

    // Создаем первый датчик
    const s = document.createElement('div');
    s.style.height = '40px';
    s.id = 'words-popup-sentinel';
    list.appendChild(s);
    observer.observe(s);
  }
} 

  editLearningWord(word, level, onDone) {
    const item = this.learningWords.find(w => w.word === word && w.level === level);
    if (!item) return;

    const newTr = prompt('Измените перевод слова:', item.translation || '');
    if (newTr == null) return; // отмена
    const trimmed = newTr.trim();
    if (!trimmed) return;

    item.translation = trimmed;

    // Если это пользовательское слово, обновим и в customWords
    this.customWords.forEach(cw => {
      if (cw.word === word && cw.level === level) {
        cw.translation = trimmed;
      }
    });

    this.saveData();
    if (typeof onDone === 'function') onDone();
  }

  playWordFromList(word, forms, region) { this.playWord(word, forms, region || 'us'); }
  toggleWordLearned(word) {
    this.stopCurrentAudio();
    const wordObj = this.learningWords.find(w => w.word === word);
    if (wordObj) {
      wordObj.isLearned = !wordObj.isLearned;
      this.saveData();
      this.showNotification(wordObj.isLearned ? 'Слово отмечено как выученное!' : 'Слово возвращено в изучение','success');
      if (this.currentSection === 'learning') {
        this.suppressAutoSpeakOnce = true;
        this.renderLearningSection();
      }
    }
  }

  // =========
  // Review logic
  // =========
getWordsToReview() {
  // 1. Если режим "Endless" (Повторение) - показываем всё подряд, кроме выученного
  if (this.currentPractice === 'endless') {
    return this.learningWords.filter(w => !w.isLearned);
  }

  // 2. Режим "Заучивание" (Scheduled)
  const today = new Date().toDateString();
  
  // Пытаемся достать текущую сессию
  let session = JSON.parse(localStorage.getItem('currentSession') || 'null');

  // Если сессии нет или она устарела (вчерашняя) — создаем новую
  if (!session || session.date !== today) {
    session = {
      date: today,
      shownWords: [], // Список слов (строки)
      currentIndex: 0, // Запоминаем, на каком слове остановились!
      correctStreak: 0,
      totalCorrect: 0,
      dailyGoal: 20 // Цель на день
    };
  }

  // Если слова уже были отобраны ранее, восстанавливаем их объекты
  if (session.shownWords.length > 0) {
    // Восстанавливаем объекты слов по их тексту
    let restoredWords = session.shownWords.map(wText => 
      this.learningWords.find(lw => lw.word === wText)
    ).filter(Boolean); // убираем удаленные слова

    // Если слова еще есть в списке, возвращаем их
    if (restoredWords.length > 0) {
      return restoredWords;
    }
  }

  // === ГЕНЕРАЦИЯ НОВОГО СПИСКА (если сессия пустая) ===
  
  // Берем все слова, которые НЕ выучены (isLearned: false)
  const active = this.learningWords.filter(w => !w.isLearned);

  // ФИЛЬТР ВЫУЧЕННЫХ (Задача №5):
  // Если у слова accScore >= 8 (очень хорошо знаем) И мы его видели СЕГОДНЯ — пропускаем
  const candidates = active.filter(w => {
    const s = this.wordStats[w.word];
    if (!s) return true; // новое слово
    
    // Если слово "мастерское" (score >= 8)
    if (s.accScore >= 8) {
       const lastSeenDate = s.lastReview ? new Date(s.lastReview).toDateString() : '';
       // Если видели сегодня — не показываем, хватит мучить
       if (lastSeenDate === today) return false; 
       // Если видели давно — можно показать для проверки
    }
    return true;
  });

  // Если слов нет (всё выучили)
  if (candidates.length === 0) return [];

  // Набираем пул: сначала сложные, потом новые
  // Сортировка: сначала те, где accScore меньше
  candidates.sort((a, b) => {
    const sa = (this.wordStats[a.word] || {}).accScore || 0;
    const sb = (this.wordStats[b.word] || {}).accScore || 0;
    return sa - sb;
  });

  // Берем топ 30 слов для сессии
  let selected = candidates.slice(0, 30);
  
  // Перемешиваем их один раз
  selected = this.shuffle(selected);

  // Сохраняем этот список в сессию, чтобы он НЕ менялся при переключении режимов
  session.shownWords = selected.map(w => w.word);
  session.currentIndex = 0; // Сброс индекса при генерации нового пула
  localStorage.setItem('currentSession', JSON.stringify(session));

  return selected;
}

updateWordStats(word, correct, responseTimeMs = null) {
  this.initializeWordStats(word);
  const s = this.wordStats[word];
  const now = Date.now();

  s.lastReview = now;
  s.totalAnswers = (s.totalAnswers || 0) + 1;
  if (responseTimeMs != null) s.totalTimeMs = (s.totalTimeMs || 0) + responseTimeMs;

  // Обновляем статистику правильных/неправильных ответов
  if (correct) {
    s.correct++;
    s.difficulty = Math.max(0, (s.difficulty || 0) - 1);
  } else {
    s.incorrect++;
    s.difficulty = Math.min(5, (s.difficulty || 0) + 1);
    s.lapses = (s.lapses || 0) + 1;
  }
  // Обновляем "точность" 0..10
if (s.accScore == null) s.accScore = 0;
if (correct) {
  s.accScore = Math.min(10, s.accScore + 1);  // +10%
} else {
  s.accScore = Math.max(0, s.accScore - 1);   // -10%
}

  // Обновляем сессию для режима "запланировано"
  if (this.currentPractice === 'scheduled') {
    let session = JSON.parse(localStorage.getItem('currentSession') || '{}');
    const today = new Date().toDateString();
    
    // Проверяем, что сессия актуальна
    if (!session.date || session.date !== today) {
      session = {
        date: today,
        shownWords: [],
        correctStreak: 0,
        totalCorrect: 0
      };
    }
    
    if (correct) {
      session.correctStreak = (session.correctStreak || 0) + 1;
      session.totalCorrect = (session.totalCorrect || 0) + 1;
      
      // Каждые 10 правильных ответов добавляем 10 слов
      if (session.totalCorrect > 0 && session.totalCorrect % 10 === 0) {
        this.showNotification(`Отлично! Добавлено еще 10 слов к изучению! Всего в пуле: ${40 + session.totalCorrect} слов`, 'success');
        // Обновляем текущий список слов
        setTimeout(() => {
          this.suppressAutoSpeakOnce = true;
          this.renderLearningSection();
        }, 100);
      }
    } else {
      session.correctStreak = 0;
    }
    
    localStorage.setItem('currentSession', JSON.stringify(session));
  }

  // Простая логика для следующего показа (без интервалов)
  s.nextReview = now; // Всегда доступно для повторения
  s.phase = 'review'; // Все слова в фазе повторения
  
  // Учитываем дневной прогресс
  this.srsDay = this.srsDay || this.loadSrsDay();
  this.srsDay.answered = (this.srsDay.answered || 0) + 1;
  this.saveSrsDay();

  this.saveData();
}

  recordDailyProgress() {
    const today = new Date().toDateString();
    const existing = this.weeklyProgress.find(p => p.date === today);
    if (existing) existing.count++;
    else this.weeklyProgress.push({ date: today, count: 1 });
    this.weeklyProgress = this.weeklyProgress.slice(-7);
    this.saveData();
  }
  
getPetState() {
    try {
        return JSON.parse(localStorage.getItem('pet_state_v1') || 'null');
    } catch {
        return null;
    }
}

setPetState(state) {
    try {
        localStorage.setItem('pet_state_v1', JSON.stringify(state));
    } catch {}
}

ensurePetDecay(pet) {
    if (!pet) return null;
    const today = new Date();
    const last = pet.lastCare ? new Date(pet.lastCare) : new Date();
    const days = Math.floor((today - last) / (1000 * 60 * 60 * 24));
    if (days > 0) {
        pet.hunger = Math.min(100, pet.hunger + 25 * days);
        pet.thirst = Math.min(100, pet.thirst + 25 * days);
        if (pet.hunger >= 100 || pet.thirst >= 100) pet.alive = false;
        pet.lastCare = new Date().toISOString();
    }
    return pet;
}

choosePet(type, name) {
    const pet = {
        type: (type === 'dog' ? 'dog' : 'cat'),
        name: (name || 'Малыш').slice(0, 18),
        hunger: 40,
        thirst: 40,
        alive: true,
        lastCare: new Date().toISOString()
    };
    this.setPetState(pet);
    this.renderProgress();
}

feedPet() {
    let pet = this.getPetState();
    if (!pet) return;
    pet = this.ensurePetDecay(pet) || pet;
    if (!pet.alive) {
        this.showNotification('Питомец умер. Оживите его, чтобы продолжить.', 'warning');
        return;
    }
    pet.hunger = Math.max(0, pet.hunger - 35);
    pet.lastCare = new Date().toISOString();
    this.setPetState(pet);
    this.renderProgress();
}

waterPet() {
    let pet = this.getPetState();
    if (!pet) return;
    pet = this.ensurePetDecay(pet) || pet;
    if (!pet.alive) {
        this.showNotification('Питомец умер. Оживите его, чтобы продолжить.', 'warning');
        return;
    }
    pet.thirst = Math.max(0, pet.thirst - 35);
    pet.lastCare = new Date().toISOString();
    this.setPetState(pet);
    this.renderProgress();
}

revivePet() {
    let pet = this.getPetState();
    if (!pet) return;
    pet.alive = true;
    pet.hunger = 60;
    pet.thirst = 60;
    pet.lastCare = new Date().toISOString();
    this.setPetState(pet);
    this.renderProgress();
}

renamePet() {
    let pet = this.getPetState();
    if (!pet) return;
    const name = prompt('Введите имя питомца', pet.name || 'Малыш');
    if (!name) return;
    pet.name = name.slice(0, 18);
    this.setPetState(pet);
    this.renderProgress();
}

switchPet() {
    const type = prompt('Кого выбрать? Введите "cat" или "dog"', 'cat');
    if (!type || (type !== 'cat' && type !== 'dog')) return;
    let pet = this.getPetState() || {};
    pet.type = type;
    pet.lastCare = new Date().toISOString();
    this.setPetState(pet);
    this.renderProgress();
}

getPetWidgetHtml() {
    let pet = this.getPetState();
    if (pet) pet = this.ensurePetDecay(pet) || pet;

    if (!pet) {
        return `
            <div class="pet-widget" data-testid="pet-widget">
                <div class="pet-header">
                    <img src="/kitten.png" class="pet-avatar" alt="pet">
                    <div>
                        <div class="pet-title">Заведи питомца!</div>
                        <div style="color:var(--text-secondary);font-size:13px;">Выбери котёнка или щенка — заботься о нём каждый день!</div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:8px;">
                    <div>
                        <label style="display:block;font-size:12px;margin-bottom:6px;color:var(--text-secondary)">Кого выбираем?</label>
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-secondary pet-choose-cat">Котёнок</button>
                            <button class="btn btn-secondary pet-choose-dog">Щенок</button>
                        </div>
                    </div>
                    <div style="flex:1;">
                        <label style="display:block;font-size:12px;margin-bottom:6px;color:var(--text-secondary)">Имя питомца</label>
                        <input id="petNameInput" style="width:100%;padding:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);color:var(--text-primary);" placeholder="Малыш" />
                    </div>
                </div>
                <div style="color:var(--text-secondary);font-size:12px;">Подсказка: если не ухаживать ежедневно — питомец может сбежать на улицу 🥺</div>
            </div>
        `;
    }

    const avatar = pet.type === 'dog' ? '/puppy.png' : '/kitten.png';
    const name = pet.name || 'Малыш';
    const hungerPct = 100 - Math.max(0, Math.min(100, pet.hunger));
    const thirstPct = 100 - Math.max(0, Math.min(100, pet.thirst));
    const deadHtml = !pet.alive ? `<div class="pet-dead">Питомец умер... Оживите, чтобы начать заново.</div>` : '';

    return `
        <div class="pet-widget" data-testid="pet-widget">
            <div class="pet-header">
                <img src="${avatar}" class="pet-avatar" alt="pet">
                <div>
                    <div class="pet-title">${name}</div>
                    <div style="color:var(--text-secondary);font-size:12px;">${pet.type === 'dog' ? 'Щенок' : 'Котёнок'}</div>
                </div>
            </div>
            ${deadHtml}
            <div class="pet-bars">
                <div>
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);"><span>Сытость</span><span>${hungerPct}%</span></div>
                    <div class="pet-bar"><div class="pet-bar-fill" style="width:${hungerPct}%"></div></div>
                </div>
                <div>
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);"><span>Напоён</span><span>${thirstPct}%</span></div>
                    <div class="pet-bar"><div class="pet-bar-fill" style="width:${thirstPct}%;background:linear-gradient(90deg,#22d3ee,#3b82f6)"></div></div>
                </div>
            </div>
            <div class="pet-actions">
                ${pet.alive ? `
                    <button class="btn btn-primary pet-feed-btn">Покормить</button>
                    <button class="btn btn-primary pet-water-btn">Напоить</button>
                    <button class="btn btn-secondary pet-rename-btn">Переименовать</button>
                    <button class="btn btn-secondary pet-switch-btn">Сменить питомца</button>
                ` : `
                    <button class="btn btn-primary pet-revive-btn">Оживить</button>
                    <button class="btn btn-secondary pet-switch-btn">Сменить питомца</button>
                `}
            </div>
        </div>
    `;
}


  // === ВОТ ЭТОТ НОВЫЙ КОД ВСТАВЛЯЕМ ===
 getAchievementsWidgetHtml() {
  // Загружаем данные
  let session = JSON.parse(localStorage.getItem('currentSession') || '{}');
  const todayCorrect = session.totalCorrect || 0;
  const goal = 20;
  const progressPct = Math.min(100, Math.round((todayCorrect / goal) * 100));
  const streak = session.correctStreak || 0;
  const totalLearned = this.learningWords.filter(w => w.isLearned).length;

  // Медали
  const medals = [
    { id: 1, icon: '🥉', name: 'Новичок', desc: '5 слов', unlocked: totalLearned >= 5 },
    { id: 2, icon: '🥈', name: 'Студент', desc: '50 слов', unlocked: totalLearned >= 50 },
    { id: 3, icon: '🥇', name: 'Мастер', desc: '200 слов', unlocked: totalLearned >= 200 },
    { id: 4, icon: '👑', name: 'Легенда', desc: '500 слов', unlocked: totalLearned >= 500 },
  ];

  // Возвращаем HTML, используя класс "progress-card" как у других блоков
  return `
    <div class="progress-card">
      
      <!-- Красивая шапка как у других карточек -->
      <div class="progress-card-header">
        <div class="progress-card-icon icon-gold">
          <i class="fas fa-trophy"></i>
        </div>
        <div>
          <div class="progress-card-title">Достижения</div>
          <div class="progress-card-subtitle">
             Серия побед: <span style="color:#d97706; font-weight:800;">${streak} 🔥</span>
          </div>
        </div>
      </div>

      <!-- Сетка медалей -->
      <div class="medals-grid">
        ${medals.map(m => `
          <div class="medal-card ${m.unlocked ? 'unlocked' : 'locked'}">
            <div class="medal-icon">${m.icon}</div>
            <div class="medal-name">${m.name}</div>
            <div class="medal-desc">${m.desc}</div>
          </div>
        `).join('')}
      </div>

      <!-- Полоска цели (в стиле приложения) -->
      <div style="margin-top: 16px; padding-top: 12px; border-top: 2px solid var(--border-color);">
        <div class="progress-main-bar-label" style="margin-bottom: 6px;">
          <span style="font-weight:800; color:var(--text-primary);">Цель на день (20 слов)</span>
          <span style="font-weight:700; color:var(--text-secondary);">${todayCorrect}/${goal}</span>
        </div>
        <div class="progress-main-bar-track" style="height:10px;">
          <div class="progress-main-bar-fill" style="width: ${progressPct}%; background: linear-gradient(90deg, #f59e0b, #fbbf24);"></div>
        </div>
        <div style="text-align:center; font-size:12px; margin-top:6px; color:var(--text-secondary); font-weight:600;">
           ${progressPct >= 100 ? '🎉 План выполнен! Ты супер!' : 'Продолжай учиться!'}
        </div>
      </div>

    </div>
  `;
}


// =========
// Progress
// =========
  
renderProgress() {
  const container = document.getElementById('progressContent');
  if (!container) return;

  const petHtml = this.getPetWidgetHtml();
  const achievementsHtml = this.getAchievementsWidgetHtml();

  const totalWords = this.learningWords.length;
  const learnedWords = this.learningWords.filter(w => w.isLearned).length;
  const inProgress = Math.max(0, totalWords - learnedWords);
  const learnedPct = totalWords > 0 ? Math.round(learnedWords / totalWords * 100) : 0;

  // Прогресс по уровням / категориям
  const levelKeys = ['A1','A2','B1','B2','C1','C2','IRREGULARS','PHRASAL_VERBS','IDIOMS','MEDICAL','ADDED'];
  const levelProgress = {};
  levelKeys.forEach(level => {
    const total = this.learningWords.filter(w => w.level === level).length;
    const learned = this.learningWords.filter(w => w.level === level && w.isLearned).length;
    if (total > 0) {
      levelProgress[level] = {
        total,
        learned,
        pct: Math.round(learned / total * 100)
      };
    }
  });

  // Статистика тренажёра предложений
  const todayKey = new Date().toDateString();
  let trainerToday = 0, trainerTodayCorrect = 0, trainerWeek = 0, trainerWeekCorrect = 0;
  (this.weeklyProgress || []).forEach(d => {
    const rep = d.trainerRepeats || 0;
    const cor = d.trainerCorrect || 0;
    trainerWeek += rep;
    trainerWeekCorrect += cor;
    if (d.date === todayKey) {
      trainerToday = rep;
      trainerTodayCorrect = cor;
    }
  });

  // Общая активность за неделю (по count)
  const weekArr = this.weeklyProgress || [];
  const maxCount = weekArr.reduce((m,d) => Math.max(m, d.count || 0), 0) || 1;
  const todayActivity = weekArr.find(d => d.date === todayKey);
  const todayRepeats = todayActivity ? (todayActivity.count || 0) : 0;

  container.innerHTML = `
    ${petHtml}
    ${achievementsHtml}
    <div class="progress-grid">
      <!-- Общий прогресс -->
      <div class="progress-card progress-card-main">
        <div class="progress-card-header">
          <div class="progress-card-icon icon-green">
            <i class="fas fa-chart-line"></i>
          </div>
          <div>
            <div class="progress-card-title">Общий прогресс</div>
            <div class="progress-card-subtitle">Ваш личный словарный запас в Bewords</div>
          </div>
        </div>
        <div class="progress-main-row">
          <div class="progress-main-number">
            ${learnedWords}
            <span>выучено</span>
          </div>
          <div class="progress-main-bar">
            <div class="progress-main-bar-label">
              <span>Всего слов: ${totalWords}</span>
              <span>${learnedPct}%</span>
            </div>
            <div class="progress-main-bar-track">
              <div class="progress-main-bar-fill" style="width:${learnedPct}%;"></div>
            </div>
            <div class="progress-main-bar-legend">
              <span><span class="dot dot-learned"></span>Выучено: ${learnedWords}</span>
              <span><span class="dot dot-active"></span>В процессе: ${inProgress}</span>
            </div>
          </div>
        </div>
        <div class="progress-row">
          <span>Повторений сегодня</span>
          <strong>${todayRepeats}</strong>
        </div>
      </div>

      <!-- По уровням / категориям -->
      <div class="progress-card">
        <div class="progress-card-header">
          <div class="progress-card-icon icon-blue">
            <i class="fas fa-layer-group"></i>
          </div>
          <div>
            <div class="progress-card-title">По уровням и категориям</div>
            <div class="progress-card-subtitle">Где вы продвинулись больше всего</div>
          </div>
        </div>
        ${
          Object.keys(levelProgress).length === 0
          ? `<p class="progress-empty-text">Вы ещё не добавили слова — начните с раздела «Списки».</p>`
          : `
            <div class="level-progress-list">
              ${Object.entries(levelProgress).map(([level, data]) => `
                <div class="level-progress-item">
                  <div class="level-progress-header">
                    <span class="level-progress-label">${level}</span>
                    <span class="level-progress-count">${data.learned} / ${data.total}</span>
                  </div>
                  <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" style="width:${data.pct}%;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          `
        }
      </div>

      <!-- Тренажёр предложений -->
      <div class="progress-card">
        <div class="progress-card-header">
          <div class="progress-card-icon icon-purple">
            <i class="fas fa-keyboard"></i>
          </div>
          <div>
            <div class="progress-card-title">Тренажёр предложений</div>
            <div class="progress-card-subtitle">Ваш прогресс в режиме «Тренажер»</div>
          </div>
        </div>
        <div class="progress-row">
          <span>Сегодня</span>
          <strong>${trainerToday} повторений (${trainerTodayCorrect} правильных)</strong>
        </div>
        <div class="progress-row">
          <span>За 7 дней</span>
          <strong>${trainerWeek} повторений (${trainerWeekCorrect} правильных)</strong>
        </div>
      </div>

      <!-- Активность за неделю -->
      <div class="progress-card">
        <div class="progress-card-header">
          <div class="progress-card-icon icon-yellow">
            <i class="fas fa-calendar-week"></i>
          </div>
          <div>
            <div class="progress-card-title">Активность за неделю</div>
            <div class="progress-card-subtitle">Сколько повторений вы делали каждый день</div>
          </div>
        </div>
        ${
          weekArr.length === 0
          ? `<p class="progress-empty-text">Пока нет данных об активности — начните практику.</p>`
          : `
            <div class="week-activity-list">
              ${weekArr.map(day => {
                const count = day.count || 0;
                const pct = Math.round(count / maxCount * 100);
                const label = new Date(day.date).toLocaleDateString('ru-RU', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short'
                });
                return `
                  <div class="week-activity-item">
                    <div class="week-activity-header">
                      <span class="week-label">${label}</span>
                      <span class="week-count">${count}</span>
                    </div>
                    <div class="week-bar">
                      <div class="week-bar-fill" style="width:${pct}%;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `
        }
      </div>
    </div>
  `;

  // обработчики для питомца
  this.attachPetHandlers();
}

// Добавьте новый метод после renderProgress:
attachPetHandlers() {
    // Выбор питомца
    const catBtn = document.querySelector('.pet-choose-cat');
    const dogBtn = document.querySelector('.pet-choose-dog');
    
    if (catBtn) {
        catBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('petNameInput');
            const name = nameInput ? nameInput.value.trim() : 'Малыш';
            this.choosePet('cat', name || 'Малыш');
        });
    }
    
    if (dogBtn) {
        dogBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('petNameInput');
            const name = nameInput ? nameInput.value.trim() : 'Малыш';
            this.choosePet('dog', name || 'Малыш');
        });
    }
    
    // Кнопки действий
    const feedBtn = document.querySelector('.pet-feed-btn');
    if (feedBtn) {
        feedBtn.addEventListener('click', () => this.feedPet());
    }
    
    const waterBtn = document.querySelector('.pet-water-btn');
    if (waterBtn) {
        waterBtn.addEventListener('click', () => this.waterPet());
    }
    
    const renameBtn = document.querySelector('.pet-rename-btn');
    if (renameBtn) {
        renameBtn.addEventListener('click', () => this.renamePet());
    }
    
    const switchBtn = document.querySelector('.pet-switch-btn');
    if (switchBtn) {
        switchBtn.addEventListener('click', () => this.switchPet());
    }
    
    const reviveBtn = document.querySelector('.pet-revive-btn');
    if (reviveBtn) {
        reviveBtn.addEventListener('click', () => this.revivePet());
    }
}

  // =========
  // Games (gate + overlays) with irregulars auto disabled
  // =========
    showQuizGateForGame(gameName, gameFile) {
    if (this.learningWords.filter(w => !w.isLearned).length < 3) {
      this.showNotification('Чтобы играть, добавьте минимум 3 слова из "списка слов" в «Изучаю»', 'warning');
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'gameQuizOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;';

    const gameContainer = document.createElement('div');
    // Убрали жесткий color:#333, чтобы CSS мог управлять цветом в темной теме
    gameContainer.style.cssText = 'background:var(--bg-primary);border-radius:16px;padding:20px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i> Закрыть';
    closeBtn.className = 'btn btn-secondary';
    closeBtn.style.marginBottom = '10px';
    closeBtn.onclick = () => overlay.remove();

    const gameTitle = document.createElement('h2');
    gameTitle.textContent = `${gameName} - Quiz`;
    gameTitle.style.cssText = 'text-align:center;margin-bottom:20px; font-weight:800;';

    const quizContainer = document.createElement('div');
    quizContainer.id = 'quizGateContainer';

    const scoreDisplay = document.createElement('div');
    scoreDisplay.id = 'scoreGateDisplay';
    scoreDisplay.style.cssText = 'text-align:center;font-size:18px;font-weight:bold;margin-top:15px;color:#667eea;';
    scoreDisplay.innerHTML = 'Правильных ответов: <span id="gateScore">0</span>/3';

    gameContainer.appendChild(closeBtn);
    gameContainer.appendChild(gameTitle);
    gameContainer.appendChild(quizContainer);
    gameContainer.appendChild(scoreDisplay);
    overlay.appendChild(gameContainer);
    document.body.appendChild(overlay);

    let correctCount = 0;
    const showNextQuestion = () => {
      const word = this.getRandomLearningWord();
      if (!word) {
        quizContainer.innerHTML = '<div style="text-align:center;padding:20px;">Недостаточно слов</div>';
        return;
      }
      const direction = Math.random() < 0.5 ? 'EN_RU' : 'RU_EN';
      const questionText = direction === 'EN_RU' ? this.getEnglishDisplay(word) : word.translation;
      const correct = direction === 'EN_RU' ? word.translation : this.getEnglishDisplay(word);
      const options = this.buildQuizOptions(word, direction);
      const shuffled = this.shuffle(options);

      // Генерируем HTML кнопок. Обрати внимание: убрали инлайн стили background/border
      quizContainer.innerHTML = `
        <div style="margin-bottom:15px;text-align:center;">
          <div style="font-size:20px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:10px;">
            ${questionText}
            <span class="sound-actions">
               <button class="mini-btn gate-sound-btn" data-region="us"><i class="fas fa-volume-up"></i></button>
            </span>
          </div>
          <div style="font-size:14px;opacity:0.8;margin-bottom:12px;">
            Выберите правильный вариант
          </div>
          <div class="quiz-options" style="display:grid;gap:10px;">
            ${shuffled.map(opt => {
              return `<div class="quiz-option-gate" data-answer="${this.safeAttr(opt)}" style="padding:12px;border-radius:8px;border:2px solid var(--border-color);cursor:pointer;text-align:center;font-weight:600;">
                ${opt}
              </div>`;
            }).join('')}
          </div>
        </div>
      `;

      // Обработчик звука вопроса (используем playWord для поддержки идиом/фразовых)
      const soundBtn = quizContainer.querySelector('.gate-sound-btn');
      if(soundBtn) {
          soundBtn.onclick = (e) => {
              e.stopPropagation();
              // Task 3 & 4: playWord сам разберется (идиома, фразовый или обычное слово)
              this.playWord(word.word, word.forms, 'us', word.level); 
          };
      }

      // Авто-озвучка
      if (direction === 'EN_RU' && this.shouldAutoPronounce(word)) {
        setTimeout(() => {
           this.playWord(word.word, word.forms, 'us', word.level);
        }, 150);
      }

      // Логика клика по ответу (ЧЕРЕЗ КЛАССЫ, а не стили)
      quizContainer.querySelectorAll('.quiz-option-gate').forEach(opt => {
        opt.addEventListener('click', async () => {
          // Блокируем повторные клики
          quizContainer.querySelectorAll('.quiz-option-gate').forEach(b => b.style.pointerEvents = 'none');

          const chosen = opt.getAttribute('data-answer');
          const isCorrect = chosen === correct;

          // Добавляем классы для стилизации (см. CSS)
          if (isCorrect) {
              opt.classList.add('gate-correct');
          } else {
              opt.classList.add('gate-wrong');
              // Подсветим правильный
              quizContainer.querySelectorAll('.quiz-option-gate').forEach(o => {
                  if (o.getAttribute('data-answer') === correct) {
                      o.classList.add('gate-correct');
                  }
              });
          }

          await this.waitForCurrentAudioToFinish();

          // Озвучка при ответе (если был русский вопрос)
          if (direction === 'RU_EN' && this.shouldAutoPronounce(word)) {
             await this.delay(200);
             await this.playWord(word.word, word.forms, 'us', word.level);
          } else {
             await this.delay(600);
          }

          if (isCorrect) {
            correctCount++;
            const scoreEl = document.getElementById('gateScore');
            if (scoreEl) scoreEl.textContent = String(correctCount);
            this.recordDailyProgress();

            if (correctCount >= 3) {
              await this.delay(300);
              overlay.remove();
              this.openGameFullscreen(gameName, gameFile);
            } else {
              showNextQuestion();
            }
          } else {
            // При ошибке даем шанс исправиться или следующий вопрос (сейчас следующий)
            setTimeout(() => showNextQuestion(), 800);
          }
        });
      });
    };
    showNextQuestion();
  }

  openGameFullscreen(gameName, gameFile) {
    const containerId = 'gameFullscreenContainer';
    const gameContainer = document.createElement('div');
    gameContainer.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#000;';
    gameContainer.id = containerId;

    const header = document.createElement('div');
    header.className = 'game-header';
    header.style.cssText = `
      position:absolute;top:0;left:0;right:0;height:56px;background:rgba(255,255,255,0.96);
      display:flex;align-items:center;gap:8px;padding:8px 12px;z-index:1000000;box-shadow:0 2px 8px rgba(0,0,0,0.15);
    `;

    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-secondary';
    backBtn.style.cssText = 'font-weight:600;';
    backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Назад в приложение';
    backBtn.onclick = () => {
      this.clearGameQuizCycle(containerId);
      gameContainer.remove();
    };

    const title = document.createElement('div');
    title.style.cssText = 'font-weight:700;color:#333;';
    title.textContent = `Игра: ${gameName}`;

    header.appendChild(backBtn);
    header.appendChild(title);

    const iframe = document.createElement('iframe');
    iframe.src = gameFile;
    iframe.style.cssText = 'position:absolute;top:56px;left:0;width:100%;height:calc(100% - 56px);border:none;';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';

    gameContainer.appendChild(header);
    gameContainer.appendChild(iframe);
    document.body.appendChild(gameContainer);

    this.showNotification(`Игра ${gameName} запущена! Приятной игры!`, 'success');

    this.startGameQuizCycle(containerId);
  }

  showCatalogGame() {
    if (this.learningWords.filter(w => !w.isLearned).length < 4) {
      this.showNotification('Чтобы играть, добавьте минимум 4 слова в «Изучаю»', 'warning');
      return;
    }

    const containerId = 'catalogGameContainer';
    const gameContainer = document.createElement('div');
    gameContainer.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#000;';
    gameContainer.id = containerId;

    const header = document.createElement('div');
    header.className = 'game-header';
    header.style.cssText = `
      position:absolute;top:0;left:0;right:0;height:56px;background:rgba(255,255,255,0.96);
      display:flex;align-items:center;gap:8px;padding:8px 12px;z-index:1000000;box-shadow:0 2px 8px rgba(0,0,0,0.15);
    `;

    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-secondary';
    backBtn.style.cssText = 'font-weight:600;';
    backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Назад в приложение';
    backBtn.onclick = () => {
      this.clearGameQuizCycle(containerId);
      gameContainer.remove();
    };

    const title = document.createElement('div');
    title.style.cssText = 'font-weight:700;color:#333;';
    title.textContent = 'Игротека';

    header.appendChild(backBtn);
    header.appendChild(title);

    const iframe = document.createElement('iframe');
    iframe.src = 'dash.html';
    iframe.style.cssText = 'position:absolute;top:56px;left:0;width:100%;height:calc(100% - 56px);border:none;';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';

    gameContainer.appendChild(header);
    gameContainer.appendChild(iframe);
    document.body.appendChild(gameContainer);

    this.startGameQuizCycle(containerId);
    setTimeout(() => this.showOverlayQuiz(containerId), 1000);
  }

  startGameQuizCycle(containerId) {
  this.clearGameQuizCycle(containerId); // 1) убираем старые таймеры

  const QUIZ_DELAY = 5 * 60 * 1000;      // 5 минут
  const WARNING_DELAY = 10 * 1000;       // предупреждение за 10 секунд

  const warningTimeoutId = setTimeout(() => {
    this.showNotification('Через 10 секунд появится Quiz! Поставьте игру на паузу.', 'warning');
  }, QUIZ_DELAY - WARNING_DELAY);

  const quizTimeoutId = setTimeout(() => {
    this.showOverlayQuiz(containerId);   // 2) через 5 минут показываем quiz
  }, QUIZ_DELAY);

  // сохраняем таймеры, чтобы потом их отменить
  this.gameQuizIntervals[containerId] = { warningTimeoutId, quizTimeoutId };
}
  clearGameQuizCycle(containerId) {
    const timers = this.gameQuizIntervals[containerId];
    if (timers) {
      clearTimeout(timers.warningTimeoutId);
      clearTimeout(timers.quizTimeoutId);
      delete this.gameQuizIntervals[containerId];
    }
  }

  showOverlayQuiz(containerId) {
    this.clearGameQuizCycle(containerId); 
    const host = document.getElementById(containerId);
    if (!host) return;

    const overlay = document.createElement('div');
    overlay.className = 'game-quiz-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:1000001;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;padding:20px;';

    const quizBox = document.createElement('div');
    quizBox.style.cssText = 'background:var(--bg-primary);border-radius:16px;padding:30px;max-width:520px;width:90%;box-shadow:var(--shadow-lg);';

    const title = document.createElement('h2');
    title.textContent = 'Время повторить слова!';
    title.style.cssText = 'text-align:center;margin-bottom:20px;color:var(--text-primary);';

    const quizContent = document.createElement('div');
    quizContent.id = `overlayQuizContent_${containerId}`;

    quizBox.appendChild(title);
    quizBox.appendChild(quizContent);
    overlay.appendChild(quizBox);
    host.appendChild(overlay);

    let quizCorrect = 0;
    const showQuestion = () => {
      const word = this.getRandomLearningWord();
      if (!word) {
        quizContent.innerHTML = '<div style="text-align:center;color:var(--text-secondary);">Недостаточно слов</div>';
        return;
      }
      const direction = Math.random() < 0.5 ? 'EN_RU' : 'RU_EN';
      const questionText = direction === 'EN_RU' ? this.getEnglishDisplay(word) : word.translation;
      const correct = direction === 'EN_RU' ? word.translation : this.getEnglishDisplay(word);
      const options = this.buildQuizOptions(word, direction);
      const shuffled = this.shuffle(options);

      quizContent.innerHTML = `
        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-size:24px;font-weight:700;color:var(--text-primary);margin-bottom:12px;">
            ${questionText}
            <span class="sound-actions" style="margin-left:8px;">
              <button class="mini-btn" title="US" onclick="app.playWord('${this.safeAttr(word.word)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'}, 'us')"><i class="fas fa-volume-up"></i></button>
              <button class="mini-btn" title="UK" onclick="app.playWord('${this.safeAttr(word.word)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'}, 'uk')"><i class="fas fa-headphones"></i></button>
            </span>
          </div>
          <div style="font-size:14px;color:var(--text-secondary);margin-bottom:10px;">Выбрано правильных: ${quizCorrect}/4</div>
          <div class="quiz-options" style="display:grid;gap:10px;">
            ${shuffled.map(opt => {
              const isEnglishOpt = this.isEnglish(opt) && !this.isRussian(opt);
              const baseForSound = opt.split('→')[0].trim();
              const soundBtns = isEnglishOpt ? `
                <span class="option-sound">
                  <button class="mini-btn" title="US" onclick="event.stopPropagation(); app.playSingleWordMp3('${this.safeAttr(baseForSound)}', 'us')"><i class="fas fa-volume-up"></i></button>
                  <button class="mini-btn" title="UK" onclick="event.stopPropagation(); app.playSingleWordMp3('${this.safeAttr(baseForSound)}', 'uk')"><i class="fas fa-headphones"></i></button>
                </span>
              ` : '';
              return `<div class="quiz-option-gate" data-answer="${this.safeAttr(opt)}" style="padding:12px;border-radius:8px;border:2px solid var(--border-color);background:var(--bg-secondary);cursor:pointer;text-align:center;font-weight:600;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <span>${opt}</span>${soundBtns}
              </div>`;
            }).join('')}
          </div>
        </div>
      `;

      if (direction === 'EN_RU' && this.shouldAutoPronounce(word)) {
        setTimeout(() => {
          if (word.forms && word.forms.length) this.playFormsSequence(word.forms, 'us');
          else if (this.isMultiWord(word.word)) this.playPhraseTTS(word.word, 'us');
          else this.playSingleWordMp3(word.word, 'us');
        }, 150);
      }

      quizContent.querySelectorAll('.quiz-option-gate').forEach(opt => {
  opt.addEventListener('click', async () => {
    const chosen = opt.getAttribute('data-answer');
    const isCorrect = chosen === correct;

    // ... оформление правильного/неправильного варианта ...

    await this.waitForCurrentAudioToFinish();

    if (direction === 'RU_EN' && this.shouldAutoPronounce(word)) {
      // ... озвучка ...
    } else {
      await this.delay(600);
    }

    if (isCorrect) {
      quizCorrect++;
      this.recordDailyProgress();

      if (quizCorrect >= 4) {
        await this.delay(300);
        overlay.remove();
        this.showNotification('Отлично! Продолжайте играть!', 'success');
        this.startGameQuizCycle(containerId); // ← ВАЖНО: запускаем новый цикл
      } else {
        showQuestion();
      }
    } else {
      showQuestion();
    }
  });
});
    };
    showQuestion();
  }
      
  // =========
  // Utils
  // =========
  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
    showNotification(msg, type = 'info') {
      // 1. Ищем или создаем контейнер
      let container = document.querySelector('.toast-container');
      if (!container) {
          container = document.createElement('div');
          container.className = 'toast-container';
          document.body.appendChild(container);
      }

      // 2. Создаем уведомление с классами
      const toast = document.createElement('div');
      toast.className = `toast ${type}`; // type: success, error, warning, info
      toast.innerHTML = `<span>${msg}</span>`;
      
      // 3. Добавляем в контейнер
      container.appendChild(toast);
      
      // 4. Удаляем через 3 секунды с анимацией исчезновения
      setTimeout(() => {
          toast.style.transition = 'all 0.3s ease';
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(-20px) scale(0.9)';
          setTimeout(() => toast.remove(), 300);
      }, 3000);
  }
  
  getRandomLearningWord() {
    const availableWords = this.learningWords.filter(w => !w.isLearned);
    if (availableWords.length === 0) return null;
    return availableWords[Math.floor(Math.random() * availableWords.length)];
  }
  
    createGlobalLoader() {
    if (this.loaderEl) return;
    const overlay = document.createElement('div');
    overlay.id = 'globalLoader';
    overlay.className = 'global-loader-overlay';
    overlay.innerHTML = `
      <div class="global-loader-box">
        <img src="/loading.gif" alt="Кот Боб загружает..." />
        <div class="global-loader-title">Загрузка...</div>
        <div class="global-loader-text global-loader-text-el">
          Кот Боб загружает для вас эту страницу
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.loaderEl = overlay;
  }

  showGlobalLoader(message = 'Кот Боб загружает для вас эту страницу', minDurationMs = 1500) {
    if (!this.isAndroid) return;
    this.createGlobalLoader();
    const textEl = this.loaderEl.querySelector('.global-loader-text-el');
    if (textEl) textEl.textContent = message;
    this.loaderMinMs = minDurationMs;
    this.loaderStart = performance.now();
    this.loaderEl.classList.add('show');
  }

  hideGlobalLoader() {
    if (!this.isAndroid || !this.loaderEl) return;
    const elapsed = performance.now() - (this.loaderStart || 0);
    const delay = Math.max(0, (this.loaderMinMs || 0) - elapsed);
    clearTimeout(this.loaderTimer);
    this.loaderTimer = setTimeout(() => {
      this.loaderEl.classList.remove('show');
    }, delay);
  }

static injectStylesOnce() { if (document.getElementById('app-extra-styles')) return; const style = document.createElement('style'); style.id = 'app-extra-styles'; style.textContent = ` @keyframes slideDown { from { transform: translate(-50%, -100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } } @keyframes slideUp { from { transform: translate(-50%, 0); opacity: 1; } to { transform: translate(-50%, -100%); opacity: 0; } } .sound-actions .mini-btn, .option-sound .mini-btn { border:none; background: var(--bg-tertiary, #f0f2f5); padding:4px 6px; border-radius:6px; cursor:pointer; color:#333; } .quiz-option .quiz-option-inner { display:flex; align-items:center; justify-content:space-between; gap:8px; }

/* Подсветка активного пункта меню во время тура */
.bottom-nav .nav-item.nav-highlight {
  position: relative;
  box-shadow: 0 0 0 6px rgba(99,102,241,0.3);
  border-radius: 12px;
}

/* Мини-игра питомец (прогресс) */
.pet-widget{background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:14px;padding:12px;margin-bottom:14px;}
.pet-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.pet-avatar{width:56px;height:56px;object-fit:contain;border-radius:10px;background:#fff;border:1px solid var(--border-color);}
.pet-title{font-weight:800;color:var(--text-primary);}
.pet-bars{display:grid;gap:8px;margin:8px 0 10px;}
.pet-bar{height:10px;background:#e5e7eb;border-radius:8px;overflow:hidden;}
.pet-bar-fill{height:100%;background:linear-gradient(90deg,#10b981,#22d3ee);}
.pet-actions{display:flex;flex-wrap:wrap;gap:8px;}
.pet-dead{color:#ef4444;font-weight:700;margin:8px 0;}
/* Стили для бейджей точности */
.acc-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  margin-left: 8px;
  vertical-align: middle;
}
.acc-none { background: #e5e7eb; color: #374151; }
.acc-good { background: #d1fae5; color: #065f46; }
.acc-mid { background: #fef3c7; color: #92400e; }
.acc-bad { background: #fee2e2; color: #991b1b; }
`; document.head.appendChild(style); }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  EnglishWordsApp.injectStylesOnce();
  window.app = new EnglishWordsApp();
});


service-worker.js
/* Caching Service Worker for Bewords & Games */
const CACHE_NAME = 'bewords-app-v6'; // Обновил версию
// Расширили регулярку: картинки + html + css + js + json
const ASSETS_RE = /\.(png|jpg|jpeg|webp|gif|svg|html|css|js|json)$/i;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Удаляем старые кэши
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  
  // Определяем, нужно ли кэшировать
  const shouldCache = 
    ASSETS_RE.test(url.pathname) || 
    url.pathname.endsWith('/') || // главная страница
    url.hostname.includes('britlex.ru') ||
    url.hostname.includes('smart.servier.com');

  // НЕ кэшируем аудио и API
  const isAudio = req.destination === 'audio' || url.pathname.endsWith('.mp3') || url.hostname.includes('wooordhunt.ru') || url.pathname.includes('/au/');
  if (isAudio) return;

  if (shouldCache) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req, { ignoreVary: true });
      
      // Стратегия: Stale-While-Revalidate (вернуть кэш сразу, но обновить в фоне)
      // Для игр это критично: они грузятся мгновенно.
      const networkFetch = fetch(req, { mode: 'cors', credentials: 'omit' })
        .then(res => {
          if (res && res.status === 200) {
             cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => {
           // Если сети нет, ничего страшного, надеемся на кэш
        });

      return cached || networkFetch;
    })());
  }
});
