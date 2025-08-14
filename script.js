// Global variables
let products = [];
let currentFilter = 'all';

// Helpers
function formatPriceGBP(value) {
    try {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(value || 0));
    } catch (_) {
        return `£${Number(value || 0).toFixed(2)}`;
    }
}

function getProductLinks(product) {
    if (Array.isArray(product.links)) {
        return product.links.filter(Boolean).slice(0, 4);
    }
    if (product.link) {
        return [product.link];
    }
    return [];
}

// DOM elements
const productsGrid = document.getElementById('products-grid');
const filterBtns = document.querySelectorAll('.filter-btn');
const modal = document.getElementById('product-modal');
const modalContent = document.getElementById('modal-product-content');
const closeBtn = document.querySelector('.close');
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const headerSearchBar = document.querySelector('.navbar .nav-search .search-bar');
const mobileSearchContainer = document.querySelector('.nav-search.mobile-search');
const searchInputEl = document.getElementById('search-query');
// removed deprecated market filter
const topCategoryFilterEl = document.getElementById('category-filter-top');
let topCategoryDisplayEl = null;

// Keep the visible category overlay text in sync with the select's selected option
function updateTopCategoryDisplay() {
    if (!topCategoryDisplayEl || !topCategoryFilterEl) return;
    const selectedOption = topCategoryFilterEl.options[topCategoryFilterEl.selectedIndex];
    topCategoryDisplayEl.textContent = selectedOption ? selectedOption.text : 'All';
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    setupEventListeners();
    setupMobileNavigation();
    initTheme();
    relocateSearchForViewport();
    // If we don't use an overlay element in DOM, synthesize one for the header select
    const container = document.querySelector('.nav-search .category-select');
    if (container) {
        topCategoryDisplayEl = document.createElement('span');
        topCategoryDisplayEl.id = 'category-display';
        topCategoryDisplayEl.className = 'category-display';
        topCategoryDisplayEl.setAttribute('aria-hidden', 'true');
        updateTopCategoryDisplay();
        container.appendChild(topCategoryDisplayEl);
    }
});

// Setup event listeners
function setupEventListeners() {
    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            filterProducts(category);
        });
    });

    // Modal close
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Search and market filter
    if (searchInputEl) {
        searchInputEl.addEventListener('input', applySearchAndFilters);
    }
    // no market filter
    if (topCategoryFilterEl) {
        const onCategoryChanged = () => {
            // Keep category buttons in sync visually
            const selected = topCategoryFilterEl.value || 'all';
            filterProducts(selected);
            updateTopCategoryDisplay();
        };
        topCategoryFilterEl.addEventListener('change', onCategoryChanged);
        topCategoryFilterEl.addEventListener('input', onCategoryChanged);
    }
}

// Theme handling
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('theme-dark');
            const newTheme = isDark ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            updateThemeToggle(toggle, newTheme);
        });
        updateThemeToggle(toggle, theme);
    }
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('theme-dark', isDark);
}

function updateThemeToggle(button, theme) {
    const icon = button.querySelector('i');
    const label = button.querySelector('.theme-toggle-label');
    const isDark = theme === 'dark';
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
    if (label) {
        label.textContent = isDark ? 'Light mode' : 'Dark mode';
    }
    button.setAttribute('aria-pressed', String(isDark));
}

// Setup mobile navigation
function setupMobileNavigation() {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        
        // Animate hamburger menu
        const bars = navToggle.querySelectorAll('.bar');
        bars.forEach((bar, index) => {
            if (navMenu.classList.contains('active')) {
                if (index === 0) bar.style.transform = 'rotate(45deg) translate(5px, 5px)';
                if (index === 1) bar.style.opacity = '0';
                if (index === 2) bar.style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                bar.style.transform = 'none';
                bar.style.opacity = '1';
            }
        });
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            const bars = navToggle.querySelectorAll('.bar');
            bars.forEach(bar => {
                bar.style.transform = 'none';
                bar.style.opacity = '1';
            });
        });
    });
}

