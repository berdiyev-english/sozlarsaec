// 🆕 Версия политики для логирования
const CONSENT_VERSION = 'v1.0-2026-08-09';
const PRIVACY_URL = 'https://bewords.ru/privacy-policy';
const AGREEMENT_URL = 'https://bewords.ru/user-agreement';

var supabaseUrl = 'https://api.bewords.ru';
var supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg2MzU4ODQ3LCJleHAiOjIxMDE3MTg4NDd9.-U9BDkhwCoa7IKTRzRSx7ovFomQI9hbLZCoAOYaFWtc';

var SITE_URL = 'https://bewords.ru/';
function getAuthRedirectBase() {
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        return 'bewords://';
    }
    // ✅ Возвращаем домен + путь, чтобы оказаться на той же странице
    return window.location.origin + window.location.pathname;
}

// ✅ КЛЮЧЕВОЕ: detectSessionInUrl + autoRefreshToken
var supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey, {
        auth: {
            detectSessionInUrl: true,
            autoRefreshToken: true,
            persistSession: true,
            flowType: 'pkce'
        }
    });
}

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isLoginMode = false;
        this.isResetMode = false;
        this.isRecoveringPassword = false;
        this.lastCustomMessage = null;

        this._lastAuthEvent = null;
        this._lastEventTime = 0;
        this.isProcessing = false;  // 🆕 защита от двойного клика
        this.init();
    }

