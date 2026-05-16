// ===============================================
// CREATEPRODUCT.JS
// ===============================================

(function() {
    const SUPABASE_URL = 'https://emcsigvlopntwbfkkjkh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY3NpZ3Zsb3BudHdiZmtramtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODE5MTgsImV4cCI6MjA5NDQ1NzkxOH0.YwYoV-azL3WEFtHoh4yoF7xTLrOwZILKCzJrGPsCs6I';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let currentUserId  = null;
    let selectedImages = []; // Fichiers File sélectionnés
    let selectedCategory = ''; // Catégorie sélectionnée

    // DOM
    const imageInput       = document.getElementById('imageInput');
    const imageAddBtn      = document.getElementById('imageAddBtn');
    const imagesRow        = document.getElementById('imagesRow');
    const publishBtn       = document.getElementById('publishBtn');
    const loadingModal     = document.getElementById('loadingModal');
    const toastEl          = document.getElementById('toast');
    const customCategoryEl = document.getElementById('customCategory');
    const catBtns          = document.querySelectorAll('.cat-btn');

    // ============================================
    // UTILITAIRES
    // ============================================
    function showLoading(msg = 'Publication...') {
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

    // ============================================
    // SESSION
    // ============================================
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
    // GESTION IMAGES
    // ============================================
    function renderImages() {
        // Vider la ligne sauf le bouton d'ajout
        imagesRow.innerHTML = '';

        // Miniatures existantes
        selectedImages.forEach((file, index) => {
            const url = URL.createObjectURL(file);
            const thumb = document.createElement('div');
            thumb.className = 'image-thumb';
            thumb.innerHTML = `
                <img src="${url}" alt="photo ${index + 1}">
                <button class="remove-img" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            imagesRow.appendChild(thumb);
        });

        // Bouton ajouter (masqué si 5 images atteintes)
        if (selectedImages.length < 5) {
            imagesRow.appendChild(imageAddBtn);
        }

        // Écouter les boutons supprimer
        imagesRow.querySelectorAll('.remove-img').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-index'));
                selectedImages.splice(idx, 1);
                renderImages();
            });
        });
    }

    imageInput.addEventListener('change', () => {
        const files = Array.from(imageInput.files);
        const remaining = 5 - selectedImages.length;
        const toAdd = files.slice(0, remaining);
        selectedImages = [...selectedImages, ...toAdd];
        imageInput.value = ''; // Reset input
        renderImages();
    });

    // ============================================
    // GESTION CATÉGORIES
    // ============================================
    catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.getAttribute('data-cat');

            if (btn.classList.contains('selected')) {
                // Désélectionner
                btn.classList.remove('selected');
                selectedCategory = '';
            } else {
                // Sélectionner ce bouton, désélectionner les autres
                catBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedCategory = cat;
                customCategoryEl.value = ''; // Effacer la saisie libre
            }
        });
    });

    // Saisie libre — désélectionne les boutons fixes
    customCategoryEl.addEventListener('input', () => {
        if (customCategoryEl.value.trim()) {
            catBtns.forEach(b => b.classList.remove('selected'));
            selectedCategory = '';
        }
    });

    // ============================================
    // UPLOAD IMAGE VERS SUPABASE STORAGE
    // ============================================
    async function uploadImage(file, index) {
        const ext  = file.name.split('.').pop();
        const path = `${currentUserId}/${Date.now()}_${index}.${ext}`;

        const { error } = await supabase.storage
            .from('product-images')
            .upload(path, file, { upsert: false });

        if (error) throw error;

        const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(path);

        return data.publicUrl;
    }

    // ============================================
    // PUBLIER LE PRODUIT
    // ============================================
    async function publishProduct() {
        const name        = document.getElementById('productName').value.trim();
        const price       = parseFloat(document.getElementById('productPrice').value);
        const priceOption = document.getElementById('productPriceOption').value.trim();
        const description = document.getElementById('productDescription').value.trim();
        const active      = document.getElementById('productActive').checked;

        // Catégorie : priorité à la saisie libre, sinon bouton sélectionné
        const customCat = customCategoryEl.value.trim();
        const category  = customCat || selectedCategory || null;

        // Validation
        if (!name) { showToast('Le nom du produit est requis', 'error'); return; }
        if (isNaN(price) || price <= 0) { showToast('Le prix doit être supérieur à 0', 'error'); return; }

        publishBtn.disabled = true;
        showLoading('Upload des images...');

        try {
            // Upload images
            const imageUrls = [];
            for (let i = 0; i < selectedImages.length; i++) {
                showLoading(`Upload image ${i + 1}/${selectedImages.length}...`);
                const url = await uploadImage(selectedImages[i], i);
                imageUrls.push(url);
            }

            showLoading('Création du produit...');

            // Insérer en base
            const { error } = await supabase
                .from('products')
                .insert({
                    user_id      : currentUserId,
                    name         : name,
                    price        : price,
                    price_option : priceOption || null,
                    description  : description || null,
                    category     : category,
                    images       : imageUrls,
                    active       : active,
                    featured     : false,
                    created_at   : new Date().toISOString()
                });

            if (error) throw error;

            showToast('Produit publié !', 'success');
            setTimeout(() => { window.location.href = 'index.html'; }, 1200);

        } catch (err) {
            showToast('Erreur : ' + err.message, 'error');
            publishBtn.disabled = false;
        } finally {
            hideLoading();
        }
    }

    // ============================================
    // EVENTS
    // ============================================
    publishBtn.addEventListener('click', publishProduct);

    // ============================================
    // INIT
    // ============================================
    async function init() {
        const ok = await checkSession();
        if (ok) renderImages();
    }

    init();
})();
