// ===============================================
// VIEWPRODUCT.JS - DÉTAIL PRODUIT (corrigé)
// ===============================================

(function() {
    const SUPABASE_URL = 'https://emcsigvlopntwbfkkjkh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY3NpZ3Zsb3BudHdiZmtramtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODE5MTgsImV4cCI6MjA5NDQ1NzkxOH0.YwYoV-azL3WEFtHoh4yoF7xTLrOwZILKCzJrGPsCs6I';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // État
    let currentUserId = null;
    let currentProduct = null;
    let currentImages = [];
    let currentImageIndex = 0;
    let editMode = false;

    // Éléments DOM
    const productNameEl   = document.getElementById('productName');
    const productImage    = document.getElementById('productImage');
    const imagePlaceholder= document.getElementById('imagePlaceholder');
    const prevBtn         = document.getElementById('prevBtn');
    const nextBtn         = document.getElementById('nextBtn');
    const imageCounter    = document.getElementById('imageCounter');
    const activeToggle    = document.getElementById('activeToggle');
    const priceValue      = document.getElementById('priceValue');
    const priceEdit       = document.getElementById('priceEdit');
    const priceOptionValue= document.getElementById('priceOptionValue');
    const priceOptionEdit = document.getElementById('priceOptionEdit');
    const descValue       = document.getElementById('descValue');
    const descEdit        = document.getElementById('descEdit');
    const editBtn         = document.getElementById('editBtn');
    const updateBtn       = document.getElementById('updateBtn');
    const featureBtn      = document.getElementById('featureBtn');
    const deleteBtn       = document.getElementById('deleteBtn');
    const addInfoBtn      = document.getElementById('addInfoBtn');
    const loadingModal    = document.getElementById('loadingModal');
    const toastEl         = document.getElementById('toast');

    // ============================================
    // UTILITAIRES
    // ============================================
    function showLoading(msg = 'Chargement...') {
        document.getElementById('modalStatus').textContent = msg;
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

    function formatPrice(p) {
        return new Intl.NumberFormat('fr-FR').format(p);
    }

    function getProductId() {
        return new URLSearchParams(window.location.search).get('id');
    }

    // ============================================
    // IMAGES
    // ============================================
    function loadImage() {
        if (currentImages.length > 0 && currentImages[currentImageIndex]) {
            productImage.src = currentImages[currentImageIndex];
            productImage.style.display = 'block';
            imagePlaceholder.style.display = 'none';
        } else {
            productImage.style.display = 'none';
            imagePlaceholder.style.display = 'flex';
        }

        const hasMultiple = currentImages.length > 1;
        prevBtn.style.display = hasMultiple ? 'flex' : 'none';
        nextBtn.style.display = hasMultiple ? 'flex' : 'none';
        imageCounter.style.display = hasMultiple ? 'block' : 'none';
        if (hasMultiple) {
            imageCounter.textContent = `${currentImageIndex + 1} / ${currentImages.length}`;
        }
    }

    prevBtn.addEventListener('click', () => {
        if (currentImageIndex > 0) { currentImageIndex--; loadImage(); }
    });

    nextBtn.addEventListener('click', () => {
        if (currentImageIndex < currentImages.length - 1) { currentImageIndex++; loadImage(); }
    });

    // ============================================
    // TOGGLE ACTIVER / DÉSACTIVER — CORRIGÉ
    // Le label englobe l'input → clic natif sur le checkbox
    // On écoute 'change' directement sur l'input
    // ============================================
    activeToggle.addEventListener('change', async function() {
        if (!currentProduct) return;

        const newStatus = this.checked;

        try {
            const { error } = await supabase
                .from('products')
                .update({ active: newStatus })
                .eq('id', getProductId())
                .eq('user_id', currentUserId);

            if (error) throw error;

            currentProduct.active = newStatus;
            showToast(newStatus ? 'Produit activé' : 'Produit désactivé', newStatus ? 'success' : 'info');

        } catch (err) {
            // Annuler le changement visuel si erreur
            this.checked = !newStatus;
            showToast('Erreur : ' + err.message, 'error');
        }
    });

    // ============================================
    // MODE ÉDITION
    // ============================================
    function enableEditMode() {
        editMode = true;
        priceValue.style.display = 'none';
        priceEdit.style.display = 'block';
        priceOptionValue.style.display = 'none';
        priceOptionEdit.style.display = 'block';
        descValue.style.display = 'none';
        descEdit.style.display = 'block';
        editBtn.style.display = 'none';
        updateBtn.style.display = 'flex';
    }

    function disableEditMode() {
        editMode = false;
        priceValue.style.display = 'block';
        priceEdit.style.display = 'none';
        priceOptionValue.style.display = 'block';
        priceOptionEdit.style.display = 'none';
        descValue.style.display = 'block';
        descEdit.style.display = 'none';
        editBtn.style.display = 'flex';
        updateBtn.style.display = 'none';
    }

    // ============================================
    // SAUVEGARDER LES MODIFICATIONS
    // ============================================
    async function saveProduct() {
        const price = parseFloat(priceEdit.value);
        const priceOption = priceOptionEdit.value.trim();
        const description = descEdit.value.trim();

        if (isNaN(price) || price <= 0) {
            showToast('Prix valide requis', 'error');
            return;
        }

        showLoading('Sauvegarde...');

        try {
            const { error } = await supabase
                .from('products')
                .update({
                    price: price,
                    price_option: priceOption,
                    description: description,
                    updated_at: new Date().toISOString()
                })
                .eq('id', getProductId())
                .eq('user_id', currentUserId);

            if (error) throw error;

            // Mettre à jour l'affichage
            currentProduct.price = price;
            currentProduct.price_option = priceOption;
            currentProduct.description = description;

            priceValue.textContent = formatPrice(price) + ' FCFA';
            priceOptionValue.textContent = priceOption || 'Prix fixe';
            descValue.textContent = description || 'Aucune description';

            disableEditMode();
            showToast('Produit mis à jour', 'success');

        } catch (err) {
            showToast('Erreur : ' + err.message, 'error');
        } finally {
            hideLoading();
        }
    }

    // ============================================
    // SUPPRIMER
    // ============================================
    async function deleteProduct() {
        if (!confirm('Supprimer ce produit définitivement ?')) return;

        showLoading('Suppression...');

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', getProductId())
                .eq('user_id', currentUserId);

            if (error) throw error;

            window.location.href = 'index.html';

        } catch (err) {
            showToast('Erreur : ' + err.message, 'error');
            hideLoading();
        }
    }

    // ============================================
    // À LA UNE (featured)
    // ============================================
    async function toggleFeature() {
        if (!currentProduct) return;

        showLoading('Mise à jour...');

        try {
            const newVal = !currentProduct.featured;

            const { error } = await supabase
                .from('products')
                .update({ featured: newVal })
                .eq('id', getProductId())
                .eq('user_id', currentUserId);

            if (error) throw error;

            currentProduct.featured = newVal;
            featureBtn.classList.toggle('active-feature', newVal);
            featureBtn.style.background = newVal ? '#ffaa44' : '';
            featureBtn.style.color      = newVal ? '#1a2a3a' : '';

            showToast(newVal ? 'Mis à la une ⭐' : 'Retiré de la une', 'success');

        } catch (err) {
            showToast('Erreur : ' + err.message, 'error');
        } finally {
            hideLoading();
        }
    }

    // ============================================
    // CHARGER LE PRODUIT
    // ============================================
    async function loadProduct() {
        const id = getProductId();
        if (!id) { window.location.href = 'index.html'; return; }

        showLoading('Chargement...');

        try {
            // Vérifier la session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { window.location.href = 'auth.html'; return; }
            currentUserId = session.user.id;

            // Charger le produit
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .eq('user_id', currentUserId)
                .single();

            if (error) throw error;
            if (!data) { showToast('Produit non trouvé', 'error'); window.location.href = 'index.html'; return; }

            currentProduct = data;
            currentImages = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
            currentImageIndex = 0;

            // Remplir le DOM
            productNameEl.textContent = data.name || 'Produit';
            loadImage();

            // Toggle actif — on met checked AVANT d'écouter les events
            activeToggle.checked = data.active !== false;

            // Prix
            priceValue.textContent = formatPrice(data.price) + ' FCFA';
            priceEdit.value = data.price;

            // Option prix
            priceOptionValue.textContent = data.price_option || 'Prix fixe';
            priceOptionEdit.value = data.price_option || '';

            // Description
            descValue.textContent = data.description || 'Aucune description';
            descEdit.value = data.description || '';

            // Featured
            featureBtn.style.background = data.featured ? '#ffaa44' : '';
            featureBtn.style.color      = data.featured ? '#1a2a3a' : '';

            disableEditMode();

        } catch (err) {
            showToast('Erreur : ' + err.message, 'error');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        } finally {
            hideLoading();
        }
    }

    // ============================================
    // EVENTS
    // ============================================
    editBtn.addEventListener('click', enableEditMode);
    updateBtn.addEventListener('click', saveProduct);
    featureBtn.addEventListener('click', toggleFeature);
    deleteBtn.addEventListener('click', deleteProduct);
    addInfoBtn.addEventListener('click', () => showToast('Fonctionnalité à venir', 'info'));

    // Démarrage
    loadProduct();

})();
