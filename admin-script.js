// Global variables
let products = [];
let editingProductId = null;
let hasUnsavedChanges = false;

// Helper function to extract supplier name from URL
function extractSupplierName(url) {
    try {
        const domain = new URL(url).hostname;
        // Remove www. and common TLDs to get a cleaner name
        return domain.replace(/^www\./, '').split('.')[0];
    } catch {
        return 'Supplier';
    }
}

// DOM elements
const productFormElement = document.getElementById('productFormElement');
const addProductBtn = document.getElementById('addProductBtn');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelEditBtn = document.getElementById('cancelEdit');
const searchInput = document.getElementById('searchProducts');
const categoryFilter = document.getElementById('categoryFilter');
const productsTableBody = document.getElementById('productsTableBody');
const output = document.getElementById('output');
const copyJsonBtn = document.getElementById('copyJsonBtn');
const importModal = document.getElementById('importModal');
const closeImportModal = document.getElementById('closeImportModal');
const confirmImport = document.getElementById('confirmImport');
const cancelImport = document.getElementById('cancelImport');
const toast = document.getElementById('toast');

// Form elements
const nameInput = document.getElementById('name');
const descriptionInput = document.getElementById('description');
const priceInput = document.getElementById('price');
const imageInput = document.getElementById('image');
const linkInput = document.getElementById('link');
const link2Input = document.getElementById('link2');
const link3Input = document.getElementById('link3');
const link4Input = document.getElementById('link4');
const supplier1Input = document.getElementById('supplier1');
const supplier2Input = document.getElementById('supplier2');
const supplier3Input = document.getElementById('supplier3');
const supplier4Input = document.getElementById('supplier4');
const categoryInput = document.getElementById('category');
const imagePreview = document.getElementById('imagePreview');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadExistingProducts();
    setupEventListeners();
    setupFormValidation();
    updateStatistics();
});

// Setup event listeners
function setupEventListeners() {
    // Form submission
    productFormElement.addEventListener('submit', handleFormSubmit);
    
    // Quick action buttons
    addProductBtn.addEventListener('click', showAddProductForm);
    importBtn.addEventListener('click', showImportModal);
    exportBtn.addEventListener('click', exportProducts);
    saveBtn.addEventListener('click', saveToFile);
    cancelEditBtn.addEventListener('click', cancelEdit);
    
    // Search and filter
    searchInput.addEventListener('input', filterProducts);
    categoryFilter.addEventListener('change', filterProducts);
    
    // Copy JSON
    copyJsonBtn.addEventListener('click', copyJsonToClipboard);
    
    // Import modal
    closeImportModal.addEventListener('click', hideImportModal);
    cancelImport.addEventListener('click', hideImportModal);
    confirmImport.addEventListener('click', handleImport);
    
    // File inputs
    document.getElementById('jsonImport').addEventListener('change', handleFileImport);
    document.getElementById('csvImport').addEventListener('change', handleFileImport);
    
    // Image preview
    imageInput.addEventListener('input', updateImagePreview);
    
    // Form inputs for change detection
    [nameInput, descriptionInput, priceInput, imageInput, linkInput, link2Input, link3Input, link4Input, supplier1Input, supplier2Input, supplier3Input, supplier4Input, categoryInput].forEach(input => {
        input.addEventListener('input', markAsChanged);
    });
}

// Setup form validation
function setupFormValidation() {
    productFormElement.addEventListener('input', function(e) {
        const input = e.target;
        if (input.validity.valid) {
            input.classList.remove('error');
        } else {
            input.classList.add('error');
        }
    });
}

// Load existing products
async function loadExistingProducts() {
    try {
        const response = await fetch('products.json');
        if (!response.ok) {
            throw new Error('No products.json found');
        }
        const data = await response.json();
        if (Array.isArray(data)) {
            products = data;
            updateOutput();
            updateProductsTable();
            console.log("Loaded existing products.json");
        }
    } catch (err) {
        console.log("No pre-existing products.json found — starting blank.");
        products = [];
        updateOutput();
        updateProductsTable();
    }
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!productFormElement.checkValidity()) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Create links array with supplier names
    const links = [];
    const linkUrls = [linkInput.value.trim(), link2Input.value.trim(), link3Input.value.trim(), link4Input.value.trim()];
    const supplierNames = [supplier1Input.value.trim(), supplier2Input.value.trim(), supplier3Input.value.trim(), supplier4Input.value.trim()];
    
    linkUrls.forEach((url, index) => {
        if (url) {
            const supplier = supplierNames[index] || extractSupplierName(url);
            links.push({ url, supplier });
        }
    });

    const productData = {
        name: nameInput.value.trim(),
        description: descriptionInput.value.trim(),
        price: parseFloat(priceInput.value),
        image: imageInput.value.trim(),
        link: linkInput.value.trim(),
        links: links,
        category: categoryInput.value || null
    };
    
    if (editingProductId) {
        // Update existing product
        const index = products.findIndex(p => p.id === editingProductId);
        if (index !== -1) {
            products[index] = { ...products[index], ...productData };
            showToast('Product updated successfully!', 'success');
        }
    } else {
        // Add new product
        const newProduct = {
            id: products.length ? Math.max(...products.map(p => p.id)) + 1 : 1,
            ...productData
        };
        products.push(newProduct);
        showToast('Product added successfully!', 'success');
    }
    
    // Reset form and update display
    resetForm();
    updateOutput();
    updateProductsTable();
    updateStatistics();
    hasUnsavedChanges = true;
}

