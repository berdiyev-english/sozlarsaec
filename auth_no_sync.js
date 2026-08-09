// 🆕 Версия политики для логирования
const CONSENT_VERSION = 'v1.0-2026-08-09';
const PRIVACY_URL = 'https://bewords.ru/privacy-policy';
const AGREEMENT_URL = 'https://bewords.ru/user-agreement';

var supabaseUrl = 'https://dyiwuslfjnvirbxfafuq.supabase.co';
var supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aXd1c2xmam52aXJieGZhZnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTU1MTEsImV4cCI6MjA5MDM5MTUxMX0.c61rc2C2YOWCMF0JdmvdcrsCdoyfJNOkFLDoxZN1N5U';

var SITE_URL = 'https://bewords.ru/';
function getAuthRedirectBase() {
    // В приложении ссылки из писем ведут на сайт (их открывают в браузере/почте)
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        return SITE_URL;
    }
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

        this.init();
    }

    async init() {
        if (!supabaseClient) return;   // Supabase не загрузился — авторизация недоступна
        // ==========================================
        // 1. СНАЧАЛА регистрируем обработчик
        //    (ДО getSession, чтобы не пропустить событие)
        // ==========================================
        supabaseClient.auth.onAuthStateChange((event, session) => {
            const now = Date.now();
            if (event === this._lastAuthEvent && (now - this._lastEventTime) < 2000) {
                return;
            }
            this._lastAuthEvent = event;
            this._lastEventTime = now;

            this.currentUser = session ? session.user : null;

            if (event === 'INITIAL_SESSION') return;
            if (event === 'TOKEN_REFRESHED') return;
            if (event === 'USER_UPDATED') return;

            if (event === 'PASSWORD_RECOVERY') {
                this.isRecoveringPassword = true;
                this.showUpdatePasswordModal();
                return;
            }

            if (event === 'SIGNED_IN') {
    // ✅ Проверяем флаг в sessionStorage
    const wasGoogle = sessionStorage.getItem('_authAction') === 'google';
    const wasLogin = sessionStorage.getItem('_authAction') === 'login';

    // 🆕 Если это была первая регистрация через Google — логируем согласие
    if (wasGoogle && session?.user) {
        // Проверяем, нет ли уже записи о согласии
        const { data: existingConsent } = await supabaseClient
            .from('consent_log')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1);

        if (!existingConsent || existingConsent.length === 0) {
            await this.logConsent(
                session.user, 
                session.user.email, 
                'oauth_registration'
            );
        }
    }

    if ((wasGoogle || wasLogin) && typeof app !== 'undefined') {
        app.showNotification('Успешный вход!', 'success');
    }

    sessionStorage.removeItem('_authAction');
    this.closeModal();
    this._cleanOAuthHash();
    return;
}

            if (event === 'SIGNED_OUT') {
                const wasLogout = sessionStorage.getItem('_authAction') === 'logout';
                if (wasLogout && typeof app !== 'undefined') {
                    app.showNotification('Вы вышли из аккаунта', 'info');
                }
                sessionStorage.removeItem('_authAction');
                this.closeModal();
                return;
            }
        });

        // ==========================================
        // 2. ПОТОМ получаем сессию
        // ==========================================
        const { data: { session } } = await supabaseClient.auth.getSession();
        this.currentUser = session ? session.user : null;

        // ==========================================
        // 3. Если вернулись с Google OAuth — очищаем URL
        // ==========================================
        if (window.location.hash.includes('access_token') ||
            window.location.search.includes('code=')) {
            this._cleanOAuthHash();

            // Даём Supabase время обработать токены
            // и проверяем сессию повторно через 1.5 сек
            setTimeout(async () => {
                const { data: { session: s2 } } = await supabaseClient.auth.getSession();
                if (s2) {
                    this.currentUser = s2.user;
                    const wasGoogle = sessionStorage.getItem('_authAction') === 'google';
                    if (wasGoogle && typeof app !== 'undefined') {
                        app.showNotification('Успешный вход через Google!', 'success');
                    }
                    sessionStorage.removeItem('_authAction');
                }
            }, 1500);
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
            if ((hash && (hash.includes('access_token') || hash.includes('type='))) ||
                (search && search.includes('code='))) {
                window.history.replaceState(
                    null, '',
                    window.location.pathname
                );
            }
        } catch (e) {}
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