async init() {
    if (!supabaseClient) return;
    
    let initialSessionHandled = false;
    
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        const now = Date.now();
        if (event === this._lastAuthEvent && (now - this._lastEventTime) < 2000) {
            return;
        }
        this._lastAuthEvent = event;
        this._lastEventTime = now;

        this.currentUser = session ? session.user : null;

        // 🆕 ИСПРАВЛЕНИЕ: Обрабатываем INITIAL_SESSION правильно
        if (event === 'INITIAL_SESSION') {
            initialSessionHandled = true;
            if (this.currentUser) {
                await this.checkPolicyUpdateOnLoad();
            }
            return;
        }
        
        if (event === 'TOKEN_REFRESHED') return;
        if (event === 'USER_UPDATED') return;

        if (event === 'PASSWORD_RECOVERY') {
            this.isRecoveringPassword = true;
            this.showUpdatePasswordModal();
            return;
        }

        if (event === 'SIGNED_IN') {
            const wasGoogle = sessionStorage.getItem('_authAction') === 'google';
            const wasLogin = sessionStorage.getItem('_authAction') === 'login';

            if (wasGoogle && session?.user) {
                await this.ensureConsentLogged(session.user, session.user.email, 'oauth_registration');
            }

            if ((wasGoogle || wasLogin) && typeof app !== 'undefined') {
                app.showNotification('Успешный вход!', 'success');
            }

            sessionStorage.removeItem('_authAction');
            this.closeModal();
            setTimeout(() => this._cleanOAuthHash(), 500);
            return;
        }

        if (event === 'SIGNED_OUT') {
            localStorage.removeItem('bewords_consent_cache');
            const wasLogout = sessionStorage.getItem('_authAction') === 'logout';
            if (wasLogout && typeof app !== 'undefined') {
                app.showNotification('Вы вышли из аккаунта', 'info');
            }
            sessionStorage.removeItem('_authAction');
            this.closeModal();
            return;
        }
    });

    // 🆕 ИСПРАВЛЕНИЕ: Ждем небольшую задержку перед getSession
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!initialSessionHandled) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        this.currentUser = session ? session.user : null;
        
        if (this.currentUser) {
            await this.checkPolicyUpdateOnLoad();
        }
    }


        // ==========================================
        // 4. Кнопка профиля
        // ==========================================
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            const newBtn = profileBtn.cloneNode(true);
            profileBtn.parentNode.replaceChild(newBtn, profileBtn);
            newBtn.addEventListener('click', () => {
                this.isLoginMode = false;
                this.isResetMode = false;
                this.showProfileModal();
            });
        }

        // ==========================================
        // 5. Восстановление пароля
        // ==========================================
        if (window.location.hash.includes('type=recovery')) {
            this.isRecoveringPassword = true;
            this.showUpdatePasswordModal();
        }
    }

    // ==========================================
    // Очистка OAuth-хеша из URL
    // ==========================================
    _cleanOAuthHash() {
    try {
        const hash = window.location.hash;
        const search = window.location.search;
        const url = window.location.pathname;
        
        // 🆕 ИСПРАВЛЕНИЕ: Проверяем наличие OAuth параметров
        const hasOAuthParams = (hash && (hash.includes('access_token') || hash.includes('type='))) ||
                              (search && (search.includes('code=') || search.includes('type=')));
        
        if (hasOAuthParams) {
            window.history.replaceState(null, '', url);
            console.log('✅ OAuth URL очищен');
        }
    } catch (e) {
        console.warn('Ошибка очистки OAuth URL:', e);
    }
}

    // ==========================================
    // ЗАГЛУШКИ
    // ==========================================
    triggerCloudSave() {}
    async syncToCloud() {}
    async syncFromCloud() {}

    // ==========================================
    // UI (без изменений, кроме Google-кнопки и Logout)
    // ==========================================
    showProfileModal(customMessage = null) {
        if (customMessage) this.lastCustomMessage = customMessage;
        this.closeModal();

        const overlay = document.createElement('div');
        overlay.id = 'authOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.3s;';

        const modal = document.createElement('div');
        modal.id = 'authModalContent';
        modal.style.cssText = 'background:var(--bg-primary);border-radius:16px;padding:24px;max-width:400px;width:100%;box-shadow:var(--shadow-lg);position:relative;animation:slideDown 0.3s;';

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.closest('.close-auth')) this.closeModal();
        });

        this.renderModalInner();
    }

    renderModalInner() {
        const modal = document.getElementById('authModalContent');
        if (!modal) return;

        // 1. КАБИНЕТ
        if (this.currentUser && !this.isRecoveringPassword) {
            const avatarUrl = this.currentUser.user_metadata?.avatar_url;
            const avatarHtml = avatarUrl
                ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                : `<i class="fas fa-user"></i>`;

            modal.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                    <h2 style="margin:0;">Личный кабинет</h2>
                    <button class="btn btn-secondary close-auth" style="padding:5px 10px;"><i class="fas fa-times"></i></button>
                </div>
                <div style="text-align:center;margin-bottom:20px;">
                    <div style="width:80px;height:80px;background:var(--primary-color);border-radius:50%;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;color:white;font-size:2rem;overflow:hidden;border:3px solid #10b981;">
                        ${avatarHtml}
                    </div>
                    <div style="font-weight:bold;color:var(--text-primary);font-size:1.1rem;">${this.currentUser.user_metadata?.full_name || this.currentUser.email}</div>
                    <div style="font-size:0.85rem;color:#10b981;margin-top:5px;font-weight:bold;">
                        <i class="fas fa-mobile-alt"></i> Данные хранятся на устройстве
                    </div>
                </div>
                <div id="profileDonateBtn" style="margin-bottom:20px;background:linear-gradient(135deg,#f6d365 0%,#fda085 100%);padding:15px;border-radius:12px;cursor:pointer;text-align:center;">
                    <div style="color:#9a3412;font-weight:900;font-size:1.1rem;margin-bottom:5px;"><i class="fas fa-gift"></i> Поддержать проект</div>
                </div>
                <button class="btn btn-secondary" id="logoutBtn" style="width:100%;padding:14px;font-weight:bold;color:#ef4444;">
                    <i class="fas fa-sign-out-alt"></i> Выйти из аккаунта
                </button>
            `;

            // ✅ Флаг в sessionStorage (переживает перезагрузку)
            document.getElementById('logoutBtn').onclick = () => {
                sessionStorage.setItem('_authAction', 'logout');
                supabaseClient.auth.signOut();
            };

            document.getElementById('profileDonateBtn').onclick = () => {
                this.closeModal();
                if (typeof app !== 'undefined') app.showSupportModal();
            };
            return;
        }

        // 2. СБРОС ПАРОЛЯ
        if (this.isResetMode) {
            modal.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                    <h2 style="margin:0;">Сброс пароля</h2>
                    <button class="btn btn-secondary close-auth" style="padding:5px 10px;"><i class="fas fa-times"></i></button>
                </div>
                <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:15px;">Введите Email для сброса.</p>
                <input type="email" id="authEmail" placeholder="Ваш Email" style="width:100%;padding:14px;border-radius:12px;border:1px solid var(--border-color);margin-bottom:15px;background:var(--bg-secondary);color:var(--text-primary);font-size:1rem;">
                <div id="authError" style="color:#ef4444;font-size:0.85rem;margin-bottom:10px;display:none;text-align:center;font-weight:bold;"></div>
                <button class="btn btn-primary" id="mainAuthBtn" style="width:100%;font-weight:900;padding:14px;font-size:1.1rem;">Отправить ссылку</button>
                <button class="btn btn-secondary" id="backToLoginBtn" style="width:100%;margin-top:10px;padding:12px;">Назад ко входу</button>
            `;
            document.getElementById('mainAuthBtn').onclick = () => this.handleAuth('reset');
            document.getElementById('backToLoginBtn').onclick = () => { this.isResetMode = false; this.renderModalInner(); };
            return;
        }

// 3. ВХОД / РЕГИСТРАЦИЯ
let hookHtml = this.lastCustomMessage
    ? `<div style="text-align:center;margin-bottom:15px;background:var(--bg-secondary);padding:15px;border-radius:12px;">
         <img src="/instructor.png" style="width:70px;margin-bottom:10px;">
         <div style="color:#f59e0b;font-weight:800;font-size:1rem;line-height:1.3;">${this.lastCustomMessage}</div>
       </div>`
    : '';

const mainBtnText = this.isLoginMode ? 'Войти в аккаунт' : 'Создать аккаунт';

// 🆕 Галочка показывается ВСЕГДА (и при входе, и при регистрации)
const consentHtml = `
    <div style="display:flex;align-items:flex-start;gap:8px;margin:15px 0;padding:12px;background:var(--bg-secondary);border-radius:10px;">
        <input type="checkbox" id="consentCheckbox" style="margin-top:2px;width:18px;height:18px;cursor:pointer;accent-color:#10b981;flex-shrink:0;">
        <label for="consentCheckbox" style="font-size:0.82rem;color:var(--text-secondary);line-height:1.4;cursor:pointer;user-select:none;">
            Я согласен с 
            <a href="${PRIVACY_URL}" target="_blank" rel="noopener" style="color:var(--primary-color);text-decoration:underline;font-weight:600;" onclick="event.stopPropagation()">Политикой конфиденциальности</a> 
            и 
            <a href="${AGREEMENT_URL}" target="_blank" rel="noopener" style="color:var(--primary-color);text-decoration:underline;font-weight:600;" onclick="event.stopPropagation()">Пользовательским соглашением</a>
        </label>
    </div>
`;

modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h2 style="margin:0;">BeWords</h2>
        <button class="btn btn-secondary close-auth" style="padding:5px 10px;"><i class="fas fa-times"></i></button>
    </div>
    <p style="color:var(--text-secondary);font-size:0.9rem;margin:0 0 15px 0;line-height:1.3;">
        Создай аккаунт, чтобы в будущем синхронизировать прогресс между устройствами.
    </p>
    ${hookHtml}
    <div style="display:flex;background:var(--bg-secondary);border-radius:12px;padding:5px;margin-bottom:20px;">
        <button id="tabRegister" style="flex:1;padding:10px;border:none;border-radius:8px;font-weight:bold;font-size:0.95rem;cursor:pointer;background:${!this.isLoginMode ? 'var(--bg-primary)' : 'transparent'};box-shadow:${!this.isLoginMode ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'};color:var(--text-primary);transition:all 0.2s;">Регистрация</button>
        <button id="tabLogin" style="flex:1;padding:10px;border:none;border-radius:8px;font-weight:bold;font-size:0.95rem;cursor:pointer;background:${this.isLoginMode ? 'var(--bg-primary)' : 'transparent'};box-shadow:${this.isLoginMode ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'};color:var(--text-primary);transition:all 0.2s;">Вход</button>
    </div>
    <button id="googleLoginBtn" style="width:100%;padding:12px;border-radius:12px;border:2px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);font-weight:bold;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:15px;opacity:0.5;cursor:not-allowed;">
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" style="width:20px;height:20px;">
        Продолжить с Google
    </button>
    <div style="display:flex;align-items:center;margin:15px 0;">
        <div style="flex:1;height:1px;background:var(--border-color);"></div>
        <div style="padding:0 10px;color:var(--text-secondary);font-size:0.8rem;font-weight:bold;">ИЛИ EMAIL</div>
        <div style="flex:1;height:1px;background:var(--border-color);"></div>
    </div>
    <input type="email" id="authEmail" placeholder="Ваш Email" style="width:100%;padding:14px;border-radius:12px;border:1px solid var(--border-color);margin-bottom:10px;background:var(--bg-secondary);color:var(--text-primary);font-size:1rem;">
    <input type="password" id="authPassword" placeholder="Пароль" style="width:100%;padding:14px;border-radius:12px;border:1px solid var(--border-color);margin-bottom:10px;background:var(--bg-secondary);color:var(--text-primary);font-size:1rem;">
    ${consentHtml}
    <div id="authError" style="color:#ef4444;font-size:0.85rem;margin-bottom:10px;display:none;text-align:center;font-weight:bold;"></div>
    <button class="btn btn-primary" id="mainAuthBtn" style="width:100%;font-weight:900;margin-bottom:10px;padding:14px;font-size:1.1rem;box-shadow:0 4px 0 rgba(0,0,0,0.2);opacity:0.5;cursor:not-allowed;">${mainBtnText}</button>
    ${this.isLoginMode
        ? `<div style="text-align:center;margin-top:10px;"><button id="forgotBtn" style="background:none;border:none;color:var(--text-secondary);text-decoration:underline;cursor:pointer;font-size:0.9rem;">Забыли пароль?</button></div>`
        : `<div style="text-align:center;margin-top:10px;"><button id="switchToLoginBtn" style="background:none;border:none;color:var(--text-secondary);text-decoration:underline;cursor:pointer;font-size:0.9rem;">Уже есть аккаунт?</button></div>`
    }
`;

// 🆕 Обработчик чекбокса — включает/выключает кнопки
const consentCheckbox = document.getElementById('consentCheckbox');
if (consentCheckbox) {
    consentCheckbox.addEventListener('change', () => {
        const checked = consentCheckbox.checked;
        const mainBtn = document.getElementById('mainAuthBtn');
        const googleBtn = document.getElementById('googleLoginBtn');
        
        if (mainBtn) {
            mainBtn.style.opacity = checked ? '1' : '0.5';
            mainBtn.style.cursor = checked ? 'pointer' : 'not-allowed';
        }
        if (googleBtn) {
            googleBtn.style.opacity = checked ? '1' : '0.5';
            googleBtn.style.cursor = checked ? 'pointer' : 'not-allowed';
        }
    });
}

document.getElementById('tabRegister').onclick = () => { this.isLoginMode = false; this.renderModalInner(); };
document.getElementById('tabLogin').onclick = () => { this.isLoginMode = true; this.renderModalInner(); };
// 🆕 Проверка согласия ВСЕГДА (и при входе, и при регистрации)
document.getElementById('mainAuthBtn').onclick = () => {
    if (this.isProcessing) return;  // 🆕 защита от двойного клика

    const consentCheckbox = document.getElementById('consentCheckbox');
    if (consentCheckbox && !consentCheckbox.checked) {
        this.showAuthError('Пожалуйста, согласитесь с условиями');
        return;
    }
    this.handleAuth(this.isLoginMode ? 'login' : 'register');
};

// 🆕 Проверка согласия ВСЕГДА
document.getElementById('googleLoginBtn').onclick = async () => {
    if (this.isProcessing) return;  // 🆕 защита от двойного клика

    const consentCheckbox = document.getElementById('consentCheckbox');
    if (consentCheckbox && !consentCheckbox.checked) {
        this.showAuthError('Пожалуйста, согласитесь с условиями');
        return;
    }
    
    const googleBtn = document.getElementById('googleLoginBtn');
    this.isProcessing = true;
    this._setLoading(true, googleBtn);

    sessionStorage.setItem('_authAction', this.isLoginMode ? 'login' : 'google');
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: getAuthRedirectBase()
        }
    });
    if (error) {
        sessionStorage.removeItem('_authAction');
        this.showAuthError(error.message);
        this.isProcessing = false;
        this._setLoading(false, googleBtn);
    }
    // При успехе — редирект на Google, разблокировка не нужна
};

if (this.isLoginMode) {
    document.getElementById('forgotBtn').onclick = () => { this.isResetMode = true; this.renderModalInner(); };
} else {
    document.getElementById('switchToLoginBtn').onclick = () => { this.isLoginMode = true; this.renderModalInner(); };
}
    }

    showAuthError(msg) {
        const el = document.getElementById('authError');
        if (el) {
            el.textContent = msg;
            el.style.color = '#ef4444';
            el.style.display = 'block';
        }
    }

    showUpdatePasswordModal() {
        this.closeModal();
        const overlay = document.createElement('div');
        overlay.id = 'authOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:20px;';
        const modal = document.createElement('div');
        modal.style.cssText = 'background:var(--bg-primary);border-radius:16px;padding:24px;max-width:400px;width:100%;box-shadow:var(--shadow-lg);text-align:center;';
        modal.innerHTML = `
            <h2 style="margin-top:0;">Новый пароль 🔐</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:20px;">Придумайте новый пароль.</p>
            <input type="password" id="newPasswordInput" placeholder="Минимум 6 символов" style="width:100%;padding:14px;border-radius:12px;border:1px solid var(--border-color);margin-bottom:15px;background:var(--bg-secondary);color:var(--text-primary);font-size:1rem;">
            <div id="updateError" style="color:#ef4444;font-size:0.85rem;margin-bottom:10px;display:none;font-weight:bold;"></div>
            <button class="btn btn-primary" id="saveNewPasswordBtn" style="width:100%;font-weight:bold;padding:14px;">Сохранить пароль</button>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        document.getElementById('saveNewPasswordBtn').onclick = async () => {
            const newPass = document.getElementById('newPasswordInput').value.trim();
            const errEl = document.getElementById('updateError');
            if (newPass.length < 6) { errEl.textContent = 'Минимум 6 символов'; errEl.style.display = 'block'; return; }
            const { error } = await supabaseClient.auth.updateUser({ password: newPass });
            if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; }
            else {
                this.isRecoveringPassword = false;
                if (typeof app !== 'undefined') app.showNotification('Пароль изменён!', 'success');
                this.closeModal();
            }
        };
    }

    // 🆕 Логирование согласия в Supabase
