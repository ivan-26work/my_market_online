// ===============================================
// AUTH.JS - VERSION SIMPLIFIÉE (SANS WIZARD)
// ===============================================

(function() {
    const SUPABASE_URL = 'https://emcsigvlopntwbfkkjkh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY3NpZ3Zsb3BudHdiZmtramtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODE5MTgsImV4cCI6MjA5NDQ1NzkxOH0.YwYoV-azL3WEFtHoh4yoF7xTLrOwZILKCzJrGPsCs6I';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let currentStep = 1;

    // DOM elements
    const loginTab = document.querySelector('[data-tab="login"]');
    const registerTab = document.querySelector('[data-tab="register"]');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const infoArea = document.getElementById('infoArea');
    const infoMessage = document.getElementById('infoMessage');
    const infoIcon = document.getElementById('infoIcon');
    const infoProgress = document.getElementById('infoProgress');
    const progressFill = document.querySelector('.progress-fill');
    const loadingModal = document.getElementById('loadingModal');

    // ===============================================
    // TOAST NOTIFICATION
    // ===============================================
    function showToast(message, type = 'success') {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <div class="toast-progress"></div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ===============================================
    // AFFICHAGE INFO
    // ===============================================
    function showInfo(message, type = 'info', showProgress = false, progress = 0) {
        if (!infoMessage) return;
        infoMessage.textContent = message;
        infoArea.classList.remove('info-info', 'info-success', 'info-error');
        
        if (type === 'success') {
            infoArea.classList.add('info-success');
            infoIcon.className = 'fas fa-check-circle';
        } else if (type === 'error') {
            infoArea.classList.add('info-error');
            infoIcon.className = 'fas fa-exclamation-circle';
        } else {
            infoArea.classList.add('info-info');
            infoIcon.className = 'fas fa-info-circle';
        }
        
        if (showProgress && infoProgress) {
            infoProgress.style.display = 'block';
            if (progressFill) progressFill.style.width = `${progress}%`;
        } else if (infoProgress) {
            infoProgress.style.display = 'none';
            if (progressFill) progressFill.style.width = '0%';
        }
    }

    function showLoading(message = 'Chargement...') {
        const modalStatus = document.getElementById('modalStatus');
        if (modalStatus) modalStatus.textContent = message;
        loadingModal.style.display = 'flex';
    }

    function hideLoading() {
        loadingModal.style.display = 'none';
    }

    // ===============================================
    // ONGLETS
    // ===============================================
    function switchTab(tab) {
        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
            forgotForm.classList.remove('active');
            showInfo('Connectez-vous à votre marché.', 'info');
        } else {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
            forgotForm.classList.remove('active');
            resetRegistration();
            showInfo('Créez votre compte (4 étapes).', 'info');
        }
    }

    // ===============================================
    // INSCRIPTION - 4 ÉTAPES
    // ===============================================
    function showStep(step) {
        for (let i = 1; i <= 4; i++) {
            const el = document.getElementById(`step${i}`);
            if (el) el.classList.toggle('active', i === step);
        }
        
        if (prevBtn) prevBtn.style.display = step > 1 ? 'block' : 'none';
        if (nextBtn) {
            nextBtn.textContent = step === 4 ? 'Créer' : 'Suivant';
        }
        
        const stepNames = ['Email', 'Mot de passe', 'Pseudo', 'Nom du marché'];
        const progressPercent = (step / 4) * 100;
        showInfo(`Étape ${step}/4 : ${stepNames[step - 1]}`, 'info', true, progressPercent);
    }

    function checkPasswordStrength(password) {
        const hasMinLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        const valid = hasMinLength && hasUpperCase && hasLowerCase && hasNumbers;
        
        const strengthDiv = document.getElementById('passwordStrength');
        if (strengthDiv && password.length > 0) {
            if (!hasMinLength) strengthDiv.innerHTML = '❌ Minimum 8 caractères';
            else if (!hasUpperCase) strengthDiv.innerHTML = '❌ Ajoutez une majuscule';
            else if (!hasLowerCase) strengthDiv.innerHTML = '❌ Ajoutez une minuscule';
            else if (!hasNumbers) strengthDiv.innerHTML = '❌ Ajoutez un chiffre';
            else strengthDiv.innerHTML = '✅ Mot de passe solide';
        } else if (strengthDiv) {
            strengthDiv.innerHTML = '';
        }
        return { valid };
    }

    function normalizeWhatsappNumber(number) {
        if (!number) return '';
        let clean = number.replace(/\D/g, '');
        if (clean.startsWith('0')) clean = clean.substring(1);
        if (!clean.startsWith('225')) clean = '225' + clean;
        return clean;
    }

    async function nextStep() {
        if (currentStep === 1) {
            const email = document.getElementById('regEmail').value;
            if (!email || !email.includes('@')) {
                showInfo('Email invalide.', 'error');
                return;
            }
            showInfo('Email valide !', 'success');
        }
        else if (currentStep === 2) {
            const pwd = document.getElementById('regPassword').value;
            const confirm = document.getElementById('regConfirmPassword').value;
            const strength = checkPasswordStrength(pwd);
            if (!strength.valid) {
                showInfo('Mot de passe trop faible (8+ caractères, majuscule, minuscule, chiffre).', 'error');
                return;
            }
            if (pwd !== confirm) {
                showInfo('Les mots de passe ne correspondent pas.', 'error');
                return;
            }
            showInfo('Mot de passe sécurisé !', 'success');
        }
        else if (currentStep === 3) {
            const username = document.getElementById('regUsername').value;
            if (!username.trim()) {
                showInfo('Pseudo requis.', 'error');
                return;
            }
            showInfo('Pseudo valide !', 'success');
        }
        else if (currentStep === 4) {
            const marketName = document.getElementById('regMarketName').value;
            if (!marketName.trim()) {
                showInfo('Nom du marché requis.', 'error');
                return;
            }
            await createAccount();
            return;
        }
        
        currentStep++;
        showStep(currentStep);
    }

    function prevStep() {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    }

    function resetRegistration() {
        currentStep = 1;
        document.getElementById('regEmail').value = '';
        document.getElementById('regPassword').value = '';
        document.getElementById('regConfirmPassword').value = '';
        document.getElementById('regUsername').value = '';
        document.getElementById('regMarketName').value = '';
        document.getElementById('passwordStrength').innerHTML = '';
        showStep(1);
    }

    // ===============================================
    // CRÉATION DU COMPTE + MARCHÉ
    // ===============================================
    async function createAccount() {
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const username = document.getElementById('regUsername').value;
    const marketName = document.getElementById('regMarketName').value;
    
    showLoading('Création du compte...');
    showInfo('Création en cours...', 'info', true, 30);
    
    try {
        // 1. Créer l'utilisateur
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { username: username }
            }
        });
        
        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('Erreur création utilisateur');
        
        showInfo('Compte créé ! Sauvegarde du marché...', 'success', true, 60);
        
        // 2. Attendre que la session soit établie (important !)
        // Si l'utilisateur n'est pas encore connecté, on le connecte
        let userId = authData.user.id;
        
        // Tenter l'insertion
        const { error: marketError } = await supabase
            .from('markets')
            .insert({
                id: userId,
                email: email,
                market_name: marketName,
                owner_name: username,
                phone: '',
                public_email: email,
                city: '',
                description: '',
                whatsapp: '',
                market_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        
        if (marketError) {
            console.error('Erreur insertion:', marketError);
            showToast(`⚠️ Compte créé mais erreur: ${marketError.message}`, 'error');
        } else {
            showToast('✅ Compte et marché créés avec succès !', 'success');
        }
        
        showInfo('Compte créé ! Connectez-vous.', 'success', true, 100);
        
        setTimeout(() => {
            hideLoading();
            switchTab('login');
            document.getElementById('loginEmail').value = email;
            showInfo('Compte créé ! Connectez-vous pour accéder à votre tableau de bord.', 'success');
        }, 1500);
        
    } catch (error) {
        hideLoading();
        console.error('Erreur:', error);
        showToast(`❌ Erreur: ${error.message}`, 'error');
        showInfo(`Erreur: ${error.message}`, 'error');
    }
}
    // ===============================================
    // CONNEXION
    // ===============================================
    async function login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            showInfo('Email et mot de passe requis.', 'error');
            return;
        }
        
        showLoading('Connexion...');
        showInfo('Connexion en cours...', 'info', true, 50);
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            
            if (data.user) {
                showInfo('Connexion réussie !', 'success', true, 100);
                showToast('✅ Connexion réussie ! Redirection...', 'success');
                
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('userEmail', data.user.email);
                localStorage.setItem('userId', data.user.id);
                
                setTimeout(() => {
                    hideLoading();
                    window.location.href = 'index.html';
                }, 1000);
            }
        } catch (error) {
            hideLoading();
            console.error('Erreur connexion:', error);
            
            if (error.message === 'Invalid login credentials') {
                showInfo('Email ou mot de passe incorrect.', 'error');
                showToast('❌ Email ou mot de passe incorrect', 'error');
            } else {
                showInfo(`Erreur: ${error.message}`, 'error');
                showToast(`❌ ${error.message}`, 'error');
            }
        }
    }

    // ===============================================
    // MOT DE PASSE OUBLIÉ
    // ===============================================
    async function resetPassword() {
        const email = document.getElementById('forgotEmail').value;
        if (!email || !email.includes('@')) {
            showInfo('Email valide requis.', 'error');
            return;
        }
        
        showLoading('Envoi...');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            showToast('✅ Lien de réinitialisation envoyé !', 'success');
            showInfo(`Lien envoyé à ${email}`, 'success');
            setTimeout(() => {
                hideLoading();
                forgotForm.classList.remove('active');
                loginForm.classList.add('active');
            }, 2000);
        } catch (error) {
            hideLoading();
            showToast(`❌ Erreur: ${error.message}`, 'error');
            showInfo(`Erreur: ${error.message}`, 'error');
        }
    }

    // ===============================================
    // INITIALISATION
    // ===============================================
    function initPasswordToggles() {
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.getAttribute('data-target'));
                const icon = btn.querySelector('i');
                if (target.type === 'password') {
                    target.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    target.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }

    function initEventListeners() {
        loginTab.addEventListener('click', () => switchTab('login'));
        registerTab.addEventListener('click', () => switchTab('register'));
        prevBtn.addEventListener('click', prevStep);
        nextBtn.addEventListener('click', nextStep);
        document.getElementById('doLoginBtn').addEventListener('click', login);
        document.getElementById('resetPasswordBtn').addEventListener('click', resetPassword);
        
        document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.remove('active');
            forgotForm.classList.add('active');
            showInfo('Entrez votre email pour réinitialiser.', 'info');
        });
        
        document.getElementById('backToLoginLink').addEventListener('click', (e) => {
            e.preventDefault();
            forgotForm.classList.remove('active');
            loginForm.classList.add('active');
            showInfo('Connectez-vous.', 'info');
        });
        
        document.getElementById('regPassword').addEventListener('input', (e) => checkPasswordStrength(e.target.value));
    }

    // Styles pour les toasts
    const style = document.createElement('style');
    style.textContent = `
        .toast-notification {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: #0e1a26;
            border: 1px solid #2a3a4a;
            border-radius: 50px;
            padding: 12px 24px;
            min-width: 250px;
            max-width: 90%;
            z-index: 10000;
            transition: transform 0.3s ease;
            font-family: 'DM Sans', sans-serif;
            font-size: 0.85rem;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .toast-notification.show {
            transform: translateX(-50%) translateY(0);
        }
        .toast-notification.success { border-left: 4px solid #4ade80; }
        .toast-notification.success i { color: #4ade80; }
        .toast-notification.error { border-left: 4px solid #ff4d4d; }
        .toast-notification.error i { color: #ff4d4d; }
        .toast-notification.info { border-left: 4px solid #5a9eff; }
        .toast-notification.info i { color: #5a9eff; }
        .toast-content { display: flex; align-items: center; gap: 12px; }
        .toast-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: #5a9eff;
            width: 100%;
            animation: toastProgress 4s linear forwards;
            border-radius: 0 0 50px 50px;
        }
        @keyframes toastProgress {
            from { width: 100%; }
            to { width: 0%; }
        }
        .toast-notification.success .toast-progress { background: #4ade80; }
        .toast-notification.error .toast-progress { background: #ff4d4d; }
    `;
    document.head.appendChild(style);

    function init() {
        initPasswordToggles();
        initEventListeners();
        showInfo('Bienvenue. Connectez-vous ou créez un compte.', 'info');
    }
    
    init();
})();