// Show add product form
function showAddProductForm() {
    editingProductId = null;
    resetForm();
    document.getElementById('formTitle').textContent = 'Add New Product';
    cancelEditBtn.style.display = 'none';
    productFormElement.scrollIntoView({ behavior: 'smooth' });
}

// Edit product
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    editingProductId = productId;
    nameInput.value = product.name;
    descriptionInput.value = product.description;
    priceInput.value = product.price;
    imageInput.value = product.image || '';
    
    // Handle both old and new link formats
    if (Array.isArray(product.links) && product.links.length > 0) {
        // New format with supplier objects
        if (typeof product.links[0] === 'object' && product.links[0].url) {
            linkInput.value = product.links[0].url || '';
            supplier1Input.value = product.links[0].supplier || '';
            link2Input.value = product.links[1]?.url || '';
            supplier2Input.value = product.links[1]?.supplier || '';
            link3Input.value = product.links[2]?.url || '';
            supplier3Input.value = product.links[2]?.supplier || '';
            link4Input.value = product.links[3]?.url || '';
            supplier4Input.value = product.links[3]?.supplier || '';
        } else {
            // Old format with string URLs
            linkInput.value = product.links[0] || '';
            supplier1Input.value = extractSupplierName(product.links[0] || '');
            link2Input.value = product.links[1] || '';
            supplier2Input.value = extractSupplierName(product.links[1] || '');
            link3Input.value = product.links[2] || '';
            supplier3Input.value = extractSupplierName(product.links[2] || '');
            link4Input.value = product.links[3] || '';
            supplier4Input.value = extractSupplierName(product.links[3] || '');
        }
    } else {
        // Fallback to single link
        linkInput.value = product.link || '';
        supplier1Input.value = extractSupplierName(product.link || '');
        link2Input.value = '';
        supplier2Input.value = '';
        link3Input.value = '';
        supplier3Input.value = '';
        link4Input.value = '';
        supplier4Input.value = '';
    }
    
    categoryInput.value = product.category || '';
    
    updateImagePreview();
    
    document.getElementById('formTitle').textContent = 'Edit Product';
    cancelEditBtn.style.display = 'block';
    productFormElement.scrollIntoView({ behavior: 'smooth' });
}

// Cancel edit
function cancelEdit() {
    editingProductId = null;
    resetForm();
    document.getElementById('formTitle').textContent = 'Add New Product';
    cancelEditBtn.style.display = 'none';
}

// Delete product
function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    products = products.filter(p => p.id !== productId);
    updateOutput();
    updateProductsTable();
    updateStatistics();
    hasUnsavedChanges = true;
    showToast('Product deleted successfully!', 'success');
}

// Reset form
function resetForm() {
    productFormElement.reset();
    editingProductId = null;
    imagePreview.innerHTML = '<i class="fas fa-image"></i><span>No image</span>';
    linkInput.value = '';
    link2Input.value = '';
    link3Input.value = '';
    link4Input.value = '';
    supplier1Input.value = '';
    supplier2Input.value = '';
    supplier3Input.value = '';
    supplier4Input.value = '';
    hasUnsavedChanges = false;
}

// Helper: create safe image HTML for admin table
function createAdminImageHTML(imageUrl, altText) {
    if (imageUrl && imageUrl.startsWith('http')) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = altText;
        img.className = 'product-img';
        return img.outerHTML;
    }
    return '<div class="placeholder"><i class="fas fa-image"></i></div>';
}

// Update products table
function updateProductsTable() {
    const filteredProducts = getFilteredProducts();
    
    productsTableBody.innerHTML = filteredProducts.map(product => {
        let suppliers = [];
        if (Array.isArray(product.links) && product.links.length > 0) {
            if (typeof product.links[0] === 'object' && product.links[0].supplier) {
                // New format with supplier objects
                suppliers = product.links.map(link => link.supplier).filter(Boolean);
            } else {
                // Old format with string URLs
                suppliers = product.links.map(url => extractSupplierName(url)).filter(Boolean);
            }
        } else if (product.link) {
            suppliers = [extractSupplierName(product.link)];
        }
        
        const priceGBP = (new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })).format(Number(product.price || 0));
        return `
        <tr>
            <td class="product-image-cell">
                ${createAdminImageHTML(product.image, product.name)}
            </td>
            <td class="product-name">${product.name}</td>
            <td class="product-description">${product.description}</td>
            <td class="product-price">${priceGBP}</td>
            <td class="product-suppliers">${suppliers.join(', ') || 'None'}</td>
            <td class="product-category">${product.category || 'Uncategorized'}</td>
            <td class="action-buttons">
                <button class="action-btn edit-btn" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>`;
    }).join('');
}

