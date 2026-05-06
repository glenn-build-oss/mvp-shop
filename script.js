// MVP Shop JavaScript Application
class ShopApp {
    constructor() {
        this.products = [];
        this.cart = [];
        this.orders = [];
        this.currentTab = 'shop';
        this.uploadedImageData = null;
        this.originalImageData = null;
        this.uploadedVideoData = null;
        this.cropSelection = null;
        this.isDrawing = false;
        this.currentMediaType = 'image';
        this.isAdminLoggedIn = false;
        this.adminPassword = 'admin1234';
        this.productToDelete = null;
        this.appVersion = '2.0'; // Version to force localStorage reset
        this.init();
        
        // Set up periodic data refresh for cross-device sync
        setInterval(() => {
            this.refreshDataIfNeeded();
        }, 30000); // Check every 30 seconds
    }

    refreshDataIfNeeded() {
        const timestampedData = localStorage.getItem('mvpShopData');
        if (timestampedData) {
            try {
                const parsedData = JSON.parse(timestampedData);
                const lastUpdated = new Date(parsedData.lastUpdated);
                const now = new Date();
                const minutesSinceUpdate = (now - lastUpdated) / (1000 * 60);
                
                // Refresh if data is older than 1 minute
                if (minutesSinceUpdate > 1) {
                    console.log('Refreshing data from server (older than 1 minute)');
                    this.loadData();
                }
            } catch (error) {
                console.error('Error checking data age:', error);
            }
        }
    }

    init() {
        this.loadData();
        this.initializeEventListeners();
        this.renderProducts();
        this.renderCart();
        this.renderOrders();
        this.renderAdminProducts();
        this.updateCartCount();
    }

    loadData() {
        // Check app version and clear old data if version changed
        const currentVersion = this.appVersion;
        const savedVersion = localStorage.getItem('appVersion');
        
        if (savedVersion !== currentVersion) {
            console.log('App version changed, clearing old data');
            localStorage.clear();
            sessionStorage.clear();
            localStorage.setItem('appVersion', currentVersion);
        }
        
        // Try to load timestamped data first (for cross-device sync)
        const timestampedData = localStorage.getItem('mvpShopData');
        const savedProducts = localStorage.getItem('products');
        const backupProducts = sessionStorage.getItem('products_backup');
        const savedOrders = localStorage.getItem('orders');
        const backupOrders = sessionStorage.getItem('orders_backup');
        
        if (timestampedData) {
            try {
                const parsedData = JSON.parse(timestampedData);
                this.products = parsedData.products || [];
                this.orders = parsedData.orders || [];
                console.log('Loaded timestamped data from:', parsedData.lastUpdated);
            } catch (error) {
                console.error('Error parsing timestamped data:', error);
                this.products = [];
                this.orders = [];
            }
        } else if (savedProducts) {
            this.products = JSON.parse(savedProducts);
            console.log('Loaded products from localStorage');
        } else if (backupProducts) {
            this.products = JSON.parse(backupProducts);
            console.log('Loaded products from sessionStorage backup');
            // Restore to localStorage
            localStorage.setItem('products', backupProducts);
        } else {
            console.log('No saved products found, using defaults');
            this.products = [];
        }
        
        if (savedProducts) {
            this.products = JSON.parse(savedProducts);
            console.log('Loaded products from localStorage');
        } else if (backupProducts) {
            this.products = JSON.parse(backupProducts);
            console.log('Loaded products from sessionStorage backup');
            // Restore to localStorage
            localStorage.setItem('products', backupProducts);
        } else {
            console.log('No saved products found, using defaults');
        }
        
        if (this.products.length > 0) {
            // Migrate old product structure to new structure
            this.products = this.products.map(product => {
                if (!product.mediaType) {
                    // Old structure - migrate to new structure
                    return {
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        description: product.description,
                        media: product.image || `https://picsum.photos/seed/${product.name.replace(/\s+/g, '')}/300/300.jpg`,
                        mediaType: 'image'
                    };
                }
                return product;
            });
            this.saveData();
        } else {
            // Start with empty products array - admin will add products
            this.products = [];
            console.log('Starting with empty shop - no sample products');
            this.saveData();
        }
        
        if (savedOrders) {
            this.orders = JSON.parse(savedOrders);
            console.log('Loaded orders from localStorage');
        } else if (backupOrders) {
            this.orders = JSON.parse(backupOrders);
            console.log('Loaded orders from sessionStorage backup');
            // Restore to localStorage
            localStorage.setItem('orders', backupOrders);
        } else {
            console.log('No saved orders found, using defaults');
            this.orders = [];
        }
        
        if (this.orders.length > 0) {
            // Migrate old order structure to new structure
            this.orders = this.orders.map(order => {
                if (!order.customer) {
                    // Old structure - migrate to new structure
                    return {
                        id: order.id,
                        customer: {
                            name: order.name || 'Unknown',
                            phone: order.phone || 'Not provided',
                            address: order.address || 'Not provided'
                        },
                        items: order.items || [],
                        total: order.total || 0,
                        status: order.status || 'pending',
                        paymentScreenshotNumber: order.paymentScreenshotNumber || 'not provided',
                        date: order.date || new Date().toISOString()
                    };
                }
                return order;
            });
            this.saveData();
        }
    }

