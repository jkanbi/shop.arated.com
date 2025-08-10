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

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    setupEventListeners();
    setupMobileNavigation();
});

// Setup event listeners
function setupEventListeners() {
    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            filterProducts(category);
            
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
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

// Filter products by category
function filterProducts(category) {
    currentFilter = category;
    
    if (category === 'all') {
        displayProducts(products);
    } else {
        // Filter by the actual category field in the product data
        const filteredProducts = products.filter(product => {
            // Check if product has a category field and it matches
            if (product.category && product.category.toLowerCase() === category.toLowerCase()) {
                return true;
            }
            
            // Fallback to text-based detection for products without category field
            const text = (product.name + ' ' + product.description).toLowerCase();
            if (category === 'tech') {
                return text.includes('tech') || text.includes('electronic') || text.includes('gadget') || 
                       text.includes('phone') || text.includes('computer') || text.includes('laptop');
            } else if (category === 'home') {
                return text.includes('home') || text.includes('kitchen') || text.includes('furniture') ||
                       text.includes('decor') || text.includes('garden');
            } else if (category === 'lifestyle') {
                return text.includes('fitness') || text.includes('health') || text.includes('beauty') ||
                       text.includes('fashion') || text.includes('outdoor');
            }
            return false;
        });
        
        displayProducts(filteredProducts);
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

// Add some additional CSS for the modal content
const modalStyles = document.createElement('style');
modalStyles.textContent = `
    .modal-product {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        align-items: start;
    }
    
    .modal-product-image {
        width: 100%;
        height: 300px;
        background: #f8f9fa;
        border-radius: 15px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6c757d;
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
        color: #1d1d1f;
    }
    
    .modal-description {
        color: #6c757d;
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
        background: #000000;
        color: white;
        text-decoration: none;
        padding: 16px 32px;
        border-radius: 10px;
        font-weight: 600;
        transition: all 0.3s ease;
        margin-bottom: 1rem;
    }
    
    .modal-buy-btn:hover {
        background: #333333;
        transform: translateY(-2px);
    }
    
    .modal-note {
        font-size: 0.9rem;
        color: #6c757d;
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        border-left: none;
    }
    
    .modal-note i {
        color: #000000;
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
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});

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