// 🆕 Чекбокс согласия (только для регистрации и OAuth)
const consentHtml = !this.isLoginMode ? `
    <div style="display:flex;align-items:flex-start;gap:8px;margin:15px 0;padding:12px;background:var(--bg-secondary);border-radius:10px;">
        <input type="checkbox" id="consentCheckbox" style="margin-top:2px;width:18px;height:18px;cursor:pointer;accent-color:#10b981;flex-shrink:0;">
        <label for="consentCheckbox" style="font-size:0.82rem;color:var(--text-secondary);line-height:1.4;cursor:pointer;user-select:none;">
            Я согласен с 
            <a href="${PRIVACY_URL}" target="_blank" rel="noopener" style="color:var(--primary-color);text-decoration:underline;font-weight:600;" onclick="event.stopPropagation()">Политикой конфиденциальности</a> 
            и 
            <a href="${AGREEMENT_URL}" target="_blank" rel="noopener" style="color:var(--primary-color);text-decoration:underline;font-weight:600;" onclick="event.stopPropagation()">Пользовательским соглашением</a>
        </label>
    </div>
` : '';

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
    <button id="googleLoginBtn" style="width:100%;padding:12px;border-radius:12px;border:2px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);font-weight:bold;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:15px;${this.isLoginMode ? '' : 'opacity:0.5;cursor:not-allowed;'}">
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
    <button class="btn btn-primary" id="mainAuthBtn" style="width:100%;font-weight:900;margin-bottom:10px;padding:14px;font-size:1.1rem;box-shadow:0 4px 0 rgba(0,0,0,0.2);${this.isLoginMode ? '' : 'opacity:0.5;cursor:not-allowed;'}">${mainBtnText}</button>
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
document.getElementById('mainAuthBtn').onclick = () => {
    // 🆕 Проверка согласия для регистрации
    if (!this.isLoginMode) {
        const consentCheckbox = document.getElementById('consentCheckbox');
        if (consentCheckbox && !consentCheckbox.checked) {
            this.showAuthError('Пожалуйста, согласитесь с условиями');
            return;
        }
    }
    this.handleAuth(this.isLoginMode ? 'login' : 'register');
};

// 🆕 Google OAuth с проверкой согласия
document.getElementById('googleLoginBtn').onclick = async () => {
    // 🆕 Если это регистрация (не вход), требуем согласие
    if (!this.isLoginMode) {
        const consentCheckbox = document.getElementById('consentCheckbox');
        if (consentCheckbox && !consentCheckbox.checked) {
            this.showAuthError('Пожалуйста, согласитесь с условиями');
            return;
        }
    }
    
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
    }
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
                email: email,
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

    closeModal() {
        this.lastCustomMessage = null;
        this.isResetMode = false;
        const overlay = document.getElementById('authOverlay');
        if (overlay) overlay.remove();
    }

    async handleAuth(type) {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword') ? document.getElementById('authPassword').value.trim() : '';
    const errorEl = document.getElementById('authError');

    if (!email) { errorEl.textContent = 'Введите Email'; errorEl.style.color = '#ef4444'; errorEl.style.display = 'block'; return; }

    if (type === 'reset') {
        errorEl.style.display = 'none';
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
           redirectTo: getAuthRedirectBase()
        });
        if (error) { errorEl.textContent = error.message; errorEl.style.color = '#ef4444'; }
        else { errorEl.innerHTML = '✅ Ссылка отправлена!'; errorEl.style.color = '#10b981'; }
        errorEl.style.display = 'block';
        return;
    }

    if (!password) { errorEl.textContent = 'Введите пароль'; errorEl.style.color = '#ef4444'; errorEl.style.display = 'block'; return; }

    errorEl.style.display = 'none';
    let result;

    if (type === 'register') {
        // 🆕 Проверка согласия перед регистрацией
        const consentCheckbox = document.getElementById('consentCheckbox');
        if (consentCheckbox && !consentCheckbox.checked) {
            errorEl.textContent = 'Необходимо согласие с условиями';
            errorEl.style.color = '#ef4444';
            errorEl.style.display = 'block';
            return;
        }

        result = await supabaseClient.auth.signUp({ email, password });
        
        if (!result.error && result.data.user) {
            // 🆕 Логируем согласие в БД
            await this.logConsent(result.data.user, email, 'registration');
            
            if (!result.data.session) {
                errorEl.style.color = '#10b981';
                errorEl.innerHTML = '🎉 Письмо отправлено! Проверьте почту.';
                errorEl.style.display = 'block';
                return;
            }
            sessionStorage.setItem('_authAction', 'login');
        }
    } else {
        sessionStorage.setItem('_authAction', 'login');
        result = await supabaseClient.auth.signInWithPassword({ email, password });
    }

    if (result.error) {
        sessionStorage.removeItem('_authAction');
        errorEl.style.color = '#ef4444';
        errorEl.textContent = result.error.message.includes('Invalid login')
            ? 'Неверный Email или пароль'
            : result.error.message;
        errorEl.style.display = 'block';
    }
}
}

window.authManager = new AuthManager();
