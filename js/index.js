// ===============================================
// INDEX.JS - ADMINISTRATION
// ===============================================

(function() {
    const SUPABASE_URL = 'https://emcsigvlopntwbfkkjkh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY3NpZ3Zsb3BudHdiZmtramtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODE5MTgsImV4cCI6MjA5NDQ1NzkxOH0.YwYoV-azL3WEFtHoh4yoF7xTLrOwZILKCzJrGPsCs6I';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let currentUserId = null;
    let currentProducts = [];
    let activeFilter = 'all';
    let marketInfo = null;

    // DOM elements
    const productsGrid = document.getElementById('productsGrid');
    const searchInput = document.getElementById('searchInput');
    const filtersContainer = document.getElementById('filtersContainer');
    const filtersScroll = document.getElementById('filtersScroll');
    const loadingModal = document.getElementById('loadingModal');
    const loadingAnimation = document.getElementById('loadingAnimation');
    const mainContent = document.getElementById('mainContent');
    const warningBanner = document.getElementById('warningBanner');
    const warningMessage = document.getElementById('warningMessage');
    const closeWarningBtn = document.getElementById('closeWarningBtn');
    const mainHeader = document.getElementById('mainHeader');

    // ============================================
    // VÉRIFICATION DES INFOS ADMIN
    // ============================================
    function validateWhatsapp(number) {
        if (!number) return false;
        let clean = number.replace(/\D/g, '');
        if (clean.startsWith('0')) clean = clean.substring(1);
        if (!clean.startsWith('225')) clean = '225' + clean;
        return clean.length === 13;
    }

    function checkAdminInfoCompleteness() {
        if (!marketInfo) return false;
        
        const isComplete = marketInfo.market_name && marketInfo.market_name.trim() !== '' &&
            marketInfo.owner_name && marketInfo.owner_name.trim() !== '' &&
            marketInfo.phone && marketInfo.phone.trim() !== '' &&
            marketInfo.city && marketInfo.city.trim() !== '' &&
            validateWhatsapp(marketInfo.whatsapp);
        
        return isComplete;
    }

    function updateHeaderWarning() {
        const isComplete = checkAdminInfoCompleteness();
        
        if (!isComplete) {
            mainHeader.classList.add('warning-border');
        } else {
            mainHeader.classList.remove('warning-border');
        }
        
        // Bannière WhatsApp uniquement
        if (!marketInfo?.whatsapp || !validateWhatsapp(marketInfo.whatsapp)) {
            const bannerClosed = localStorage.getItem('whatsapp_warning_closed');
            if (!bannerClosed) {
                warningBanner.style.display = 'flex';
            } else {
                warningBanner.style.display = 'none';
            }
        } else {
            warningBanner.style.display = 'none';
        }
    }

    closeWarningBtn.addEventListener('click', () => {
        warningBanner.style.display = 'none';
        localStorage.setItem('whatsapp_warning_closed', 'true');
    });

    // ============================================
    // CHARGEMENT DES DONNÉES
    // ============================================
    async function loadMarketInfo() {
        const { data, error } = await supabase
            .from('markets')
            .select('*')
            .eq('id', currentUserId)
            .single();
        
        if (!error && data) {
            marketInfo = data;
            updateHeaderWarning();
        }
    }

    async function loadProducts() {
        if (!currentUserId) return;
        
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
            
            // Animation terminée → afficher le contenu
            loadingAnimation.classList.add('hide');
            setTimeout(() => {
                loadingAnimation.style.display = 'none';
                mainContent.style.display = 'block';
                filtersContainer.style.display = currentProducts.length > 0 ? 'block' : 'none';
            }, 500);
            
        } catch (err) {
            console.error('Erreur chargement:', err);
            loadingAnimation.classList.add('hide');
            setTimeout(() => {
                loadingAnimation.style.display = 'none';
                mainContent.style.display = 'block';
                productsGrid.innerHTML = `
                    <div class="empty-products">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Erreur lors du chargement des produits</p>
                    </div>
                `;
            }, 500);
        }
    }

    function buildFilters() {
        const cats = [...new Set(
            currentProducts.map(p => p.category).filter(c => c && c.trim() !== '')
        )].sort();

        if (cats.length === 0) {
            filtersContainer.style.display = 'none';
            return;
        }

        filtersContainer.style.display = 'block';
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
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active',
                (cat === 'all' && btn.textContent === 'Tout') || btn.textContent === cat
            );
        });
        displayProducts();
    }

    function displayProducts() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        let filtered = currentProducts;

        if (activeFilter !== 'all') {
            filtered = filtered.filter(p => p.category === activeFilter);
        }

        if (searchTerm) {
            filtered = filtered.filter(p =>
                (p.name && p.name.toLowerCase().includes(searchTerm)) ||
                (p.price && p.price.toString().includes(searchTerm)) ||
                (p.description && p.description.toLowerCase().includes(searchTerm))
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
            const mainImage = (product.images && product.images[0]) ? product.images[0] : null;
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
                <div class="product-card ${isFeatured ? 'featured' : ''} ${isInactive ? 'inactive' : ''}" data-id="${product.id}">
                    ${imageBlock}
                    <div class="product-info">
                        <div class="product-name">${escapeHtml(product.name)}</div>
                        <div class="product-price">${formatPrice(product.price)} FCFA</div>
                    </div>
                </div>`;
        }).join('');

        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                window.location.href = `viewproduct.html?id=${card.getAttribute('data-id')}`;
            });
        });
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

    function initSearch() {
        if (searchInput) {
            searchInput.addEventListener('input', () => displayProducts());
        }
    }

    async function init() {
        const user = await checkSession();
        if (user) {
            await loadMarketInfo();
            await loadProducts();
            initSearch();
        }
    }

    init();
})();