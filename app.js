class EnglishWordsApp {
  constructor() {
  this.isAndroid = /android/i.test((navigator.userAgent || '').toLowerCase());
  this.grammarManager = new GrammarManager(this);
  window.grammar = this.grammarManager;
  this.loaderEl = null;
  this.loaderStart = 0;
  this.loaderMinMs = 0;
  this.loaderTimer = null;

  // Предварительная подгрузка Кота Боба для ВСЕХ устройств
  const bobImg = new Image();
  bobImg.src = '/loading.gif';
  
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
    
    this.globalPlayer = new Audio();
    this.globalPlayer.preload = 'auto'; 
    
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
    
        // "Воскрешение" звука при возврате в приложение на iOS
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('App became visible - trying to wake up audio');
            
            // 1. Будим AudioContext, если он уснул
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().catch(e => console.log('Ctx resume fail', e));
            }

            // 2. Сбрасываем наш глобальный плеер, чтобы система поняла, что мы снова активны
            // Не меняем src, просто убеждаемся, что он не в "подвешенном" состоянии
            if (this.globalPlayer) {
                // Если он проигрывал что-то и завис — пауза поможет сбросить состояние
                try {
                    // Не вызываем play(), иначе может заиграть старый звук.
                    // Просто даем системе понять, что объект жив.
                    this.globalPlayer.pause(); 
                } catch(e) {}
            }
        }
    });
    
    // Запуск проверки после инициализации
    setTimeout(() => {
        this.checkAndShowFirstRunOrMotivation();
    }, 1000);
    
    // PWA Audio Warmup (Разблокировка звука при первом клике)
    window.addEventListener('click', () => {
        // 1. Будим AudioContext
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(e => console.log(e));
        }
        // 2. Будим HTML5 Audio (тишиной)
        if (this.globalPlayer) {
            // Короткий пустой звук (WAV)
            const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
            // Если плеер пустой, загружаем тишину и играем
            if (!this.globalPlayer.src || this.globalPlayer.src === window.location.href) {
                this.globalPlayer.src = silentWav;
            }
            this.globalPlayer.play().then(() => {
                // Сразу ставим на паузу, чтобы не занимать канал
                this.globalPlayer.pause(); 
            }).catch(() => {});
        }
    }, { once: true });
    
  }

// ==========================================
// ONBOARDING WIZARD
// ==========================================

checkAndShowFirstRunOrMotivation() {
    try {
        // Проверяем, прошел ли пользователь Туториал (презентацию интерфейса)
        const tutorialDone = localStorage.getItem('tutorial_complete_forever') === '1';
        
        if (!tutorialDone) {
            // Сценарий 1: Новый пользователь -> Сначала показываем интерфейс
            // Скрываем все секции, чтобы было чисто
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            // Переходим на главную (Learning), чтобы было что показывать
            this.switchSection('learning');
            
            setTimeout(() => {
                this.startAppTutorial();
                // После завершения туториала мы предложим Визард (см. метод showTutorialFinish)
            }, 500);
        } 
        else {
            // Сценарий 2: Старичок -> Показываем мотивацию (если надо)
            this.maybeShowDailyMotivation(() => {
                // Если мотивация закрыта (или не показана), проверяем, не нужно ли запустить Визард
                // Это на случай, если он пропустил его в первый раз, но флага еще нет
                const wizardDone = localStorage.getItem('wizard_v2_completed') === '1';
                if (!wizardDone) {
                    // Можно предложить ненавязчиво, но пока оставим только кнопку в настройках,
                    // чтобы не бесить пользователей
                }
            });
        }
    } catch (e) {
        console.error(e);
    }
}



