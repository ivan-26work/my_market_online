// ===============================================
// SETTINGS.JS - PARAMÈTRES AMÉLIORÉS
// ===============================================

(function() {
    const SUPABASE_URL = 'https://emcsigvlopntwbfkkjkh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY3NpZ3Zsb3BudHdiZmtramtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODE5MTgsImV4cCI6MjA5NDQ1NzkxOH0.YwYoV-azL3WEFtHoh4yoF7xTLrOwZILKCzJrGPsCs6I';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let currentUserId = null;
    let currentAvatarFile = null;
    let isSaving = false;

    // Éléments DOM
    const adminAvatar = document.getElementById('adminAvatar');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    const settingsWhatsapp = document.getElementById('settingsWhatsapp');
    const whatsappValidator = document.getElementById('whatsappValidator');
    const settingsOwnerName = document.getElementById('settingsOwnerName');
    const settingsAccountEmail = document.getElementById('settingsAccountEmail');
    const settingsPhone = document.getElementById('settingsPhone');
    const settingsMarketName = document.getElementById('settingsMarketName');
    const settingsPublicEmail = document.getElementById('settingsPublicEmail');
    const settingsCity = document.getElementById('settingsCity');
    const settingsDescription = document.getElementById('settingsDescription');
    const announcementMessage = document.getElementById('announcementMessage');
    const charCountSpan = document.getElementById('charCount');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const saveAllSettingsBtn = document.getElementById('saveAllSettingsBtn');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loadingModal = document.getElementById('loadingModal');
    const toastEl = document.getElementById('toast');
    const reminderBanner = document.getElementById('reminderBanner');
    const descWordCount = document.getElementById('descWordCount');

    // ============================================
    // TOAST NOTIFICATION
    // ============================================
    function showToast(message, type = 'success') {
        toastEl.textContent = message;
        toastEl.className = `toast ${type} show`;
        setTimeout(() => toastEl.classList.remove('show'), 3000);
    }

    // ============================================
    // VALIDATION WHATSAPP
    // ============================================
    function cleanWhatsappNumber(number) {
        if (!number) return '';
        return number.replace(/\D/g, '');
    }

    function normalizeWhatsappNumber(number) {
        let clean = cleanWhatsappNumber(number);
        if (!clean) return '';
        if (clean.startsWith('0')) clean = clean.substring(1);
        if (!clean.startsWith('225')) clean = '225' + clean;
        return clean;
    }

    function formatWhatsappDisplay(number) {
        let clean = cleanWhatsappNumber(number);
        if (!clean) return '';
        if (clean.startsWith('225')) clean = clean.substring(3);
        if (clean.startsWith('0')) clean = clean.substring(1);
        let formatted = '+225 ';
        for (let i = 0; i < clean.length; i += 2) {
            formatted += clean.substring(i, i + 2) + ' ';
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
        if (!normalized) return { valid: false, message: 'Numéro requis' };
        if (normalized.length !== 13) return { valid: false, message: 'Le numéro doit avoir 13 chiffres (225 + 10 chiffres)' };
        if (!normalized.startsWith('225')) return { valid: false, message: 'Le numéro doit commencer par 225' };
        return { valid: true, message: 'Numéro valide', normalized: normalized };
    }

    function updateWhatsappValidator() {
        const rawValue = settingsWhatsapp.value;
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
            whatsappValidator.className = 'whatsapp-validator success';
            settingsWhatsapp.style.borderColor = '#4ade80';
            document.getElementById('whatsappGroup').classList.remove('error');
            return true;
        } else {
            whatsappValidator.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i> ❌ ${validation.message}
                <div class="validator-hint">Format attendu : +225 05 03 58 83 36</div>
                <div class="validator-hint">Exemple : 0503588336 ou +2250503588336</div>
            `;
            whatsappValidator.className = 'whatsapp-validator error';
            settingsWhatsapp.style.borderColor = '#ff4d4d';
            return false;
        }
    }

    // ============================================
    // VALIDATION DES AUTRES CHAMPS
    // ============================================
    function checkRequiredFields() {
        let hasMissing = false;
        const warnings = [];

        // Nom du propriétaire
        if (!settingsOwnerName.value.trim()) {
            document.getElementById('ownerNameWarning').style.display = 'flex';
            document.getElementById('ownerNameGroup').classList.add('warning');
            hasMissing = true;
            warnings.push('nom');
        } else {
            document.getElementById('ownerNameWarning').style.display = 'none';
        }

        // Téléphone (recommandé)
        if (!settingsPhone.value.trim()) {
            document.getElementById('phoneWarning').style.display = 'flex';
            hasMissing = true;
        } else {
            document.getElementById('phoneWarning').style.display = 'none';
        }

        // Ville
        if (!settingsCity.value.trim()) {
            document.getElementById('cityWarning').style.display = 'flex';
            hasMissing = true;
        } else {
            document.getElementById('cityWarning').style.display = 'none';
        }

        // Description (100 mots)
        const descText = settingsDescription.value.trim();
        const wordCount = descText.length === 0 ? 0 : descText.split(/\s+/).length;
        if (wordCount < 100 && descText.length > 0) {
            document.getElementById('descWarning').style.display = 'flex';
            hasMissing = true;
        } else {
            document.getElementById('descWarning').style.display = 'none';
        }

        // WhatsApp
        const whatsappValid = updateWhatsappValidator();
        if (!whatsappValid) {
            hasMissing = true;
        }

        if (hasMissing) {
            reminderBanner.style.display = 'flex';
        } else {
            reminderBanner.style.display = 'none';
        }

        return !hasMissing;
    }

    function updateWordCount() {
        const text = settingsDescription.value;
        const wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
        descWordCount.textContent = `${wordCount} / 100 mots`;
        if (wordCount >= 100) {
            descWordCount.style.color = '#4ade80';
        } else if (wordCount > 0) {
            descWordCount.style.color = '#ffaa44';
        } else {
            descWordCount.style.color = '#8a9aaa';
        }
    }

    // ============================================
    // ANIMATION BOUTON SAUVEGARDE
    // ============================================
    async function animateSave(action) {
        if (isSaving) return false;
        isSaving = true;
        const originalText = saveAllSettingsBtn.innerHTML;
        saveAllSettingsBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Enregistrement...';
        saveAllSettingsBtn.disabled = true;

        const result = await action();

        if (result) {
            saveAllSettingsBtn.innerHTML = '<i class="fas fa-check"></i> Succès !';
            setTimeout(() => {
                saveAllSettingsBtn.innerHTML = originalText;
                saveAllSettingsBtn.disabled = false;
                isSaving = false;
            }, 1500);
        } else {
            saveAllSettingsBtn.innerHTML = '<i class="fas fa-times"></i> Échec';
            setTimeout(() => {
                saveAllSettingsBtn.innerHTML = originalText;
                saveAllSettingsBtn.disabled = false;
                isSaving = false;
            }, 2000);
        }
        return result;
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
                settingsWhatsapp.value = marketInfo.whatsapp || '';
                
                if (announcementMessage) {
                    announcementMessage.value = marketInfo.announcement_text || '';
                    charCountSpan.textContent = (marketInfo.announcement_text || '').length;
                }
                
                if (marketInfo.avatar_url) {
                    adminAvatar.src = marketInfo.avatar_url;
                }
                
                updateWhatsappValidator();
                updateWordCount();
                checkRequiredFields();
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
        // Vérifier le WhatsApp
        const whatsappValidation = validateWhatsapp(settingsWhatsapp.value);
        if (!whatsappValidation.valid) {
            showToast(whatsappValidation.message, 'error');
            settingsWhatsapp.focus();
            return false;
        }
        
        const normalizedWhatsapp = normalizeWhatsappNumber(settingsWhatsapp.value);
        
        const updates = {
            owner_name: settingsOwnerName.value,
            phone: settingsPhone.value,
            market_name: settingsMarketName.value,
            public_email: settingsPublicEmail.value,
            city: settingsCity.value,
            description: settingsDescription.value,
            whatsapp: normalizedWhatsapp,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('markets')
            .update(updates)
            .eq('id', currentUserId);

        if (error) throw error;

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
        checkRequiredFields();
        return true;
    }

    // ============================================
    // ENVOI MESSAGE
    // ============================================
    async function sendMessage() {
        const message = announcementMessage.value;
        
        showLoading('Envoi du message...');
        try {
            const { error } = await supabase
                .from('markets')
                .update({
                    announcement_text: message,
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
    // COMPTEUR CARACTÈRES MESSAGE
    // ============================================
    announcementMessage.addEventListener('input', () => {
        charCountSpan.textContent = announcementMessage.value.length;
    });

    // ============================================
    // ÉVÉNEMENTS WHATSAPP
    // ============================================
    settingsWhatsapp.addEventListener('input', updateWhatsappValidator);
    settingsWhatsapp.addEventListener('blur', updateWhatsappValidator);

    // ============================================
    // ÉVÉNEMENTS AUTRES CHAMPS
    // ============================================
    settingsOwnerName.addEventListener('input', () => checkRequiredFields());
    settingsPhone.addEventListener('input', () => checkRequiredFields());
    settingsCity.addEventListener('input', () => checkRequiredFields());
    settingsDescription.addEventListener('input', () => {
        updateWordCount();
        checkRequiredFields();
    });

    // ============================================
    // ACTIONS
    // ============================================
    sendMessageBtn.addEventListener('click', sendMessage);
    saveAllSettingsBtn.addEventListener('click', () => animateSave(() => saveAllSettings()));
    
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

    // ============================================
    // SESSION
    // ============================================
    function showLoading(msg = 'Chargement...') {
        const modalStatus = document.getElementById('modalStatus');
        if (modalStatus) modalStatus.textContent = msg;
        loadingModal.style.display = 'flex';
    }

    function hideLoading() {
        loadingModal.style.display = 'none';
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
    // INIT
    // ============================================
    async function init() {
        const ok = await checkSession();
        if (ok) {
            await loadSettings();
        }
    }
    
    init();
})();