// Filter products
function filterProducts() {
    updateProductsTable();
}

// Get filtered products
function getFilteredProducts() {
    let filtered = [...products];
    
    const searchTerm = searchInput.value.toLowerCase();
    const categoryFilterValue = categoryFilter.value;
    
    if (searchTerm) {
        filtered = filtered.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
    }
    
    if (categoryFilterValue) {
        filtered = filtered.filter(product => product.category === categoryFilterValue);
    }
    
    return filtered;
}

// Update image preview
function updateImagePreview() {
    const imageUrl = imageInput.value.trim();
    if (imageUrl && imageUrl.startsWith('http')) {
        const wrapper = document.createElement('div');
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Preview';
        img.addEventListener('error', () => {
            imagePreview.innerHTML = '<i class="fas fa-image"></i><span>Invalid image</span>';
        });
        wrapper.appendChild(img);
        imagePreview.innerHTML = wrapper.innerHTML;
    } else {
        imagePreview.innerHTML = '<i class="fas fa-image"></i><span>No image</span>';
    }
}

// Update JSON output
function updateOutput() {
    output.value = JSON.stringify(products, null, 2);
}

// Update statistics
function updateStatistics() {
    document.getElementById('totalProducts').textContent = products.length;
    
    const categories = new Set(products.map(p => p.category).filter(Boolean));
    document.getElementById('totalCategories').textContent = categories.size;
}

// Copy JSON to clipboard
async function copyJsonToClipboard() {
    try {
        await navigator.clipboard.writeText(output.value);
        showToast('JSON copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        output.select();
        document.execCommand('copy');
        showToast('JSON copied to clipboard!', 'success');
    }
}

// Export products
function exportProducts() {
    if (!products.length) {
        showToast('No products to export', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(products, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products.json';
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('Products exported successfully!', 'success');
}

// Save to file
function saveToFile() {
    if (!hasUnsavedChanges) {
        showToast('No changes to save', 'info');
        return;
    }
    
    // In a real application, this would save to the server
    // For now, we'll just download the file
    exportProducts();
    hasUnsavedChanges = false;
    showToast('Changes saved!', 'success');
}

// Show import modal
function showImportModal() {
    importModal.style.display = 'block';
}

// Hide import modal
function hideImportModal() {
    importModal.style.display = 'none';
}

// Handle import
function handleImport() {
    const jsonFile = document.getElementById('modalJsonImport').files[0];
    const csvFile = document.getElementById('modalCsvImport').files[0];
    
    if (!jsonFile && !csvFile) {
        showToast('Please select a file to import', 'error');
        return;
    }
    
    if (jsonFile) {
        handleFileImport({ target: { files: [jsonFile] } });
    } else if (csvFile) {
        handleFileImport({ target: { files: [csvFile] } });
    }
    
    hideImportModal();
}

// Handle file import
function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = event => {
        try {
            if (file.name.endsWith('.json')) {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    products = imported;
                    showToast('JSON imported successfully!', 'success');
                } else {
                    showToast('Invalid JSON format', 'error');
                    return;
                }
            } else if (file.name.endsWith('.csv')) {
                const text = event.target.result.trim();
                const rows = text.split("\n").map(r => r.split(","));
                const headers = rows.shift().map(h => h.trim());
                
                products = rows.map((row, index) => {
                    let obj = { id: index + 1 };
                    headers.forEach((h, i) => {
                        let val = row[i] ? row[i].trim().replace(/^"|"$/g, '').replace(/""/g, '"') : "";
                        if (h.toLowerCase() === 'price') val = parseFloat(val) || 0;
                        if (h.toLowerCase() === 'id') val = parseInt(val) || index + 1;
                        obj[h] = val;
                    });
                    return obj;
                });
                
                showToast('CSV imported successfully!', 'success');
            }
            
            updateOutput();
            updateProductsTable();
            updateStatistics();
            hasUnsavedChanges = true;
            
        } catch (err) {
            showToast('Error parsing file', 'error');
            console.error(err);
        }
    };
    reader.readAsText(file);
}

// Mark as changed
function markAsChanged() {
    hasUnsavedChanges = true;
}

// Show toast notification
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Add some additional CSS for form validation
const validationStyles = document.createElement('style');
validationStyles.textContent = `
    .form-group input.error,
    .form-group textarea.error,
    .form-group select.error {
        border-color: #dc3545;
        box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
    }
    
    .toast.info {
        background: #17a2b8;
    }
`;

document.head.appendChild(validationStyles);

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToFile();
    }
    
    // Ctrl/Cmd + N for new product
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showAddProductForm();
    }
    
    // Escape to cancel edit
    if (e.key === 'Escape' && editingProductId) {
        cancelEdit();
    }
});

// Warn before leaving with unsaved changes
window.addEventListener('beforeunload', function(e) {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
    }
});