showOnboardingWizard() {
    // Начальное состояние визарда
    this.wizardState = {
        step: 1,
        totalSteps: 4,
        data: {
            experience: null, // 1-5
            goal: null,       // 'travel', 'career', 'exam', 'fun'
            subGoal: null,    // 'medical', 'it', etc.
            pace: 15,         // words per day
            focus: null       // 'basic', 'grammar', 'speaking', 'prof'
        }
    };

    // Создаем DOM элементы
    const overlay = document.createElement('div');
    overlay.className = 'wizard-overlay';
    overlay.id = 'onboardingWizard';
    
    overlay.innerHTML = `
        <div class="wizard-header" style="display:flex; align-items:center; gap:10px; padding:15px;">
            <!-- Кнопка НАЗАД -->
            <button class="btn btn-secondary" onclick="document.getElementById('onboardingWizard').remove()" style="padding:8px 12px; border-radius:12px;">
                <i class="fas fa-times"></i>
            </button>
            
            <!-- Полоска прогресса -->
            <div class="wizard-progress-track" style="flex:1;">
                <div class="wizard-progress-fill" id="wizardProgress" style="width: 25%"></div>
            </div>
        </div>
        
        <div class="wizard-content" id="wizardContent">
            <!-- Контент шага рендерится тут -->
        </div>
        
        <div class="wizard-footer">
            <button class="wizard-btn" id="wizardNextBtn" disabled>ПРОДОЛЖИТЬ</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Биндим кнопку
    document.getElementById('wizardNextBtn').addEventListener('click', () => this.nextWizardStep());
    
    // Рендерим первый шаг
    this.renderWizardStep();
}

renderWizardStep() {
    const content = document.getElementById('wizardContent');
    const progress = document.getElementById('wizardProgress');
    const nextBtn = document.getElementById('wizardNextBtn');
    const step = this.wizardState.step;
    
    // Обновляем прогресс
    progress.style.width = `${(step / this.wizardState.totalSteps) * 100}%`;
    
    // Для шага 4 (Мультивыбор) кнопка активна, если уже что-то выбрано
    if (step === 4 && Array.isArray(this.wizardState.data.focus) && this.wizardState.data.focus.length > 0) {
        nextBtn.disabled = false;
    } else {
        nextBtn.disabled = true;
    }

    let html = '';
    let mascotText = '';

    // --- ШАГ 1: ОПЫТ ---
    if (step === 1) {
        mascotText = "Привет! Я Кот Боб. Давай подберем идеальную программу. Какой у тебя опыт?";
        html = `
            <div class="wizard-options">
                ${this._renderWizardCard(1, 'step1', 'Новичок (A1)', 'Знаю hello, cat. Сложные фразы — тёмный лес.')}
                ${this._renderWizardCard(2, 'step1', 'Элементарный (A2)', 'Могу рассказать о себе простыми фразами.')}
                ${this._renderWizardCard(3, 'step1', 'Средний (B1)', 'Понимаю смысл, но говорю с ошибками.')}
                ${this._renderWizardCard(4, 'step1', 'Выше среднего (B2)', 'Смотрю сериалы, но хочу звучать как носитель.')}
                ${this._renderWizardCard(5, 'step1', 'Продвинутый (C1-C2)', 'Для профи, спец. термины и сложные идиомы.')}
            </div>
        `;
    }
    
    // --- ШАГ 2: ЦЕЛЬ ---
    else if (step === 2) {
        mascotText = "Для чего тебе английский прямо сейчас?";
        html = `
            <div class="wizard-options">
                ${this._renderWizardCard('travel', 'step2', 'Путешествия и общение', '✈️ Разговорный язык')}
                ${this._renderWizardCard('career', 'step2', 'Карьера и работа', '💼 IT, Медицина, Бизнес')}
                ${this._renderWizardCard('exam', 'step2', 'Сдача экзамена', '🎓 ОГЭ, ЕГЭ, IELTS')}
                ${this._renderWizardCard('fun', 'step2', 'Для себя', '🎬 Фильмы, тренировка памяти')}
            </div>
            <div id="subGoalContainer" style="margin-top:15px; display:none; border-top:2px solid var(--border-color); padding-top:15px;">
                <div class="wizard-title" style="font-size:1.1rem; margin-bottom:10px;">Уточните направление:</div>
                <div class="wizard-options sub-options">
                     <!-- Рендерится динамически -->
                </div>
            </div>
        `;
    }

    // --- ШАГ 3: ТЕМП ---
    else if (step === 3) {
        mascotText = "Сколько новых слов в день ты готов учить?";
        html = `
            <div class="wizard-options">
                ${this._renderWizardCard(5, 'step3', 'Лайт (5 слов)', 'Для очень занятых')}
                ${this._renderWizardCard(15, 'step3', 'Норма (15 слов)', 'Золотая середина')}
                ${this._renderWizardCard(25, 'step3', 'Хардкор (25 слов)', 'Быстрый результат')}
            </div>
        `;
    }

    // --- ШАГ 4: ФОКУС (МУЛЬТИ-ВЫБОР) ---
    else if (step === 4) {
        const exp = this.wizardState.data.experience;
        mascotText = "На чем сделаем упор? (Можно выбрать несколько)";
        
        const blockSpeaking = exp < 2; // Нельзя идиомы, если совсем новичок
        const blockProf = exp < 3;     // Нельзя профи, если ниже среднего

        html = `
            <div class="wizard-options">
                ${this._renderWizardCard('basic', 'step4', 'Базовый словарь', 'Самые важные слова для выживания')}
                ${this._renderWizardCard('grammar', 'step4', 'Грамматика', 'Неправильные глаголы, Предлоги, Союзы')}
                ${this._renderWizardCard('speaking', 'step4', 'Разговорная речь', 'Фразовые глаголы, Идиомы', blockSpeaking, 'Нужна база A2')}
                ${this._renderWizardCard('prof', 'step4', 'Сложная лексика', 'Пословицы, редкие слова', blockProf, 'Нужна база B1')}
            </div>
            <div style="text-align:center; margin-top:10px; font-size:0.8rem; color:var(--text-secondary);">
               Выберите один или несколько пунктов
            </div>
        `;
    }

    // Вставка в DOM
    content.innerHTML = `
        <div class="wizard-mascot-area">
            <img src="/loading.gif" class="wizard-mascot-img" alt="Bob">
            <div class="wizard-bubble">${mascotText}</div>
        </div>
        <div class="wizard-title">${this._getStepTitle(step)}</div>
        ${html}
    `;

    // Если на 4 шаге уже были выбраны опции (при возврате назад), подсветим их
    if (step === 4 && Array.isArray(this.wizardState.data.focus)) {
        this.wizardState.data.focus.forEach(val => {
            const card = content.querySelector(`[data-value="${val}"]`);
            if(card) {
                card.classList.add('active');
                card.querySelector('i').className = 'fas fa-check-square'; // Квадратик для мультивыбора
            }
        });
    }

    this._attachWizardCardHandlers();
}

_renderWizardCard(value, group, title, desc, disabled = false, tooltip = '') {
    const disabledAttr = disabled ? 'disabled' : '';
    const tooltipHtml = disabled ? `<div class="wizard-tooltip">${tooltip}</div>` : '';
    return `
        <div class="wizard-card ${disabledAttr ? 'disabled' : ''}" data-group="${group}" data-value="${value}">
            ${tooltipHtml}
            <div class="wizard-card-text">
                <div class="wizard-card-title">${title}</div>
                <div class="wizard-card-desc">${desc}</div>
            </div>
            <div class="wizard-card-icon">
                <i class="far fa-circle"></i> 
            </div>
        </div>
    `;
}

_getStepTitle(step) {
    if (step === 1) return 'Уровень владения';
    if (step === 2) return 'Ваша цель';
    if (step === 3) return 'Дневная цель';
    if (step === 4) return 'Фокус обучения';
    return '';
}

_attachWizardCardHandlers() {
    const cards = document.querySelectorAll('.wizard-card:not(.disabled)');
    cards.forEach(card => {
        // Удаляем старые слушатели, чтобы не дублировать (клон ноды - хак)
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        
        newCard.addEventListener('click', (e) => {
            const group = newCard.dataset.group;
            const val = newCard.dataset.value;

            // --- ЛОГИКА ДЛЯ ШАГА 4 (МУЛЬТИ-ВЫБОР) ---
            if (this.wizardState.step === 4) {
                // Инициализируем массив, если нет
                if (!Array.isArray(this.wizardState.data.focus)) {
                    this.wizardState.data.focus = [];
                }

                if (newCard.classList.contains('active')) {
                    // Если уже активна - убираем
                    newCard.classList.remove('active');
                    newCard.querySelector('i').className = 'far fa-square'; // Пустой квадрат
                    this.wizardState.data.focus = this.wizardState.data.focus.filter(i => i !== val);
                } else {
                    // Если не активна - добавляем
                    newCard.classList.add('active');
                    newCard.querySelector('i').className = 'fas fa-check-square'; // Галочка в квадрате
                    this.wizardState.data.focus.push(val);
                }

                // Кнопка "Далее" активна, если выбран хотя бы 1 пункт
                document.getElementById('wizardNextBtn').disabled = (this.wizardState.data.focus.length === 0);
                return;
            }

            // --- ЛОГИКА ДЛЯ ОСТАЛЬНЫХ ШАГОВ (ОДИНОЧНЫЙ ВЫБОР) ---
            
            // Сброс активных в этой группе
            if (group === 'step2_sub') {
                 document.querySelectorAll(`[data-group="step2_sub"]`).forEach(c => {
                    c.classList.remove('active');
                    c.querySelector('i').className = 'far fa-circle';
                });
                this.wizardState.data.subGoal = val;
            } else {
                document.querySelectorAll(`[data-group="${group}"]`).forEach(c => {
                    c.classList.remove('active');
                    c.querySelector('i').className = 'far fa-circle';
                });
            }

            // Активация текущей
            newCard.classList.add('active');
            newCard.querySelector('i').className = 'fas fa-check-circle';
            
            // Сохранение данных
            if (this.wizardState.step === 1) this.wizardState.data.experience = parseInt(val);
            if (this.wizardState.step === 2) {
                if (group === 'step2') {
                    this.wizardState.data.goal = val;
                    // Если выбрали Карьеру или Экзамен - показываем подменю
                    if (val === 'career' || val === 'exam') {
                        this._handleStep2SubOptions(val);
                    } else {
                        // Иначе скрываем подменю
                        document.getElementById('subGoalContainer').style.display = 'none';
                        this.wizardState.data.subGoal = null;
                        document.getElementById('wizardNextBtn').disabled = false;
                    }
                }
            }
            if (this.wizardState.step === 3) this.wizardState.data.pace = parseInt(val);

            // Разблокировка кнопки (кроме случая когда открылось подменю)
            if (group !== 'step2' || (val !== 'career' && val !== 'exam')) {
                document.getElementById('wizardNextBtn').disabled = false;
            }
        });
    });
}

_handleStep2SubOptions(mainGoal) {
    const container = document.getElementById('subGoalContainer');
    const subOptions = container.querySelector('.sub-options');
    
    let html = '';
    
    if (mainGoal === 'career') {
        html += this._renderWizardCard('MEDICAL', 'step2_sub', 'Медицина', 'Anatomy, Healthcare');
        html += this._renderWizardCard('IT', 'step2_sub', 'IT и Технологии', 'Coding, Hardware, Internet');
        html += this._renderWizardCard('BUSINESS', 'step2_sub', 'Бизнес', 'Finance, Management, Marketing');
        html += this._renderWizardCard('LEGAL', 'step2_sub', 'Юриспруденция', 'Law, Court, Crime');
    } else if (mainGoal === 'exam') {
        html += this._renderWizardCard('OGE', 'step2_sub', 'ОГЭ (9 класс)', 'Уровень A2-B1');
        html += this._renderWizardCard('EGE', 'step2_sub', 'ЕГЭ (11 класс)', 'Уровень B1-B2');
        html += this._renderWizardCard('IELTS', 'step2_sub', 'IELTS / TOEFL', 'Academic English');
    }

    if (html) {
        subOptions.innerHTML = html;
        container.style.display = 'block';
        this.wizardState.data.subGoal = null; 
        document.getElementById('wizardNextBtn').disabled = true; // Ждем выбора
        
        // Прокрутим вниз к опциям
        setTimeout(() => {
             container.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        
        this._attachWizardCardHandlers();
    } else {
        container.style.display = 'none';
        this.wizardState.data.subGoal = null;
        document.getElementById('wizardNextBtn').disabled = false;
    }
}

nextWizardStep() {
    if (this.wizardState.step < this.wizardState.totalSteps) {
        this.wizardState.step++;
        this.renderWizardStep();
    } else {
        this.finishWizard();
    }
}

async finishWizard() {
    const overlay = document.getElementById('onboardingWizard');
    const data = this.wizardState.data;
    
    // 1. Формируем конфиг пользователя
    const userConfig = {
        experience: data.experience,
        goal: data.goal,
        subGoal: data.subGoal,
        dailyLimit: data.pace,
        focus: data.focus,
        setupDate: new Date().toDateString(),
        newWordsAddedToday: 0,
        lastNewWordsDate: null,
        pendingSpecialWords: [] 
    };
    
    localStorage.setItem('userConfig', JSON.stringify(userConfig));
    localStorage.setItem('first_run_completed', '1');

    // 2. Показываем лоадер (Кот Боб)
    if (overlay) {
        overlay.innerHTML = `
            <div style="text-align:center; padding:40px; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;">
                <img src="/loading.gif" style="width:120px; margin-bottom:20px;">
                <h2 style="margin-bottom:10px; font-weight:900;">Настраиваю программу...</h2>
                <p style="color:var(--text-secondary)">Кот Боб подбирает слова под ваш уровень.</p>
            </div>
        `;
    }

    await this.delay(1500); // Пауза для эффекта
    
    // 3. Генерируем слова
    this.generateInitialVocabulary(data, userConfig);
    this.saveData();
    
    // 4. Удаляем Визард (Опросник)
    if (overlay) overlay.remove();
    localStorage.setItem('wizard_v2_completed', '1');
    
    // 5. Запускаем интерфейс приложения
    this.initializeUI(); 
    this.renderProgress();
    this.syncModePracticeToggles();
    
    this.showNotification(`План готов! Ваша цель: ${data.pace} новых слов в день.`, 'success');
    
    // 6. Останавливаем лишние звуки
    this.stopCurrentAudio();
    this.suppressAutoSpeakOnce = true;

    // 7. Переходим на экран обучения
    this.switchSection('learning');
    this.renderLearningSection();
    
    // === ГЛАВНОЕ ИЗМЕНЕНИЕ ===
    // Запускаем инструкцию (Туториал) через полсекунды
    setTimeout(() => {
        this.startAppTutorial();
        
        // СТАВИМ "ВЕЧНЫЙ" ФЛАГ
        // Это значит: "Пользователь прошел обучение, больше не показывать".
        localStorage.setItem('tutorial_complete_forever', '1');
        
    }, 500);
    // ==========================
}

// --- ГЛАВНЫЙ АЛГОРИТМ ПОДБОРА (Logic Engine) ---
generateInitialVocabulary(data, config) {
    const exp = data.experience;
    const focusArray = Array.isArray(data.focus) ? data.focus : [data.focus]; // Работаем как с массивом
    const wordsToAdd = [];
    const pendingWords = [];

    const add = (sourceLevel) => {
        const db = oxfordWordsDatabase[sourceLevel] || [];
        db.forEach(w => {
            wordsToAdd.push({ ...w, level: sourceLevel, forms: w.forms || null });
        });
    };
    
    const addPending = (sourceLevel) => {
        const db = oxfordWordsDatabase[sourceLevel] || [];
        db.forEach(w => {
            pendingWords.push({ ...w, level: sourceLevel });
        });
    };

    // === 1. БАЗА ПО ОПЫТУ ===
    if (exp === 1) add('A1'); 
    else if (exp === 2) { add('A2'); add('B1'); }
    else if (exp === 3) { add('B1'); add('B2'); }
    else if (exp === 4) { add('B2'); add('C1'); }
    else if (exp === 5) { add('C1'); add('C2'); }

    // === 2. ЭКЗАМЕНЫ (УМНАЯ ЛОГИКА) ===
    if (data.subGoal) {
        const goal = data.subGoal;
        
        if (goal === 'OGE') {
            // ОГЭ - это уровень A2-B1. Если человек новичок, даем A1+A2.
            if (exp <= 2) { add('A1'); add('A2'); } 
            else { add('A2'); add('B1'); }
            this.showNotification('Добавлен словарный минимум для ОГЭ (A2-B1)', 'success');
        }
        else if (goal === 'EGE') {
            // ЕГЭ - это B1-B2.
            if (exp <= 2) { add('A2'); add('B1'); } // Подтягиваем базу
            else { add('B1'); add('B2'); }
            this.showNotification('Добавлен словарный минимум для ЕГЭ (B1-B2)', 'success');
        }
        else if (goal === 'IELTS' || goal === 'TOEFL') {
            add('B2');
            add('C1');
            add('IELTS'); // Если есть такая категория в базе
        }
        else {
            // Профессии (IT, MED, etc)
            if (exp <= 2) {
                addPending(goal);
                this.showNotification(`Слова для ${goal} добавлены в очередь (нужна база)`, 'info');
            } else {
                add(goal);
            }
        }
    }

    // === 3. ФОКУС (МУЛЬТИ-ВЫБОР) ===
    if (focusArray.includes('basic')) {
        // Если выбрали "Базу", убедимся, что A1/A2 добавлены
        if (exp > 2) { add('A1'); add('A2'); } 
    }
    if (focusArray.includes('grammar')) {
        add('PREPOSITIONS');
        add('IRREGULARS'); // Неправильные глаголы
    }
    if (focusArray.includes('speaking')) {
        add('PHRASAL_VERBS');
        add('IDIOMS');
    }
    if (focusArray.includes('prof')) {
        add('PROVERBS');
        if (exp >= 3) add('C1');
    }

    // Сохраняем очередь
    config.pendingSpecialWords = pendingWords;
    localStorage.setItem('userConfig', JSON.stringify(config));

    // Фильтрация дублей и сохранение
    let count = 0;
    const uniqueSet = new Set();
    
    wordsToAdd.forEach(w => {
        // Ключ уникальности: слово + уровень
        const key = `${w.word}_${w.level}`;
        
        // Проверяем, нет ли уже такого слова в текущем списке обучения
        const alreadyInLearning = this.learningWords.some(lw => lw.word === w.word && lw.level === w.level);
        
        if (!uniqueSet.has(key) && !alreadyInLearning) {
            uniqueSet.add(key);
            this.learningWords.push({
                word: w.word,
                translation: w.translation,
                level: w.level,
                forms: w.forms || null,
                isLearned: false,
                addedAt: Date.now()
            });
            this.initializeWordStats(w.word);
            count++;
        }
    });
    
    console.log(`Wizard added ${count} unique words.`);
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
  // NEW AUDIO LOGIC: PREPOSITIONS, IDIOMS, PHRASAL , PROVERBS
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
  
    // --- 4. ПОСЛОВИЦЫ (Proverbs) ---
  buildProverbFileName(phrase) {
    if (!phrase) return '';
    return String(phrase)
      .toLowerCase()
      .replace(/[^a-z\s]/g, '') // Убираем запятые, точки, апострофы
      .trim()
      .replace(/\s+/g, '_');    // Пробелы меняем на нижнее подчеркивание
  }

  // URL: bewords.ru/au/proverbs/us/no_pain_no_gain.mp3
  buildProverbAudioUrl(fileName) {
    // Всегда берем папку 'us', независимо от нажатой кнопки
    return `https://bewords.ru/au/proverbs/us/${fileName}.mp3`;
  }

  async playProverbAudio(phrase) {
    const file = this.buildProverbFileName(phrase);
    if (!file) return false;
    
    const url = this.buildProverbAudioUrl(file);
    
    try {
      await this.playMp3Url(url);
      return true;
    } catch (e) {
      // TTS ОТКЛЮЧЕН: если файла нет — тишина
      console.log('Proverb audio missing:', url);
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
    
    // D. ПОСЛОВИЦЫ
    if (level === 'PROVERBS') {
      // Игнорируем regionPref, внутри метода всегда стоит 'us'
      await this.playProverbAudio(word);
      return;
    }

    // E. СТАНДАРТНАЯ ЛОГИКА (Для A1-C2 и остальных)
    
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
    // 1. Останавливаем HTML5 Audio (Глобальный плеер)
    if (this.globalPlayer) {
        this.globalPlayer.pause();
        this.globalPlayer.currentTime = 0;
        // ВАЖНО: Сбрасываем источник, чтобы плеер "забыл" последнее слово
        this.globalPlayer.removeAttribute('src'); 
        this.globalPlayer.load(); // Принудительная перезагрузка пустого состояния
    }

    // 2. Останавливаем TTS (синтез речи)
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    // 3. Сбрасываем текущий промис и флаги
    this.currentAudioPromise = null;
}

playCorrectSound() {
    if (this.muted) return;
    
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = this.audioCtx || new AudioContext();
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // 'sine' = Чистый, мягкий звук (как колокольчик или электронный "пилим")
        osc.type = 'sine'; 
        
        // Частота: C6 (Высокая До) - классический звук успеха
        osc.frequency.setValueAtTime(1046.50, now); 
        
        // Громкость: Резкий удар и плавное затухание (эффект колокола)
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.02); // Быстрая атака
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5); // Длинный хвост

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
        
    } catch (e) {
        // error
    }
}

  // MP3 play that resolves when playback finishes (no overlap)
