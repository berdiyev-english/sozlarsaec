class EnglishWordsApp {
  constructor() {
    this.currentSection = 'about';
    this.currentLevel = null;
    this.currentCategory = null;
    this.learningWords = [];
    this.customWords = [];
    this.wordStats = {};
    this.weeklyProgress = [];
    this.currentMode = 'flashcards';
    this.currentPractice = 'scheduled'; 
    this.currentReviewIndex = 0;
    this.showFilter = 'all';
    this.gameQuizIntervals = {}; // {containerId: {warningTimeoutId, quizTimeoutId}}

    // runtime flags
    this.lastFlashcardFrontWasRussian = false;
    this.currentAudio = null;
    this.currentAudioPromise = null; // tracks current playback completion
    this.suppressAutoSpeakOnce = false; // suppress autoplay on next render (fix stray audio on add/remove)

    this.loadData();
    this.initializeUI();
    this.renderProgress();
  }

  // =========================
  // Helpers: language & audio
  // =========================
  isRussian(text) {
    return /[а-яё]/i.test(text || '');
  }
  isEnglish(text) {
    return /[a-z]/i.test(text || '');
  }
  isMultiWord(text) {
    if (!text) return false;
    return /\s/.test(String(text).trim());
  }
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
  isIrregularWord(wordObj) {
    return wordObj && wordObj.level === 'IRREGULARS';
  }
  shouldAutoPronounce(wordObj) {
    // Автопроизношение выключено для «Неправильных глаголов»
    return !this.isIrregularWord(wordObj);
  }

  delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
  async waitForCurrentAudioToFinish() {
    const p = this.currentAudioPromise;
    if (p && typeof p.then === 'function') {
      try { await p; } catch {}
    }
  }

  cleanWordForAudio(raw) {
    if (!raw) return '';
    const w = String(raw).toLowerCase().trim();
    // keep letters, apostrophes, hyphen and spaces (for phrasals); replace slashes with space
    const basic = w
      .replace(/[\/]+/g, ' ')
      .replace(/[^a-z\s'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return basic;
  }
  sanitizeForSpeech(raw) {
    if (!raw) return '';
    // remove arrows and any punctuation except hyphen/apostrophe/spaces; replace slashes with space
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
    [cleaned, noSpace, firstToken].forEach(c => {
      if (c && !uniq.includes(c)) uniq.push(c);
    });
    return uniq;
  }
  buildAudioUrl(wordCandidate, region = 'us') {
    const clean = (wordCandidate || '').toLowerCase();
    return `https://wooordhunt.ru/data/sound/sow/${region}/${clean}.mp3`;
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
    const p = new Promise((resolve, reject) => {
      try {
        this.stopCurrentAudio();
        const audio = new Audio(url);
        this.currentAudio = audio;

        let endedOrFailed = false;
        const cleanup = () => {
          if (endedOrFailed) return;
          endedOrFailed = true;
          try {
            audio.onended = null;
            audio.onerror = null;
            audio.oncanplaythrough = null;
          } catch {}
        };

        audio.oncanplaythrough = () => {
          audio.play().catch(err => {
            cleanup();
            reject(err);
          });
        };
        audio.onended = () => {
          cleanup();
          resolve(true);
        };
        audio.onerror = () => {
          cleanup();
          reject(new Error('Audio error'));
        };
        // Safety timeout
        setTimeout(() => {
          if (!endedOrFailed && audio && !audio.paused) return; // still playing
          if (!endedOrFailed) {
            try { audio.pause(); } catch {}
            cleanup();
            reject(new Error('Audio timeout'));
          }
        }, 15000);
      } catch (e) {
        reject(e);
      }
    });

    // Track current audio promise lifecycle
    this.currentAudioPromise = p.finally(() => {
      if (this.currentAudioPromise === p) {
        this.currentAudioPromise = null;
      }
    });

    return p;
  }

  // Web Speech helpers (phrases only)
  async ensureVoicesLoaded(timeoutMs = 1500) {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.getVoices().length > 0) return;
    await new Promise(resolve => {
      const t = setTimeout(resolve, timeoutMs);
      const handler = () => {
        clearTimeout(t);
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handler);
    });
  }
  pickPreferredGoogleVoice(region = 'us') {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;

    const lc = s => (s || '').toLowerCase();
    const isOnline = v => v && v.localService === false;

    // Name candidates (order matters)
    const namePrefsUK = [
      'google uk english male',
      'google uk english',
      'google english uk male',
      'google en-gb'
    ];
    const namePrefsUS = [
      'google us english',
      'google en-us',
      'google english us'
    ];

    const langCheckUK = v => lc(v.lang).startsWith('en-gb');
    const langCheckUS = v => lc(v.lang).startsWith('en-us') || lc(v.lang) === 'en';

    const tryPick = (nameList, langCheck) => {
      // exact name match among online voices
      for (const pref of nameList) {
        const found = voices.find(v => isOnline(v) && lc(v.name).includes(pref));
        if (found) return found;
      }
      // online voice by language
      const onlineByLang = voices.find(v => isOnline(v) && langCheck(v));
      if (onlineByLang) return onlineByLang;
      // any by language
      const anyByLang = voices.find(v => langCheck(v));
      if (anyByLang) return anyByLang;
      // any english online
      const anyEnOnline = voices.find(v => isOnline(v) && lc(v.lang).startsWith('en'));
      if (anyEnOnline) return anyEnOnline;
      // any english
      const anyEn = voices.find(v => lc(v.lang).startsWith('en'));
      return anyEn || voices[0] || null;
    };

    return region === 'uk' ? tryPick(namePrefsUK, langCheckUK) : tryPick(namePrefsUS, langCheckUS);
  }
  // Phrase-only TTS (no single words!)
  async playPhraseTTS(text, region = 'us') {
    const phrase = this.sanitizeForSpeech(text);
    if (!phrase) return false;
    if (!('speechSynthesis' in window)) return false;

    await this.ensureVoicesLoaded();
    const voice = this.pickPreferredGoogleVoice(region === 'uk' ? 'uk' : 'us');

    const rate = region === 'uk' ? 0.9 : 0.8;
    const pitch = 1;

    const p = new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(phrase);
      if (voice) {
        u.voice = voice;
        if (voice.lang) u.lang = voice.lang;
      } else {
        u.lang = region === 'uk' ? 'en-GB' : 'en-US';
      }
      u.rate = rate;
      u.pitch = pitch;
      u.onend = resolve;
      u.onerror = resolve;

      // ensure no overlap with any mp3/speech
      try { window.speechSynthesis.cancel(); } catch {}
      window.speechSynthesis.speak(u);
    });

    this.currentAudioPromise = p.finally(() => {
      if (this.currentAudioPromise === p) this.currentAudioPromise = null;
    });

    await p;
    return true;
  }

  // Core play single word (mp3 only; no TTS fallback)
  async playSingleWordMp3(word, regionPreferred = 'us') {
    // Handle variants like "was/were" — speak each part separately via mp3
    if (typeof word === 'string' && word.includes('/')) {
      const parts = word.split('/').map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        for (const part of parts) {
          // each part as single word mp3-only
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
        } catch (e) {
          // try next
        }
      }
    }
    // IMPORTANT: no TTS fallback for single words
    return false;
  }

  // Sequence play for irregular forms (mp3 for each; no TTS)
  async playFormsSequence(forms, regionPreferred = 'us') {
    if (!forms || !forms.length) return false;
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      await this.playSingleWordMp3(form, regionPreferred);
      await this.delay(200);
    }
    return true;
  }
  // Unified API for UI with rules:
  // - forms[]: mp3 sequence (irregulars etc)
  // - single word: mp3 only
  // - multi-word phrase: Web Speech API only
  async playWord(word, forms = null, region = null) {
    if (typeof forms === 'string') {
      forms = [forms];
    }
    const regionPref = (region === 'uk' || region === 'us') ? region : 'us';

    // Irregular-like variants "was/were" (slash) -> mp3 for each
    if ((!forms || !Array.isArray(forms) || forms.length === 0) && typeof word === 'string' && word.includes('/')) {
      const parts = word.split('/').map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        await this.playFormsSequence(parts, regionPref);
        return;
      }
    }

    if (forms && Array.isArray(forms) && forms.length) {
      await this.playFormsSequence(forms, regionPref);
      return;
    }

    if (this.isMultiWord(word)) {
      await this.playPhraseTTS(word, regionPref);
      return;
    }

    await this.playSingleWordMp3(word, regionPref);
  }

  // =========================
  // Image helpers
  // =========================
  getPrimaryImageUrl(wordObj) {
    const base = (this.getBaseEnglish(wordObj) || '').toLowerCase().trim();
    // источник: britlex (lower-case + encodeURIComponent)
    return `https://britlex.ru/images/${encodeURIComponent(base)}.jpg`;
  }
  getFallbackImageUrl() {
    const n = Math.floor(Math.random() * 100) + 1;
    return `${n}.jpg`;
  }
  handleImageError(imgEl) {
    // Первая ошибка: подставить рандом 1..100
    if (!imgEl.dataset.fallbackTried) {
      imgEl.dataset.fallbackTried = '1';
      imgEl.src = this.getFallbackImageUrl();
      return;
    }
    // Вторая ошибка: подставить nophoto
    imgEl.onerror = null;
    imgEl.src = 'nophoto.jpg';
  }
  handleMotivationImageError(imgEl) {
    // Сначала пробуем mN.jpg из корня, затем nophoto
    if (!imgEl.dataset.step) {
      imgEl.dataset.step = '1';
      const current = imgEl.dataset.index || '1';
      imgEl.src = `m${current}.jpg`;
      return;
    } else {
      imgEl.onerror = null;
      imgEl.src = 'nophoto.jpg';
    }
  }

  // =========================
  // Initialize UI and events
  // =========================
  initializeUI() {
    // Hide PREPOSITIONS everywhere
    document.querySelectorAll('[data-category="PREPOSITIONS"]').forEach(el => { el.style.display = 'none'; });

    // Hide level selectors in "New words" section (we do not ask level/category there)
    const newLevelSel = document.getElementById('newLevel');
    if (newLevelSel) {
      const grp = newLevelSel.closest('.form-group') || newLevelSel.parentElement;
      if (grp) grp.style.display = 'none'; else newLevelSel.style.display = 'none';
    }
    const bulkLevelSel = document.getElementById('bulkLevel');
    if (bulkLevelSel) {
      const grp2 = bulkLevelSel.closest('.form-group') || bulkLevelSel.parentElement;
      if (grp2) grp2.style.display = 'none'; else bulkLevelSel.style.display = 'none';
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', () => this.toggleTheme());

    // Support button
    const supportBtn = document.getElementById('supportBtn');
    if (supportBtn) supportBtn.addEventListener('click', () => this.showSupportModal());
    
       // Info button
const infoBtn = document.getElementById('infoBtn');
if (infoBtn) infoBtn.addEventListener('click', () => this.showInfoModal());

    // Navigation buttons
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const section = e.currentTarget.getAttribute('data-section');
        if (section) {
          this.switchSection(section);
          if (section === 'levels') this.insertAutoDictionaryButtonInLevels();
        }
      });
    });

    // Level cards
    document.querySelectorAll('.level-card[data-level]').forEach(card => {
      card.addEventListener('click', (e) => {
        const level = e.currentTarget.getAttribute('data-level');
        if (level) this.showLevelWords(level);
      });
    });

    // Category cards
    document.querySelectorAll('.level-card[data-category]').forEach(card => {
      card.addEventListener('click', (e) => {
        const cat = e.currentTarget.getAttribute('data-category');
        if (!cat) return;
        if (cat === 'ADDED') this.showAddedWordsCategory();
        else this.showCategoryWords(cat);
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

    // Mode toggle buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentMode = e.currentTarget.getAttribute('data-mode');
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.renderLearningSection();
      });
    });

    // Practice toggle buttons
    document.querySelectorAll('.practice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentPractice = e.currentTarget.getAttribute('data-practice');
        document.querySelectorAll('.practice-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.renderLearningSection();
      });
    });

    // Add/Remove all level buttons
    const addAllBtn = document.getElementById('addAllLevelBtn');
    if (addAllBtn) addAllBtn.addEventListener('click', () => this.addAllLevelWords());

    const removeAllBtn = document.getElementById('removeAllLevelBtn');
    if (removeAllBtn) removeAllBtn.addEventListener('click', () => this.removeAllLevelWords());

    // Game buttons
    const surfBtn = document.getElementById('surfStartBtn');
    if (surfBtn) surfBtn.addEventListener('click', () => this.showQuizGateForGame('Racing', 'subway.html'));

    const doodleBtn = document.getElementById('doodleStartBtn');
    if (doodleBtn) doodleBtn.addEventListener('click', () => this.showQuizGateForGame('Flying Bird', 'doodle-jump.html'));

    const game2048Btn = document.getElementById('game2048StartBtn');
    if (game2048Btn) game2048Btn.addEventListener('click', () => this.showQuizGateForGame('2048', '2048.html'));

    const rocketBtn = document.getElementById('rocketStartBtn');
    if (rocketBtn) rocketBtn.addEventListener('click', () => this.showQuizGateForGame('match 3', 'rocket-soccer.html'));

    const catalogBtn = document.getElementById('catalogStartBtn');
    if (catalogBtn) catalogBtn.addEventListener('click', () => this.showQuizGateForGame('dash', 'dash.html'));

    this.updateLevelCounts();
    this.insertAutoDictionaryButtonInLevels(); // ensure visible initially if on levels
    this.renderLearningSection();
    this.renderCustomWords();
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
    } catch (e) {
      console.error('Error saving data:', e);
    }
  }
  
  // =========
  // Theme
  // =========
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
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
        <p style="margin-bottom:15px;color:var(--text-secondary);">Это бесплатный сервис без рекламы, который создан с любовью к изучению английского языка. Проект может развиваться и существовать благодаря вашим донатам.</p>
        <p style="margin-bottom:15px;color:var(--text-secondary);">Если вам понравилось наше приложение и оно помогает вам учить английский, не забудьте поддержать разработку!</p>
        <p style="margin-bottom:20px;color:var(--text-secondary);"><strong>Об авторе:</strong><br>Приложение создано на основе методики Абдуррахима Бердиева.  Прибыль от донатов идет на развитие и улучшение функционала приложения.</p>
        <a href="https://pay.cloudtips.ru/p/8f56d7d3" target="_blank" class="btn btn-primary" style="text-decoration:none;display:inline-block;margin-right:10px;margin-bottom:10px;">
          <i class="fas fa-heart"></i> Поддержать проект
        </a>
        <button class="btn btn-secondary" onclick="this.closest('.support-modal').remove()">Закрыть</button>
      </div>
    `;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    document.body.appendChild(modal);
  }
  
    // =========
  // Info
  // =========
  
showInfoModal() {
  const modal = document.createElement('div');
  modal.className = 'info-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';
  modal.innerHTML = `
    <div class="info-modal-content" style="background:var(--bg-primary);border-radius:16px;padding:30px;max-width:800px;width:100%;box-shadow:var(--shadow-lg);max-height:90vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="margin:0;color:var(--text-primary);">О приложении</h2>
        <button onclick="this.closest('.info-modal').remove()" style="background:transparent;border:none;font-size:24px;cursor:pointer;color:var(--text-secondary);width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:all 0.2s;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
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
          <p style="color:var(--text-secondary);margin:0;">Играйте в разные увлекательные игры! Спустя время у вас будет появляться quiz, на который нужно ответить правильно, чтобы продолжить играть. Это помогает закрепить изученные слова в игровой форме.</p>
        </div>
        
        <div class="feature-card" style="background:var(--bg-secondary);padding:20px;border-radius:12px;margin-bottom:15px;">
          <div class="feature-icon" style="width:60px;height:60px;background:#7c3aed;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:10px;">
            <i class="fas fa-laugh-beam" style="color:white;"></i>
          </div>
          <h3 style="margin-bottom:8px;color:var(--text-primary);">Позитивная атмосфера обучения</h3>
          <p style="color:var(--text-secondary);margin:0;">В приложении добавлены смешные картинки и мемы, чтобы атмосфера изучения английских слов была позитивной, интересной и мотивирующей!</p>
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


  // =========
  // Sections
  // =========
