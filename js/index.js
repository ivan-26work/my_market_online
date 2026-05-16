// ===============================================
// INDEX.JS - PAGE PRINCIPALE
// ===============================================

(function() {
    const SUPABASE_URL = 'https://emcsigvlopntwbfkkjkh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY3NpZ3Zsb3BudHdiZmtramtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODE5MTgsImV4cCI6MjA5NDQ1NzkxOH0.YwYoV-azL3WEFtHoh4yoF7xTLrOwZILKCzJrGPsCs6I';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let currentUserId  = null;
    let currentProducts = [];
    let activeFilter   = 'all'; // 'all' ou nom de catégorie

    const productsGrid     = document.getElementById('productsGrid');
    const searchInput      = document.getElementById('searchInput');
    const loadingModal     = document.getElementById('loadingModal');
    const filtersContainer = document.getElementById('filtersContainer');
    const filtersScroll    = document.getElementById('filtersScroll');

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

    function formatPrice(price) {
        return new Intl.NumberFormat('fr-FR').format(price);
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getMainImage(images) {
        if (Array.isArray(images) && images.length > 0 && images[0]) return images[0];
        return null;
    }

    // ============================================
    // SESSION
    // ============================================
    async function checkSession() {
        showLoading('Vérification session...');
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            if (!session) { window.location.href = 'auth.html'; return null; }
            currentUserId = session.user.id;
            hideLoading();
            return session.user;
        } catch (err) {
            hideLoading();
            window.location.href = 'auth.html';
            return null;
        }
    }

    // ============================================
    // CHARGEMENT PRODUITS
    // ============================================
    async function loadProducts() {
        if (!currentUserId) return;
        showLoading('Chargement produits...');
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('user_id', currentUserId)
                .order('featured', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            currentProducts = data || [];
            buildFilters();
            displayProducts();
        } catch (err) {
            productsGrid.innerHTML = `
                <div class="empty-products">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Erreur lors du chargement des produits</p>
                </div>`;
        } finally {
            hideLoading();
        }
    }

    // ============================================
    // FILTRES CATÉGORIES
    // Affichés seulement si au moins 1 produit a une catégorie
    // ============================================
    function buildFilters() {
        // Récupérer les catégories uniques présentes dans les produits
        const cats = [...new Set(
            currentProducts
                .map(p => p.category)
                .filter(c => c && c.trim() !== '')
        )].sort();

        // Si aucune catégorie → cacher les filtres et partir
        if (cats.length === 0) {
            filtersContainer.style.display = 'none';
            return;
        }

        // Afficher la barre de filtres
        filtersContainer.style.display = 'block';

        // Construire les boutons : "Tout" + une catégorie par catégorie présente
        filtersScroll.innerHTML = '';

        const allBtn = document.createElement('button');
        allBtn.className = 'filter-btn' + (activeFilter === 'all' ? ' active' : '');
        allBtn.textContent = 'Tout';
        allBtn.addEventListener('click', () => setFilter('all'));
        filtersScroll.appendChild(allBtn);

        cats.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn' + (activeFilter === cat ? ' active' : '');
            btn.textContent = cat;
            btn.addEventListener('click', () => setFilter(cat));
            filtersScroll.appendChild(btn);
        });
    }

    function setFilter(cat) {
        activeFilter = cat;
        // Mettre à jour les boutons actifs
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active',
                (cat === 'all' && btn.textContent === 'Tout') ||
                btn.textContent === cat
            );
        });
        displayProducts();
    }

    // ============================================
    // AFFICHAGE PRODUITS
    // ============================================
    function displayProducts() {
        if (!productsGrid) return;

        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        let filtered = currentProducts;

        // Filtre catégorie
        if (activeFilter !== 'all') {
            filtered = filtered.filter(p => p.category === activeFilter);
        }

        // Filtre recherche
        if (searchTerm) {
            filtered = filtered.filter(p =>
                (p.name && p.name.toLowerCase().includes(searchTerm)) ||
                (p.price && p.price.toString().includes(searchTerm)) ||
                (p.description && p.description.toLowerCase().includes(searchTerm)) ||
                (p.category && p.category.toLowerCase().includes(searchTerm))
            );
        }

        if (filtered.length === 0) {
            productsGrid.innerHTML = `
                <div class="empty-products">
                    <i class="fas fa-box-open"></i>
                    <p>Aucun produit trouvé</p>
                </div>`;
            return;
        }

        productsGrid.innerHTML = filtered.map(product => {
            const mainImage  = getMainImage(product.images);
            const isInactive = product.active === false;
            const isFeatured = product.featured === true;

            const imageBlock = `
                <div class="product-image-wrap">
                    ${mainImage
                        ? `<img src="${escapeHtml(mainImage)}" class="product-image" alt="${escapeHtml(product.name)}">`
                        : `<div class="product-image-placeholder"><i class="fas fa-image"></i></div>`
                    }
                    ${isInactive ? `
                    <div class="image-hidden-overlay">
                        <i class="fas fa-eye-slash"></i>
                        <span>Masqué</span>
                    </div>` : ''}
                </div>`;

            return `
                <div class="product-card ${isFeatured ? 'featured' : ''} ${isInactive ? 'inactive' : ''}"
                     data-id="${product.id}">
                    ${imageBlock}
                    <div class="product-info">
                        <div class="product-name">${escapeHtml(product.name)}</div>
                        <div class="product-price">${formatPrice(product.price)} FCFA</div>
                    </div>
                </div>`;
        }).join('');

        // Clics sur les cartes
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                window.location.href = `viewproduct.html?id=${card.getAttribute('data-id')}`;
            });
        });
    }

    // ============================================
    // RECHERCHE
    // ============================================
    function initSearch() {
        if (searchInput) {
            searchInput.addEventListener('input', () => displayProducts());
        }
    }

    // ============================================
    // INIT
    // ============================================
    async function init() {
        const user = await checkSession();
        if (user) {
            await loadProducts();
            initSearch();
        }
    }

    init();
})();
