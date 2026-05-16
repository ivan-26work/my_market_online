// ===============================================
// SETTINGS.JS - PARAMÈTRES
// ===============================================

(function() {
    const SUPABASE_URL = 'https://emcsigvlopntwbfkkjkh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY3NpZ3Zsb3BudHdiZmtramtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODE5MTgsImV4cCI6MjA5NDQ1NzkxOH0.YwYoV-azL3WEFtHoh4yoF7xTLrOwZILKCzJrGPsCs6I';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let currentUserId = null;
    let currentAvatarFile = null;

    // Éléments DOM
    const adminAvatar = document.getElementById('adminAvatar');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    const whatsappLink = document.getElementById('whatsappLink');
    const whatsappValidator = document.getElementById('whatsappValidator');
    const settingsOwnerName = document.getElementById('settingsOwnerName');
    const settingsAccountEmail = document.getElementById('settingsAccountEmail');
    const settingsPhone = document.getElementById('settingsPhone');
    const settingsMarketName = document.getElementById('settingsMarketName');
    const settingsPublicEmail = document.getElementById('settingsPublicEmail');
    const settingsCity = document.getElementById('settingsCity');
    const settingsDescription = document.getElementById('settingsDescription');
    const marketActiveToggle = document.getElementById('marketActiveToggle');
    const announcementMessage = document.getElementById('announcementMessage');
    const charCountSpan = document.getElementById('charCount');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const saveAllSettingsBtn = document.getElementById('saveAllSettingsBtn');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const themeLight = document.getElementById('themeLight');
    const themeDark = document.getElementById('themeDark');
    const loadingModal = document.getElementById('loadingModal');
    const toastEl = document.getElementById('toast');

    // ============================================
    // VALIDATION ET FORMATAGE WHATSAPP
    // ============================================
    
    function cleanWhatsappNumber(number) {
        if (!number) return '';
        return number.replace(/\D/g, '');
    }
    
    // Normaliser pour stockage: 2250503588336 (13 chiffres)
    function normalizeWhatsappNumber(number) {
        let clean = cleanWhatsappNumber(number);
        if (!clean) return '';
        
        // Cas: 0503588336 (11 chiffres: 0 + 10 chiffres)
        if (clean.length === 11 && clean.startsWith('0')) {
            clean = '225' + clean.substring(1);
        }
        // Cas: 503588336 (9 chiffres)
        else if (clean.length === 9) {
            clean = '2250' + clean;
        }
        // Cas: 2250503588336 (13 chiffres)
        else if (clean.length === 13 && clean.startsWith('225')) {
            // déjà bon
        }
        // Cas: 2250503588336 avec plus de chiffres
        else if (clean.length > 13 && clean.startsWith('225')) {
            clean = clean.substring(0, 13);
        }
        
        return clean;
    }
    
    // Formater pour affichage: +225 05 03 58 83 36
    function formatWhatsappDisplay(number) {
        let clean = cleanWhatsappNumber(number);
        if (!clean) return '';
        
        // Extraire les 10 chiffres après 225
        let digits = clean;
        if (digits.startsWith('225')) {
            digits = digits.substring(3);
        }
        if (digits.startsWith('0')) {
            digits = digits.substring(1);
        }
        
        // S'assurer qu'on a 10 chiffres (compléter si besoin)
        while (digits.length < 10) {
            digits = '0' + digits;
        }
        if (digits.length > 10) {
            digits = digits.substring(0, 10);
        }
        
        // Formater par paires
        let formatted = '+225 ';
        for (let i = 0; i < digits.length; i += 2) {
            formatted += digits.substring(i, i + 2) + ' ';
        }
        return formatted.trim();
    }
    
    function getWhatsAppLink(number) {
        const normalized = normalizeWhatsappNumber(number);
        if (!normalized) return '#';
        return `https://wa.me/${normalized}`;
    }
    
    function validateWhatsapp(number) {
        const normalized = normalizeWhatsappNumber(number);
        if (!normalized) {
            return { valid: false, message: 'Numéro requis' };
        }
        
        if (normalized.length !== 13) {
            return { valid: false, message: 'Le numéro doit avoir 13 chiffres (225 + 10 chiffres)' };
        }
        
        if (!normalized.startsWith('225')) {
            return { valid: false, message: 'Le numéro doit commencer par 225' };
        }
        
        return { valid: true, message: 'Numéro valide', normalized: normalized };
    }
    
    function updateWhatsappValidator() {
        const rawValue = whatsappLink.value;
        const validation = validateWhatsapp(rawValue);
        
        if (validation.valid) {
            const displayNumber = formatWhatsappDisplay(rawValue);
            const waLink = getWhatsAppLink(rawValue);
            
            whatsappValidator.innerHTML = `
                <i class="fas fa-check-circle"></i> ✓ ${validation.message}
                <div class="validator-hint">Format officiel : ${displayNumber}</div>
                <div class="validator-link">
                    <i class="fab fa-whatsapp"></i> 
                    <a href="${waLink}" target="_blank">${waLink}</a>
                </div>
            `;
            whatsappValidator.className = 'validator-box success';
            whatsappLink.style.borderColor = '#4ade80';
        } else {
            whatsappValidator.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i> ⚠️ ${validation.message}
                <div class="validator-hint">Format attendu : +225 05 03 58 83 36</div>
                <div class="validator-hint">Exemple : 0503588336 ou +2250503588336</div>
            `;
            whatsappValidator.className = 'validator-box error';
            whatsappLink.style.borderColor = '#ff4d4d';
        }
    }

    // ============================================
    // UTILITAIRES
    // ============================================
    function showLoading(msg = 'Chargement...') {
        const modalStatus = document.getElementById('modalStatus');
        if (modalStatus) modalStatus.textContent = msg;
        loadingModal.style.display = 'flex';
    }

    function hideLoading() {
        loadingModal.style.display = 'none';
    }

    function showToast(message, type = 'info') {
        toastEl.textContent = message;
        toastEl.className = `toast ${type} show`;
        setTimeout(() => { toastEl.className = 'toast'; }, 3000);
    }

    async function checkSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { window.location.href = 'auth.html'; return false; }
            currentUserId = session.user.id;
            return true;
        } catch {
            window.location.href = 'auth.html';
            return false;
        }
    }

    // ============================================
    // THEME
    // ============================================
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        if (savedTheme === 'light') {
            themeLight.classList.add('active');
            themeDark.classList.remove('active');
        } else {
            themeLight.classList.remove('active');
            themeDark.classList.add('active');
        }
    }

    function setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        if (theme === 'light') {
            themeLight.classList.add('active');
            themeDark.classList.remove('active');
        } else {
            themeLight.classList.remove('active');
            themeDark.classList.add('active');
        }
    }

    // ============================================
    // CHARGEMENT DES DONNÉES
    // ============================================
    async function loadSettings() {
        showLoading('Chargement des paramètres...');
        try {
            const { data: marketInfo, error } = await supabase
                .from('markets')
                .select('*')
                .eq('id', currentUserId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (marketInfo) {
                settingsOwnerName.value = marketInfo.owner_name || '';
                settingsAccountEmail.value = marketInfo.email || '';
                settingsPhone.value = marketInfo.phone || '';
                settingsMarketName.value = marketInfo.market_name || '';
                settingsPublicEmail.value = marketInfo.public_email || '';
                settingsCity.value = marketInfo.city || '';
                settingsDescription.value = marketInfo.description || '';
                
                // Afficher le WhatsApp formaté
                if (marketInfo.whatsapp) {
                    whatsappLink.value = formatWhatsappDisplay(marketInfo.whatsapp);
                } else {
                    whatsappLink.value = '';
                }
                
                marketActiveToggle.checked = marketInfo.market_active !== false;
                
                if (announcementMessage) {
                    announcementMessage.value = marketInfo.announcement_text || '';
                    charCountSpan.textContent = (marketInfo.announcement_text || '').length;
                }
                
                const msgType = marketInfo.announcement_type || 'info';
                document.querySelectorAll('.type-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-type') === msgType);
                });
                
                if (marketInfo.avatar_url) {
                    adminAvatar.src = marketInfo.avatar_url;
                }
                
                // Valider le WhatsApp après chargement
                updateWhatsappValidator();
            }
        } catch (err) {
            console.error('Erreur chargement:', err);
            showToast('Erreur chargement des paramètres', 'error');
        } finally {
            hideLoading();
        }
    }

    // ============================================
    // SAUVEGARDE
    // ============================================
    async function saveAllSettings() {
        // Valider le WhatsApp
        const validation = validateWhatsapp(whatsappLink.value);
        if (!validation.valid) {
            showToast(validation.message, 'error');
            whatsappLink.focus();
            return;
        }
        
        const normalizedWhatsapp = normalizeWhatsappNumber(whatsappLink.value);
        
        showLoading('Enregistrement...');
        try {
            const updates = {
                owner_name: settingsOwnerName.value,
                phone: settingsPhone.value,
                market_name: settingsMarketName.value,
                public_email: settingsPublicEmail.value,
                city: settingsCity.value,
                description: settingsDescription.value,
                whatsapp: normalizedWhatsapp,
                market_active: marketActiveToggle.checked,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('markets')
                .update(updates)
                .eq('id', currentUserId);

            if (error) throw error;

            // Mettre à jour l'affichage avec le numéro formaté
            whatsappLink.value = formatWhatsappDisplay(normalizedWhatsapp);
            updateWhatsappValidator();

            if (currentAvatarFile) {
                const fileExt = currentAvatarFile.name.split('.').pop();
                const fileName = `${currentUserId}/avatar.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, currentAvatarFile, { upsert: true });
                
                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
                    await supabase.from('markets').update({ avatar_url: urlData.publicUrl }).eq('id', currentUserId);
                    adminAvatar.src = urlData.publicUrl;
                }
                currentAvatarFile = null;
            }

            showToast('Paramètres enregistrés !', 'success');
        } catch (err) {
            console.error('Erreur:', err);
            showToast('Erreur lors de l\'enregistrement', 'error');
        } finally {
            hideLoading();
        }
    }

    // ============================================
    // ENVOI MESSAGE
    // ============================================
    async function sendMessage() {
        const message = announcementMessage.value;
        const activeType = document.querySelector('.type-btn.active');
        const announcementType = activeType ? activeType.getAttribute('data-type') : 'info';
        
        showLoading('Envoi du message...');
        try {
            const { error } = await supabase
                .from('markets')
                .update({
                    announcement_text: message,
                    announcement_type: announcementType,
                    show_announcement: true
                })
                .eq('id', currentUserId);

            if (error) throw error;
            showToast('Message envoyé aux acheteurs !', 'success');
        } catch (err) {
            showToast('Erreur: ' + err.message, 'error');
        } finally {
            hideLoading();
        }
    }

    // ============================================
    // AVATAR
    // ============================================
    changeAvatarBtn.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            currentAvatarFile = file;
            const reader = new FileReader();
            reader.onload = (ev) => { adminAvatar.src = ev.target.result; };
            reader.readAsDataURL(file);
        }
    });

    // ============================================
    // TYPE MESSAGE
    // ============================================
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ============================================
    // COMPTEUR CARACTÈRES
    // ============================================
    announcementMessage.addEventListener('input', () => {
        charCountSpan.textContent = announcementMessage.value.length;
    });

    // ============================================
    // ÉVÉNEMENTS WHATSAPP
    // ============================================
    if (whatsappLink) {
        whatsappLink.addEventListener('input', updateWhatsappValidator);
        whatsappLink.addEventListener('blur', updateWhatsappValidator);
    }

    // ============================================
    // ACTIONS
    // ============================================
    sendMessageBtn.addEventListener('click', sendMessage);
    saveAllSettingsBtn.addEventListener('click', saveAllSettings);
    
    changePasswordBtn.addEventListener('click', async () => {
        const email = settingsAccountEmail.value;
        if (email) {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            showToast(error ? 'Erreur' : 'Lien envoyé !', error ? 'error' : 'success');
        }
    });
    
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'auth.html';
    });
    
    themeLight.addEventListener('click', () => setTheme('light'));
    themeDark.addEventListener('click', () => setTheme('dark'));

    // ============================================
    // INIT
    // ============================================
    async function init() {
        await checkSession();
        initTheme();
        await loadSettings();
    }
    
    init();
})();