playMp3Url(url) {
    if (this.muted) return Promise.resolve(false);
    
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(()=>{});
    }

    const p = new Promise((resolve, reject) => {
        try {
            // Используем глобальный плеер вместо new Audio()
            const audio = this.globalPlayer;

            // Сбрасываем предыдущее воспроизведение
            audio.pause();
            
            // Важный хак для iOS: очистка src и принудительный load() сбрасывают буфер
            // Но иногда вызов load() на пустом src вызывает ошибку, поэтому делаем аккуратно:
            // audio.src = ''; 
            // audio.load(); 

            let endedOrFailed = false;

            // Очистка слушателей от предыдущего запуска
            audio.onended = null;
            audio.onerror = null;
            audio.oncanplaythrough = null;
            audio.onloadeddata = null;

            const cleanup = () => {
                if (endedOrFailed) return;
                endedOrFailed = true;
                // Мы не удаляем слушатели здесь жестко, так как объект переиспользуется, 
                // они перезапишутся при следующем вызове, но флаг endedOrFailed защитит промис.
            };

            // Навешиваем новые обработчики
            audio.onended = () => {
                cleanup();
                resolve(true);
            };

            audio.onerror = (e) => {
                cleanup();
                // На iOS часто бывает ошибка AbortError при быстром переключении, это не страшно
                console.warn('Audio playback error or aborted', e);
                reject(new Error('Audio error'));
            };
            
            // Обработчик готовности
            audio.oncanplaythrough = async () => {
               // Пытаемся воспроизвести
               try {
                   await audio.play();
               } catch (err) {
                   // Если ошибка NotAllowedError (нет жеста), реджектим
                   cleanup();
                   reject(err);
               }
            };

            // Устанавливаем новый URL
            audio.src = url;
            
            // Явный load() помогает iOS понять, что это новый ресурс
            audio.load();

            // Таймаут на случай зависания сети
            setTimeout(() => {
                if (!endedOrFailed && !audio.paused && audio.duration > 0 && !audio.ended) {
                    // Если все еще играет - ок
                } else if (!endedOrFailed && audio.paused) {
                    // Если завис в паузе
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
    
    // ИЗМЕНЕНИЕ: Строго следуем региону, без авто-переключения
    // Если нажали US — пробуем только US.
    const tryRegions = [regionPreferred]; 

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
      this.showLevelWords(level);    // ← ВАЖНО: вызываем переход
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
    
    // Сохраняем текущий режим
    this.currentMode = mode;
    localStorage.setItem('currentMode', this.currentMode);
    
    // == ВАЖНО: Не сбрасываем currentReviewIndex, чтобы остаться на том же слове ==
    // Но удаляем lastFlashcardFrontWasRussian, чтобы сбросить состояние карточки
    this.lastFlashcardFrontWasRussian = false; 

    // Обновляем UI кнопок
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    // Логика переключателя "Scheduled/Endless" (оставляем как было)
    const practiceToggle = document.querySelector('.practice-toggle');
    if (practiceToggle) {
      if (mode === 'trainer') {
        practiceToggle.style.display = 'none';
      } else {
        practiceToggle.style.display = 'flex';
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
    if (surfBtn) surfBtn.addEventListener('click', () => this.showQuizGateForGame('Subway surfers', 'subway.html'));
    
    const doodleBtn = document.getElementById('doodleStartBtn');
    if (doodleBtn) doodleBtn.addEventListener('click', () => this.showQuizGateForGame('Flying Bob', 'doodle-jump.html'));
    
    const game2048Btn = document.getElementById('game2048StartBtn');
    if (game2048Btn) game2048Btn.addEventListener('click', () => this.showQuizGateForGame('2048', '2048.html'));
    
    const rocketBtn = document.getElementById('rocketStartBtn');
    if (rocketBtn) rocketBtn.addEventListener('click', () => this.showQuizGateForGame('Bubble shoot', 'rocket-soccer.html'));
    
    const ninjaBtn = document.getElementById('ninjaStartBtn');
    if (ninjaBtn) ninjaBtn.addEventListener('click', () => this.showQuizGateForGame('ninja', 'ninja.html'));
    
    const catalogBtn = document.getElementById('catalogStartBtn');
    if (catalogBtn) catalogBtn.addEventListener('click', () => this.showQuizGateForGame('Geometry Dash', 'dash.html'));
    
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
    window.onAddToStudy = (payload) => this.handleTranslatorAdd(payload);
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
    const unlock = async () => {
        // 1. Разблокировка Web Audio API
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            try {
                await this.audioCtx.resume();
                console.log('AudioContext resumed via touch');
            } catch (e) {
                console.warn('AudioContext resume failed', e);
            }
        } else if (!this.audioCtx) {
             // Если контекста нет, создаем его
             const AC = window.AudioContext || window.webkitAudioContext;
             if (AC) this.audioCtx = new AC();
        }

        // 2. Разблокировка HTML5 Audio (для длинных mp3)
        if (this.globalPlayer) {
            // Проигрываем микро-тишину, чтобы iOS "разрешил" этому тегу играть звуки
            if (!this.globalPlayer.src || this.globalPlayer.src === window.location.href) {
                 this.globalPlayer.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
            }
            try {
                await this.globalPlayer.play();
                this.globalPlayer.pause();
                // Не сбрасываем currentTime в 0, просто пауза
            } catch(e) {}
        }
        
        // Не удаляем слушатель сразу! На iOS иногда нужно несколько тапов.
        // Удалим только если точно уверены, что все работает, или оставим "пассивным".
        // Но для чистоты, удалим после успешного resume
        if (this.audioCtx && this.audioCtx.state === 'running') {
            ['touchstart', 'touchend', 'click'].forEach(evt => 
                document.removeEventListener(evt, unlock, true)
            );
        }
    };
    
    // Вешаем на все виды взаимодействий
    ['touchstart', 'touchend', 'click', 'keydown'].forEach(evt => 
        document.addEventListener(evt, unlock, true)
    );
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
  // Support (New Beautiful Popup)
  // =========
  showSupportModal() {
    const overlay = document.createElement('div');
    overlay.className = 'donate-modal-overlay';
    
    const percent = 45; 
    
    overlay.innerHTML = `
      <div class="donate-popup-card">
        <button class="donate-close-absolute" id="closeDonateBtn">
            <i class="fas fa-times"></i>
        </button>
        
        <div class="donate-heart-icon">❤️</div>
        
        <h2 class="donate-title">Внесите свой вклад в <span>Bewords</span></h2>
        
        <p class="donate-desc">
            Я разрабатываю это приложение в одиночку. 
            Здесь нет рекламы и платных подписок. 
            Ваш донат помогает оплачивать серверы и работу над новыми функциями.
        </p>
        
        <div class="donate-goal-box">
            <div class="donate-goal-header">
                <span>Цель: Оплата серверов</span>
                <span>${percent}%</span>
            </div>
            <div class="donate-track">
                <div class="donate-fill" style="width: 0%"></div>
            </div>
            <div style="font-size: 11px; color: #aaa; margin-top: 8px; font-weight:600;">
               Осталось немного, чтобы закрыть расходы на этот месяц! 🔥
            </div>
        </div>
        
        <a href="https://pay.cloudtips.ru/p/8f56d7d3" target="_blank" class="donate-main-btn">
            <i class="fas fa-heart"></i> Поддержать автора
        </a>
        
        <div class="donate-secure">
            <i class="fas fa-lock"></i> Безопасная оплата через CloudTips (Тинькофф)
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Анимация появления (Fade In + Scale Up)
    requestAnimationFrame(() => {
        overlay.classList.add('visible');
    });

    // Анимация прогресс-бара (через 200мс после открытия)
    setTimeout(() => {
        const fill = overlay.querySelector('.donate-fill');
        if (fill) fill.style.width = `${percent}%`;
    }, 200);

    // Логика закрытия
    const close = () => {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 300); // Ждем окончания анимации CSS
    };

    overlay.querySelector('#closeDonateBtn').addEventListener('click', close);
    
    // Закрытие по клику на фон (вне карточки)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
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
        <button class="btn btn-primary" onclick="window.open('about.html', '_blank')" style="width:100%;margin-bottom:10px;">
          <i class="fas fa-info-circle"></i> О приложении
        </button> 
        <button class="btn btn-primary settings-theme-btn" data-testid="settings-theme" style="width:100%;margin-bottom:10px;">
          <i class="fas fa-adjust"></i> Переключить тему
        </button> 
        <button class="btn btn-primary settings-audio-btn" data-testid="settings-audio" style="width:100%;margin-bottom:10px;">
          <i class="fas fa-volume-up"></i> Настройки аудио
        </button>
        <button class="btn btn-primary" onclick="window.open('app.html', '_blank')" style="width:100%;margin-bottom:10px;">
          <i class="fas fa-download"></i> Установка приложения
        </button>
        <button class="btn btn-primary" onclick="app.startAppTutorial()" style="width:100%; margin-bottom:10px;">
   <i class="fas fa-question-circle"></i> Инструкция
</button>
        <button class="btn btn-success" onclick="app.showOnboardingWizard(); document.querySelector('.settings-modal').remove();" style="width:100%; margin-bottom:10px;">
           <i class="fas fa-magic"></i> Подобрать программу
        </button>
        <button class="btn btn-primary" id="notifyToggleBtn" style="width:100%; margin-bottom:10px;">
           <i class="fas fa-bell"></i> Управление уведомлениями
        </button>
      </div>
      <div id="settingsInnerPage" style="display:none;"></div>
      <div id="installGuide" style="display:none;"></div>
    </div>
  `; 
  
  document.body.appendChild(modal);
  
 // Логика кнопки уведомлений
  // Внутри showSettingsModal (app.js)

  // Логика кнопки уведомлений (СУПЕР-ВЕРСИЯ)
  const notifyBtn = modal.querySelector('#notifyToggleBtn');
  if (notifyBtn) {
      
      // Функция обновления вида кнопки
      const updateBtnState = () => {
          const perm = Notification.permission;
          const appDisabled = localStorage.getItem('notifications_disabled') === 'true';

          if (perm === 'granted') {
              // Разрешено браузером
              if (appDisabled) {
                  // Но выключено в приложении
                  notifyBtn.innerHTML = '<i class="fas fa-bell"></i> Включить уведомления';
                  notifyBtn.className = 'btn btn-primary';
              } else {
                  // Все работает
                  notifyBtn.innerHTML = '<i class="fas fa-check"></i> Уведомления активны';
                  notifyBtn.className = 'btn btn-success';
              }
          } else if (perm === 'denied') {
              // Заблокировано
              notifyBtn.innerHTML = '<i class="fas fa-ban"></i> Доступ запрещен (Нажми)';
              notifyBtn.className = 'btn btn-danger';
          } else {
              // Default (еще не спрашивали)
              notifyBtn.innerHTML = '<i class="fas fa-bell"></i> Разрешить уведомления';
              notifyBtn.className = 'btn btn-primary';
          }
      };

      // Инициализация кнопки
      updateBtnState();

      // Обработчик клика
      notifyBtn.onclick = () => {
          const perm = Notification.permission;
          const appDisabled = localStorage.getItem('notifications_disabled') === 'true';

          // 1. Если уже разрешено — просто переключаем настройку внутри приложения
          if (perm === 'granted') {
              if (appDisabled) {
                  localStorage.setItem('notifications_disabled', 'false');
                  this.showNotification('Уведомления включены!', 'success');
              } else {
                  localStorage.setItem('notifications_disabled', 'true');
                  this.showNotification('Уведомления приостановлены', 'info');
              }
              updateBtnState();
          } 
          
          // 2. Если ЕЩЕ НЕ СПРАШИВАЛИ (default) — запрашиваем
          else if (perm === 'default') {
              Notification.requestPermission().then(newPerm => {
                  if (newPerm === 'granted') {
                      localStorage.setItem('notifications_disabled', 'false');
                      this.showNotification('Ура! Боб на связи! 🚀', 'success');
                      this.scheduleBobReminders();
                  } else {
                      this.showNotification('Эх, Боб не сможет писать...', 'warning');
                  }
                  updateBtnState();
              });
          }
          
          // 3. Если ЗАБЛОКИРОВАНО (denied)
          else {
              // Мы пытаемся спросить, но скорее всего браузер откажет сразу
              Notification.requestPermission().then(newPerm => {
                  if (newPerm === 'granted') {
                      // О чудо, сработало!
                      localStorage.setItem('notifications_disabled', 'false');
                      updateBtnState();
                  } else {
                      // Не сработало — показываем инструкцию
                      alert('Браузер заблокировал запрос уведомлений.\n\nКак включить:\n1. Нажмите на значок замка 🔒 или настроек ⚙️ в строке адреса.\n2. Найдите "Уведомления".\n3. Выберите "Разрешить".');
                  }
              });
          }
      };
  }
  
  // Добавляем обработчики через addEventListener
  const closeBtn = modal.querySelector('.settings-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.remove());
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
    }
    
        if (section === 'learning') {
      // === СБРОС ФИЛЬТРА ТЕМЫ ===
      // Если пользователь нажал "Изучаю" в меню, он хочет общий режим.
      // Сбрасываем фильтр конкретной темы грамматики.
      this.sentenceBuilderState.filterTopic = null; 
      this.sentenceBuilderState.currentSentence = null; // Сбрасываем текущее предложение, чтобы загрузилось новое
      // ==========================

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
            // Для тренажера оставляем видимыми (или скрываем, как решишь)
          } else {
            practiceToggle.style.display = 'flex';
          }
        }
      }, 50);
      this.renderLearningSection();
    }
    
        if (section === 'grammar') {
        // Скрываем детальный просмотр, если он был открыт
        const detail = document.getElementById('grammarDetail');
        if (detail) detail.classList.add('hidden');
        
        // Запускаем рендер корня (список уровней)
        if (this.grammarManager) {
            this.grammarManager.renderRoot();
        }
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

     startGrammarPractice(topicId) {
    // 1. Находим контейнеры
    const listContainer = document.getElementById('grammarList');
    const detailContainer = document.getElementById('grammarDetail');
    
    if (!detailContainer) return;

    // === ВОТ ЭТО ИСПРАВЛЕНИЕ ===
    // Скрываем список тем и показываем блок с тренажером
    if (listContainer) listContainer.classList.add('hidden');
    detailContainer.classList.remove('hidden');
    // ============================

    // 2. Устанавливаем тему
    this.sentenceBuilderState.filterTopic = topicId;
    
    // Проверка на наличие предложений
    if (!window.sentencesByTopic || !window.sentencesByTopic[topicId]) {
        // Если предложений нет - показываем уведомление, но не ломаем интерфейс
        this.showNotification('Для этой темы пока нет упражнений', 'warning');
        
        // Возвращаем пользователя назад в список или теорию
        if (listContainer) listContainer.classList.remove('hidden');
        detailContainer.classList.add('hidden');
        return;
    }
    
    const sentences = window.sentencesByTopic[topicId];

    // Выбираем случайное предложение
    this.sentenceBuilderState.currentSentence = sentences[Math.floor(Math.random() * sentences.length)];
    this.sentenceBuilderState.assembledWords = [];
    this.sentenceBuilderState.correctOrder = this.sentenceBuilderState.currentSentence.en.split(' ');
    
    const state = this.sentenceBuilderState;
    const shuffledWords = [...state.correctOrder].sort(() => Math.random() - 0.5);

    // 3. Рендерим Тренажер
    detailContainer.innerHTML = `
        <div class="grammar-detail-header">
            <!-- Кнопка назад возвращает к Теории этого же урока -->
            <button class="btn btn-secondary" onclick="window.grammar.renderLesson('${this.grammarManager.currentLevel}', '${topicId}')">
                <i class="fas fa-arrow-left"></i> К теории
            </button>
            <h3 style="margin:0; font-size:1.1rem;">Тренировка</h3>
        </div>
       
        <div class="grammar-content" style="padding-top: 20px;">
            <div class="sentence-builder-container" style="box-shadow:none; border:none; background:transparent; padding:0; overflow: visible !important; border-radius: 0 !important;">
              
              <div class="sentence-instruction" style="margin-bottom:1rem;">
                <div class="sentence-instruction-text" style="font-size:1.1rem;">Переведите предложение</div>
                <div class="grammar-lamp pulse" id="grammarLampBtn">💡</div>
              </div>
              
              <div class="russian-sentence-box">
                <span class="russian-text">${state.currentSentence.ru}</span>
              </div>
              
              <div class="sentence-answer-area" id="grammarAnswerArea">
                <div class="assembled-sentence" id="grammarAssembledSentence"></div>
              </div>
              
              <div class="sentence-word-pool" id="grammarWordPool">
                ${shuffledWords.map((word, index) => {
                  return `
                    <button class="sentence-word" 
                            data-word="${this.safeAttr(word)}"
                            data-index="${index}">
                      ${word}
                    </button>
                  `;
                }).join('')}
              </div>
              
              <button class="sentence-check-btn" id="grammarCheckBtn" disabled>Проверить</button>
              
              <div class="sentence-feedback" id="grammarFeedback" style="display: none;"></div>
            </div>
        </div>
    `;

    // 4. Навешиваем обработчики
    this.attachGrammarTrainerEvents(detailContainer, topicId);
    
    window.scrollTo(0,0);
  }

attachGrammarTrainerEvents(container, topicId) {
    // Обработчик клика по словам
    const wordButtons = container.querySelectorAll('.sentence-word');
    wordButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            const word = btn.getAttribute('data-word');
            const index = parseInt(btn.getAttribute('data-index'));
            
            // Логика выбора (копируем упрощенную логику из основного тренажера)
            this.handleGrammarWordSelect(word, index, container);
        });
    });

    // Кнопка Проверить
    const checkBtn = container.querySelector('#grammarCheckBtn');
    if (checkBtn) {
        checkBtn.addEventListener('click', () => this.checkGrammarSentence(container, topicId));
    }

    // Лампочка
    const lamp = container.querySelector('#grammarLampBtn');
    if (lamp) {
        lamp.addEventListener('click', () => this.showSentenceGrammarModal());
    }
}

handleGrammarWordSelect(word, index, container) {
    const state = this.sentenceBuilderState;
    const wordKey = `${word}_${index}`;
    
    // Проверяем порядок (как было)
    const nextPos = state.assembledWords.length;
    const expected = (state.correctOrder[nextPos] || '').toLowerCase().trim();
    const clicked = (word || '').toLowerCase().trim();

    if (clicked !== expected) {
        const area = container.querySelector('#grammarAnswerArea');
        area.classList.add('incorrect');
        setTimeout(() => area.classList.remove('incorrect'), 300);
        return;
    }

    this.playSingleWordMp3(word, 'us').catch(()=>{});

    // Добавляем
    state.assembledWords.push(wordKey);
    
    // Обновляем UI
    const area = container.querySelector('#grammarAssembledSentence');
    area.textContent = state.assembledWords.map(w => w.split('_')[0]).join(' ');
    
    const btn = container.querySelector(`[data-index="${index}"]`);
    if (btn) {
        btn.classList.add('used');
        btn.disabled = true;
    }
    
    // === ИСПРАВЛЕНИЕ ===
    // Активируем кнопку ТОЛЬКО если длина совпадает
    const checkBtn = container.querySelector('#grammarCheckBtn');
    if (state.assembledWords.length === state.correctOrder.length) {
        checkBtn.disabled = false;
        
        // Авто-проверка через 0.5 сек
        setTimeout(() => this.checkGrammarSentence(container, this.sentenceBuilderState.filterTopic), 500);
    } else {
        checkBtn.disabled = true;
    }
}

checkGrammarSentence(container, topicId) {
    const state = this.sentenceBuilderState;
    
        if (state.assembledWords.length !== state.correctOrder.length) {
        return;
    }
    
    const feedback = container.querySelector('#grammarFeedback');
    
    state.score++; 
    this.incrementTrainerCounters({ correct: true });

    // ДЕРЗКИЕ И ВЕСЕЛЫЕ КОМПЛИМЕНТЫ ОТ БОБА
    const compliments = [
        "Гениально! 🌟",
        "Красавчик! 😎",
        "Ты машина! 🤖",
        "Мозг — огонь! 🔥",
        "Легче легкого! 🥱",
        "Да ты профи! 🎓",
        "Боб одобряет! 😺",
        "В точку! 🎯",
        "Не остановить! 🚀",
        "Изи катка! 🎮",
        "Ты это сделал! 🙌",
    ];
    
    const randomCompliment = compliments[Math.floor(Math.random() * compliments.length)];

    feedback.className = 'sentence-feedback correct';
    
    // HTML с Бобом
    feedback.innerHTML = `
        <img src="/instruction.png" class="feedback-bob" alt="Bob">
        <div>${randomCompliment}</div>
    `;
    
    feedback.style.display = 'block';
    
    // ЗВУК ВКЛЮЧЕН (как ты просил)
    this.playCorrectSound(); 

    // Пауза 2 сек, чтобы насладиться похвалой Боба
    setTimeout(() => {
        this.startGrammarPractice(topicId); 
    }, 2000);
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

  showCategoryWords(category) {
    this.stopCurrentAudio();
    this.currentCategory = category;
    this.currentLevel = null; // Сбрасываем уровень, чтобы кнопка назад работала правильно

    const words = oxfordWordsDatabase[category] || [];
    const container = document.getElementById('wordsContainer');
    const title = document.getElementById('currentLevelTitle');
    const wordsList = document.getElementById('wordsList');

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
      category;

    if (title) title.textContent = `${categoryName} - ${words.length} слов`;

    if (wordsList) {
        // Используем наш улучшенный рендер, который теперь включает кнопку "Учить все"
        this.renderFilteredWordsList(words, category);
    }

    this.jumpToTopStrict();
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
  // 1. Если включен фильтр по теме Грамматики (из startGrammarPractice)
  if (this.sentenceBuilderState.filterTopic) {
      const topicId = this.sentenceBuilderState.filterTopic;
      
      // Предполагаем, что в window.sentencesByTopic лежат массивы предложений по ID
      // Тебе нужно будет создать такую структуру в sentences-data.js
      if (window.sentencesByTopic && window.sentencesByTopic[topicId]) {
          return window.sentencesByTopic[topicId];
      } else {
          // Фолбэк, если предложений по теме нет
          console.warn(`No sentences found for topic: ${topicId}`);
          return []; 
      }
  }

  // 2. Если фильтра нет — работаем как раньше (Берем предложения по уровням слов пользователя)
  const availableLevels = this.getAvailableLevelsFromWords();
  let sentences = [];
  
  if (availableLevels.size === 0) return [];
  
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
      
      // === НОВАЯ ЛОГИКА: POP-UP С БОБОМ (Как в Грамматике) ===
      const compliments = [
        "Супер! 🔥", "Так держать! 🚀", "Идеально! ✨",
        "Ты крут! 😎", "В точку! 🎯", "Боб доволен! 😺"
      ];
      const randomCompliment = compliments[Math.floor(Math.random() * compliments.length)];

      feedback.className = 'sentence-feedback correct'; // Используем новый класс
      feedback.innerHTML = `
          <img src="/instruction.png" class="feedback-bob" alt="Bob">
          <div>${randomCompliment}</div>
      `;
      
      // Включаем Flex для центрирования
      feedback.style.display = 'flex'; 
      
      // Звук
      this.playCorrectSound();

      setTimeout(() => {
        feedback.style.display = 'none'; // Скрываем перед следующим
        this.skipSentence(); // Грузим новый вопрос
      }, 2000);
      
    } else {
      // ОШИБКА (Оставляем красную плашку, но можно тоже сделать с Бобом, если хочешь)
      // Пока оставим старый стиль для ошибки, чтобы было понятно, что не так
      feedback.className = 'sentence-feedback incorrect';
      feedback.innerHTML = `
          <div style="font-size:1.2rem; color:white; margin-bottom:10px;">❌ Ошибка!</div>
          <div style="font-size:1rem; color:white;">Правильно: <strong>${state.correctOrder.join(' ')}</strong></div>
      `;
      feedback.style.display = 'flex';
      
      // Даем больше времени прочитать ошибку
      setTimeout(() => {
          feedback.style.display = 'none';
      }, 3500);
    }
    
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
  // Получаем текущее предложение
  const currentSent = this.sentenceBuilderState.currentSentence;
  
  // Пытаемся найти тему
  let foundTopic = null;
  
  // Вариант А: Если включен фильтр темы (мы пришли из Грамматики)
  if (this.sentenceBuilderState.filterTopic) {
      const topicId = this.sentenceBuilderState.filterTopic;
      foundTopic = this._findTopicById(topicId);
  } 
  // Вариант Б: Если мы в общем режиме, но у предложения прописан topicId (в базе данных)
  else if (currentSent && currentSent.topicId) {
      foundTopic = this._findTopicById(currentSent.topicId);
  }

  // Если тему нашли — показываем её контент
  if (foundTopic) {
      const modal = document.createElement('div');
      modal.className = 'grammar-modal show';
      modal.innerHTML = `
        <div class="grammar-modal-content">
          <div class="grammar-modal-header">
            <div class="grammar-modal-title">
              <span>🎓</span>
              <span style="font-size:1rem;">${foundTopic.title}</span>
            </div>
            <button class="grammar-close-btn" onclick="this.closest('.grammar-modal').remove()">&times;</button>
          </div>
          <div class="grammar-modal-body">
            ${foundTopic.content} 
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      return;
  }

  // Фолбэк: Стандартная подсказка (если тема не определена)
  const modal = document.createElement('div');
  modal.className = 'grammar-modal show';
  modal.innerHTML = `
    <div class="grammar-modal-content">
      <div class="grammar-modal-header">
        <div class="grammar-modal-title">
          <span>💡</span>
          <span>Подсказка</span>
        </div>
        <button class="grammar-close-btn" onclick="this.closest('.grammar-modal').remove()">&times;</button>
      </div>
      <div class="grammar-modal-body">
        <p>К сожалению, для этого предложения не привязано конкретное правило.</p>
        <div class="grammar-tip">
           <div class="grammar-tip-title">Общий совет</div>
           <p>В английском строгий порядок слов: <strong>Кто + Делает + Что/Где/Когда</strong>.</p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Вспомогательный метод для поиска темы в grammar.js
_findTopicById(id) {
    if (!this.grammarManager || !this.grammarManager.data) return null;
    const allLevels = this.grammarManager.data;
    for (const lvl in allLevels) {
        const t = allLevels[lvl].find(x => x.id === id);
        if (t) return t;
    }
    return null;
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
  this.stopCurrentAudio();
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
  this.showGlobalLoader('Кот Боб загружает для вас список слов...', 1000);
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
    this.showGlobalLoader('Кот Боб загружает для вас список слов...', 1500);
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
          this.showGlobalLoader('Кот Боб загружает ещё слова...', 1000);
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
  // 1. Режим "Endless" — без ограничений
  if (this.currentPractice === 'endless') {
    return this.learningWords.filter(w => !w.isLearned);
  }

  // 2. Режим "Заучивание" (Scheduled) — СТРОГАЯ ЛОГИКА
  const today = new Date().toDateString();
  
  // Загружаем конфиг пользователя
  let userConfig = JSON.parse(localStorage.getItem('userConfig') || '{}');
  // Дефолтный лимит, если конфига нет
  const dailyLimit = userConfig.dailyLimit || 15; 

  // Сброс счетчика нового дня
  if (userConfig.lastNewWordsDate !== today) {
      userConfig.lastNewWordsDate = today;
      userConfig.newWordsAddedToday = 0;
      localStorage.setItem('userConfig', JSON.stringify(userConfig));
  }

  // Пытаемся достать текущую сессию
  let session = JSON.parse(localStorage.getItem('currentSession') || 'null');

  // Если сессии нет или она вчерашняя — создаем новую
  if (!session || session.date !== today) {
    session = {
      date: today,
      shownWords: [],
      currentIndex: 0, 
      correctStreak: 0,
      totalCorrect: 0
    };
  }

  // --- ВОЗВРАТ СОХРАНЕННОЙ СЕССИИ ---
  if (session.shownWords.length > 0) {
    let restoredWords = session.shownWords.map(wText => 
      this.learningWords.find(lw => lw.word === wText)
    ).filter(Boolean); 
    if (restoredWords.length > 0) return restoredWords;
  }

  // --- ГЕНЕРАЦИЯ НОВОГО ПУЛА ---
  
  const activeWords = this.learningWords.filter(w => !w.isLearned);
  
  // 1. Сначала отбираем слова на ПОВТОРЕНИЕ (уже видели, accScore > 0)
  // Сортируем: самые "плохие" (низкий accScore) идут первыми
  const reviewCandidates = activeWords
      .filter(w => {
          const s = this.wordStats[w.word];
          // Если статистики нет — это новое слово, пропускаем этот фильтр
          if (!s) return false; 
          // Если accScore >= 8 (хорошо знаем) и видели сегодня — не показываем
          if (s.accScore >= 8) {
             const lastSeen = s.lastReview ? new Date(s.lastReview).toDateString() : '';
             if (lastSeen === today) return false;
          }
          // Берем только те, что уже учили (totalAnswers > 0)
          return s.totalAnswers > 0;
      })
      .sort((a, b) => {
          const sa = (this.wordStats[a.word] || {}).accScore || 0;
          const sb = (this.wordStats[b.word] || {}).accScore || 0;
          return sa - sb;
      });

  // 2. Проверяем "Качество" базы (средний балл повторения)
  // Если слов на повторение много и средний балл низкий — новые не даем!
  let canAddNew = true;
  if (reviewCandidates.length > 5) {
      const totalScore = reviewCandidates.reduce((acc, w) => acc + ((this.wordStats[w.word]||{}).accScore || 0), 0);
      const avgScore = totalScore / reviewCandidates.length;
      // Если средняя точность меньше 5 (50%), блокируем новые слова
      if (avgScore < 5) {
          canAddNew = false;
          console.log('Blocking new words: avg score is too low', avgScore);
      }
  }

  // 3. Отбираем НОВЫЕ слова (ни разу не учили)
  let newCandidates = [];
  if (canAddNew) {
      // Сколько еще можно добавить сегодня?
      const slotsLeft = dailyLimit - userConfig.newWordsAddedToday;
      
      if (slotsLeft > 0) {
          newCandidates = activeWords
              .filter(w => {
                  const s = this.wordStats[w.word];
                  // Новое слово: статистики нет или ответов 0
                  return !s || s.totalAnswers === 0;
              })
              // Сортируем по уровню (сначала A1, потом A2...)
              .sort((a, b) => (a.level || '').localeCompare(b.level || ''))
              .slice(0, slotsLeft); // БЕРЕМ НЕ БОЛЬШЕ ЛИМИТА
      }
  }

  // Если вообще нет слов (всё выучили)
  if (reviewCandidates.length === 0 && newCandidates.length === 0) return [];

  // 4. Собираем пул: Сначала повторение, потом новые
  // Ограничиваем размер сессии (например, 30 слов за подход)
  let finalPool = [];
  
  // Заполняем повторением
  finalPool = finalPool.concat(reviewCandidates.slice(0, 25));
  
  // Добиваем новыми (если есть место и лимит позволяет)
  if (finalPool.length < 30 && newCandidates.length > 0) {
      finalPool = finalPool.concat(newCandidates);
      
      // ОБНОВЛЯЕМ СЧЕТЧИК НОВЫХ СЛОВ
      userConfig.newWordsAddedToday += newCandidates.length;
      localStorage.setItem('userConfig', JSON.stringify(userConfig));
  }
  
  // Перемешиваем
  finalPool = this.shuffle(finalPool);

  // Сохраняем в сессию
  session.shownWords = finalPool.map(w => w.word);
  session.currentIndex = 0;
  localStorage.setItem('currentSession', JSON.stringify(session));

  return finalPool;
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
    // Считаем выученным, если стоит галочка ИЛИ если точность (accScore) достигла 10
  const totalLearned = this.learningWords.filter(w => {
      if (w.isLearned) return true;
      const s = this.wordStats[w.word];
      return s && s.accScore >= 10;
  }).length;

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
          <span style="font-weight:800; color:var(--text-primary);">Цель на день</span>
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
  const learnedWords = this.learningWords.filter(w => {
      if (w.isLearned) return true;
      const s = this.wordStats[w.word];
      return s && s.accScore >= 10;
  }).length;
  const inProgress = Math.max(0, totalWords - learnedWords);
  const learnedPct = totalWords > 0 ? Math.round(learnedWords / totalWords * 100) : 0;

  // Прогресс по уровням / категориям
  const levelKeys = ['A1','A2','B1','B2','C1','C2','IRREGULARS','PHRASAL_VERBS','IDIOMS','MEDICAL','ADDED'];
  const levelProgress = {};
  levelKeys.forEach(level => {
    const total = this.learningWords.filter(w => w.level === level).length;
        const learned = this.learningWords.filter(w => {
        if (w.level !== level) return false;
        if (w.isLearned) return true;
        const s = this.wordStats[w.word];
        return s && s.accScore >= 10;
    }).length;
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
      
            <!-- Грамматика (Новый блок) -->
      <div class="progress-card">
        <div class="progress-card-header">
          <div class="progress-card-icon icon-purple"> <!-- Фиолетовая иконка -->
            <i class="fas fa-university"></i>
          </div>
          <div>
            <div class="progress-card-title">Грамматика</div>
            <div class="progress-card-subtitle">Пройдено тем и упражнений</div>
          </div>
        </div>
        
        <div style="display:flex; gap:10px; margin-top:10px;">
            <!-- Плашка за сегодня -->
            <div style="flex:1; background:var(--bg-tertiary); border-radius:12px; padding:10px; text-align:center;">
                <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">За сегодня</div>
                <div style="font-size:1.4rem; font-weight:900; color:var(--primary-color);">
                    ${trainerTodayCorrect} <span style="font-size:0.9rem;">предл.</span>
                </div>
            </div>
            
            <!-- Плашка за неделю -->
            <div style="flex:1; background:var(--bg-tertiary); border-radius:12px; padding:10px; text-align:center;">
                <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">За неделю</div>
                <div style="font-size:1.4rem; font-weight:900; color:#8b5cf6;">
                    ${trainerWeekCorrect} <span style="font-size:0.9rem;">предл.</span>
                </div>
            </div>
        </div>
        
        <div style="margin-top:12px; font-size:0.85rem; color:var(--text-secondary); text-align:center;">
           <i class="fas fa-check-circle" style="color:#10b981"></i> Каждое правильное предложение — шаг к C2!
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
    // 1. Проверка слов
    if (this.learningWords.filter(w => !w.isLearned).length < 3) {
      this.showNotification('Чтобы играть, добавьте минимум 3 слова из "списка слов" в «Изучаю»', 'warning');
      return;
    }

    // 2. Оверлей
    const overlay = document.createElement('div');
    overlay.id = 'gameQuizOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;';

    // 3. Карточка (Контейнер)
    const gameContainer = document.createElement('div');
    // Убрали overflow:visible, так как Боб теперь внутри
    gameContainer.style.cssText = 'background:var(--bg-primary); border-radius:24px; padding:24px; max-width:480px; width:90%; box-shadow:0 20px 60px rgba(0,0,0,0.3); animation: popIn 0.3s ease; display:flex; flex-direction:column;';

    // 4. Кнопка Закрыть
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i> Закрыть';
    closeBtn.className = 'btn btn-secondary';
    closeBtn.style.marginBottom = '15px';
    closeBtn.style.alignSelf = 'flex-start'; // Кнопка слева
    closeBtn.onclick = () => overlay.remove();

    // 5. Контейнер контента
    const quizContainer = document.createElement('div');
    quizContainer.id = 'quizGateContainer';
    
    // === ЭКРАН 1: ИНТРО С БОБОМ ВНУТРИ ===
    quizContainer.innerHTML = `
        <div style="text-align:center; padding:10px;">
            <!-- БОБ ЗДЕСЬ (ВНУТРИ) -->
            <img src="/instruction.png" style="width:120px; height:auto; margin-bottom:15px; filter:drop-shadow(0 5px 10px rgba(0,0,0,0.15));">
            
            <h3 style="margin-bottom:10px; font-weight:900; font-size:1.4rem; color:var(--text-primary);">
                Боб охраняет игру!
            </h3>
            
            <p style="color:var(--text-secondary); margin-bottom:20px; font-size:1.1rem; line-height:1.5;">
                Чтобы запустить <b>${gameName}</b>,<br>переведи 3 слова правильно.
            </p>
            
            <button class="btn btn-primary" id="startGateBtn" style="width:100%; font-size:1.1rem; padding:14px; font-weight:800; box-shadow:0 4px 0 rgba(0,0,0,0.2);">
                Погнали! 🚀
            </button>
        </div>
    `;

    gameContainer.appendChild(closeBtn);
    gameContainer.appendChild(quizContainer);
    overlay.appendChild(gameContainer);
    document.body.appendChild(overlay);

    // 6. Логика Квиза
    let correctCount = 0;

    const showNextQuestion = () => {
      const word = this.getRandomLearningWord();
      if (!word) return; 

      const direction = Math.random() < 0.5 ? 'EN_RU' : 'RU_EN';
      const questionText = direction === 'EN_RU' ? this.getEnglishDisplay(word) : word.translation;
      const correct = direction === 'EN_RU' ? word.translation : this.getEnglishDisplay(word);
      const options = this.buildQuizOptions(word, direction);
      const shuffled = this.shuffle(options);

      // === ЭКРАН 2: ВОПРОС + СЧЕТЧИК ВНУТРИ ===
      quizContainer.innerHTML = `
        <div style="margin-bottom:5px; text-align:center;">
          <!-- Вопрос -->
          <div style="font-size:24px; font-weight:700; margin-bottom:20px; display:flex; align-items:center; justify-content:center; gap:10px; color:var(--text-primary);">
            ${questionText}
            <span class="sound-actions">
               <button class="mini-btn gate-sound-btn"><i class="fas fa-volume-up"></i></button>
            </span>
          </div>

          <!-- Варианты -->
          <div class="quiz-options" style="display:grid; gap:10px; margin-bottom:20px;">
            ${shuffled.map(opt => {
              return `<div class="quiz-option-gate" data-answer="${this.safeAttr(opt)}" style="padding:14px; border-radius:12px; border:2px solid var(--border-color); cursor:pointer; text-align:center; font-weight:700; font-size:1rem;">
                ${opt}
              </div>`;
            }).join('')}
          </div>

          <!-- СЧЕТЧИК ТЕПЕРЬ ТУТ (Темный текст) -->
          <div style="font-size:1rem; font-weight:700; color:var(--text-secondary); border-top:2px solid var(--border-color); padding-top:15px;">
             Правильных ответов: <span style="color:var(--primary-color); font-size:1.2rem;">${correctCount}</span>/3
          </div>
        </div>
      `;

      // Обработчик звука
      const soundBtn = quizContainer.querySelector('.gate-sound-btn');
      if(soundBtn) {
          soundBtn.onclick = (e) => {
              e.stopPropagation();
              this.playWord(word.word, word.forms, 'us', word.level);
          };
      }

      // Авто-озвучка
      if (direction === 'EN_RU' && this.shouldAutoPronounce(word)) {
        setTimeout(() => {
           this.playWord(word.word, word.forms, 'us', word.level);
        }, 150);
      }

      // Обработчики ответов
      quizContainer.querySelectorAll('.quiz-option-gate').forEach(opt => {
        opt.addEventListener('click', async () => {
          // Блокируем повторные клики
          quizContainer.querySelectorAll('.quiz-option-gate').forEach(b => b.style.pointerEvents = 'none');

          const chosen = opt.getAttribute('data-answer');
          const isCorrect = chosen === correct;

          if (isCorrect) {
              opt.classList.add('gate-correct');
              this.playCorrectSound();
          } else {
              opt.classList.add('gate-wrong');
              quizContainer.querySelectorAll('.quiz-option-gate').forEach(o => {
                  if (o.getAttribute('data-answer') === correct) o.classList.add('gate-correct');
              });
          }

          await this.waitForCurrentAudioToFinish();

          if (direction === 'RU_EN' && this.shouldAutoPronounce(word)) {
             await this.delay(200);
             await this.playWord(word.word, word.forms, 'us', word.level);
          } else {
             await this.delay(600);
          }

          if (isCorrect) {
            correctCount++;
            this.recordDailyProgress();

            if (correctCount >= 3) {
              // Показываем успех
              quizContainer.innerHTML = `
                  <div style="text-align:center; padding:20px;">
                      <i class="fas fa-check-circle" style="font-size:60px; color:#4ade80; margin-bottom:20px; display:block;"></i>
                      <h3 style="color:var(--text-primary);">Отлично!</h3>
                      <p style="color:var(--text-secondary);">Запускаю игру...</p>
                  </div>
              `;
              await this.delay(1000);
              overlay.remove();
              this.openGameFullscreen(gameName, gameFile);
            } else {
              showNextQuestion();
            }
          } else {
            setTimeout(() => showNextQuestion(), 800);
          }
        });
      });
    };

    // 7. Запуск по кнопке
    setTimeout(() => {
        const startBtn = document.getElementById('startGateBtn');
        if (startBtn) startBtn.onclick = () => showNextQuestion();
    }, 50);
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
    // Важно: background задается через CSS для поддержки тем, тут только база
    quizBox.className = 'quiz-box-overlay'; 
    quizBox.style.cssText = 'background:var(--bg-primary);border-radius:16px;padding:30px;max-width:520px;width:90%;box-shadow:var(--shadow-lg);position:relative;';

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
        quizContent.innerHTML = '<div style="text-align:center;color:var(--text-secondary);">Недостаточно слов для игры. Добавьте слова в "Изучаю".</div>';
        setTimeout(() => { overlay.remove(); }, 3000);
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
          </div>
          <div style="font-size:14px;color:var(--text-secondary);margin-bottom:10px;">Нужно правильных подряд: ${quizCorrect}/4</div>
          <div class="quiz-options" style="display:grid;gap:10px;">
            ${shuffled.map(opt => {
              // Не добавляем сюда кнопки звука, чтобы не перегружать DOM и клики
              return `<div class="quiz-option-gate" data-answer="${this.safeAttr(opt)}" style="padding:14px;border-radius:12px;border:2px solid var(--border-color);cursor:pointer;text-align:center;font-weight:700;">
                ${opt}
              </div>`;
            }).join('')}
          </div>
        </div>
      `;

      // Безопасная авто-озвучка с таймаутом
      if (direction === 'EN_RU' && this.shouldAutoPronounce(word)) {
        setTimeout(() => {
           this.playWord(word.word, word.forms, 'us', word.level).catch(()=>{});
        }, 150);
      }

      const optionBtns = quizContent.querySelectorAll('.quiz-option-gate');
      optionBtns.forEach(opt => {
        opt.addEventListener('click', async (e) => {
            e.stopPropagation(); // Остановить всплытие
            
            // 1. Блокируем все кнопки мгновенно
            optionBtns.forEach(btn => btn.style.pointerEvents = 'none');

            const chosen = opt.getAttribute('data-answer');
            const isCorrect = chosen === correct;

            // 2. Визуальная реакция
            if (isCorrect) {
                opt.classList.add('gate-correct');
                // Звук успеха
                this.playCorrectSound();
            } else {
                opt.classList.add('gate-wrong');
                // Подсветка правильного
                optionBtns.forEach(b => {
                    if (b.getAttribute('data-answer') === correct) b.classList.add('gate-correct');
                });
                // Вибрация на телефоне (если поддерживается)
                if (navigator.vibrate) navigator.vibrate(200);
            }

            // 3. Ждем аудио (но не вечно!)
            // Создаем промис-таймаут, чтобы если аудио зависнет, мы продолжили через 1 сек
            const audioWait = this.waitForCurrentAudioToFinish();
            const timeout = new Promise(r => setTimeout(r, 1000));
            await Promise.race([audioWait, timeout]);

            // 4. Озвучка правильного ответа (если надо)
            if (direction === 'RU_EN' && this.shouldAutoPronounce(word)) {
                this.playWord(word.word, word.forms, 'us', word.level).catch(()=>{});
                await this.delay(800); // Даем время послушать
            } else {
                await this.delay(500);
            }

            // 5. Логика перехода
            if (isCorrect) {
                quizCorrect++;
                // Обновляем прогресс (опционально)
                this.updateWordStats(word.word, true);
                
                if (quizCorrect >= 4) {
                    overlay.innerHTML = `
                        <div style="text-align:center; color:white;">
                            <i class="fas fa-check-circle" style="font-size:60px; color:#4ade80; margin-bottom:20px;"></i>
                            <h2>Отлично!</h2>
                            <p>Игра продолжается...</p>
                        </div>
                    `;
                    await this.delay(1500);
                    overlay.remove();
                    this.startGameQuizCycle(containerId); // Запускаем таймер заново
                } else {
                    showQuestion();
                }
            } else {
                // Если ошибка — сбрасываем счетчик или просто след вопрос
                // quizCorrect = 0; // Можно раскомментировать для хардкора
                this.updateWordStats(word.word, false);
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
    this.createGlobalLoader();
    const textEl = this.loaderEl.querySelector('.global-loader-text-el');
    if (textEl) textEl.textContent = message;
    this.loaderMinMs = minDurationMs;
    this.loaderStart = performance.now();
    this.loaderEl.classList.add('show');
  }

  hideGlobalLoader() {
    if (!this.loaderEl) return; // Оставили только проверку существования элемента
    const elapsed = performance.now() - (this.loaderStart || 0);
    const delay = Math.max(0, (this.loaderMinMs || 0) - elapsed);
    clearTimeout(this.loaderTimer);
    this.loaderTimer = setTimeout(() => {
      this.loaderEl.classList.remove('show');
    }, delay);
  }
  
  // =================================================
  // 1. КОНФИГУРАЦИЯ КАТЕГОРИЙ (A1-C2)
  // =================================================
 
    getLevelCategoriesConfig() {
    return {
      "A1": {
        "grammar": [
          { "id": "nouns", "name": "Существительные", "icon": "fa-cube" },
          { "id": "verbs", "name": "Глаголы", "icon": "fa-bolt" },
          { "id": "adjectives", "name": "Прилагательные", "icon": "fa-palette" },
          { "id": "adverbs", "name": "Наречия", "icon": "fa-wind" },
          { "id": "prepositions", "name": "Предлоги", "icon": "fa-map-marker-alt" },
          { "id": "conjunctions", "name": "Союзы", "icon": "fa-link" },
          { "id": "pronouns", "name": "Местоимения", "icon": "fa-user" },
          { "id": "determiners", "name": "Определители", "icon": "fa-crosshairs" },
          { "id": "modal_verbs", "name": "Модальные глаголы", "icon": "fa-magic" },
          { "id": "numbers", "name": "Числительные", "icon": "fa-sort-numeric-up" },
          { "id": "exclamations", "name": "Междометия", "icon": "fa-comment-dots" }
        ],
        "topics": [
          { "id": "family", "name": "Семья", "icon": "fa-users" },
          { "id": "food", "name": "Еда и напитки", "icon": "fa-utensils" },
          { "id": "home", "name": "Дом и быт", "icon": "fa-home" },
          { "id": "clothing", "name": "Одежда", "icon": "fa-tshirt" },
          { "id": "body", "name": "Тело человека", "icon": "fa-heartbeat" },
          { "id": "transport", "name": "Транспорт", "icon": "fa-car" },
          { "id": "places", "name": "Места и здания", "icon": "fa-building" },
          { "id": "time", "name": "Время", "icon": "fa-clock" },
          { "id": "work", "name": "Работа", "icon": "fa-briefcase" },
          { "id": "education", "name": "Образование", "icon": "fa-graduation-cap" },
          { "id": "entertainment", "name": "Развлечения", "icon": "fa-theater-masks" },
          { "id": "emotions", "name": "Эмоции", "icon": "fa-smile" },
          { "id": "colors", "name": "Цвета", "icon": "fa-rainbow" },
          { "id": "nature", "name": "Природа", "icon": "fa-leaf" },
          { "id": "communication", "name": "Общение", "icon": "fa-comments" },
          { "id": "actions", "name": "Действия", "icon": "fa-running" },
          { "id": "weather", "name": "Погода", "icon": "fa-sun" },
          { "id": "shopping", "name": "Покупки", "icon": "fa-shopping-cart" },
          { "id": "descriptions", "name": "Описания", "icon": "fa-star" },
          { "id": "general", "name": "Общие слова", "icon": "fa-list-alt" }
        ]
      },
      "A2": {
        "grammar": [
          { "id": "nouns", "name": "Существительные", "icon": "fa-cube" },
          { "id": "verbs", "name": "Глаголы", "icon": "fa-bolt" },
          { "id": "adjectives", "name": "Прилагательные", "icon": "fa-palette" },
          { "id": "adverbs", "name": "Наречия", "icon": "fa-wind" },
          { "id": "prepositions", "name": "Предлоги", "icon": "fa-map-marker-alt" },
          { "id": "conjunctions", "name": "Союзы", "icon": "fa-link" },
          { "id": "pronouns", "name": "Местоимения", "icon": "fa-user" },
          { "id": "determiners", "name": "Определители", "icon": "fa-crosshairs" },
          { "id": "modal_verbs", "name": "Модальные глаголы", "icon": "fa-magic" },
          { "id": "numbers", "name": "Числительные", "icon": "fa-sort-numeric-up" }
        ],
        "topics": [
          { "id": "home", "name": "Дом и быт", "icon": "fa-home" },
          { "id": "food", "name": "Еда и кухня", "icon": "fa-utensils" },
          { "id": "work", "name": "Карьера", "icon": "fa-briefcase" },
          { "id": "education", "name": "Образование", "icon": "fa-book" },
          { "id": "technology", "name": "Технологии", "icon": "fa-laptop" },
          { "id": "transport", "name": "Транспорт", "icon": "fa-plane" },
          { "id": "health", "name": "Здоровье", "icon": "fa-medkit" },
          { "id": "nature", "name": "Природа", "icon": "fa-tree" },
          { "id": "entertainment", "name": "Развлечения", "icon": "fa-gamepad" },
          { "id": "sports", "name": "Спорт", "icon": "fa-futbol" },
          { "id": "emotions", "name": "Эмоции", "icon": "fa-laugh" },
          { "id": "people", "name": "Люди", "icon": "fa-user-friends" },
          { "id": "law", "name": "Закон", "icon": "fa-gavel" },
          { "id": "society", "name": "Общество", "icon": "fa-city" },
          { "id": "business", "name": "Бизнес", "icon": "fa-chart-line" },
          { "id": "weather", "name": "Погода", "icon": "fa-cloud-sun" },
          { "id": "clothing", "name": "Одежда", "icon": "fa-tshirt" },
          { "id": "buildings", "name": "Здания", "icon": "fa-hotel" },
          { "id": "media", "name": "СМИ", "icon": "fa-newspaper" },
          { "id": "science", "name": "Наука", "icon": "fa-microscope" },
          { "id": "time", "name": "Время", "icon": "fa-hourglass-half" },
          { "id": "communication", "name": "Общение", "icon": "fa-comment-alt" },
          { "id": "abstract", "name": "Абстрактное", "icon": "fa-brain" },
          { "id": "actions", "name": "Действия", "icon": "fa-running" },
          { "id": "general", "name": "Общие слова", "icon": "fa-list" }
        ]
      },
      "B1": {
        "grammar": [
          { "id": "nouns", "name": "Существительные", "icon": "fa-cube" },
          { "id": "verbs", "name": "Глаголы", "icon": "fa-bolt" },
          { "id": "adjectives", "name": "Прилагательные", "icon": "fa-palette" },
          { "id": "adverbs", "name": "Наречия", "icon": "fa-wind" },
          { "id": "prepositions", "name": "Предлоги", "icon": "fa-map-marker-alt" },
          { "id": "conjunctions", "name": "Союзы", "icon": "fa-link" },
          { "id": "pronouns", "name": "Местоимения", "icon": "fa-user" },
          { "id": "determiners", "name": "Определители", "icon": "fa-crosshairs" },
          { "id": "modal_verbs", "name": "Модальные", "icon": "fa-magic" }
        ],
        "topics": [
          { "id": "abstract", "name": "Абстрактное", "icon": "fa-cloud" },
          { "id": "nature", "name": "Природа", "icon": "fa-tree" },
          { "id": "science", "name": "Наука", "icon": "fa-flask" },
          { "id": "society", "name": "Общество", "icon": "fa-globe" },
          { "id": "law", "name": "Закон", "icon": "fa-balance-scale" },
          { "id": "business", "name": "Бизнес", "icon": "fa-briefcase" },
          { "id": "emotions", "name": "Чувства", "icon": "fa-heart" },
          { "id": "work", "name": "Работа", "icon": "fa-laptop-code" },
          { "id": "education", "name": "Образование", "icon": "fa-university" },
          { "id": "communication", "name": "Язык", "icon": "fa-language" },
          { "id": "entertainment", "name": "Искусство", "icon": "fa-music" },
          { "id": "technology", "name": "Техно", "icon": "fa-microchip" },
          { "id": "transport", "name": "Путешествия", "icon": "fa-suitcase-rolling" },
          { "id": "home", "name": "Быт", "icon": "fa-couch" },
          { "id": "clothing", "name": "Стиль", "icon": "fa-hat-cowboy" },
          { "id": "food", "name": "Кулинария", "icon": "fa-pizza-slice" },
          { "id": "health", "name": "Здоровье", "icon": "fa-stethoscope" },
          { "id": "materials", "name": "Материалы", "icon": "fa-layer-group" },
          { "id": "religion", "name": "Религия", "icon": "fa-pray" },
          { "id": "military", "name": "Армия", "icon": "fa-jet-fighter" },
          { "id": "descriptions", "name": "Качества", "icon": "fa-feather-alt" },
          { "id": "actions", "name": "Процессы", "icon": "fa-cogs" },
          { "id": "general", "name": "Общее", "icon": "fa-th-list" }
        ]
      },
      "B2": {
        "grammar": [
          { "id": "nouns", "name": "Существительные", "icon": "fa-cube" },
          { "id": "verbs", "name": "Глаголы", "icon": "fa-bolt" },
          { "id": "adjectives", "name": "Прилагательные", "icon": "fa-palette" },
          { "id": "adverbs", "name": "Наречия", "icon": "fa-wind" },
          { "id": "prepositions", "name": "Предлоги", "icon": "fa-map-marker-alt" },
          { "id": "conjunctions", "name": "Союзы", "icon": "fa-link" },
          { "id": "pronouns", "name": "Местоимения", "icon": "fa-user" },
          { "id": "numbers", "name": "Числительные", "icon": "fa-sort-numeric-up" }
        ],
        "topics": [
          { "id": "abstract", "name": "Концепции", "icon": "fa-lightbulb" },
          { "id": "nature", "name": "Экология", "icon": "fa-leaf" },
          { "id": "science", "name": "Исследования", "icon": "fa-dna" },
          { "id": "society", "name": "Политика", "icon": "fa-landmark" },
          { "id": "law", "name": "Право", "icon": "fa-gavel" },
          { "id": "business", "name": "Финансы", "icon": "fa-coins" },
          { "id": "emotions", "name": "Психология", "icon": "fa-brain" },
          { "id": "work", "name": "Карьера", "icon": "fa-id-card" },
          { "id": "education", "name": "Учеба", "icon": "fa-user-graduate" },
          { "id": "communication", "name": "Речь", "icon": "fa-bullhorn" },
          { "id": "entertainment", "name": "Культура", "icon": "fa-theater-masks" },
          { "id": "technology", "name": "Медиа", "icon": "fa-wifi" },
          { "id": "transport", "name": "Логистика", "icon": "fa-shipping-fast" },
          { "id": "home", "name": "Дом", "icon": "fa-door-open" },
          { "id": "food", "name": "Гастрономия", "icon": "fa-wine-glass" },
          { "id": "health", "name": "Медицина", "icon": "fa-hospital" },
          { "id": "body", "name": "Анатомия", "icon": "fa-walking" },
          { "id": "materials", "name": "Вещества", "icon": "fa-atom" },
          { "id": "religion", "name": "Духовность", "icon": "fa-church" },
          { "id": "military", "name": "Оборона", "icon": "fa-shield-alt" },
          { "id": "descriptions", "name": "Характеристики", "icon": "fa-tags" },
          { "id": "actions", "name": "Активность", "icon": "fa-play-circle" },
          { "id": "time", "name": "Периоды", "icon": "fa-calendar-alt" },
          { "id": "space", "name": "Пространство", "icon": "fa-arrows-alt" },
          { "id": "family", "name": "Отношения", "icon": "fa-users" },
          { "id": "clothing", "name": "Имидж", "icon": "fa-glasses" },
          { "id": "sports", "name": "Спорт", "icon": "fa-basketball-ball" },
          { "id": "general", "name": "Общее", "icon": "fa-clipboard-list" }
        ]
      },
      "C1": {
        "grammar": [
          { "id": "nouns", "name": "Существительные", "icon": "fa-cube" },
          { "id": "verbs", "name": "Глаголы", "icon": "fa-bolt" },
          { "id": "adjectives", "name": "Прилагательные", "icon": "fa-palette" },
          { "id": "adverbs", "name": "Наречия", "icon": "fa-wind" },
          { "id": "prepositions", "name": "Предлоги", "icon": "fa-map-marker-alt" },
          { "id": "conjunctions", "name": "Союзы", "icon": "fa-link" }
        ],
        "topics": [
          { "id": "abstract", "name": "Абстракция", "icon": "fa-shapes" },
          { "id": "law", "name": "Юриспруденция", "icon": "fa-balance-scale-right" },
          { "id": "society", "name": "Социум", "icon": "fa-users-cog" },
          { "id": "health", "name": "Здравоохранение", "icon": "fa-heartbeat" },
          { "id": "science", "name": "Наука", "icon": "fa-vial" },
          { "id": "business", "name": "Экономика", "icon": "fa-chart-pie" },
          { "id": "education", "name": "Академия", "icon": "fa-scroll" },
          { "id": "emotions", "name": "Психика", "icon": "fa-head-side-virus" },
          { "id": "religion", "name": "Вера", "icon": "fa-om" },
          { "id": "military", "name": "Война", "icon": "fa-fighter-jet" },
          { "id": "nature", "name": "Экология", "icon": "fa-globe-americas" },
          { "id": "technology", "name": "Инновации", "icon": "fa-rocket" },
          { "id": "communication", "name": "Диалог", "icon": "fa-comments-dollar" },
          { "id": "work", "name": "Менеджмент", "icon": "fa-tasks" },
          { "id": "descriptions", "name": "Нюансы", "icon": "fa-highlighter" },
          { "id": "actions", "name": "Операции", "icon": "fa-project-diagram" },
          { "id": "time", "name": "Хронология", "icon": "fa-history" },
          { "id": "space", "name": "Локация", "icon": "fa-map-marked-alt" },
          { "id": "entertainment", "name": "Культура", "icon": "fa-palette" },
          { "id": "family", "name": "Родство", "icon": "fa-baby-carriage" },
          { "id": "transport", "name": "Перевозки", "icon": "fa-truck-moving" },
          { "id": "materials", "name": "Ресурсы", "icon": "fa-oil-can" },
          { "id": "body", "name": "Физиология", "icon": "fa-x-ray" },
          { "id": "general", "name": "Прочее", "icon": "fa-folder-open" }
        ]
      },
      "C2": {
        "grammar": [
          { "id": "nouns", "name": "Существительные", "icon": "fa-cube" },
          { "id": "verbs", "name": "Глаголы", "icon": "fa-bolt" },
          { "id": "adjectives", "name": "Прилагательные", "icon": "fa-palette" },
          { "id": "adverbs", "name": "Наречия", "icon": "fa-wind" }
        ],
        "topics": [
          { "id": "rhetoric", "name": "Риторика", "icon": "fa-quote-right" },
          { "id": "character", "name": "Личность", "icon": "fa-fingerprint" },
          { "id": "morality", "name": "Этика", "icon": "fa-yin-yang" },
          { "id": "criticism", "name": "Критика", "icon": "fa-pen-fancy" },
          { "id": "deception", "name": "Обман", "icon": "fa-mask" },
          { "id": "emotions", "name": "Чувства", "icon": "fa-heart-broken" },
          { "id": "intellect", "name": "Интеллект", "icon": "fa-chess" },
          { "id": "behavior", "name": "Поведение", "icon": "fa-theater-masks" },
          { "id": "conflict", "name": "Конфликт", "icon": "fa-fist-raised" },
          { "id": "religion", "name": "Теология", "icon": "fa-khanda" },
          { "id": "philosophy", "name": "Философия", "icon": "fa-book-open" },
          { "id": "appearance", "name": "Облик", "icon": "fa-magic" },
          { "id": "abstract", "name": "Метафизика", "icon": "fa-infinity" },
          { "id": "literary", "name": "Литература", "icon": "fa-feather" },
          { "id": "social", "name": "Интеракция", "icon": "fa-handshake" }
        ]
      }
    };
  }

  // 2. ОТРИСОВКА МЕНЮ КАТЕГОРИЙ (БЕЗОПАСНАЯ ВЕРСИЯ)
   renderLevelCategoriesMenu(level, config) {
    const list = document.getElementById('wordsList');
    if (!list) return;

    let html = '<div class="category-menu-container">';
    
    html += '<button class="show-all-btn" onclick="window.app.showLevelWords(\'' + level + '\', { type: \'all\' })">';
    html += '<i class="fas fa-layer-group"></i> Показать все слова списка';
    html += '</button>';
    
    html += '<div class="category-section-title">';
    html += '<i class="fas fa-shapes"></i> Грамматика';
    html += '</div>';
    html += '<div class="grammar-grid">';
    
    for (let i = 0; i < config.grammar.length; i++) {
        const g = config.grammar[i];
        html += '<div class="grammar-cat-card" onclick="window.app.showLevelWords(\'' + level + '\', { type: \'grammar\', id: \'' + g.id + '\' })">';
        html += '<div class="grammar-icon"><i class="fas ' + g.icon + '"></i></div>';
        html += '<div class="grammar-name">' + g.name + '</div>';
        html += '</div>';
    }
    
    html += '</div>';
    
    html += '<div class="category-section-title" style="margin-top: 30px;">';
    html += '<i class="fas fa-graduation-cap"></i> Тематические уроки';
    html += '</div>';
    html += '<div class="lessons-list">';
    
    for (let i = 0; i < config.topics.length; i++) {
        const t = config.topics[i];
        const lessonNum = i + 1;
        html += '<div class="lesson-card" onclick="window.app.showLevelWords(\'' + level + '\', { type: \'topic\', id: \'' + t.id + '\' })">';
        html += '<div class="lesson-number">' + lessonNum + '</div>';
        html += '<div class="lesson-info">';
        html += '<div class="lesson-label">Урок ' + lessonNum + '</div>';
        html += '<div class="lesson-title">' + t.name + '</div>';
        html += '</div>';
        html += '<div class="lesson-icon"><i class="fas ' + t.icon + '"></i></div>';
        html += '</div>';
    }
    
    html += '</div>';
    html += '<div style="text-align: center; margin-top: 30px; color: var(--text-muted); font-size: 0.9rem;">';
    html += '<p>Проходите уроки последовательно для лучшего результата!</p>';
    html += '</div>';
    html += '</div>';
    
    list.innerHTML = html;
  }

  // =================================================
  // 3. РЕНДЕР СПИСКА СЛОВ (С ленивой загрузкой)
  // =================================================
   renderFilteredWordsList(words, level) {
      const wordsList = document.getElementById('wordsList');
      const BATCH_SIZE = 100;
      
      wordsList.innerHTML = '';

      // === ФИКС КНОПКИ "УЧИТЬ ВСЕ" ===
      const bulkBtn = document.getElementById('bulkToggleBtn');
      if(bulkBtn) {
          bulkBtn.style.display = 'inline-flex'; // Показываем кнопку
          this.updateBulkToggleButton();         // Обновляем её состояние
      }
      // ===============================

      // Если слов мало, рендерим сразу
      if (words.length <= BATCH_SIZE) {
          const fragment = document.createDocumentFragment();
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = words.map(w => this.createWordCard(w, level)).join('');
          while (tempDiv.firstChild) fragment.appendChild(tempDiv.firstChild);
          wordsList.appendChild(fragment);
          
          this.installWordsListDelegatedHandlers();
          return;
      }
      
      // Ленивая загрузка
      let loaded = 0;
      const renderBatch = () => {
          const batch = words.slice(loaded, loaded + BATCH_SIZE);
          if(batch.length === 0) return;
          const html = batch.map(w => this.createWordCard(w, level)).join('');
          wordsList.insertAdjacentHTML('beforeend', html);
          loaded += batch.length;
      };
      
      renderBatch();
      this.installWordsListDelegatedHandlers();
      
      const sentinel = document.createElement('div');
      sentinel.style.height = '50px';
      wordsList.appendChild(sentinel);
      
      const observer = new IntersectionObserver(entries => {
          if(entries[0].isIntersecting) {
              renderBatch();
              if(loaded >= words.length) {
                  observer.disconnect();
                  sentinel.remove();
              } else {
                  wordsList.appendChild(sentinel);
              }
          }
      }, { rootMargin: '200px' });
      
      observer.observe(sentinel);
  }

  // =================================================
  // 4. ГЛАВНАЯ ФУНКЦИЯ ПОКАЗА (Маршрутизатор Меню/Список)
  // =================================================
   showLevelWords(level, filter = null) {
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
    
    // Проверяем конфиг
    const config = this.getLevelCategoriesConfig();
    const levelConfig = config[level];

    // 1. ПОКАЗЫВАЕМ МЕНЮ КАТЕГОРИЙ (если нет фильтра) -> Тут Боб не нужен, меню легкое
    if (levelConfig && !filter) {
        if (title) title.textContent = `Уровень ${level}`;
        const bulkBtn = document.getElementById('bulkToggleBtn');
        if(bulkBtn) bulkBtn.style.display = 'none';

        this.renderLevelCategoriesMenu(level, levelConfig);
        this.jumpToTopStrict();
        return;
    }

    // 2. ПОКАЗЫВАЕМ СПИСОК СЛОВ -> ТУТ НУЖЕН БОБ
    const bulkBtn = document.getElementById('bulkToggleBtn');
    if(bulkBtn) {
        bulkBtn.style.display = 'inline-flex';
        this.updateBulkToggleButton();
    }

    let words = oxfordWordsDatabase[level] || [];
    
    if (filter && filter.type !== 'all') {
        if (filter.type === 'grammar') {
            words = words.filter(w => w.grammar === filter.id);
            if (title) title.textContent = `${level} • Грамматика`;
        } else if (filter.type === 'topic') {
            words = words.filter(w => w.topic === filter.id);
            const catName = levelConfig.topics.find(t => t.id === filter.id)?.name || 'Урок';
            if (title) title.textContent = `${level} • ${catName}`;
        }
    } else {
        if (title) title.textContent = `${level} - ${words.length} слов`;
    }
    
    if (wordsList) {
        // === ДОБАВЛЯЕМ БОБА ===
        wordsList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Загрузка...</div>';
        this.showGlobalLoader('Кот Боб открывает список...', 800);

        // Рендерим с небольшой задержкой, чтобы Боб успел появиться
        requestAnimationFrame(() => {
             this.renderFilteredWordsList(words, level);
             
             // Скрываем Боба после рендера (внутри renderFilteredWordsList это может быть не сделано)
             setTimeout(() => this.hideGlobalLoader(), 100);
        });
        // ======================
    }
    
    this.jumpToTopStrict();
  }

  // =================================================
  // 5. КНОПКА НАЗАД (С улучшенной логикой)
  // =================================================
    backToLevels() {
    // 1. Жестко останавливаем любой звук
    this.stopCurrentAudio();
    
    // 2. Сбрасываем флаг авто-озвучки, чтобы при следующем входе всё было чисто
    this.suppressAutoSpeakOnce = true; 

    const list = document.getElementById('wordsList');
    const isShowingList = list && list.querySelector('.word-card'); // Если есть карточки - значит мы в списке
    const hasCategories = this.currentLevel && this.getLevelCategoriesConfig()[this.currentLevel];

    // Если мы внутри категории (списка слов) — вернуться в МЕНЮ категорий
    if (isShowingList && hasCategories) {
        // Вызываем меню категорий
        this.showLevelWords(this.currentLevel); 
        return;
    }

    // Иначе — выход на главную страницу уровней
    this.toggleLevelsIndexVisibility(true);
    this.currentLevel = null;
    this.currentCategory = null;

    // Убираем возможные остатки авто-словаря (на всякий случай)
    document.querySelectorAll('#levels .auto-dict-top, #levels .auto-dict-inline')
      .forEach(n => n.remove());
      
      // Попытка запросить уведомления на первом же клике после визарда
const autoAskNotify = () => {
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => {
            if (p === 'granted') {
                localStorage.setItem('notifications_disabled', 'false');
                this.showNotification('Отлично! Я буду напоминать о словах', 'success');
            }
        });
    }
    document.removeEventListener('click', autoAskNotify);
};
document.addEventListener('click', autoAskNotify, { once: true });
      
  }
  
  
      startAppTutorial() {
    const settingsModal = document.querySelector('.settings-modal');
    if (settingsModal) settingsModal.remove();

    const steps = [
      // 1. Списки
      { 
        el: '.nav-item[data-section="levels"]', 
        text: 'Раздел "Списки". Здесь вся библиотека слов: по уровням, темам и грамматика.',
        pos: 'top',
        action: () => this.switchSection('levels')
      },
      // 2. Обучение (Главная)
      { 
        el: '.nav-item[data-section="learning"]', 
        text: 'Главный экран "Изучаю". Здесь твои карточки, квизы и тренажер предложений.',
        pos: 'top',
        action: () => this.switchSection('learning')
      },
      // 3. Игры (если есть кнопка в меню)
      {
        el: '.nav-item[data-section="games"]', // <-- ПРОВЕРЬ СЕЛЕКТОР КНОПКИ ИГР
        text: 'Игротека! Учись играючи. Аркады, гонки и головоломки со словами.',
        pos: 'top',
        action: () => this.switchSection('games') // <-- ПРОВЕРЬ ID СЕКЦИИ
      },
      // 4. ИИ Чат (если есть кнопка)
      {
        el: '.nav-item[data-section="grammar"]', // <-- ПРОВЕРЬ СЕЛЕКТОР
        text: 'Практикуй грамматику без ограничений',
        pos: 'top',
        action: () => this.switchSection('grammar') // <-- ПРОВЕРЬ ID
      },
      // 5. Переводчик
      {
        el: '.nav-item[data-section="new-words"]', 
        text: 'Переводчик. Введи любое слово, и я создам для него красивую карточку.',
        pos: 'top',
        action: () => this.switchSection('new-words')
      },
      // 6. Прогресс
      { 
        el: '.nav-item[data-section="progress"]', 
        text: 'Прогресс и Питомец. Заходи каждый день, чтобы кормить его своими знаниями!',
        pos: 'top',
        action: () => this.switchSection('progress')
      }
    ];

    this.currentTutorialStep = 0;
    // Начинаем с первого шага
    this.showTutorialStep(steps);
  }

   showTutorialStep(steps) {
    // 1. Удаляем старые элементы (оверлей и боба)
    document.querySelectorAll('.tutorial-overlay, .tutorial-bob-container').forEach(e => e.remove());

    // 2. Если шаги кончились -> Финиш
    if (this.currentTutorialStep >= steps.length) {
        this.showTutorialFinish();
        return;
    }

    const step = steps[this.currentTutorialStep];

    // 3. Выполняем действие (переключение вкладки)
    if (step.action && typeof step.action === 'function') {
        step.action();
    }

    // 4. Ждем 500мс, пока интерфейс обновится
    setTimeout(() => {
        const element = document.querySelector(step.el);

        // Если элемента нет — пропускаем шаг рекурсивно
        if (!element || element.offsetParent === null) {
            console.warn('Tutorial: Element not found or hidden:', step.el);
            this.currentTutorialStep++;
            this.showTutorialStep(steps); // Рекурсия
            return;
        }

        // 5. Рисуем подсветку (Overlay)
        const rect = element.getBoundingClientRect();
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        
        // Тень с "дыркой" через box-shadow
        overlay.style.cssText = `
            position: fixed;
            top: ${rect.top - 8}px;
            left: ${rect.left - 8}px;
            width: ${rect.width + 16}px;
            height: ${rect.height + 16}px;
            border-radius: 16px;
            box-shadow: 0 0 0 9999px rgba(0,0,0,0.75); 
            z-index: 99998;
            pointer-events: auto; 
            cursor: pointer;
            transition: all 0.4s ease;
        `;

        // 6. Рисуем Боба и Бабл
        const container = document.createElement('div');
        container.className = 'tutorial-bob-container';
        
        let topPos;
        const isTop = step.pos === 'top';
        
        // Вычисляем позицию Боба
        if (isTop) {
            topPos = rect.top - 240; // Над элементом
            if (topPos < 20) topPos = rect.bottom + 20; // Если не влезает — вниз
        } else {
            topPos = rect.bottom + 20; // Под элементом
        }

        container.style.cssText = `
            position: fixed;
            top: ${topPos}px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 300px;
            pointer-events: auto;
        `;

        // HTML Боба
        container.innerHTML = `
            <div class="tutorial-bubble" style="animation: popIn 0.3s ease;">
                <p>${step.text}</p>
                <div class="tutorial-controls">
                    <span style="font-size:12px; color:#999; font-weight:600;">${this.currentTutorialStep + 1} из ${steps.length}</span>
                    <button class="btn btn-primary btn-sm" id="tutNextBtn">Далее</button>
                </div>
                <div class="bubble-arrow ${isTop ? 'down' : 'up'}"></div>
            </div>
            <img src="/instruction.png" class="bob-img" style="width:110px; height:auto; margin-top:-12px; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.2));">
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(container);

        // 7. Обработчики кликов
        const next = () => {
            this.currentTutorialStep++;
            this.showTutorialStep(steps);
        };

        document.getElementById('tutNextBtn').onclick = next;
        
        // Клик по затемнению тоже переключает шаг
        overlay.onclick = (e) => {
            if (e.target === overlay) next();
        };

    }, 600); // Задержка для плавности
  }
  
requestNotificationPermission() {
    if (!('Notification' in window)) {
        this.showNotification('Уведомления не поддерживаются вашим браузером', 'warning');
        return;
    }
    
    // Проверка для iOS PWA: уведомления работают только если приложение добавлено на экран
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone || (window.matchMedia('(display-mode: standalone)').matches);
    
    if (isIOS && !isStandalone) {
         this.showNotification('На iPhone уведомления работают только если добавить приложение "На экран домой"', 'info');
         return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            localStorage.setItem('notifications_disabled', 'false');
            this.showNotification('Уведомления включены! Боб будет напоминать о словах.', 'success');
            // Сразу пробуем отправить тестовое, чтобы убедиться (через 5 сек)
            setTimeout(() => {
                 if(document.hidden) new Notification('Bewords', { body: 'Проверка связи! 🚀' });
            }, 5000);
            this.scheduleBobReminders();
        } else if (permission === 'denied') {
            this.showNotification('Вы запретили уведомления. Включите их в настройках телефона.', 'warning');
        }
    });
}
  scheduleBobReminders() {
    // Проверка раз в час
    setInterval(() => {
       if (localStorage.getItem('notifications_disabled') === 'true') return;
        // Если страница скрыта (пользователь не в приложении)
        if (document.hidden && Notification.permission === 'granted') {
            const now = new Date();
            // Не беспокоить ночью (с 22:00 до 08:00)
            if (now.getHours() >= 22 || now.getHours() < 8) return;

            const phrases = [
                "Эй! Слова остывают! 🔥",
                "Твой питомец хочет кушать 😿",
                "Зайди на 5 минут, не ленись!",
                "Time to study! Let's go!"
            ];
            
            // Шанс 10% каждый час (чтобы не спамить), или проверяй lastVisit
            if (Math.random() < 0.1) {
                new Notification('BeWords', {
                    body: phrases[Math.floor(Math.random() * phrases.length)],
                    icon: '/icon-192.png',
                    vibrate: [200, 100, 200]
                });
            }
        }
    }, 60 * 60 * 1000); 
  }

   showTutorialFinish() {
      const overlay = document.createElement('div');
      overlay.className = 'tutorial-overlay';
      overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:99999; display:flex; align-items:center; justify-content:center;';
      
      // Ставим флаг, что туториал пройден
      localStorage.setItem('tutorial_complete_forever', '1');
      
      overlay.innerHTML = `
        <div style="background:white; padding:30px; border-radius:20px; text-align:center; max-width:320px; animation: popIn 0.4s;">
            <img src="/instruction.png" style="width:100px; margin-bottom:15px;">
            <h2 style="margin-bottom:10px; color:#333;">Ты готов! 🚀</h2>
            <p style="color:#666; margin-bottom:20px;">Хочешь, я подберу слова специально для твоего уровня?</p>
            
            <button class="btn btn-success" id="finishWizardBtn" style="width:100%; margin-bottom:10px;">
               <i class="fas fa-magic"></i> Подобрать программу
            </button>
            
            <button class="btn btn-secondary" onclick="this.closest('.tutorial-overlay').remove()" style="width:100%;">
               Я сам выберу
            </button>
        </div>
      `;
      document.body.appendChild(overlay);
      
      // Обработчик для кнопки Визарда
      document.getElementById('finishWizardBtn').onclick = () => {
          overlay.remove();
          this.showOnboardingWizard();
      };
  }

static injectStylesOnce() {
    if (document.getElementById('app-extra-styles')) return;
    const style = document.createElement('style');
    style.id = 'app-extra-styles';
    style.textContent = ` 
@keyframes slideDown {
    from { transform: translate(-50%, -100%); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
}
@keyframes slideUp {
    from { transform: translate(-50%, 0); opacity: 1; }
    to { transform: translate(-50%, -100%); opacity: 0; }
}
.sound-actions .mini-btn, .option-sound .mini-btn {
    border:none; 
    background: var(--bg-tertiary, #f0f2f5); 
    padding:4px 6px; 
    border-radius:6px; 
    cursor:pointer; 
    color:#333; 
}
.quiz-option .quiz-option-inner {
    display:flex; 
    align-items:center; 
    justify-content:space-between; 
    gap:8px; 
}

/* Подсветка активного пункта меню во время тура */
.bottom-nav .nav-item.nav-highlight {
    position: relative;
    box-shadow: 0 0 0 6px rgba(99,102,241,0.3);
    border-radius: 12px;
}

/* Мини-игра питомец (прогресс) */
.pet-widget{
    background:var(--bg-secondary);
    border:1px solid var(--border-color);
    border-radius:14px;
    padding:12px;
    margin-bottom:14px;
}
.pet-header{
    display:flex;
    align-items:center;
    gap:10px;
    margin-bottom:10px;
}
.pet-avatar{
    width:56px;
    height:56px;
    object-fit:contain;
    border-radius:10px;
    background:#fff;
    border:1px solid var(--border-color);
}
.pet-title{
    font-weight:800;
    color:var(--text-primary);
}
.pet-bars{
    display:grid;
    gap:8px;
    margin:8px 0 10px;
}
.pet-bar{
    height:10px;
    background:#e5e7eb;
    border-radius:8px;
    overflow:hidden;
}
.pet-bar-fill{
    height:100%;
    background:linear-gradient(90deg,#10b981,#22d3ee);
}
.pet-actions{
    display:flex;
    flex-wrap:wrap;
    gap:8px;
}
.pet-dead{
    color:#ef4444;
    font-weight:700;
    margin:8px 0;
}
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
`;
    document.head.appendChild(style);
}
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  EnglishWordsApp.injectStylesOnce();
  window.app = new EnglishWordsApp();
});

