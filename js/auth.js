// ===============================================
// AUTH.JS - MARCHÉ PERSONNEL (Flow inversé)
// ===============================================

(function() {
    // Configuration Supabase
    const SUPABASE_URL = 'https://emcsigvlopntwbfkkjkh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY3NpZ3Zsb3BudHdiZmtramtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODE5MTgsImV4cCI6MjA5NDQ1NzkxOH0.YwYoV-azL3WEFtHoh4yoF7xTLrOwZILKCzJrGPsCs6I';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ÉTAT GLOBAL
    let currentStep = 1;
    let wizardStep = 1;
    let currentUserId = null;
    let marketData = {};

    // ÉLÉMENTS DOM
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
    const marketWizard = document.getElementById('marketWizard');
    const wizardPrevBtn = document.getElementById('wizardPrevBtn');
    const wizardNextBtn = document.getElementById('wizardNextBtn');
    const confirmMarketBtn = document.getElementById('confirmMarketBtn');

    // ===============================================
    // VALIDATION NUMÉRO WHATSAPP
    // ===============================================
    function validateAndFormatWhatsapp(number) {
        if (!number || number.trim() === '') {
            return { valid: false, message: 'Numéro WhatsApp requis' };
        }
        
        // Supprimer tous les espaces, tirets, points, parenthèses
        let clean = number.replace(/[\s\-\.\(\)]/g, '');
        
        // Enlever le + s'il y est
        clean = clean.replace(/^\+/, '');
        
        // Vérifier que c'est uniquement des chiffres
        if (!/^\d+$/.test(clean)) {
            return { valid: false, message: 'Le numéro ne doit contenir que des chiffres, espaces ou +' };
        }
        
        // Vérifier la longueur (entre 9 et 13 chiffres)
        if (clean.length < 9 || clean.length > 13) {
            return { valid: false, message: 'Le numéro doit avoir entre 9 et 13 chiffres' };
        }
        
        // Enlever le premier 0 si présent (ex: 0503588336 → 503588336)
        if (clean.startsWith('0')) {
            clean = clean.substring(1);
        }
        
        // Ajouter l'indicatif 225 si pas présent (Côte d'Ivoire)
        if (!clean.startsWith('225') && clean.length <= 9) {
            clean = '225' + clean;
        }
        
        return { valid: true, formatted: clean, message: 'Numéro valide' };
    }

    // Appliquer la validation sur un champ input
    function setupWhatsappValidation(inputElement, onValid) {
        if (!inputElement) return;
        
        inputElement.addEventListener('blur', () => {
            const result = validateAndFormatWhatsapp(inputElement.value);
            if (!result.valid) {
                showInfo(result.message, 'error');
                inputElement.style.borderColor = '#ff4d4d';
            } else {
                inputElement.value = '+' + result.formatted;
                inputElement.style.borderColor = '#4ade80';
                if (onValid) onValid(result.formatted);
            }
        });
        
        inputElement.addEventListener('input', () => {
            inputElement.style.borderColor = '';
        });
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
        if (loadingModal) loadingModal.style.display = 'flex';
    }

    function hideLoading() {
        if (loadingModal) loadingModal.style.display = 'none';
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
            showInfo('Créez votre compte (3 étapes).', 'info');
        }
    }

    // ===============================================
    // INSCRIPTION - 3 ÉTAPES
    // ===============================================
    function showStep(step) {
        for (let i = 1; i <= 3; i++) {
            const el = document.getElementById(`step${i}`);
            if (el) el.classList.toggle('active', i === step);
        }
        
        if (prevBtn) prevBtn.style.display = step > 1 ? 'block' : 'none';
        if (nextBtn) {
            nextBtn.textContent = step === 3 ? 'Créer' : 'Suivant';
        }
        
        const stepNames = ['Email', 'Mot de passe', 'Pseudo'];
        const progressPercent = (step / 3) * 100;
        showInfo(`Étape ${step}/3 : ${stepNames[step - 1]}`, 'info', true, progressPercent);
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
        document.getElementById('passwordStrength').innerHTML = '';
        showStep(1);
    }

    // ===============================================
    // CRÉATION DU COMPTE (email, mdp, pseudo)
    // ===============================================
    async function createAccount() {
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const username = document.getElementById('regUsername').value;
        
        showLoading('Création du compte...');
        showInfo('Création en cours...', 'info', true, 30);
        
        try {
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { username: username }
                }
            });
            
            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error('Erreur création utilisateur');
            
            showInfo('Compte créé !', 'success', true, 100);
            
            setTimeout(() => {
                hideLoading();
                switchTab('login');
                document.getElementById('loginEmail').value = email;
                showInfo('Compte créé ! Connectez-vous pour compléter votre profil.', 'success');
            }, 1500);
            
        } catch (error) {
            hideLoading();
            console.error('Erreur:', error);
            showInfo(`Erreur: ${error.message}`, 'error');
        }
    }

    // ===============================================
    // CONNEXION + VÉRIFICATION WIZARD
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
                currentUserId = data.user.id;
                showInfo('Connexion réussie !', 'success', true, 100);
                
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('userEmail', data.user.email);
                localStorage.setItem('userId', data.user.id);
                
                const { data: marketInfo, error: marketError } = await supabase
                    .from('markets')
                    .select('*')
                    .eq('id', currentUserId)
                    .single();
                
                hideLoading();
                
                if (marketError || !marketInfo || !marketInfo.market_name) {
                    openMarketWizard();
                } else {
                    localStorage.setItem('marketWhatsapp', marketInfo.whatsapp || '');
                    window.location.href = 'index.html';
                }
            }
        } catch (error) {
            hideLoading();
            if (error.message === 'Invalid login credentials') {
                showInfo('Email ou mot de passe incorrect.', 'error');
            } else {
                showInfo(`Erreur: ${error.message}`, 'error');
            }
        }
    }

    // ===============================================
    // WIZARD MARCHÉ (4 étapes)
    // ===============================================
    function updateWizardProgress() {
        const progressPercent = (wizardStep / 4) * 100;
        const fill = document.querySelector('.wizard-progress-fill');
        if (fill) fill.style.width = `${progressPercent}%`;
    }

    function showWizardStep(step) {
        for (let i = 1; i <= 4; i++) {
            const el = document.getElementById(`wizardStep${i}`);
            if (el) el.classList.toggle('active', i === step);
        }
        
        if (wizardPrevBtn) wizardPrevBtn.style.display = step > 1 ? 'block' : 'none';
        if (wizardNextBtn) {
            wizardNextBtn.style.display = step === 4 ? 'none' : 'block';
        }
        
        updateWizardProgress();
    }

    function countWords(text) {
        return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
    }

    function updateWizardWordCount() {
        const desc = document.getElementById('wizardDescription');
        const wordCountSpan = document.getElementById('wizardWordCount');
        if (desc && wordCountSpan) {
            const words = countWords(desc.value);
            wordCountSpan.textContent = `${words} / 100 mots`;
            wordCountSpan.style.color = words >= 100 ? '#4ade80' : '#ffaa44';
        }
    }

    function updateRecap() {
        document.getElementById('recapMarketName').textContent = document.getElementById('wizardMarketName').value || '-';
        document.getElementById('recapOwnerName').textContent = document.getElementById('wizardOwnerName').value || '-';
        document.getElementById('recapPhone').textContent = document.getElementById('wizardPhone').value || '-';
        document.getElementById('recapPublicEmail').textContent = document.getElementById('wizardPublicEmail').value || '-';
        document.getElementById('recapCity').textContent = document.getElementById('wizardCity').value || '-';
        document.getElementById('recapWhatsapp').textContent = document.getElementById('wizardWhatsapp').value || '-';
        const desc = document.getElementById('wizardDescription').value || '';
        const preview = desc.length > 100 ? desc.substring(0, 100) + '...' : desc;
        document.getElementById('recapDescriptionPreview').textContent = preview || '-';
    }

    function nextWizardStep() {
        if (wizardStep === 1) {
            const marketName = document.getElementById('wizardMarketName').value;
            const ownerName = document.getElementById('wizardOwnerName').value;
            const phone = document.getElementById('wizardPhone').value;
            const publicEmail = document.getElementById('wizardPublicEmail').value;
            const city = document.getElementById('wizardCity').value;
            
            if (!marketName.trim()) { showInfo('Nom du marché requis.', 'error'); return; }
            if (!ownerName.trim()) { showInfo('Nom du propriétaire requis.', 'error'); return; }
            if (!phone.trim()) { showInfo('Numéro de téléphone requis.', 'error'); return; }
            if (!publicEmail || !publicEmail.includes('@')) { showInfo('Email public valide requis.', 'error'); return; }
            if (!city.trim()) { showInfo('Ville requise.', 'error'); return; }
            
            showInfo('Informations enregistrées.', 'success');
        }
        else if (wizardStep === 2) {
            const description = document.getElementById('wizardDescription').value;
            const wordCount = countWords(description);
            if (wordCount < 100) {
                showInfo(`Description trop courte : ${wordCount}/100 mots.`, 'error');
                return;
            }
            showInfo('Description enregistrée.', 'success');
        }
        else if (wizardStep === 3) {
            const whatsappInput = document.getElementById('wizardWhatsapp');
            const result = validateAndFormatWhatsapp(whatsappInput.value);
            if (!result.valid) {
                showInfo(result.message, 'error');
                whatsappInput.style.borderColor = '#ff4d4d';
                return;
            }
            whatsappInput.value = '+' + result.formatted;
            whatsappInput.style.borderColor = '#4ade80';
            updateRecap();
            showInfo('Vérifiez vos informations.', 'info');
        }
        
        if (wizardStep < 4) {
            wizardStep++;
            showWizardStep(wizardStep);
        }
    }

    function prevWizardStep() {
        if (wizardStep > 1) {
            wizardStep--;
            showWizardStep(wizardStep);
        }
    }

    async function saveMarketData() {
        const marketName = document.getElementById('wizardMarketName').value;
        const ownerName = document.getElementById('wizardOwnerName').value;
        const phone = document.getElementById('wizardPhone').value;
        const publicEmail = document.getElementById('wizardPublicEmail').value;
        const city = document.getElementById('wizardCity').value;
        const description = document.getElementById('wizardDescription').value;
        let whatsapp = document.getElementById('wizardWhatsapp').value;
        
        // Valider et normaliser le WhatsApp
        const whatsappResult = validateAndFormatWhatsapp(whatsapp);
        if (!whatsappResult.valid) {
            showInfo(whatsappResult.message, 'error');
            return;
        }
        whatsapp = whatsappResult.formatted;
        
        showLoading('Enregistrement...');
        
        try {
            const { error } = await supabase
                .from('markets')
                .upsert({
                    id: currentUserId,
                    email: localStorage.getItem('userEmail'),
                    market_name: marketName,
                    owner_name: ownerName,
                    phone: phone,
                    public_email: publicEmail,
                    city: city,
                    description: description,
                    whatsapp: whatsapp,
                    created_at: new Date().toISOString()
                });
            
            if (error) throw error;
            
            localStorage.setItem('marketWhatsapp', whatsapp);
            showInfo('Informations enregistrées !', 'success');
            
            setTimeout(() => {
                hideLoading();
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            hideLoading();
            showInfo(`Erreur: ${error.message}`, 'error');
        }
    }

    function openMarketWizard() {
        document.querySelector('.forms-container').style.display = 'none';
        document.querySelector('.header').style.display = 'none';
        marketWizard.style.display = 'flex';
        
        wizardStep = 1;
        showWizardStep(1);
        
        wizardPrevBtn.onclick = prevWizardStep;
        wizardNextBtn.onclick = nextWizardStep;
        confirmMarketBtn.onclick = saveMarketData;
        
        document.getElementById('wizardDescription').addEventListener('input', updateWizardWordCount);
        
        // Ajouter validation WhatsApp sur le champ du wizard
        const wizardWhatsapp = document.getElementById('wizardWhatsapp');
        if (wizardWhatsapp) {
            setupWhatsappValidation(wizardWhatsapp);
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
            showInfo(`Lien envoyé à ${email}`, 'success');
            setTimeout(() => {
                hideLoading();
                forgotForm.classList.remove('active');
                loginForm.classList.add('active');
            }, 2000);
        } catch (error) {
            hideLoading();
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
        });
        
        document.getElementById('backToLoginLink').addEventListener('click', (e) => {
            e.preventDefault();
            forgotForm.classList.remove('active');
            loginForm.classList.add('active');
        });
        
        document.getElementById('regPassword').addEventListener('input', (e) => checkPasswordStrength(e.target.value));
    }

    function init() {
        initPasswordToggles();
        initEventListeners();
        showInfo('Bienvenue. Connectez-vous ou créez un compte.', 'info');
    }
    
    init();
})();