// Load products from JSON file
async function loadProducts() {
    showLoading(); // Show loading state
    try {
        const response = await fetch('products.json');
        if (!response.ok) {
            throw new Error('Failed to load products');
        }
        products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        productsGrid.innerHTML = `
            <div class="error-message" style="text-align: center; grid-column: 1 / -1; padding: 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem;"></i>
                <h3>Unable to load products</h3>
                <p>Please check your products.json file or try refreshing the page.</p>
            </div>
        `;
    }
}

// Helper function to create image HTML
function createImageHTML(imageUrl, altText) {
    if (imageUrl && imageUrl.startsWith('http')) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = altText;
        img.onerror = function() {
            this.parentElement.innerHTML = '<i class="fas fa-image"></i>';
        };
        return img.outerHTML;
    }
    return '<i class="fas fa-image"></i>';
}

// Display products in the grid
function displayProducts(productsToShow) {
    if (!productsToShow || productsToShow.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-products" style="text-align: center; grid-column: 1 / -1; padding: 2rem;">
                <i class="fas fa-search" style="font-size: 3rem; color: #6c757d; margin-bottom: 1rem;"></i>
                <h3>No products found</h3>
                <p>Try adjusting your filters or check back later.</p>
            </div>
        `;
        return;
    }

    productsGrid.innerHTML = productsToShow.map(product => `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image">
                ${createImageHTML(product.image, product.name)}
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">${formatPriceGBP(product.price)}</div>
                <button class="buy-now-btn" onclick="openProductModal(${product.id})">
                    <i class="fas fa-external-link-alt"></i> View Product
                </button>
            </div>
        </div>
    `).join('');

    // Add click event to product cards for modal
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('buy-now-btn')) {
                const productId = parseInt(card.dataset.productId);
                openProductModal(productId);
            }
        });
    });
}

// Apply text search and market filter on top of current category filter
function applySearchAndFilters() {
    const query = (searchInputEl?.value || '').toLowerCase().trim();
    const selectedTopCategory = (topCategoryFilterEl?.value || 'all').toLowerCase();

    // Start from category-filtered list
    let baseList = [];
    const effectiveCategory = selectedTopCategory !== 'all' ? selectedTopCategory : currentFilter;
    if (effectiveCategory === 'all') {
        baseList = products;
    } else {
        baseList = products.filter(p => (p.category || '').toLowerCase() === effectiveCategory.toLowerCase());
    }

    // Start with category-filtered base list
    let filtered = baseList;

    // Text search against name and description
    if (query) {
        filtered = filtered.filter(p =>
            (p.name || '').toLowerCase().includes(query) ||
            (p.description || '').toLowerCase().includes(query)
        );
    }

    displayProducts(filtered);

    // Update the visible category display overlay text
    updateTopCategoryDisplay();
}

// Filter products by category
function filterProducts(category) {
    currentFilter = category;
    
    // After updating currentFilter, apply combined search/market filters
    applySearchAndFilters();

    // Update active state on category buttons
    document.querySelectorAll('.filter-btn').forEach(b => {
        if (b.dataset.category === category) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });

    // Keep the top category dropdown in sync with the selected category
    if (topCategoryFilterEl) {
        topCategoryFilterEl.value = category || 'all';
    }
    // Also update overlay display text immediately
    updateTopCategoryDisplay();

    // Show/hide hero and scroll to products when applicable
    const hero = document.querySelector('.hero');
    const productsSection = document.getElementById('products');
    if (hero) {
        if (category === 'all') {
            hero.classList.remove('hidden');
        } else {
            hero.classList.add('hidden');
            if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }
}

// Open product modal
function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    modalContent.innerHTML = `
        <div class="modal-product">
            <div class="modal-product-image">
                ${createImageHTML(product.image, product.name)}
            </div>
            <div class="modal-product-info">
                <h2>${product.name}</h2>
                <p class="modal-description">${product.description}</p>
                <div class="modal-price">${formatPriceGBP(product.price)}</div>
                <div class="modal-links">
                    ${getProductLinks(product).map((url, i) => `
                        <a href="${url}" target="_blank" rel="nofollow noopener" class="modal-buy-btn">
                            <i class="fas fa-external-link-alt"></i> Buy Link ${i + 1}
                        </a>
                    `).join('') || '<p style="color:#6c757d">No affiliate links available.</p>'}
                </div>
                <p class="modal-note">
                    <i class="fas fa-info-circle"></i>
                    You'll be redirected to the supplier's website to complete your purchase.
                </p>
            </div>
        </div>
    `;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close product modal
function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Add some additional CSS for the modal content (theme-aware via CSS variables)
const modalStyles = document.createElement('style');
modalStyles.textContent = `
    .modal-product {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        padding: 0.5rem;
        align-items: start;
    }
    
    .modal-product-image {
        width: 100%;
        height: 300px;
        background: var(--color-surface-alt);
        border-radius: 15px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-muted);
        font-size: 4rem;
    }
    
    .modal-product-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .modal-product-info h2 {
        font-size: 1.8rem;
        font-weight: 700;
        margin-bottom: 1rem;
        color: var(--color-text);
    }
    
    .modal-description {
        color: var(--color-muted);
        line-height: 1.6;
        margin-bottom: 1.5rem;
    }
    
    .modal-price {
        font-size: 2rem;
        font-weight: 700;
        color: #007aff;
        margin-bottom: 1.5rem;
    }
    
    .modal-buy-btn {
        display: inline-block;
        background: var(--color-accent);
        color: var(--color-accent-contrast);
        text-decoration: none;
        padding: 16px 32px;
        border-radius: 10px;
        font-weight: 600;
        transition: all 0.3s ease;
        margin-bottom: 1rem;
    }
    
    .modal-buy-btn:hover {
        background: var(--color-accent-hover);
        transform: translateY(-2px);
    }
    
    .modal-note {
        font-size: 0.9rem;
        color: var(--color-muted);
        background: var(--color-surface-alt);
        padding: 1rem;
        border-radius: 8px;
        border-left: none;
    }
    
    .modal-note i {
        color: var(--color-accent);
        margin-right: 0.5rem;
    }
    
    @media (max-width: 768px) {
        .modal-product {
            grid-template-columns: 1fr;
            gap: 1rem;
        }
        
        .modal-product-image {
            height: 200px;
        }
    }
`;

document.head.appendChild(modalStyles);

// Add scroll effect to navbar
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    navbar.classList.toggle('navbar-scrolled', window.scrollY > 100);
});

// Move header search bar into the mobile slot on small screens, and back on larger screens
function relocateSearchForViewport() {
    if (!headerSearchBar || !mobileSearchContainer) return;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const inNavbar = headerSearchBar.parentElement?.classList.contains('search-bar') === false && headerSearchBar.closest('.nav-search')?.classList.contains('mobile-search') === false;
    if (isMobile) {
        if (headerSearchBar.parentElement !== mobileSearchContainer) {
            mobileSearchContainer.appendChild(headerSearchBar);
        }
    } else {
        const navbarSearch = document.querySelector('.navbar .nav-search');
        if (navbarSearch && headerSearchBar.parentElement !== navbarSearch) {
            navbarSearch.appendChild(headerSearchBar);
        }
    }
}

window.addEventListener('resize', relocateSearchForViewport);

// Add loading animation
function showLoading() {
    productsGrid.innerHTML = `
        <div class="loading" style="text-align: center; grid-column: 1 / -1; padding: 2rem;">
            <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #007aff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
            <p>Loading products...</p>
        </div>
    `;
}

// Add spinner animation CSS
const spinnerStyles = document.createElement('style');
spinnerStyles.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

document.head.appendChild(spinnerStyles);