async logConsent(user, email, consentType = 'registration') {
    try {
        const userAgent = navigator.userAgent;
        let ipAddress = null;
        
        // Получаем IP через внешний сервис (опционально, можно убрать)
        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            ipAddress = ipData.ip;
        } catch (e) {
            // Если не получилось — ничего страшного
            console.warn('Не удалось получить IP:', e);
        }

        const { error } = await supabaseClient
            .from('consent_log')
            .insert({
            user_id: user.id,
            consent_version: CONSENT_VERSION,
            consent_type: consentType,
            ip_address: ipAddress,
            user_agent: userAgent
            });

        if (error) {
            console.warn('Не удалось сохранить лог согласия:', error);
        } else {
            console.log('✅ Согласие залогировано');
        }
    } catch (e) {
        console.warn('Ошибка при логировании согласия:', e);
    }
}

       // ==========================================
    // 🆕 УМНОЕ ЛОГИРОВАНИЕ СОГЛАСИЯ (с кэшем в localStorage)
    // ==========================================
    async ensureConsentLogged(user, email, consentType) {
        const CACHE_KEY = 'bewords_consent_cache';
        try {
            // 1. Проверяем локальный кэш (0 запросов к серверу)
            let cache = null;
            try { cache = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch(e) {}
            if (cache && cache.user_id === user.id && cache.version === CONSENT_VERSION) {
                return; // согласие текущей версии уже есть
            }

            // 2. Кэш не совпал → один запрос к серверу
            const { data: allConsents, error } = await supabaseClient
                .from('consent_log')
                .select('consent_version')
                .eq('user_id', user.id);

            if (error) throw error;

            const hasCurrentVersion = (allConsents || []).some(c => c.consent_version === CONSENT_VERSION);
            if (hasCurrentVersion) {
                // согласие есть → кэшируем, чтобы больше не дёргать сервер
                localStorage.setItem(CACHE_KEY, JSON.stringify({ user_id: user.id, version: CONSENT_VERSION }));
                return;
            }

            // 3. Согласия текущей версии нет → логируем
            //    Если были старые версии → это обновление политики
            const finalType = (allConsents && allConsents.length > 0) ? 'policy_update' : consentType;
            await this.logConsent(user, email, finalType);

            // 4. Кэшируем после успешной записи
            localStorage.setItem(CACHE_KEY, JSON.stringify({ user_id: user.id, version: CONSENT_VERSION }));
        } catch (e) {
            console.warn('Ошибка при проверке/логировании согласия:', e);
        }
    }

    // ==========================================
    // 🆕 ПРОВЕРКА ОБНОВЛЕНИЯ ПОЛИТИКИ ПРИ ЗАГРУЗКЕ ПРИЛОЖЕНИЯ
    // ==========================================
    async checkPolicyUpdateOnLoad() {
        if (!this.currentUser) return;
        const CACHE_KEY = 'bewords_consent_cache';
        try {
            let cache = null;
            try { cache = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch(e) {}
            if (cache && cache.user_id === this.currentUser.id && cache.version === CONSENT_VERSION) {
                return; // всё актуально
            }

            const { data: allConsents, error } = await supabaseClient
                .from('consent_log')
                .select('consent_version')
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            const hasCurrentVersion = (allConsents || []).some(c => c.consent_version === CONSENT_VERSION);
            if (hasCurrentVersion) {
                localStorage.setItem(CACHE_KEY, JSON.stringify({ user_id: this.currentUser.id, version: CONSENT_VERSION }));
                return;
            }

            // Политика обновилась, а пользователь ещё не подтвердил → показать модалку
            this.showPolicyUpdateModal();
        } catch (e) {
            console.warn('Ошибка проверки версии политики:', e);
        }
    }

    // ==========================================
    // 🆕 МОДАЛКА ПОВТОРНОГО СОГЛАСИЯ (при обновлении политики)
    // ==========================================
    showPolicyUpdateModal() {
        this.closeModal();
        const overlay = document.createElement('div');
        overlay.id = 'authOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:20px;';
        const modal = document.createElement('div');
        modal.style.cssText = 'background:var(--bg-primary);border-radius:16px;padding:24px;max-width:400px;width:100%;box-shadow:var(--shadow-lg);text-align:center;';
        modal.innerHTML = `
            <h2 style="margin-top:0;">📜 Обновление политики</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.4;margin-bottom:20px;">
                Мы обновили Политику конфиденциальности и Пользовательское соглашение.
                Пожалуйста, ознакомьтесь и подтвердите согласие, чтобы продолжить использовать BeWords.
            </p>
            <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:20px;padding:12px;background:var(--bg-secondary);border-radius:10px;text-align:left;">
                <input type="checkbox" id="policyUpdateCheckbox" style="margin-top:2px;width:18px;height:18px;cursor:pointer;accent-color:#10b981;flex-shrink:0;">
                <label for="policyUpdateCheckbox" style="font-size:0.85rem;color:var(--text-secondary);line-height:1.4;cursor:pointer;">
                    Я согласен с обновлённой 
                    <a href="${PRIVACY_URL}" target="_blank" rel="noopener" style="color:var(--primary-color);text-decoration:underline;">Политикой конфиденциальности</a> 
                    и 
                    <a href="${AGREEMENT_URL}" target="_blank" rel="noopener" style="color:var(--primary-color);text-decoration:underline;">Пользовательским соглашением</a>
                </label>
            </div>
            <button class="btn btn-primary" id="acceptPolicyBtn" style="width:100%;font-weight:900;padding:14px;opacity:0.5;cursor:not-allowed;">Принять и продолжить</button>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const checkbox = document.getElementById('policyUpdateCheckbox');
        const acceptBtn = document.getElementById('acceptPolicyBtn');

        checkbox.addEventListener('change', () => {
            acceptBtn.style.opacity = checkbox.checked ? '1' : '0.5';
            acceptBtn.style.cursor = checkbox.checked ? 'pointer' : 'not-allowed';
        });

        acceptBtn.onclick = async () => {
            if (!checkbox.checked || this.isProcessing) return;
            this.isProcessing = true;
            acceptBtn.disabled = true;
            acceptBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохраняем...';
            try {
                await this.logConsent(this.currentUser, this.currentUser.email, 'policy_update');
                localStorage.setItem('bewords_consent_cache', JSON.stringify({ user_id: this.currentUser.id, version: CONSENT_VERSION }));
                if (typeof app !== 'undefined') app.showNotification('Согласие обновлено!', 'success');
                overlay.remove();
            } catch(e) {
                console.warn(e);
                acceptBtn.disabled = false;
                acceptBtn.textContent = 'Принять и продолжить';
            } finally {
                this.isProcessing = false;
            }
        };
    }

    // ==========================================
    // 🆕 БЛОКИРОВКА/РАЗБЛОКИРОВКА КНОПОК (защита от двойного клика)
    // ==========================================
    _setLoading(loading, btn) {
        if (!btn) return;
        const consent = document.getElementById('consentCheckbox');
        const consentOk = consent ? consent.checked : true;

        btn.disabled = loading;
        if (loading) {
            if (!btn.dataset.origHtml) btn.dataset.origHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Подождите...';
            btn.style.opacity = '0.6';
            btn.style.cursor = 'wait';
        } else {
            if (btn.dataset.origHtml) {
                btn.innerHTML = btn.dataset.origHtml;
                delete btn.dataset.origHtml;
            }
            btn.style.opacity = consentOk ? '1' : '0.5';
            btn.style.cursor = consentOk ? 'pointer' : 'not-allowed';
        }
    }

    closeModal() {
        this.lastCustomMessage = null;
        this.isResetMode = false;
        const overlay = document.getElementById('authOverlay');
        if (overlay) overlay.remove();
    }

    async handleAuth(type) {
    if (this.isProcessing) return;

    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword') ? document.getElementById('authPassword').value.trim() : '';
    const errorEl = document.getElementById('authError');
    const mainBtn = document.getElementById('mainAuthBtn');

    if (!email) { 
        errorEl.textContent = 'Введите Email'; 
        errorEl.style.color = '#ef4444'; 
        errorEl.style.display = 'block'; 
        return; 
    }

    // === СБРОС ПАРОЛЯ ===
    if (type === 'reset') {
        this.isProcessing = true;
        this._setLoading(true, mainBtn);
        errorEl.style.display = 'none';
        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: getAuthRedirectBase()
            });
            if (error) { 
                console.error('Reset error:', error);
                errorEl.textContent = error.message; 
                errorEl.style.color = '#ef4444'; 
            }
            else { 
                errorEl.innerHTML = '✅ Ссылка отправлена!'; 
                errorEl.style.color = '#10b981'; 
            }
            errorEl.style.display = 'block';
        } finally {
            this.isProcessing = false;
            this._setLoading(false, mainBtn);
        }
        return;
    }

    if (!password) { 
        errorEl.textContent = 'Введите пароль'; 
        errorEl.style.color = '#ef4444'; 
        errorEl.style.display = 'block'; 
        return; 
    }

    errorEl.style.display = 'none';

    const consentCheckbox = document.getElementById('consentCheckbox');
    if ((type === 'register' || type === 'login') && consentCheckbox && !consentCheckbox.checked) {
        errorEl.textContent = 'Необходимо согласие с условиями';
        errorEl.style.color = '#ef4444';
        errorEl.style.display = 'block';
        return;
    }

    this.isProcessing = true;
    this._setLoading(true, mainBtn);

    let result;
    try {
        if (type === 'register') {
            console.log('📝 Регистрация:', email);
            result = await supabaseClient.auth.signUp({ email, password });
            console.log('📝 Результат регистрации:', result);
            
            if (!result.error && result.data.user) {
                await this.logConsent(result.data.user, email, 'registration');
                localStorage.setItem('bewords_consent_cache', JSON.stringify({
                    user_id: result.data.user.id,
                    version: CONSENT_VERSION
                }));
                
                if (!result.data.session) {
                    errorEl.style.color = '#10b981';
                    errorEl.innerHTML = '🎉 Письмо отправлено! Проверьте почту.';
                    errorEl.style.display = 'block';
                    this.isProcessing = false;
                    this._setLoading(false, mainBtn);
                    return;
                }
                sessionStorage.setItem('_authAction', 'login');
            }
        } else {
            sessionStorage.setItem('_authAction', 'login');
            console.log('🔑 Вход:', email);
            result = await supabaseClient.auth.signInWithPassword({ email, password });
            console.log('🔑 Результат входа:', result);

            if (!result.error && result.data.user) {
                await this.ensureConsentLogged(result.data.user, email, 'login_consent');
            }
        }

        if (result.error) {
            console.error('❌ Ошибка аутентификации:', result.error);
            console.error('❌ Код ошибки:', result.error.status);
            console.error('❌ Сообщение:', result.error.message);
            
            sessionStorage.removeItem('_authAction');
            errorEl.style.color = '#ef4444';
            
            let errorMessage = result.error.message;
            if (errorMessage.includes('Invalid login') || errorMessage.includes('Invalid credentials')) {
                errorMessage = 'Неверный Email или пароль';
            } else if (errorMessage.includes('Email not confirmed')) {
                errorMessage = 'Подтвердите email по ссылке в почте';
            }
            
            errorEl.textContent = errorMessage;
            errorEl.style.display = 'block';
        }
    } catch (e) {
        console.error('💥 Критическая ошибка:', e);
        errorEl.style.color = '#ef4444';
        errorEl.textContent = 'Произошла ошибка. Попробуйте еще раз.';
        errorEl.style.display = 'block';
    } finally {
        this.isProcessing = false;
        this._setLoading(false, mainBtn);
    }
}
}

window.authManager = new AuthManager();