switchSection(section) {
    // строкa для прокрутки вверх
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    this.currentSection = section;

    this.stopCurrentAudio();

    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const targetSection = document.getElementById(section);
    if (targetSection) targetSection.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-section="${section}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    if (section === 'levels') {
      this.backToLevels();
      this.insertAutoDictionaryButtonInLevels();
    }
    if (section === 'learning') this.renderLearningSection();
    if (section === 'progress') this.renderProgress();
    if (section === 'new-words') {
      // Hide any level/category selectors
      const newLevelSel = document.getElementById('newLevel');
      if (newLevelSel) {
        const grp = newLevelSel.closest('.form-group') || newLevelSel.parentElement;
        if (grp) grp.style.display = 'none'; else newLevelSel.style.display = 'none';
      }
      const bulkLevelSel = document.getElementById('bulkLevel');
      if (bulkLevelSel) {
        const grp2 = bulkLevelSel.closest('.form-group') || bulkLevelSel.parentElement;
        if (grp2) grp2.style.display = 'none'; else bulkLevelSel.style.display = 'none';
      }
      this.renderCustomWords();
    }
  }

  // =========
  // Levels & Categories
  // =========
  updateLevelCounts() {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    levels.forEach(level => {
      const words = oxfordWordsDatabase[level] || [];
      const card = document.querySelector(`[data-level="${level}"] .word-count`);
      if (card) card.textContent = `${words.length} слов`;
    });

    const irregulars = oxfordWordsDatabase['IRREGULARS'] || [];
    const irregCard = document.querySelector('[data-category="IRREGULARS"] .word-count');
    if (irregCard) irregCard.textContent = `${irregulars.length} слов`;

    const phrasals = oxfordWordsDatabase['PHRASAL_VERBS'] || [];
    const phrasalCard = document.querySelector('[data-category="PHRASAL_VERBS"] .word-count');
    if (phrasalCard) phrasalCard.textContent = `${phrasals.length} слов`;

    const idioms = oxfordWordsDatabase['IDIOMS'] || [];
    const idiomsCard = document.querySelector('[data-category="IDIOMS"] .word-count');
    if (idiomsCard) idiomsCard.textContent = `${idioms.length} слов`;

    const addedCard = document.querySelector('[data-category="ADDED"] .word-count');
    if (addedCard) addedCard.textContent = `${this.customWords.length} слов`;
  }

  showLevelWords(level) {
    this.stopCurrentAudio();

    this.currentLevel = level;
    this.currentCategory = null;

    const words = oxfordWordsDatabase[level] || [];
    const container = document.getElementById('wordsContainer');
    const title = document.getElementById('currentLevelTitle');
    const wordsList = document.getElementById('wordsList');

    if (container) container.classList.remove('hidden');
    if (title) title.textContent = `${level} - ${words.length} слов`;

    if (wordsList) {
      wordsList.innerHTML = words.map(word => this.createWordCard(word, level)).join('');
      this.attachWordCardListeners();
    }

    if (container) {
      setTimeout(() => container.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }

  showCategoryWords(category) {
    this.stopCurrentAudio();

    this.currentCategory = category;
    this.currentLevel = null;

    const words = oxfordWordsDatabase[category] || [];
    const container = document.getElementById('wordsContainer');
    const title = document.getElementById('currentLevelTitle');
    const wordsList = document.getElementById('wordsList');

    if (container) container.classList.remove('hidden');

    const categoryName =
      category === 'IRREGULARS' ? 'Неправильные глаголы' :
      category === 'PHRASAL_VERBS' ? 'Фразовые глаголы' :
      category === 'IDIOMS' ? 'Идиомы' :
      'Категория';

    if (title) title.textContent = `${categoryName} - ${words.length} слов`;

    if (wordsList) {
      wordsList.innerHTML = words.map(word => this.createWordCard(word, category)).join('');
      this.attachWordCardListeners();
    }

    if (container) {
      setTimeout(() => container.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }

  showAddedWordsCategory() {
    this.stopCurrentAudio();

    this.currentCategory = 'ADDED';
    this.currentLevel = null;

    const words = this.customWords || [];
    const container = document.getElementById('wordsContainer');
    const title = document.getElementById('currentLevelTitle');
    const wordsList = document.getElementById('wordsList');

    if (container) container.classList.remove('hidden');
    if (title) title.textContent = `Добавленные слова - ${words.length} слов`;

    if (wordsList) {
      wordsList.innerHTML = words.map(word => this.createWordCard(word, 'ADDED')).join('');
      this.attachWordCardListeners();
    }

    if (container) {
      setTimeout(() => container.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }

  backToLevels() {
    this.stopCurrentAudio();
    const container = document.getElementById('wordsContainer');
    if (container) container.classList.add('hidden');
    this.currentLevel = null;
       this.currentCategory = null;
  }

  // =========
  // Auto Dictionary (Levels page) — NEW TEST UI
  // =========
  insertAutoDictionaryButtonInLevels() {
    const levelsSection = document.getElementById('levels');
    if (!levelsSection) return;
    if (levelsSection.querySelector('#autoDictLevelsBtn')) return;

    const bar = document.createElement('div');
    bar.style.cssText = 'width:100%;display:flex;justify-content:center;margin-bottom:12px;';

    const btn = document.createElement('button');
    btn.id = 'autoDictLevelsBtn';
    btn.className = 'btn btn-primary';
    btn.style.cssText = 'width:100%;font-weight:700;';
    btn.textContent = 'ПОДОБРАТЬ СЛОВАРЬ ПОД ТЕБЯ 🚀';
    btn.addEventListener('click', () => this.showAutoDictionaryTest());

    levelsSection.insertAdjacentElement('afterbegin', bar);
    bar.appendChild(btn);
  }

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
  // Word cards
  // =========
  createWordCard(word, levelOrCategory) {
    const isInLearning = this.learningWords.some(w => w.word === word.word && w.level === levelOrCategory);

    let displayText = word.word;
    let translationText = word.translation;

    if (word.forms && word.forms.length > 0) {
      displayText = word.forms.join(' → ');
    }

    return `
      <div class="word-card" data-word="${this.safeAttr(word.word)}" data-level="${this.safeAttr(levelOrCategory)}">
        <div class="word-header">
          <div class="word-text">${displayText}</div>
          <div class="word-actions">
            <button class="action-btn play-btn" title="US" onclick="app.playWord('${this.safeAttr(word.word)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'}, 'us')">
              <i class="fas fa-volume-up"></i>
            </button>
            <button class="action-btn play-btn" title="UK" onclick="app.playWord('${this.safeAttr(word.word)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'}, 'uk')">
              <i class="fas fa-headphones"></i>
            </button>
            ${isInLearning ?
              `<button class="action-btn remove-btn" onclick="app.removeWordFromLearning('${this.safeAttr(word.word)}', '${this.safeAttr(levelOrCategory)}')" title="Удалить из изучаемых">
                <i class="fas fa-trash"></i>
              </button>` :
              `<button class="action-btn add-btn" onclick="app.addWordToLearning('${this.safeAttr(word.word)}', '${this.safeAttr(translationText)}', '${this.safeAttr(levelOrCategory)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'})" title="Добавить в изучаемые">
                <i class="fas fa-plus"></i>
              </button>`
            }
          </div>
        </div>
        <div class="word-translation">${translationText}</div>
        <span class="word-level">${levelOrCategory}</span>
      </div>
    `;
  }
  attachWordCardListeners() {
    // inline onclick
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

      // UI instant swap
      this.swapCardButtonToRemove(word, level);
      this.updateLevelCounts();
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

      // UI instant swap
      this.swapCardButtonToAdd(word, level);
      this.updateLevelCounts();
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
    if (!card) {
      if (this.currentLevel === level) this.showLevelWords(this.currentLevel);
      if (this.currentCategory === level) this.showCategoryWords(this.currentCategory);
      return;
    }
    const actions = card.querySelector('.word-actions');
    if (!actions) return;
    actions.innerHTML = `
      <button class="action-btn play-btn" title="US" onclick="app.playWord('${this.safeAttr(word)}', null, 'us')"><i class="fas fa-volume-up"></i></button>
      <button class="action-btn play-btn" title="UK" onclick="app.playWord('${this.safeAttr(word)}', null, 'uk')"><i class="fas fa-headphones"></i></button>
      <button class="action-btn remove-btn" onclick="app.removeWordFromLearning('${this.safeAttr(word)}', '${this.safeAttr(level)}')" title="Удалить из изучаемых">
        <i class="fas fa-trash"></i>
      </button>
    `;
  }
  swapCardButtonToAdd(word, level) {
    const selWord = (CSS && CSS.escape) ? CSS.escape(word) : word;
    const selLevel = (CSS && CSS.escape) ? CSS.escape(level) : level;
    const card = document.querySelector(`.word-card[data-word="${selWord}"][data-level="${selLevel}"]`);
    if (!card) {
      if (this.currentLevel === level) this.showLevelWords(this.currentLevel);
      if (this.currentCategory === level) this.showCategoryWords(this.currentCategory);
      return;
    }
    const actions = card.querySelector('.word-actions');
    if (!actions) return;
    const translation = card.querySelector('.word-translation')?.textContent || '';
    actions.innerHTML = `
      <button class="action-btn play-btn" title="US" onclick="app.playWord('${this.safeAttr(word)}', null, 'us')"><i class="fas fa-volume-up"></i></button>
      <button class="action-btn play-btn" title="UK" onclick="app.playWord('${this.safeAttr(word)}', null, 'uk')"><i class="fas fa-headphones"></i></button>
      <button class="action-btn add-btn" onclick="app.addWordToLearning('${this.safeAttr(word)}', '${this.safeAttr(translation)}', '${this.safeAttr(level)}', null)" title="Добавить в изучаемые">
        <i class="fas fa-plus"></i>
      </button>
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
      this.showNotification(`Удалено ${removedCount} слов из изучаемых`, 'success');
      this.currentLevel ? this.showLevelWords(this.currentLevel) : this.showCategoryWords(this.currentCategory);

      if (this.currentSection === 'learning') {
        this.suppressAutoSpeakOnce = true;
        this.renderLearningSection();
      }
    }
  }
  initializeWordStats(word) {
    if (!this.wordStats[word]) {
      this.wordStats[word] = {
        correct: 0,
        incorrect: 0,
        lastReview: null,
        nextReview: Date.now(),
        difficulty: 0
      };
    }
  }

  // =========
  // Add words (manual and bulk) -> ADDED category, no level selectors used
  // =========
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
      // "go, went, gone - идти" OR "word - перевод" OR "word — перевод" OR "word: перевод" OR "word<TAB>перевод"
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

  renderCustomWords() {
    const container = document.getElementById('customWords');
    if (!container) return;

    if (this.customWords.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-plus-circle"></i>
          <h3>Нет добавленных слов</h3>
          <p>Используйте формы выше для добавления новых слов</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.customWords.map(word => `
      <div class="word-card">
        <div class="word-header">
          <div class="word-text">${this.getEnglishDisplay(word)}</div>
          <div class="word-actions">
            <button class="action-btn play-btn" title="US" onclick="app.playWord('${this.safeAttr(word.word)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'}, 'us')">
              <i class="fas fa-volume-up"></i>
            </button>
            <button class="action-btn play-btn" title="UK" onclick="app.playWord('${this.safeAttr(word.word)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'}, 'uk')">
              <i class="fas fa-headphones"></i>
            </button>
            <button class="action-btn remove-btn" onclick="app.deleteCustomWord('${this.safeAttr(word.word)}')" title="Удалить">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="word-translation">${word.translation}</div>
        <span class="word-level">ADDED</span>
      </div>
    `).join('');
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

    if (this.learningWords.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-book-open"></i>
          <h3>Пока нет слов для изучения</h3>
          <p>Добавьте слова из списка по уровням или создайте новые</p>
        </div>
      `;
      this.insertMotivationButton(container);
      return;
    }

    if (this.currentMode === 'flashcards') {
      this.renderFlashcards();
    } else if (this.currentMode === 'quiz') {
      this.renderQuiz();
    } else if (this.currentMode === 'list') {
      this.renderWordsList();
    }

    this.insertMotivationButton(container);
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
    btn.addEventListener('click', () => this.showMotivationPopup());

    containerEl.insertAdjacentElement('afterbegin', btn);
  }
  showMotivationPopup() {
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
    closeBtn.onclick = () => overlay.remove();

    header.appendChild(title);
    header.appendChild(closeBtn);

    const n = Math.floor(Math.random() * 61) + 1;
    const imgWrap = document.createElement('div');
    imgWrap.style.cssText = 'width:100%;display:flex;align-items:center;justify-content:center;';

    const img = document.createElement('img');
    img.alt = 'motivation';
    img.src = `motivation/m${n}.jpg`;
    img.setAttribute('data-index', String(n));
    img.style.cssText = 'max-width:100%;max-height:70vh;height:auto;object-fit:contain;display:block;border-radius:10px;';
    img.onerror = () => this.handleMotivationImageError(img);

    imgWrap.appendChild(img);

    modal.appendChild(header);
    modal.appendChild(imgWrap);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  // =========
  // Flashcards
  // =========
  renderFlashcards() {
    const container = document.getElementById('learningWordsList');
    if (!container) return;

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

    const primaryImg = this.getPrimaryImageUrl(word);

    container.innerHTML = `
      <div class="flashcard" data-testid="flashcard">
        <img src="${primaryImg}" alt="flashcard" class="flashcard-image" onerror="app.handleImageError(this)">
        <div class="flashcard-body">
          <h3 class="flashcard-title">
            ${displayWord}
            <span class="sound-actions">
              <button class="mini-btn" title="US" onclick="app.playWord('${this.safeAttr(word.word)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'}, 'us')"><i class="fas fa-volume-up"></i></button>
              <button class="mini-btn" title="UK" onclick="app.playWord('${this.safeAttr(word.word)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'}, 'uk')"><i class="fas fa-headphones"></i></button>
            </span>
          </h3>
          <p class="flashcard-subtitle">Нажмите, чтобы увидеть перевод</p>
          <div class="flashcard-answer hidden" id="flashcardAnswer">
            <div class="review-translation">${word.translation}</div>
          </div>
          <div class="card-actions">
            <button class="btn btn-primary" onclick="app.showFlashcardAnswer()" id="showAnswerBtn" data-testid="flashcard-show-answer">
              <i class="fas fa-eye"></i> Показать ответ
            </button>
            <button class="btn btn-secondary hidden" onclick="app.playCurrentWord()" id="playFlashcardBtn" data-testid="flashcard-play">
              <i class="fas fa-volume-up"></i> Произношение
            </button>
          </div>
          <div class="answer-buttons hidden" id="answerButtons">
            <button class="btn btn-danger" onclick="app.answerFlashcard(false)" data-testid="flashcard-wrong">
              <i class="fas fa-times"></i> Не знал
            </button>
            <button class="btn btn-success" onclick="app.answerFlashcard(true)" data-testid="flashcard-correct">
              <i class="fas fa-check"></i> Знал
            </button>
          </div>
        </div>
      </div>
      <div style="text-align:center;margin-top:15px;color:var(--text-secondary);">
        Карточка ${this.currentReviewIndex + 1} из ${wordsToReview.length}
      </div>
    `;

    // Autoplay when front is English and not suppressed, except IRREGULARS
    if (!this.lastFlashcardFrontWasRussian && !this.suppressAutoSpeakOnce && this.currentSection === 'learning' && this.shouldAutoPronounce(word)) {
      setTimeout(() => {
        if (word.forms && word.forms.length) this.playFormsSequence(word.forms, 'us');
        else if (this.isMultiWord(word.word)) this.playPhraseTTS(word.word, 'us');
        else this.playSingleWordMp3(word.word, 'us');
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
          if (word.forms && word.forms.length) this.playFormsSequence(word.forms, 'us');
          else if (this.isMultiWord(word.word)) this.playPhraseTTS(word.word, 'us');
          else this.playSingleWordMp3(word.word, 'us');
        }, 200);
      }
    }
  }
  playCurrentWord() {
    const wordsToReview = this.getWordsToReview();
    const word = wordsToReview[this.currentReviewIndex % wordsToReview.length];
    if (word.forms && word.forms.length > 0) {
      this.playFormsSequence(word.forms, 'us');
    } else if (this.isMultiWord(word.word)) {
      this.playPhraseTTS(word.word, 'us');
    } else {
      this.playSingleWordMp3(word.word, 'us');
    }
  }
  async answerFlashcard(correct) {
    await this.waitForCurrentAudioToFinish();

    const wordsToReview = this.getWordsToReview();
    const word = wordsToReview[this.currentReviewIndex % wordsToReview.length];

    this.updateWordStats(word.word, correct);
    this.recordDailyProgress();

    this.currentReviewIndex++;

    if (this.currentReviewIndex >= wordsToReview.length && this.currentPractice === 'scheduled') {
      this.currentReviewIndex = 0;
      this.showNotification('Отличная работа! Все слова повторены!', 'success');
    }

    this.renderFlashcards();
  }

  // =========
  // Quiz (Learning)
  // =========
  renderQuiz() {
    const container = document.getElementById('learningWordsList');
    if (!container) return;

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

    const primaryImg = this.getPrimaryImageUrl(word);

    container.innerHTML = `
      <div class="quiz-container" data-testid="quiz-container">
        <img src="${primaryImg}" alt="quiz" class="quiz-image" onerror="app.handleImageError(this)">
        <div class="quiz-question">
          ${questionText}
          <span class="sound-actions" style="margin-left:8px;">
            <button class="mini-btn" title="US" onclick="app.quizPlayQuestion('${this.safeAttr(word.word)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'}, 'us')"><i class="fas fa-volume-up"></i></button>
            <button class="mini-btn" title="UK" onclick="app.quizPlayQuestion('${this.safeAttr(word.word)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'}, 'uk')"><i class="fas fa-headphones"></i></button>
          </span>
        </div>
        <div class="quiz-sub">Выберите правильный перевод</div>
        <div class="quiz-options" id="quizOptions">
          ${shuffled.map(opt => {
            const isEnglishOpt = this.isEnglish(opt) && !this.isRussian(opt);
            const baseForSound = opt.split('→')[0].trim();
            const soundBtns = isEnglishOpt ? `
              <span class="option-sound">
                <button class="mini-btn" title="US" onclick="event.stopPropagation(); app.playSingleWordMp3('${this.safeAttr(baseForSound)}', 'us')"><i class="fas fa-volume-up"></i></button>
                <button class="mini-btn" title="UK" onclick="event.stopPropagation(); app.playSingleWordMp3('${this.safeAttr(baseForSound)}', 'uk')"><i class="fas fa-headphones"></i></button>
              </span>
            ` : '';
            return `
              <div class="quiz-option" data-answer="${this.safeAttr(opt)}" onclick="app.selectQuizOption('${this.safeAttr(opt)}', '${this.safeAttr(correctAnswer)}', '${this.safeAttr(word.word)}', '${direction}')">
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

    // Autoplay only if not irregular
    if (direction === 'EN_RU' && !this.suppressAutoSpeakOnce && this.currentSection === 'learning' && this.shouldAutoPronounce(word)) {
      setTimeout(() => {
        if (word.forms && word.forms.length) this.playFormsSequence(word.forms, 'us'); // mp3 per form
        else if (this.isMultiWord(word.word)) this.playPhraseTTS(word.word, 'us');
        else this.playSingleWordMp3(word.word, 'us');
      }, 200);
    }
    this.suppressAutoSpeakOnce = false;
  }

  quizPlayQuestion(word, forms, region) {
    this.playWord(word, forms, region || 'us');
  }

  buildQuizOptions(word, direction) {
    const correctAnswer = direction === 'EN_RU' ? word.translation : this.getEnglishDisplay(word);
    const options = [correctAnswer];

    const allWords = [...this.learningWords];
    const shuffled = this.shuffle(allWords);

    for (let w of shuffled) {
      if (w.word !== word.word) {
        const wrongOption = direction === 'EN_RU' ? w.translation : this.getEnglishDisplay(w);
        if (!options.includes(wrongOption)) {
          options.push(wrongOption);
        }
      }
      if (options.length >= 4) break;
    }

    if (options.length < 4) {
      const allLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const allCats = ['IRREGULARS', 'PHRASAL_VERBS', 'IDIOMS'];
      for (let level of allLevels) {
        const levelWords = oxfordWordsDatabase[level] || [];
        const shuffledLevel = this.shuffle(levelWords);
        for (let w of shuffledLevel) {
          const wrongOption = direction === 'EN_RU' ? w.translation : (w.forms && w.forms.length ? w.forms.join(' → ') : w.word);
          if (!options.includes(wrongOption)) {
            options.push(wrongOption);
          }
          if (options.length >= 4) break;
        }
        if (options.length >= 4) break;
      }
      for (let cat of allCats) {
        if (options.length >= 4) break;
        const catWords = oxfordWordsDatabase[cat] || [];
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

      if (answer === selected) {
        opt.classList.add(isCorrect ? 'correct' : 'wrong');
      }
      if (answer === correct && !isCorrect) {
        opt.classList.add('correct');
      }
    });

    this.updateWordStats(wordToPlay, isCorrect);
    this.recordDailyProgress();

    const wordsToReview = this.getWordsToReview();
    const wordObj = wordsToReview.find(w => w.word === wordToPlay);

    await this.waitForCurrentAudioToFinish();

    // Post-answer autoplay only if not irregular
    if (direction === 'RU_EN' && this.currentSection === 'learning' && this.shouldAutoPronounce(wordObj)) {
      await this.delay(200);
      if (wordObj && wordObj.forms && wordObj.forms.length > 0) {
        await this.playFormsSequence(wordObj.forms, 'us');
      } else if (this.isMultiWord(wordToPlay)) {
        await this.playPhraseTTS(wordToPlay, 'us');
      } else {
        await this.playSingleWordMp3(wordToPlay, 'us');
      }
    } else {
      await this.delay(600);
    }

    this.currentReviewIndex++;
    if (this.currentReviewIndex >= wordsToReview.length && this.currentPractice === 'scheduled') {
      this.currentReviewIndex = 0;
      this.showNotification('Quiz завершен! Отличная работа!', 'success');
    }
    this.renderQuiz();
  }

  // =========
  // Words List
  // =========
  renderWordsList() {
    const container = document.getElementById('learningWordsList');
    if (!container) return;

    const wordsToShow = this.currentPractice === 'endless' ? this.learningWords.filter(w => !w.isLearned) : this.getWordsToReview();

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
      return `
        <div class="word-card ${word.isLearned ? 'learned' : ''}">
          <div class="word-header">
            <div class="word-text">${displayWord}</div>
            <div class="word-actions">
              <button class="action-btn play-btn" title="US" onclick="app.playWordFromList('${this.safeAttr(word.word)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'}, 'us')">
                <i class="fas fa-volume-up"></i>
              </button>
              <button class="action-btn play-btn" title="UK" onclick="app.playWordFromList('${this.safeAttr(word.word)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'}, 'uk')">
                <i class="fas fa-headphones"></i>
              </button>
              <button class="action-btn ${word.isLearned ? 'add-btn' : 'remove-btn'}" onclick="app.toggleWordLearned('${this.safeAttr(word.word)}')" title="${word.isLearned ? 'Вернуть в изучение' : 'Отметить выученным'}">
                <i class="fas fa-${word.isLearned ? 'undo' : 'check'}"></i>
              </button>
            </div>
          </div>
          <div class="word-translation">${word.translation}</div>
          <span class="word-level">${word.level}</span>
        </div>
      `;
    }).join('');
  }
  playWordFromList(word, forms, region) {
    this.playWord(word, forms, region || 'us');
  }
  toggleWordLearned(word) {
    this.stopCurrentAudio();
    const wordObj = this.learningWords.find(w => w.word === word);
    if (wordObj) {
      wordObj.isLearned = !wordObj.isLearned;
      this.saveData();
      this.showNotification(
        wordObj.isLearned ? 'Слово отмечено как выученное!' : 'Слово возвращено в изучение',
        'success'
      );
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
    if (this.currentPractice === 'endless') {
      return this.learningWords.filter(w => !w.isLearned);
    }
    const now = Date.now();
    return this.learningWords.filter(w => {
      if (w.isLearned) return false;
      const stats = this.wordStats[w.word];
      if (!stats) return true;
      return stats.nextReview <= now;
    });
  }
  updateWordStats(word, correct) {
    if (!this.wordStats[word]) this.initializeWordStats(word);

    const stats = this.wordStats[word];
    stats.lastReview = Date.now();

    if (correct) {
      stats.correct++;
      stats.difficulty = Math.max(0, stats.difficulty - 1);
      const intervals = [
        1000 * 60 * 60, // 1 hour
        1000 * 60 * 60 * 4,
        1000 * 60 * 60 * 24,
        1000 * 60 * 60 * 24 * 3,
        1000 * 60 * 60 * 24 * 7
      ];
      const reviewCount = stats.correct;
      const intervalIndex = Math.min(reviewCount - 1, intervals.length - 1);
      stats.nextReview = Date.now() + intervals[Math.max(0, intervalIndex)];
    } else {
      stats.incorrect++;
      stats.difficulty = Math.min(2, stats.difficulty + 1);
      stats.nextReview = Date.now() + (1000 * 60 * 10);
    }

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

  // =========
  // Progress
  // =========
  renderProgress() {
    const container = document.getElementById('progressContent');
    if (!container) return;

    const totalWords = this.learningWords.length;
    const learnedWords = this.learningWords.filter(w => w.isLearned).length;
    const inProgress = totalWords - learnedWords;

    const levelProgress = {};
    ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'IRREGULARS', 'PHRASAL_VERBS', 'IDIOMS', 'ADDED'].forEach(level => {
      const total = this.learningWords.filter(w => w.level === level).length;
      const learned = this.learningWords.filter(w => w.level === level && w.isLearned).length;
      levelProgress[level] = { total, learned };
    });

    container.innerHTML = `
      <div class="progress-card">
        <h3 style="margin-bottom:15px;">Общий прогресс</h3>
        <div class="progress-row"><span>Всего слов:</span><strong>${totalWords}</strong></div>
        <div class="progress-row"><span>Выучено:</span><strong style="color:var(--accent-color);">${learnedWords}</strong></div>
        <div class="progress-row"><span>В процессе:</span><strong style="color:var(--primary-color);">${inProgress}</strong></div>
        <div class="progress-bar-wrap" style="margin-top:10px;">
          <div class="progress-bar-fill" style="width:${totalWords > 0 ? (learnedWords / totalWords * 100) : 0}%"></div>
        </div>
      </div>

      <div class="progress-card">
        <h3 style="margin-bottom:15px;">Прогресс по категориям/уровням</h3>
        ${Object.entries(levelProgress).map(([level, data]) => {
          if (data.total === 0) return '';
          const percent = (data.learned / data.total * 100).toFixed(0);
          return `
            <div style="margin-bottom:12px;">
              <div class="progress-row"><span>${level}</span><span>${data.learned} / ${data.total}</span></div>
              <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${percent}%"></div></div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="progress-card">
        <h3 style="margin-bottom:15px;">Активность за неделю</h3>
        ${this.weeklyProgress.length > 0 ?
          this.weeklyProgress.map(day => `
            <div class="progress-row">
              <span>${new Date(day.date).toLocaleDateString('ru-RU', {weekday: 'short', month: 'short', day: 'numeric'})}</span>
              <strong>${day.count} повторений</strong>
            </div>
          `).join('') :
          '<p style="color:var(--text-secondary);text-align:center;">Нет данных об активности</p>'
        }
      </div>
    `;
  }

  // =========
  // Games (gate + overlays) with irregulars auto disabled
  // =========
  showQuizGateForGame(gameName, gameFile) {
    if (this.learningWords.filter(w => !w.isLearned).length < 3) {
      this.showNotification('Чтобы играть, добавьте минимум 3 слова в «Изучаю»', 'warning');
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'gameQuizOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;';

    const gameContainer = document.createElement('div');
    gameContainer.style.cssText = 'background:rgba(255,255,255,0.95);border-radius:16px;padding:20px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i> Закрыть';
    closeBtn.className = 'btn btn-secondary';
    closeBtn.style.marginBottom = '10px';
    closeBtn.onclick = () => overlay.remove();

    const gameTitle = document.createElement('h2');
    gameTitle.textContent = `${gameName} - Quiz`;
    gameTitle.style.cssText = 'text-align:center;margin-bottom:20px;color:#333;';

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
        quizContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#666;">Недостаточно слов</div>';
        return;
      }
      const direction = Math.random() < 0.5 ? 'EN_RU' : 'RU_EN';
      const questionText = direction === 'EN_RU' ? this.getEnglishDisplay(word) : word.translation;
      const correct = direction === 'EN_RU' ? word.translation : this.getEnglishDisplay(word);
      const options = this.buildQuizOptions(word, direction);
      const shuffled = this.shuffle(options);

      quizContainer.innerHTML = `
        <div style="margin-bottom:15px;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:#333;margin-bottom:12px;">
            ${questionText}
            <span class="sound-actions" style="margin-left:8px;">
              <button class="mini-btn" title="US" onclick="app.playWord('${this.safeAttr(word.word)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'}, 'us')"><i class="fas fa-volume-up"></i></button>
              <button class="mini-btn" title="UK" onclick="app.playWord('${this.safeAttr(word.word)}', ${word.forms ? JSON.stringify(word.forms).replace(/"/g, '&quot;') : 'null'}, 'uk')"><i class="fas fa-headphones"></i></button>
            </span>
          </div>
          <div style="font-size:14px;color:#666;margin-bottom:12px;">
            Выберите правильный вариант
          </div>
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
              return `<div class="quiz-option-gate" data-answer="${this.safeAttr(opt)}" style="padding:12px;border-radius:8px;border:2px solid #e0e0e0;background:#f9f9f9;cursor:pointer;text-align:center;font-weight:600;display:flex;align-items:center;justify-content:space-between;gap:8px;">
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

      quizContainer.querySelectorAll('.quiz-option-gate').forEach(opt => {
        opt.addEventListener('click', async () => {
          const chosen = opt.getAttribute('data-answer');
          const isCorrect = chosen === correct;

          opt.style.background = isCorrect ? '#d1fae5' : '#fee2e2';
          opt.style.borderColor = isCorrect ? '#10b981' : '#ef4444';

          if (!isCorrect) {
            quizContainer.querySelectorAll('.quiz-option-gate').forEach(o => {
              if (o.getAttribute('data-answer') === correct) {
                o.style.background = '#d1fae5';
                o.style.borderColor = '#10b981';
              }
            });
          }

          await this.waitForCurrentAudioToFinish();

          if (direction === 'RU_EN' && this.shouldAutoPronounce(word)) {
            await this.delay(200);
            if (word.forms && word.forms.length) await this.playFormsSequence(word.forms, 'us');
            else if (this.isMultiWord(word.word)) await this.playPhraseTTS(word.word, 'us');
            else await this.playSingleWordMp3(word.word, 'us');
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
            showNextQuestion();
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
    this.clearGameQuizCycle(containerId);
    const QUIZ_DELAY = 5 * 60 * 1000;
    const WARNING_DELAY = 15 * 1000;

    const schedule = () => {
      const warningTimeoutId = setTimeout(() => {
        this.showNotification('⚠️ Через 15 секунд появится quiz! Поставьте игру на паузу!', 'warning');
      }, QUIZ_DELAY - WARNING_DELAY);

      const quizTimeoutId = setTimeout(() => {
        this.showOverlayQuiz(containerId);
        schedule();
      }, QUIZ_DELAY);

      this.gameQuizIntervals[containerId] = { warningTimeoutId, quizTimeoutId };
    };

    schedule();
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

          opt.style.background = isCorrect ? '#d1fae5' : '#fee2e2';
          opt.style.borderColor = isCorrect ? '#10b981' : '#ef4444';

          if (!isCorrect) {
            quizContent.querySelectorAll('.quiz-option-gate').forEach(o => {
              if (o.getAttribute('data-answer') === correct) {
                o.style.background = '#d1fae5';
                o.style.borderColor = '#10b981';
              }
            });
          }

          await this.waitForCurrentAudioToFinish();

          if (direction === 'RU_EN' && this.shouldAutoPronounce(word)) {
            await this.delay(200);
            if (word.forms && word.forms.length) await this.playFormsSequence(word.forms, 'us');
            else if (this.isMultiWord(word.word)) await this.playPhraseTTS(word.word, 'us');
            else await this.playSingleWordMp3(word.word, 'us');
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
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position:fixed;top:80px;left:50%;transform:translateX(-50%);
      background:${type === 'success' ? 'var(--accent-color)' : type === 'warning' ? 'var(--warning-color)' : 'var(--primary-color)'};
      color:white;padding:12px 24px;border-radius:8px;
      box-shadow:var(--shadow-lg);z-index:10000;
      max-width:90%;text-align:center;font-weight:600;
      animation:slideDown 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideUp 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 2500);
  }
  getRandomLearningWord() {
    const availableWords = this.learningWords.filter(w => !w.isLearned);
    if (availableWords.length === 0) return null;
    return availableWords[Math.floor(Math.random() * availableWords.length)];
  }

  static injectStylesOnce() {
    if (document.getElementById('app-extra-styles')) return;
    const style = document.createElement('style');
    style.id = 'app-extra-styles';
    style.textContent = `
      @keyframes slideDown { from { transform: translate(-50%, -100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
      @keyframes slideUp { from { transform: translate(-50%, 0); opacity: 1; } to { transform: translate(-50%, -100%); opacity: 0; } }

      .sound-actions .mini-btn, .option-sound .mini-btn {
        border:none; background: var(--bg-tertiary, #f0f2f5); padding:4px 6px; border-radius:6px; cursor:pointer; color:#333;
      }
      .quiz-option .quiz-option-inner { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    `;
    document.head.appendChild(style);
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const icon = document.querySelector('#themeToggle i');
  if (icon) {
    icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }

  EnglishWordsApp.injectStylesOnce();
  window.app = new EnglishWordsApp();
});


