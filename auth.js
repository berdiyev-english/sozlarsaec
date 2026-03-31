var supabaseUrl = 'https://dyiwuslfjnvirbxfafuq.supabase.co';
var supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aXd1c2xmam52aXJieGZhZnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTU1MTEsImV4cCI6MjA5MDM5MTUxMX0.c61rc2C2YOWCMF0JdmvdcrsCdoyfJNOkFLDoxZN1N5U'; 
var supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isLoginMode = false; // false = Рега, true = Вход
        this.isResetMode = false; // Экран сброса пароля
        this.isRecoveringPassword = false;
        this.lastCustomMessage = null;
        this.syncTimer = null;
        this.hasSyncedThisSession = false; 
        this.isDownloading = false; 
        this.init();
    }

    async init() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        this.currentUser = session ? session.user : null;

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

        supabaseClient.auth.onAuthStateChange((event, session) => {
            this.currentUser = session ? session.user : null;
            
            if (event === 'PASSWORD_RECOVERY') {
                this.isRecoveringPassword = true;
                this.showUpdatePasswordModal();
            } 
            else if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
                if (this.currentUser && !this.hasSyncedThisSession) {
                    const isSilent = (event === 'INITIAL_SESSION'); 
                    this.syncFromCloud(isSilent);
                    this.hasSyncedThisSession = true; 
                    
                    if (event === 'SIGNED_IN' && !this.isRecoveringPassword) {
                        if (typeof app !== 'undefined') app.showNotification('Успешный вход!', 'success');
                        this.closeModal();
                    }
                }
            } 
            else if (event === 'SIGNED_OUT') {
                this.hasSyncedThisSession = false; 
                if (typeof app !== 'undefined') app.showNotification('Вы вышли из аккаунта', 'info');
                this.closeModal();
            }
        });

        if (window.location.hash.includes('type=recovery')) {
            this.isRecoveringPassword = true;
            this.showUpdatePasswordModal();
        }
    }

    triggerCloudSave() {
        if (!this.currentUser || this.isDownloading) return; 
        clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(() => this.syncToCloud(), 2000);
    }

    async syncToCloud() {
        if (!this.currentUser || this.isDownloading) return;
        
        const appData = {
            learningWords: JSON.parse(localStorage.getItem('learningWords') || '[]'),
            customWords: JSON.parse(localStorage.getItem('customWords') || '[]'),
            wordStats: JSON.parse(localStorage.getItem('wordStats') || '{}'),
            weeklyProgress: JSON.parse(localStorage.getItem('weeklyProgress') || '[]'),
            petState: JSON.parse(localStorage.getItem('pet_state_v1') || 'null')
        };

        const { error } = await supabaseClient.from('user_sync').upsert({
            id: this.currentUser.id,
            email: this.currentUser.email,
            app_data: appData,
            updated_at: new Date().toISOString()
        });

        if (error) console.error('❌ Ошибка сохранения в Supabase:', error.message);
        else console.log('✅ ☁️ Прогресс успешно сохранен в облако!');
    }

    async syncFromCloud(silent = false) {
        if (!this.currentUser) return;
        this.isDownloading = true; 
        if (!silent && typeof app !== 'undefined') app.showGlobalLoader('Загружаем твой прогресс...', 1000);

        try {
            const { data, error } = await supabaseClient.from('user_sync').select('app_data').eq('id', this.currentUser.id).single();

            if (data && data.app_data && Object.keys(data.app_data).length > 0) {
                const d = data.app_data;
                if (d.learningWords) localStorage.setItem('learningWords', JSON.stringify(d.learningWords));
                if (d.customWords) localStorage.setItem('customWords', JSON.stringify(d.customWords));
                if (d.wordStats) localStorage.setItem('wordStats', JSON.stringify(d.wordStats));
                if (d.weeklyProgress) localStorage.setItem('weeklyProgress', JSON.stringify(d.weeklyProgress));
                if (d.petState) localStorage.setItem('pet_state_v1', JSON.stringify(d.petState));

                if (typeof app !== 'undefined') {
                    app.loadData(); app.renderProgress();
                    if (app.currentSection === 'learning') app.renderLearningSection();
                    if (!silent) app.showNotification('Данные загружены из облака! ☁️', 'success');
                }
            }
        } catch (err) {
            console.error('Ошибка синхронизации:', err);
        } finally {
            this.isDownloading = false; 
            if (!silent && typeof app !== 'undefined') app.hideGlobalLoader();
        }
    }

    showProfileModal(customMessage = null) {
        if (customMessage) this.lastCustomMessage = customMessage;
        this.closeModal(); 
        
        const overlay = document.createElement('div');
        overlay.id = 'authOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:20px; animation: fadeIn 0.3s;';

        const modal = document.createElement('div');
        modal.id = 'authModalContent';
        modal.style.cssText = 'background:var(--bg-primary);border-radius:16px;padding:24px;max-width:400px;width:100%;box-shadow:var(--shadow-lg);position:relative; animation: slideDown 0.3s;';

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

        // 1. КАБИНЕТ ЮЗЕРА
        if (this.currentUser && !this.isRecoveringPassword) {
            const avatarUrl = this.currentUser.user_metadata?.avatar_url;
            const avatarHtml = avatarUrl ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : `<i class="fas fa-user"></i>`;

            modal.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                    <h2 style="margin:0;">Личный кабинет</h2>
                    <button class="btn btn-secondary close-auth" style="padding:5px 10px;"><i class="fas fa-times"></i></button>
                </div>
                <div style="text-align:center; margin-bottom: 20px;">
                    <div style="width:80px;height:80px;background:var(--primary-color);border-radius:50%;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;color:white;font-size:2rem; overflow:hidden; border: 3px solid #10b981;">
                        ${avatarHtml}
                    </div>
                    <div style="font-weight:bold; color:var(--text-primary); font-size:1.1rem;">${this.currentUser.user_metadata?.full_name || this.currentUser.email}</div>
                    <div style="font-size:0.85rem; color:#10b981; margin-top:5px; font-weight:bold;"><i class="fas fa-cloud"></i> Облачная синхронизация активна</div>
                </div>
                <div id="profileDonateBtn" style="margin-bottom: 20px; background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); padding: 15px; border-radius: 12px; cursor: pointer; text-align: center;">
                    <div style="color: #9a3412; font-weight: 900; font-size: 1.1rem; margin-bottom: 5px;"><i class="fas fa-gift"></i> Поддержать проект (Коту Бобу на корм)</div>
                </div>
                <button class="btn btn-secondary" id="logoutBtn" style="width:100%; padding:14px; font-weight:bold; color:#ef4444;"><i class="fas fa-sign-out-alt"></i> Выйти из аккаунта</button>
            `;
            document.getElementById('logoutBtn').onclick = () => supabaseClient.auth.signOut();
            document.getElementById('profileDonateBtn').onclick = () => { this.closeModal(); if (typeof app !== 'undefined') app.showSupportModal(); };
            return;
        }

        // 2. ЭКРАН СБРОСА ПАРОЛЯ
        if (this.isResetMode) {
            modal.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                    <h2 style="margin:0;">Сброс пароля</h2>
                    <button class="btn btn-secondary close-auth" style="padding:5px 10px;"><i class="fas fa-times"></i></button>
                </div>
                <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:15px;">Введите Email, на который был зарегистрирован аккаунт.</p>
                
                <input type="email" id="authEmail" placeholder="Ваш Email" style="width:100%; padding:14px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:15px; background:var(--bg-secondary); color:var(--text-primary); font-size:1rem;">
                <div id="authError" style="color:#ef4444; font-size:0.85rem; margin-bottom:10px; display:none; text-align:center; font-weight:bold;"></div>
                
                <button class="btn btn-primary" id="mainAuthBtn" style="width:100%; font-weight:900; padding:14px; font-size:1.1rem;">Отправить ссылку</button>
                <button class="btn btn-secondary" id="backToLoginBtn" style="width:100%; margin-top:10px; padding:12px;">Назад ко входу</button>
            `;
            document.getElementById('mainAuthBtn').onclick = () => this.handleAuth('reset');
            document.getElementById('backToLoginBtn').onclick = () => { this.isResetMode = false; this.renderModalInner(); };
            return;
        }

        // 3. ЭКРАН ВХОДА / РЕГИСТРАЦИИ (С ВКЛАДКАМИ)
        let hookHtml = this.lastCustomMessage 
            ? `<div style="text-align:center; margin-bottom:15px; background:var(--bg-secondary); padding:15px; border-radius:12px;">
                 <img src="/instruction.png" style="width:70px; margin-bottom:10px;">
                 <div style="color:#f59e0b; font-weight:800; font-size:1rem; line-height:1.3;">${this.lastCustomMessage}</div>
               </div>`
            : '';

        const mainBtnText = this.isLoginMode ? 'Войти в аккаунт' : 'Создать аккаунт';

        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h2 style="margin:0;">BeWords</h2>
                <button class="btn btn-secondary close-auth" style="padding:5px 10px;"><i class="fas fa-times"></i></button>
            </div>
            
            ${hookHtml}

            <!-- ПЕРЕКЛЮЧАТЕЛЬ ВКЛАДОК -->
            <div style="display:flex; background:var(--bg-secondary); border-radius:12px; padding:5px; margin-bottom:20px;">
                <button id="tabRegister" style="flex:1; padding:10px; border:none; border-radius:8px; font-weight:bold; font-size:0.95rem; cursor:pointer; background:${!this.isLoginMode ? 'var(--bg-primary)' : 'transparent'}; box-shadow:${!this.isLoginMode ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'}; color:var(--text-primary); transition:all 0.2s;">Регистрация</button>
                <button id="tabLogin" style="flex:1; padding:10px; border:none; border-radius:8px; font-weight:bold; font-size:0.95rem; cursor:pointer; background:${this.isLoginMode ? 'var(--bg-primary)' : 'transparent'}; box-shadow:${this.isLoginMode ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'}; color:var(--text-primary); transition:all 0.2s;">Вход</button>
            </div>

            <button id="googleLoginBtn" style="width:100%; padding:12px; border-radius:12px; border:2px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); font-weight:bold; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:15px;">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" style="width:20px; height:20px;">
                Продолжить с Google
            </button>
            
            <div style="display:flex; align-items:center; margin: 15px 0;">
                <div style="flex:1; height:1px; background:var(--border-color);"></div>
                <div style="padding:0 10px; color:var(--text-secondary); font-size:0.8rem; font-weight:bold;">ИЛИ EMAIL</div>
                <div style="flex:1; height:1px; background:var(--border-color);"></div>
            </div>
            
            <input type="email" id="authEmail" placeholder="Ваш Email" style="width:100%; padding:14px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:10px; background:var(--bg-secondary); color:var(--text-primary); font-size:1rem;">
            <input type="password" id="authPassword" placeholder="Пароль" style="width:100%; padding:14px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:10px; background:var(--bg-secondary); color:var(--text-primary); font-size:1rem;">
            
            <div id="authError" style="color:#ef4444; font-size:0.85rem; margin-bottom:10px; display:none; text-align:center; font-weight:bold;"></div>

            <button class="btn btn-primary" id="mainAuthBtn" style="width:100%; font-weight:900; margin-bottom:10px; padding:14px; font-size:1.1rem; box-shadow: 0 4px 0 rgba(0,0,0,0.2);">${mainBtnText}</button>
            
            ${this.isLoginMode ? `<div style="text-align:center; margin-top:10px;"><button id="forgotBtn" style="background:none; border:none; color:var(--text-secondary); text-decoration:underline; cursor:pointer; font-size:0.9rem;">Забыли пароль?</button></div>` : ''}
        `;

        document.getElementById('tabRegister').onclick = () => { this.isLoginMode = false; this.renderModalInner(); };
        document.getElementById('tabLogin').onclick = () => { this.isLoginMode = true; this.renderModalInner(); };
        document.getElementById('mainAuthBtn').onclick = () => this.handleAuth(this.isLoginMode ? 'login' : 'register');
        document.getElementById('googleLoginBtn').onclick = async () => {
            await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
        };

        if (this.isLoginMode) {
            document.getElementById('forgotBtn').onclick = () => { this.isResetMode = true; this.renderModalInner(); };
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
            <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:20px;">Придумайте новый пароль для вашего аккаунта.</p>
            <input type="password" id="newPasswordInput" placeholder="Минимум 6 символов" style="width:100%; padding:14px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:15px; background:var(--bg-secondary); color:var(--text-primary); font-size:1rem;">
            <div id="updateError" style="color:#ef4444; font-size:0.85rem; margin-bottom:10px; display:none; font-weight:bold;"></div>
            <button class="btn btn-primary" id="saveNewPasswordBtn" style="width:100%; font-weight:bold; padding:14px;">Сохранить пароль</button>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('saveNewPasswordBtn').onclick = async () => {
            const newPass = document.getElementById('newPasswordInput').value.trim();
            const errEl = document.getElementById('updateError');
            if (newPass.length < 6) { errEl.textContent = 'Пароль должен быть минимум 6 символов'; errEl.style.display = 'block'; return; }
            if (typeof app !== 'undefined') app.showGlobalLoader('Сохраняю...', 500);
            
            const { error } = await supabaseClient.auth.updateUser({ password: newPass });
            if (typeof app !== 'undefined') app.hideGlobalLoader();

            if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; } 
            else {
                this.isRecoveringPassword = false;
                if (typeof app !== 'undefined') app.showNotification('Пароль успешно изменен!', 'success');
                this.closeModal();
            }
        };
    }

    closeModal() {
        this.lastCustomMessage = null;
        this.isResetMode = false; // Сбрасываем режим сброса при закрытии
        const overlay = document.getElementById('authOverlay');
        if (overlay) overlay.remove();
    }

    async handleAuth(type) {
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword') ? document.getElementById('authPassword').value.trim() : '';
        const errorEl = document.getElementById('authError');
        
        if (!email) {
            errorEl.textContent = "Пожалуйста, введите Email";
            errorEl.style.color = '#ef4444';
            errorEl.style.display = 'block';
            return;
        }

        if (type === 'reset') {
            errorEl.style.display = 'none';
            if (typeof app !== 'undefined') app.showGlobalLoader('Отправляю...', 500);
            
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname
            });
            if (typeof app !== 'undefined') app.hideGlobalLoader();

            if (error) {
                errorEl.textContent = error.message;
                errorEl.style.color = '#ef4444';
            } else {
                errorEl.innerHTML = '✅ Ссылка отправлена!<br>Проверьте почту (и папку Спам).';
                errorEl.style.color = '#10b981';
            }
            errorEl.style.display = 'block';
            return;
        }

        if (!password) {
            errorEl.textContent = "Пожалуйста, введите пароль";
            errorEl.style.color = '#ef4444';
            errorEl.style.display = 'block';
            return;
        }

        errorEl.style.display = 'none';
        let result;

        if (typeof app !== 'undefined') app.showGlobalLoader('Связываюсь с сервером...', 500);

        if (type === 'register') {
            result = await supabaseClient.auth.signUp({ email, password });
            if (typeof app !== 'undefined') app.hideGlobalLoader();

            if (!result.error && result.data.user && !result.data.session) {
                errorEl.style.color = '#10b981';
                errorEl.innerHTML = '🎉 Письмо отправлено!<br>Проверьте почту (и папку Спам).';
                errorEl.style.display = 'block';
                return;
            }
        } else {
            result = await supabaseClient.auth.signInWithPassword({ email, password });
            if (typeof app !== 'undefined') app.hideGlobalLoader();
        }

        if (result.error) {
            errorEl.style.color = '#ef4444';
            errorEl.textContent = result.error.message.includes('Invalid login') ? 'Неверный Email или пароль' : 'Ошибка: ' + result.error.message;
            errorEl.style.display = 'block';
        }
    }
}

window.authManager = new AuthManager();