    saveData() {
        try {
            // Save to localStorage with timestamp for cross-device sync
            const dataWithTimestamp = {
                products: this.products,
                orders: this.orders,
                timestamp: Date.now(),
                lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem('mvpShopData', JSON.stringify(dataWithTimestamp));
            localStorage.setItem('products', JSON.stringify(this.products));
            localStorage.setItem('orders', JSON.stringify(this.orders));
            
            // Also save to sessionStorage as backup
            sessionStorage.setItem('products_backup', JSON.stringify(this.products));
            sessionStorage.setItem('orders_backup', JSON.stringify(this.orders));
            
            console.log('Data saved with timestamp:', dataWithTimestamp.lastUpdated);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                this.showNotification('Storage quota exceeded. Please clear some products or use smaller images.', 'error');
                // Fallback: keep only essential data
                this.clearLargeImages();
                try {
                    const dataWithTimestamp = {
                        products: this.products,
                        orders: this.orders,
                        timestamp: Date.now(),
                        lastUpdated: new Date().toISOString()
                    };
                    localStorage.setItem('mvpShopData', JSON.stringify(dataWithTimestamp));
                    localStorage.setItem('products', JSON.stringify(this.products));
                    localStorage.setItem('orders', JSON.stringify(this.orders));
                    sessionStorage.setItem('products_backup', JSON.stringify(this.products));
                    sessionStorage.setItem('orders_backup', JSON.stringify(this.orders));
                } catch (fallbackError) {
                    this.showNotification('Storage full. Please remove some products.', 'error');
                }
            }
        }
    }

    clearLargeImages() {
        // Convert large base64 images to URLs to save space
        this.products = this.products.map(product => {
            // Check both old image property and new media property
            const imageSource = product.media || product.image;
            if (imageSource && imageSource.startsWith('data:image') && imageSource.length > 50000) {
                // Replace large images with placeholder URLs
                return {
                    ...product,
                    media: `https://picsum.photos/seed/${product.name.replace(/\s+/g, '')}/300/300.jpg`,
                    mediaType: 'image'
                };
            }
            return product;
        });
    }

    initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.textContent.toLowerCase().includes('shop') ? 'shop' :
                              e.currentTarget.textContent.toLowerCase().includes('cart') ? 'cart' : 'admin';
                this.showTab(tabName);
            });
        });

        // Add product form
        document.getElementById('add-product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addProduct();
        });

        // Media type switching
        document.querySelectorAll('input[name="media-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.switchMediaType(e.target.value);
            });
        });

        // Image file input
        document.getElementById('product-image-file').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        // Video file input
        document.getElementById('product-video-file').addEventListener('change', (e) => {
            this.handleVideoUpload(e);
        });

        // Crop tool buttons
        document.getElementById('apply-crop').addEventListener('click', () => {
            this.applyCrop();
        });
        
        document.getElementById('cancel-crop').addEventListener('click', () => {
            this.cancelCrop();
        });

        // Checkout form
        document.getElementById('checkout-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.processCheckout();
        });

        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    }

    showTab(tabName) {
        // Check if trying to access admin tab without login
        if (tabName === 'admin' && !this.isAdminLoggedIn) {
            this.showLogin();
            return;
        }
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(`${tabName}-tab`).classList.add('active');
        this.currentTab = tabName;
        
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('bg-blue-100');
        });
        
        const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => 
            btn.textContent.toLowerCase().includes(tabName)
        );
        if (activeBtn) {
            activeBtn.classList.add('bg-blue-100');
        }
    }

    renderProducts() {
        const grid = document.getElementById('products-grid');
        grid.innerHTML = '';

        console.log('Rendering products:', this.products.length, 'products found');

        this.products.forEach((product, index) => {
            console.log(`Product ${index}:`, product.name, product.mediaType);
            const card = document.createElement('div');
            card.className = 'product-card bg-white rounded-lg shadow-md overflow-hidden';
            
            let mediaElement = '';
            if (product.mediaType === 'video') {
                mediaElement = `
                    <video src="${product.media}" controls class="w-full h-48 object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        Your browser does not support video.
                    </video>
                    <div style="display:none;" class="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <span class="text-gray-500">Video unavailable</span>
                    </div>
                `;
            } else {
                // Default to image for backward compatibility
                const imageSrc = product.media || product.image || `https://picsum.photos/seed/default999/300/300.jpg`;
                console.log('Rendering image for product:', product.name, 'Source type:', imageSrc.startsWith('data:') ? 'Base64' : 'URL', 'Length:', imageSrc.length);
                mediaElement = `<img src="${imageSrc}" alt="${product.name}" class="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition" onclick="app.showImagePreview('${imageSrc}', '${product.name}')" onerror="this.src='https://picsum.photos/seed/error999/300/300.jpg'; console.log('Image failed to load:', '${imageSrc.substring(0, 50)}...');">`;
            }
            
            card.innerHTML = `
                ${mediaElement}
                <div class="p-4">
                    <h3 class="font-semibold text-lg mb-2">${product.name}</h3>
                    <p class="text-gray-600 text-sm mb-3">${product.description}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-xl font-bold text-blue-600">₵${product.price.toFixed(2)}</span>
                        <button onclick="app.addToCart(${product.id})" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-cart-plus"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        if (this.products.length === 0) {
            grid.innerHTML = '<p class="text-gray-500 text-center col-span-full py-8">No products available yet. Please add products in the Admin panel.</p>';
        }
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const existingItem = this.cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            this.cart.push({ ...product, quantity: 1 });
        }

        this.renderCart();
        this.updateCartCount();
        this.showNotification('Product added to cart!', 'success');
    }

    
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.renderCart();
        this.updateCartCount();
        this.showNotification('Item removed from cart', 'info');
    }

    updateCartCount() {
        const count = this.cart.reduce((total, item) => total + item.quantity, 0);
        document.getElementById('cart-count').textContent = count;
    }

    proceedToCheckout() {
        if (this.cart.length === 0) {
            this.showNotification('Your cart is empty!', 'error');
            return;
        }
        document.getElementById('checkout-modal').classList.remove('hidden');
    }

    closeCheckout() {
        document.getElementById('checkout-modal').classList.add('hidden');
    }

    
    renderCart() {
        const cartItems = document.getElementById('cart-items');
        cartItems.innerHTML = '';

        if (this.cart.length === 0) {
            cartItems.innerHTML = '<p class="text-gray-500 text-center py-8">Your cart is empty</p>';
            document.getElementById('cart-total').textContent = '₵0.00';
            return;
        }

        let total = 0;
        this.cart.forEach(item => {
            total += item.price * item.quantity;
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item bg-white rounded-lg shadow-md p-4 flex items-center space-x-4';
            
            // Use the correct image property (media for new structure, image for backward compatibility)
            const imageSrc = item.media || item.image || `https://picsum.photos/seed/cart${item.id}/300/300.jpg`;
            
            cartItem.innerHTML = `
                <img src="${imageSrc}" alt="${item.name}" class="w-20 h-20 object-cover rounded" onerror="this.src='https://picsum.photos/seed/carterror999/300/300.jpg';">
                <div class="flex-1">
                    <h4 class="font-semibold">${item.name}</h4>
                    <p class="text-gray-600">₵${item.price.toFixed(2)} x ${item.quantity}</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold">₵${(item.price * item.quantity).toFixed(2)}</p>
                    <button onclick="app.removeFromCart(${item.id})" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            cartItems.appendChild(cartItem);
        });

        document.getElementById('cart-total').textContent = `₵${total.toFixed(2)}`;
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.renderCart();
        this.updateCartCount();
        this.showNotification('Item removed from cart', 'info');
    }

    updateCartCount() {
        const count = this.cart.reduce((total, item) => total + item.quantity, 0);
        document.getElementById('cart-count').textContent = count;
    }

proceedToCheckout() {
        if (this.cart.length === 0) {
            this.showNotification('Your cart is empty!', 'error');
            return;
        }
        document.getElementById('checkout-modal').classList.remove('hidden');
    }

    closeCheckout() {
        document.getElementById('checkout-modal').classList.add('hidden');
    }

    processCheckout() {
        const name = document.getElementById('checkout-name').value;
        const phone = document.getElementById('checkout-phone').value;
        const address = document.getElementById('checkout-address').value;
        const screenshotNumber = document.getElementById('payment-screenshot-number').value;
        
        // Validate cart items and calculate total with validation
        let total = 0;
        const validItems = this.cart.map(item => {
            // Ensure price is a valid number
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity) || 1;
            const itemTotal = price * quantity;
            total += itemTotal;
            
            console.log(`Order item: ${item.name}, Price: ₵${price.toFixed(2)}, Quantity: ${quantity}, Item Total: ₵${itemTotal.toFixed(2)}`);
            
            return {
                ...item,
                price: price,
                quantity: quantity
            };
        });
        
        console.log(`Order total calculated: ₵${total.toFixed(2)}`);
        
        const order = {
            id: Date.now(),
            customer: { name, phone, address },
            items: validItems,
            total: total,
            status: 'pending',
            paymentScreenshotNumber: screenshotNumber || 'not provided',
            date: new Date().toISOString()
        };

        this.orders.push(order);
        this.saveData();
        this.renderOrders();
        
        // Clear cart
        this.cart = [];
        this.renderCart();
        this.updateCartCount();
        
        // Close modal and reset form
        this.closeCheckout();
        document.getElementById('checkout-form').reset();
        this.showNotification('Order placed successfully! We will contact you soon.', 'success');
        this.showTab('shop');
    }

    compressImage(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Get user-selected size and quality options, but force smaller sizes for localStorage
                    const maxSize = Math.min(parseInt(document.getElementById('image-size-option').value), 400); // Max 400px for storage
                    const quality = Math.min(parseFloat(document.getElementById('image-quality-option').value), 0.7); // Max 70% quality
                    
                    console.log('Compressing image:', img.width, 'x', img.height, 'to max size:', maxSize, 'quality:', quality);
                    
                    // Calculate new dimensions
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw and compress image with selected quality
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    console.log('Compression complete, new size:', width, 'x', height);
                    callback(compressedDataUrl);
                } catch (error) {
                    console.error('Error during compression:', error);
                    callback(null);
                }
            };
            
            img.onerror = (error) => {
                console.error('Error loading image for compression:', error);
                callback(null);
            };
            
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    switchMediaType(mediaType) {
        this.currentMediaType = mediaType;
        
        const imageSection = document.getElementById('image-upload-section');
        const videoSection = document.getElementById('video-upload-section');
        
        if (mediaType === 'video') {
            imageSection.classList.add('hidden');
            videoSection.classList.remove('hidden');
        } else {
            imageSection.classList.remove('hidden');
            videoSection.classList.add('hidden');
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            console.log('Image upload started:', file.name, file.size, file.type);
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.showNotification('Please select an image file', 'error');
                event.target.value = '';
                return;
            }
            
            // Store original image for cropping
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    this.originalImageData = e.target.result;
                    console.log('Original image loaded, length:', this.originalImageData.length);
                    
                    // Compress image for preview
                    this.compressImage(file, (compressedDataUrl) => {
                        if (compressedDataUrl) {
                            try {
                                console.log('Image compressed successfully, length:', compressedDataUrl.length);
                                const preview = document.getElementById('media-preview');
                                preview.innerHTML = `
                                    <img src="${compressedDataUrl}" alt="Preview" class="w-32 h-32 object-cover rounded-lg border">
                                    <p class="text-sm text-green-600 mt-2">Image uploaded successfully (${Math.round(compressedDataUrl.length * 0.75 / 1024)}KB)</p>
                                    <button type="button" onclick="app.showCropTool()" class="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                                        <i class="fas fa-crop mr-1"></i>Crop Image
                                    </button>
                                `;
                                // Store the compressed base64 image data
                                this.uploadedImageData = compressedDataUrl;
                                console.log('Image stored for product');
                                this.showNotification('Image uploaded successfully!', 'success');
                            } catch (error) {
                                console.error('Error processing compressed image:', error);
                                this.showNotification('Error processing image', 'error');
                                this.uploadedImageData = null;
                            }
                        } else {
                            console.error('Compression failed, using original image');
                            // Fallback to original image if compression fails
                            this.uploadedImageData = this.originalImageData;
                            const preview = document.getElementById('media-preview');
                            preview.innerHTML = `
                                <img src="${this.originalImageData}" alt="Preview" class="w-32 h-32 object-cover rounded-lg border">
                                <p class="text-sm text-yellow-600 mt-2">Image uploaded (original size)</p>
                            `;
                            this.showNotification('Image uploaded (compression failed, using original)', 'warning');
                        }
                    });
                } catch (error) {
                    console.error('Error loading original image:', error);
                    this.showNotification('Error loading image', 'error');
                    this.uploadedImageData = null;
                }
            };
            
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                this.showNotification('Error reading file', 'error');
                this.uploadedImageData = null;
            };
            
            reader.readAsDataURL(file);
        }
    }
    addProduct() {
        const editingId = document.getElementById('editing-product-id').value;
        const name = document.getElementById('product-name').value;
        const price = parseFloat(document.getElementById('product-price').value);
        const description = document.getElementById('product-description').value;
        
        // Validate price
        if (isNaN(price) || price <= 0 || price > 999999) {
            this.showNotification('Please enter a valid price (between ₵0.01 and ₵999,999)', 'error');
            return;
        }
        
        let media = null;
        let mediaType = this.currentMediaType;
        
        console.log('Adding product:', { name, price, mediaType });

        if (mediaType === 'image') {
            let image = document.getElementById('product-image').value;
            
            // Use uploaded image if available, otherwise use URL or placeholder
            if (this.uploadedImageData) {
                media = this.uploadedImageData;
                console.log('Using uploaded image, size:', Math.round(media.length * 0.75 / 1024), 'KB');
            } else if (!image) {
                media = `https://picsum.photos/seed/${name.replace(/\s+/g, '')}/300/300.jpg`;
                console.log('Using placeholder image');
            } else {
                media = image;
                console.log('Using image URL');
            }
        } else if (mediaType === 'video') {
            let video = document.getElementById('product-video').value;
            
            // Use uploaded video if available, otherwise use URL
            if (this.uploadedVideoData) {
                media = this.uploadedVideoData;
                console.log('Using uploaded video');
            } else if (!video) {
                this.showNotification('Please provide a video file or URL', 'error');
                return;
            } else {
                media = video;
                console.log('Using video URL');
            }
        }

        if (editingId) {
            // Edit existing product
            const productIndex = this.products.findIndex(p => p.id == editingId);
            if (productIndex !== -1) {
                const existingProduct = this.products[productIndex];
                
                // Preserve existing media if no new media is uploaded
                // Only use new media if there's actually new uploaded data
                if (mediaType === 'image' && this.uploadedImageData) {
                    media = this.uploadedImageData;
                    console.log('Using newly uploaded image for edit');
                } else if (mediaType === 'video' && this.uploadedVideoData) {
                    media = this.uploadedVideoData;
                    console.log('Using newly uploaded video for edit');
                } else {
                    // Keep existing media when just updating price/description
                    media = existingProduct.media;
                    mediaType = existingProduct.mediaType || 'image';
                    console.log('Preserving existing media for edit:', mediaType);
                }
                
                this.products[productIndex] = {
                    id: parseInt(editingId),
                    name,
                    price,
                    description,
                    media,
                    mediaType
                };
                this.showNotification('Product updated successfully!', 'success');
                this.saveData();
                this.renderProducts();
                this.renderAdminProducts();
            }
            this.cancelEdit();
        } else {
            // Add new product
            const product = {
                id: Date.now(),
                name,
                price,
                description,
                media,
                mediaType
            };
            this.products.push(product);
            this.showNotification('Product added successfully!', 'success');
            this.saveData();
            this.renderProducts();
            this.renderAdminProducts();
        }
        
        // Reset form
        document.getElementById('add-product-form').reset();
        document.getElementById('image-preview').innerHTML = '';
        this.uploadedImageData = null;
    }

    editProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Fill form with product data
        document.getElementById('editing-product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-description').value = product.description;
        
        // Set media type and populate appropriate fields
        const mediaType = product.mediaType || 'image';
        this.currentMediaType = mediaType;
        
        // Update radio button for media type
        document.querySelector(`input[name="media-type"][value="${mediaType}"]`).checked = true;
        
        // Show/hide appropriate sections
        this.switchMediaType(mediaType);
        
        // Set media URL if it's not a base64 data URL
        if (mediaType === 'image' && product.media && !product.media.startsWith('data:')) {
            document.getElementById('product-image').value = product.media;
        } else if (mediaType === 'video' && product.media && !product.media.startsWith('data:')) {
            document.getElementById('product-video').value = product.media;
        }

        // Update form UI
        document.getElementById('form-title').textContent = 'Edit Product';
        document.getElementById('submit-btn').innerHTML = '<i class="fas fa-save mr-2"></i>Update Product';
        document.getElementById('cancel-edit').classList.remove('hidden');

        // Show media preview for current media
        const preview = document.getElementById('media-preview');
        if (product.media) {
            // Show remove button for existing media
            document.getElementById('remove-media-btn').classList.remove('hidden');
            
            if (mediaType === 'image') {
                preview.innerHTML = `
                    <img src="${product.media}" alt="Current" class="w-32 h-32 object-cover rounded-lg border">
                    <p class="text-sm text-gray-600 mt-2">Current product image</p>
                `;
            } else if (mediaType === 'video') {
                preview.innerHTML = `
                    <video src="${product.media}" controls class="w-32 h-32 object-cover rounded-lg border"></video>
                    <p class="text-sm text-gray-600 mt-2">Current product video</p>
                `;
            }
        } else {
            // Hide remove button if no media
            document.getElementById('remove-media-btn').classList.add('hidden');
        }

        // Scroll to form
        document.getElementById('add-product-form').scrollIntoView({ behavior: 'smooth' });
    }

    cancelEdit() {
        // Reset form
        document.getElementById('add-product-form').reset();
        document.getElementById('editing-product-id').value = '';
        document.getElementById('image-preview').innerHTML = '';
        this.uploadedImageData = null;
        
        // Hide remove button
        document.getElementById('remove-media-btn').classList.add('hidden');

        // Reset UI
        document.getElementById('form-title').textContent = 'Add New Product';
        document.getElementById('submit-btn').innerHTML = '<i class="fas fa-plus mr-2"></i>Add Product';
        document.getElementById('cancel-edit').classList.add('hidden');
    }

    deleteProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        this.productToDelete = productId;
        this.showDeleteModal(product.name);
    }

    showDeleteModal(productName) {
        document.getElementById('delete-product-name').textContent = productName;
        document.getElementById('delete-modal').classList.remove('hidden');
    }

    closeDeleteModal() {
        document.getElementById('delete-modal').classList.add('hidden');
        this.productToDelete = null;
    }

    confirmDelete() {
        if (this.productToDelete) {
            this.products = this.products.filter(p => p.id !== this.productToDelete);
            this.saveData();
            this.renderProducts();
            this.renderAdminProducts();
            this.showNotification('Product deleted successfully!', 'info');
            this.closeDeleteModal();
        }
    }

    renderAdminProducts() {
        const container = document.getElementById('admin-products-list');
        container.innerHTML = '';

        if (this.products.length === 0) {
            container.innerHTML = '<p class="text-gray-500 col-span-full text-center py-8">No products yet</p>';
            return;
        }

        this.products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'border rounded-lg p-4 bg-white shadow-sm';
            
            let mediaElement = '';
            if (product.mediaType === 'video') {
                mediaElement = `
                    <video src="${product.media}" controls class="w-full h-32 object-cover rounded mb-3">
                        Your browser does not support video.
                    </video>
                `;
            } else {
                // Default to image for backward compatibility
                const imageSrc = product.media || product.image || `https://picsum.photos/seed/admin999/300/300.jpg`;
                console.log('Admin rendering image for product:', product.name, 'Source type:', imageSrc.startsWith('data:') ? 'Base64' : 'URL', 'Length:', imageSrc.length);
                mediaElement = `<img src="${imageSrc}" alt="${product.name}" class="w-full h-32 object-cover rounded mb-3 cursor-pointer hover:opacity-90 transition" onclick="app.showImagePreview('${imageSrc}', '${product.name}')" onerror="this.src='https://picsum.photos/seed/adminerror999/300/300.jpg'; console.log('Admin image failed to load:', '${imageSrc.substring(0, 50)}...');">`;
            }
            
            const mediaTypeLabel = product.mediaType === 'video' ? '📹 Video' : '🖼️ Image';
            
            productCard.innerHTML = `
                ${mediaElement}
                <div class="mb-2">
                    <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">${mediaTypeLabel}</span>
                </div>
                <h5 class="font-semibold text-lg mb-1">${product.name}</h5>
                <p class="text-gray-600 text-sm mb-2">${product.description}</p>
                <p class="text-xl font-bold text-blue-600 mb-3">₵${product.price.toFixed(2)}</p>
                <div class="flex space-x-2">
                    <button onclick="app.editProduct(${product.id})" class="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition">
                        <i class="fas fa-edit mr-1"></i>Edit
                    </button>
                    <button onclick="app.deleteProduct(${product.id})" class="flex-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition">
                        <i class="fas fa-trash mr-1"></i>Delete
                    </button>
                </div>
            `;
            container.appendChild(productCard);
        });
    }

    renderOrders() {
        const ordersList = document.getElementById('orders-list');
        ordersList.innerHTML = '';

        if (this.orders.length === 0) {
            ordersList.innerHTML = '<p class="text-gray-500 text-center py-8">No orders yet</p>';
            return;
        }

        this.orders.forEach(order => {
            // Skip invalid orders
            if (!order || !order.customer) {
                console.warn('Invalid order found:', order);
                return;
            }
            
            const orderCard = document.createElement('div');
            orderCard.className = 'border rounded-lg p-4 mb-4';
            orderCard.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h4 class="font-semibold text-lg">Order #${order.id}</h4>
                        <p class="text-sm text-gray-600">Customer: ${order.customer.name || 'N/A'}</p>
                        <p class="text-sm text-gray-600">Phone: ${order.customer.phone || 'N/A'}</p>
                        <p class="text-sm text-gray-600">Date: ${order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div class="text-right">
                        <span class="inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }">
                            ${order.status || 'pending'}
                        </span>
                        <p class="font-semibold mt-2">₵${order.total ? order.total.toFixed(2) : '0.00'}</p>
                    </div>
                </div>
                <div class="mb-3">
                    <p class="text-sm font-semibold mb-1">Delivery Address:</p>
                    <p class="text-sm text-gray-600">${order.customer.address}</p>
                </div>
                <div class="mb-3">
                    <p class="text-sm font-semibold mb-1">Customer WhatsApp:</p>
                    <p class="text-sm text-gray-600">${order.paymentScreenshotNumber || 'not provided'}</p>
                </div>
                <div class="mb-3">
                    <p class="text-sm font-semibold mb-1">Order Items:</p>
                    ${order.items.map(item => `
                        <div class="text-sm text-gray-600 ml-4">
                            ${item.name} x ${item.quantity} - ₵${(item.price * item.quantity).toFixed(2)}
                        </div>
                    `).join('')}
                </div>
                <div class="flex space-x-2">
                    <button onclick="app.updateOrderStatus(${order.id}, 'confirmed')" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                        <i class="fas fa-check mr-1"></i>Confirm
                    </button>
                    <button onclick="app.deleteOrder(${order.id})" class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                        <i class="fas fa-trash mr-1"></i>Delete
                    </button>
                </div>
            `;
            ordersList.appendChild(orderCard);
        });
    }

    updateOrderStatus(orderId, status) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.status = status;
            this.saveData();
            this.renderOrders();
            this.showNotification('Order status updated!', 'success');
        }
    }

    deleteOrder(orderId) {
        this.orders = this.orders.filter(o => o.id !== orderId);
        this.saveData();
        this.renderOrders();
        this.showNotification('Order deleted!', 'info');
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification px-4 py-3 rounded-lg shadow-lg mb-4 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${
                    type === 'success' ? 'fa-check-circle' :
                    type === 'error' ? 'fa-exclamation-circle' :
                    'fa-info-circle'
                } mr-2"></i>
                ${message}
            </div>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showLogin() {
        document.getElementById('login-modal').classList.remove('hidden');
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-password').focus();
    }

    closeLogin() {
        document.getElementById('login-modal').classList.add('hidden');
    }

    handleLogin() {
        const password = document.getElementById('admin-password').value;
        
        if (password === this.adminPassword) {
            this.isAdminLoggedIn = true;
            this.closeLogin();
            this.showNotification('Login successful!', 'success');
            this.showTab('admin');
        } else {
            this.showNotification('Invalid password!', 'error');
            document.getElementById('admin-password').value = '';
            document.getElementById('admin-password').focus();
        }
    }

    removeMedia() {
        // Clear uploaded media data
        this.uploadedImageData = null;
        this.uploadedVideoData = null;
        
        // Clear preview
        document.getElementById('media-preview').innerHTML = '';
        
        // Hide remove button
        document.getElementById('remove-media-btn').classList.add('hidden');
        
        // Clear file inputs
        document.getElementById('product-image-file').value = '';
        document.getElementById('product-video-file').value = '';
        
        this.showNotification('Media removed. You can upload a new image or leave blank for placeholder.', 'info');
    }

    showImagePreview(imageSrc, productName) {
        const modal = document.getElementById('image-preview-modal');
        const previewImage = document.getElementById('preview-image');
        const titleElement = document.getElementById('preview-image-title');
        
        previewImage.src = imageSrc;
        titleElement.textContent = productName;
        modal.classList.remove('hidden');
        
        // Add keyboard listener to close on Escape
        document.addEventListener('keydown', this.handleEscapeKey);
    }

    closeImagePreview() {
        const modal = document.getElementById('image-preview-modal');
        modal.classList.add('hidden');
        
        // Remove keyboard listener
        document.removeEventListener('keydown', this.handleEscapeKey);
    }

    handleEscapeKey(event) {
        if (event.key === 'Escape') {
            app.closeImagePreview();
        }
    }

    logout() {
        this.isAdminLoggedIn = false;
        this.showNotification('Logged out successfully!', 'info');
        this.showTab('shop');
    }
}

// Global functions for inline event handlers
function showTab(tabName) {
    if (app && app.showTab) {
        app.showTab(tabName);
    } else {
        console.error('App not initialized for showTab');
    }
}

function closeCheckout() {
    if (app && app.closeCheckout) {
        app.closeCheckout();
    } else {
        console.error('App not initialized for closeCheckout');
    }
}

function proceedToCheckout() {
    if (app && app.proceedToCheckout) {
        app.proceedToCheckout();
    } else {
        console.error('App not initialized for proceedToCheckout');
    }
}

function showLogin() {
    console.log('showLogin function called');
    if (app && app.showLogin) {
        app.showLogin();
    } else {
        console.error('App not initialized for showLogin');
        console.log('app object:', app);
        alert('Error: App not properly initialized. Please refresh the page.');
    }
}

function closeLogin() {
    if (app && app.closeLogin) {
        app.closeLogin();
    } else {
        console.error('App not initialized for closeLogin');
    }
}

function confirmDelete() {
    if (app && app.confirmDelete) {
        app.confirmDelete();
    } else {
        console.error('App not initialized for confirmDelete');
    }
}

function closeDeleteModal() {
    if (app && app.closeDeleteModal) {
        app.closeDeleteModal();
    } else {
        console.error('App not initialized for closeDeleteModal');
    }
}

function removeMedia() {
    if (app && app.removeMedia) {
        app.removeMedia();
    } else {
        console.error('App not initialized for removeMedia');
    }
}

function closeImagePreview() {
    if (app && app.closeImagePreview) {
        app.closeImagePreview();
    } else {
        console.error('App not initialized for closeImagePreview');
    }
}

function logout() {
    if (app && app.logout) {
        app.logout();
    } else {
        console.error('App not initialized for logout');
    }
}

// Initialize the app
let app;
try {
    app = new ShopApp();
    console.log('App initialized successfully:', app);
} catch (error) {
    console.error('Error initializing app:', error);
    alert('Error initializing application. Please refresh the page.');
}
