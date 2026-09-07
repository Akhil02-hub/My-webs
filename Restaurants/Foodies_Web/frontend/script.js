// ============================================================
// FILE: frontend/script.js
// Final consolidated frontend
// ============================================================

const API_BASE = '/api';
const MAX_CART_QUANTITY = 99;

let allMenuItems = [];
const menuItemCache = new Map();
let menuRequestController = null;
let cart = [];
let currentCategory = 'all';
let currentSearch = '';

let authToken = localStorage.getItem('foodies_token') || null;
let currentUser = null;
let favouriteIds = [];

let navCartBtn, navCartCount, cartFloatingBtn, cartFloatingCount;
let cartOverlay, cartPanel, cartClose, cartItems, cartTotal;
let cartTotalItems, cartOrderBtn, cartItemSummary, cartTizolaBtn;

let authModalOverlay, authModalClose;
let userMenuBtn, userDropdown, userNameDisplay;
let myBookingsLink, myFavouritesLink, logoutLink;

let orderNowBtn, heroOrderNow, askFoodiesBtn;

let whatsappNumber = '919951000029';

// ============================================================
// DOM READY
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    const loadingScreen = document.getElementById('loading-screen');

    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 600);
    }

    const navbar = document.getElementById('navbar');

    if (navbar) {
        const updateNavbar = () => {
            navbar.classList.toggle('scrolled', window.scrollY > 80);
        };

        updateNavbar();

        window.addEventListener('scroll', updateNavbar, {
            passive: true
        });
    }

    setupMobileNav();
    setupScrollTop();
    setupSmoothAnchors();

    updateWhatsAppLinks();

    fetch(`${API_BASE}/whatsapp-number`)
        .then(res => {
            if (!res.ok) {
                throw new Error('WhatsApp number request failed');
            }

            return res.json();
        })
        .then(data => {
            whatsappNumber = String(
                data.number || '919951000029'
            ).replace(/\D/g, '');

            updateWhatsAppLinks();
        })
        .catch(() => { });

    setupCart();

    loadFeatured();
    loadMenu();

    setupMenuFilters();

    loadReviews();
    setupReviewForm();

    setupBookingForm();

    setupGallery();
    loadAboutImage();

    setupAuth();

    setupOrderNow();
    setupAskFoodies();

    if (authToken) {
        fetchUserProfile();
        loadFavouriteIds();
    }
});

// ============================================================
// MOBILE NAVIGATION
// ============================================================

function setupMobileNav() {

    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (!navToggle || !navLinks) return;

    navToggle.addEventListener('click', () => {

        const open = !navLinks.classList.contains('open');

        navToggle.classList.toggle('open', open);
        navLinks.classList.toggle('open', open);

        navToggle.setAttribute(
            'aria-expanded',
            String(open)
        );
    });

    navLinks
        .querySelectorAll('a[href^="#"]')
        .forEach(link => {

            link.addEventListener('click', () => {
                closeMobileNav();
            });

        });
}

function closeMobileNav() {

    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (!navToggle || !navLinks) return;

    navToggle.classList.remove('open');
    navLinks.classList.remove('open');

    navToggle.setAttribute(
        'aria-expanded',
        'false'
    );
}

// ============================================================
// SCROLL TOP
// ============================================================

function setupScrollTop() {

    const scrollBtn = document.getElementById('scrollTop');

    if (!scrollBtn) return;

    const update = () => {
        scrollBtn.classList.toggle(
            'visible',
            window.scrollY > 400
        );
    };

    update();

    window.addEventListener('scroll', update, {
        passive: true
    });

    scrollBtn.addEventListener('click', () => {

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

    });
}

// ============================================================
// SMOOTH ANCHORS
// ============================================================

function setupSmoothAnchors() {

    document
        .querySelectorAll('a[href^="#"]')
        .forEach(anchor => {

            anchor.addEventListener('click', function (e) {

                const targetId = this.getAttribute('href');

                if (!targetId || targetId === '#') {
                    return;
                }

                const target =
                    document.querySelector(targetId);

                if (!target) return;

                e.preventDefault();

                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

            });

        });
}

// ============================================================
// WHATSAPP
// ============================================================

function updateWhatsAppLinks() {

    const links = document.querySelectorAll(
        '#whatsappBookingLink, ' +
        '#contactWhatsAppLink, ' +
        '#footerWhatsAppLink'
    );

    const waUrl =
        `https://wa.me/${whatsappNumber}`;

    links.forEach(el => {

        el.href = waUrl;

        el.textContent =
            formatPhoneNumber(whatsappNumber);

    });
}

function formatPhoneNumber(num) {

    const value = String(num);

    if (
        value.length === 12 &&
        value.startsWith('91')
    ) {

        return value
            .slice(2)
            .replace(/(\d{5})(\d{5})/, '$1 $2');

    }

    return value;
}

// ============================================================
// CART
// ============================================================

function getCartKey() {

    return authToken && currentUser
        ? `foodies_cart_user_${currentUser.id}`
        : 'foodies_cart_guest';
}

function sanitizeCartItem(item) {

    if (
        !item ||
        item.id === undefined ||
        item.id === null
    ) {
        return null;
    }

    const quantity = Number(item.quantity);
    const price = Number(item.price);

    if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > MAX_CART_QUANTITY
    ) {
        return null;
    }

    if (
        !Number.isFinite(price) ||
        price < 0
    ) {
        return null;
    }

    return {
        id: String(item.id),
        name: String(item.name || 'Item'),
        price,
        quantity
    };
}

function loadCartFromStorage() {

    try {

        const raw =
            localStorage.getItem(getCartKey());

        if (!raw) {
            cart = [];
            return;
        }

        const parsed = JSON.parse(raw);

        cart = Array.isArray(parsed)
            ? parsed
                .map(sanitizeCartItem)
                .filter(Boolean)
            : [];

        saveCart();

    } catch {

        cart = [];

    }
}

function saveCart() {

    try {

        localStorage.setItem(
            getCartKey(),
            JSON.stringify(cart)
        );

    } catch (e) {

        console.error(
            'Cart storage error:',
            e
        );

    }
}

function setupCart() {

    loadCartFromStorage();

    navCartBtn =
        document.getElementById('navCartBtn');

    navCartCount =
        document.getElementById('navCartCount');

    cartFloatingBtn =
        document.getElementById('cartFloatingBtn');

    cartFloatingCount =
        document.getElementById('cartCount');

    cartOverlay =
        document.getElementById('cartOverlay');

    cartPanel =
        document.getElementById('cartPanel');

    cartClose =
        document.getElementById('cartClose');

    cartItems =
        document.getElementById('cartItems');

    cartTotal =
        document.getElementById('cartTotal');

    cartTotalItems =
        document.getElementById('cartTotalItems');

    cartOrderBtn =
        document.getElementById('cartOrderBtn');

    cartItemSummary =
        document.getElementById('cartItemSummary');

    cartTizolaBtn =
        document.getElementById('cartTizolaBtn');

    navCartBtn?.addEventListener(
        'click',
        openCart
    );

    cartFloatingBtn?.addEventListener(
        'click',
        openCart
    );

    cartClose?.addEventListener(
        'click',
        closeCart
    );

    cartOverlay?.addEventListener(
        'click',
        closeCart
    );

    cartOrderBtn?.addEventListener(
        'click',
        orderCart
    );

    cartTizolaBtn?.addEventListener(
        'click',
        redirectToTizola
    );

    document.addEventListener(
        'keydown',
        e => {

            if (e.key === 'Escape') {
                closeCart();
            }

        }
    );

    updateCartUI();
}

function openCart() {

    cartPanel?.classList.add('open');

    cartPanel?.setAttribute(
        'aria-hidden',
        'false'
    );

    cartOverlay?.classList.add('open');

    cartOverlay?.setAttribute(
        'aria-hidden',
        'false'
    );

    navCartBtn?.setAttribute(
        'aria-expanded',
        'true'
    );

    document.body.classList.add(
        'cart-open'
    );

    updateCartUI();
}

function closeCart() {

    cartPanel?.classList.remove('open');

    cartPanel?.setAttribute(
        'aria-hidden',
        'true'
    );

    cartOverlay?.classList.remove('open');

    cartOverlay?.setAttribute(
        'aria-hidden',
        'true'
    );

    navCartBtn?.setAttribute(
        'aria-expanded',
        'false'
    );

    document.body.classList.remove(
        'cart-open'
    );
}

function addToCart(item) {

    if (!item) {
        return showToast(
            'Unable to add this item.',
            'error'
        );
    }

    if (Number(item.available) === 0) {

        return showToast(
            `${item.name} is currently unavailable.`,
            'error'
        );
    }

    const existing = cart.find(
        c => String(c.id) === String(item.id)
    );

    if (existing) {

        if (
            existing.quantity >=
            MAX_CART_QUANTITY
        ) {

            return showToast(
                `Maximum quantity is ${MAX_CART_QUANTITY}.`,
                'error'
            );
        }

        existing.quantity += 1;
        existing.name = String(item.name);
        existing.price =
            Number(item.price) || 0;

    } else {

        cart.push({
            id: String(item.id),
            name: String(item.name),
            price: Number(item.price) || 0,
            quantity: 1
        });

    }

    saveCart();
    updateCartUI();

    showToast(
        `${item.name} added to cart`,
        'success'
    );
}

function addMenuItemToCart(id) {

    const item =
        menuItemCache.get(String(id));

    if (!item) {

        return showToast(
            'Item not found. Please refresh the menu.',
            'error'
        );
    }

    addToCart(item);
}

function increaseCartItem(id) {

    const item = cart.find(
        c => String(c.id) === String(id)
    );

    if (!item) return;

    if (
        !Number.isInteger(item.quantity) ||
        item.quantity >= MAX_CART_QUANTITY
    ) {

        return showToast(
            `Maximum quantity is ${MAX_CART_QUANTITY}.`,
            'error'
        );
    }

    item.quantity += 1;

    saveCart();
    updateCartUI();
}

function decreaseCartItem(id) {

    const item = cart.find(
        c => String(c.id) === String(id)
    );

    if (!item) return;

    if (item.quantity > 1) {
        item.quantity -= 1;
    } else {

        cart = cart.filter(
            c => String(c.id) !== String(id)
        );

    }

    saveCart();
    updateCartUI();
}

function removeCartItem(id) {

    cart = cart.filter(
        c => String(c.id) !== String(id)
    );

    saveCart();
    updateCartUI();
}

function updateCartUI() {

    updateCartCount();
    renderCart();
    updateCartTotal();
}

function updateCartCount() {

    const total = cart.reduce(
        (sum, i) =>
            sum + (Number(i.quantity) || 0),
        0
    );

    if (navCartCount) {

        navCartCount.textContent =
            String(total);

        navCartCount.style.display =
            'inline-flex';

    }

    if (cartFloatingCount) {

        cartFloatingCount.textContent =
            String(total);

        cartFloatingCount.style.display =
            total > 0
                ? 'inline-flex'
                : 'none';

    }
}

function renderCart() {

    if (!cartItems) return;

    if (!cart.length) {

        cartItems.innerHTML = `
            <div class="cart-empty">
                <span>🛒</span>
                <p>Your cart is empty</p>
                <small>Add dishes from the menu</small>
            </div>
        `;

        return;
    }

    cartItems.innerHTML = cart.map(item => {

        const subtotal =
            Number(item.price) *
            Number(item.quantity);

        const id =
            escapeHtml(item.id);

        return `
            <div class="cart-item">

                <div class="cart-item-info">

                    <h4>
                        ${escapeHtml(item.name)}
                    </h4>

                    <span class="cart-item-price">
                        ₹${formatMoney(item.price)} each
                    </span>

                </div>

                <div class="cart-item-actions">

                    <div
                        class="quantity-control"
                        aria-label="Quantity controls"
                    >

                        <button
                            type="button"
                            class="quantity-btn"
                            onclick="decreaseCartItem('${id}')"
                            aria-label="Decrease quantity"
                        >
                            −
                        </button>

                        <span class="quantity-number">
                            ${item.quantity}
                        </span>

                        <button
                            type="button"
                            class="quantity-btn"
                            onclick="increaseCartItem('${id}')"
                            aria-label="Increase quantity"
                        >
                            +
                        </button>

                    </div>

                    <strong class="cart-item-total">
                        ₹${formatMoney(subtotal)}
                    </strong>

                    <button
                        type="button"
                        class="cart-remove-btn"
                        onclick="removeCartItem('${id}')"
                        aria-label="Remove ${escapeHtml(item.name)}"
                    >
                        ✕
                    </button>

                </div>

            </div>
        `;

    }).join('');
}

function updateCartTotal() {

    const totalItems = cart.reduce(
        (sum, i) =>
            sum + (Number(i.quantity) || 0),
        0
    );

    const totalPrice = cart.reduce(
        (sum, i) =>
            sum +
            Number(i.price) *
            Number(i.quantity),
        0
    );

    if (cartTotalItems) {

        cartTotalItems.textContent =
            String(totalItems);

    }

    if (cartTotal) {

        cartTotal.textContent =
            `₹${formatMoney(totalPrice)}`;

    }

    if (cartOrderBtn) {

        cartOrderBtn.disabled =
            cart.length === 0;

    }

    if (cartItemSummary) {

        cartItemSummary.textContent =
            `${totalItems} item${totalItems !== 1 ? 's' : ''}`;

    }
}

// ============================================================
// ORDER CART VIA WHATSAPP
// ============================================================

async function orderCart() {

    if (!cart.length) {

        showToast(
            'Your cart is empty.',
            'error'
        );

        return;
    }

    const phone =
        String(whatsappNumber)
            .replace(/\D/g, '');

    if (!/^\d{10,15}$/.test(phone)) {

        showToast(
            'Invalid WhatsApp number.',
            'error'
        );

        return;
    }

    let menu;

    try {

        const res = await fetch(
            `${API_BASE}/menu`,
            {
                cache: 'no-store'
            }
        );

        if (!res.ok) {
            throw new Error(
                'Unable to fetch menu'
            );
        }

        menu = await res.json();

    } catch (error) {

        console.error(
            'Cart validation error:',
            error
        );

        showToast(
            'Could not validate cart items. Please try again.',
            'error'
        );

        return;
    }

    let invalid = false;

    const validatedCart =
        cart.map(rawItem => {

            const item =
                sanitizeCartItem(rawItem);

            if (!item) {

                invalid = true;

                return {
                    ...rawItem,
                    error: 'Invalid cart item.'
                };
            }

            const menuItem = menu.find(
                m =>
                    String(m.id) ===
                    String(item.id)
            );

            if (!menuItem) {

                invalid = true;

                return {
                    ...item,
                    error:
                        `${item.name} is no longer available`
                };
            }

            if (
                Number(menuItem.available) === 0
            ) {

                invalid = true;

                return {
                    ...item,
                    error:
                        `${menuItem.name} is currently unavailable`
                };
            }

            if (
                !Number.isFinite(
                    Number(menuItem.price)
                ) ||
                Number(menuItem.price) < 0
            ) {

                invalid = true;

                return {
                    ...item,
                    error:
                        `${menuItem.name} has an invalid price`
                };
            }

            if (
                Math.abs(
                    Number(menuItem.price) -
                    Number(item.price)
                ) > 0.01
            ) {

                invalid = true;

                return {
                    ...item,
                    error:
                        `${menuItem.name} price has changed to ₹${formatMoney(menuItem.price)}`
                };
            }

            return {
                ...item,
                name: String(menuItem.name),
                price: Number(menuItem.price)
            };

        });

    if (invalid) {

        const errors =
            validatedCart
                .filter(item => item.error)
                .map(item => item.error)
                .join('\n');

        showToast(
            `Some items are invalid:\n${errors}`,
            'error'
        );

        return;
    }

    let total = 0;

    let msg =
        'Hello Foodies! 👋\n\n' +
        'I would like to place the following order:\n\n';

    validatedCart.forEach(
        (item, index) => {

            const subtotal =
                item.price *
                item.quantity;

            total += subtotal;

            msg +=
                `${index + 1}. ${item.name}\n` +
                `Qty: ${item.quantity}\n` +
                `₹${formatMoney(item.price)} each\n` +
                `Subtotal: ₹${formatMoney(subtotal)}\n\n`;

        }
    );

    msg +=
        `Total: ₹${formatMoney(total)}\n\n` +
        'Please confirm my order.';

    const shouldSend = confirm(
        'Send order via WhatsApp? Your cart will be cleared after ordering.'
    );

    if (!shouldSend) return;

    const whatsappUrl =
        `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;

    window.location.href =
        whatsappUrl;

    cart = [];

    saveCart();
    updateCartUI();
    closeCart();
}

// ============================================================
// HELPERS
// ============================================================

function formatMoney(value) {

    const number = Number(value);

    return (
        Number.isFinite(number)
            ? number
            : 0
    ).toLocaleString(
        'en-IN',
        {
            maximumFractionDigits: 2
        }
    );
}

function escapeHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function isSafeImageSource(value) {

    if (typeof value !== 'string') {
        return false;
    }

    return (
        value.startsWith('https://') ||
        /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/i.test(value)
    );
}

function imageHtml(source, alt) {

    if (isSafeImageSource(source)) {

        return `
            <img
                src="${escapeHtml(source)}"
                alt="${escapeHtml(alt)}"
                loading="lazy"
            >
        `;

    }

    return `
        <span
            class="image-fallback"
            aria-hidden="true"
        >
            🍽️
        </span>
    `;
}

function cacheMenuItems(items) {

    if (!Array.isArray(items)) return;

    items.forEach(item => {

        if (
            item?.id !== undefined
        ) {

            menuItemCache.set(
                String(item.id),
                item
            );

        }

    });
}

function showToast(
    message,
    type = 'success'
) {

    let container =
        document.querySelector(
            '.toast-container'
        );

    if (!container) {

        container =
            document.createElement('div');

        container.className =
            'toast-container';

        document.body.appendChild(
            container
        );
    }

    const toast =
        document.createElement('div');

    toast.className =
        `toast ${type}`;

    toast.textContent =
        message;

    container.appendChild(
        toast
    );

    setTimeout(() => {

        toast.classList.add(
            'toast-out'
        );

        setTimeout(
            () => toast.remove(),
            300
        );

    }, 3500);
}

// ============================================================
// AUTH
// ============================================================

function setupAuth() {

    authModalOverlay =
        document.getElementById(
            'authModalOverlay'
        );

    authModalClose =
        document.getElementById(
            'authModalClose'
        );

    userMenuBtn =
        document.getElementById(
            'userMenuBtn'
        );

    userDropdown =
        document.getElementById(
            'userDropdown'
        );

    userNameDisplay =
        document.getElementById(
            'userNameDisplay'
        );

    myBookingsLink =
        document.getElementById(
            'myBookingsLink'
        );

    myFavouritesLink =
        document.getElementById(
            'myFavouritesLink'
        );

    logoutLink =
        document.getElementById(
            'logoutLink'
        );

    authModalClose?.addEventListener(
        'click',
        closeAuthModal
    );

    authModalOverlay?.addEventListener(
        'click',
        e => {

            if (
                e.target ===
                authModalOverlay
            ) {
                closeAuthModal();
            }

        }
    );

    userMenuBtn?.addEventListener(
        'click',
        e => {

            e.stopPropagation();

            if (!authToken || !currentUser) {

                openAuthModal('login');

            } else {

                const open =
                    !userDropdown.classList.contains(
                        'open'
                    );

                userDropdown.classList.toggle(
                    'open',
                    open
                );

                userMenuBtn.setAttribute(
                    'aria-expanded',
                    String(open)
                );

            }

        }
    );

    document.addEventListener(
        'click',
        () => {

            userDropdown?.classList.remove(
                'open'
            );

            userMenuBtn?.setAttribute(
                'aria-expanded',
                'false'
            );

        }
    );

    logoutLink?.addEventListener(
        'click',
        e => {

            e.preventDefault();

            logoutUser(
                'Logged out successfully.',
                'success'
            );

        }
    );

    myBookingsLink?.addEventListener(
        'click',
        e => {

            e.preventDefault();

            userDropdown?.classList.remove(
                'open'
            );

            const section =
                document.getElementById(
                    'myBookingsSection'
                );

            if (!section) return;

            section.style.display =
                'block';

            loadMyBookings();

            section.scrollIntoView({
                behavior: 'smooth'
            });

        }
    );

    myFavouritesLink?.addEventListener(
        'click',
        e => {

            e.preventDefault();

            userDropdown?.classList.remove(
                'open'
            );

            const section =
                document.getElementById(
                    'myFavouritesSection'
                );

            if (!section) return;

            section.style.display =
                'block';

            loadMyFavourites();

            section.scrollIntoView({
                behavior: 'smooth'
            });

        }
    );

    document
        .getElementById('loginFormElement')
        ?.addEventListener(
            'submit',
            handleLogin
        );

    document
        .getElementById('registerFormElement')
        ?.addEventListener(
            'submit',
            handleRegister
        );

    document
        .getElementById('forgotFormElement')
        ?.addEventListener(
            'submit',
            handleForgotPassword
        );

    document
        .getElementById('showRegister')
        ?.addEventListener(
            'click',
            e => {

                e.preventDefault();

                openAuthModal('register');

            }
        );

    document
        .getElementById('showLogin')
        ?.addEventListener(
            'click',
            e => {

                e.preventDefault();

                openAuthModal('login');

            }
        );

    document
        .getElementById('showLoginFromForgot')
        ?.addEventListener(
            'click',
            e => {

                e.preventDefault();

                openAuthModal('login');

            }
        );

    document
        .getElementById('showForgot')
        ?.addEventListener(
            'click',
            e => {

                e.preventDefault();

                openAuthModal('forgot');

            }
        );

    const forgotUsername =
        document.getElementById(
            'forgotUsername'
        );

    forgotUsername?.addEventListener(
        'blur',
        fetchSecurityQuestion
    );

    forgotUsername?.addEventListener(
        'input',
        () => {

            const display =
                document.getElementById(
                    'securityQuestionDisplay'
                );

            if (display) {
                display.textContent = '';
            }

        }
    );

    updateAuthUI();
}

function openAuthModal(
    tab = 'login'
) {

    [
        'loginForm',
        'registerForm',
        'forgotForm'
    ].forEach(id => {

        const el =
            document.getElementById(id);

        if (el) {
            el.style.display = 'none';
        }

    });

    const active =
        document.getElementById(
            `${tab}Form`
        );

    if (active) {
        active.style.display = 'block';
    }

    if (tab === 'forgot') {

        const display =
            document.getElementById(
                'securityQuestionDisplay'
            );

        if (display) {
            display.textContent = '';
        }

        const username =
            document
                .getElementById(
                    'forgotUsername'
                )
                ?.value
                .trim();

        if (username) {
            fetchSecurityQuestion();
        }
    }

    if (authModalOverlay) {
        authModalOverlay.style.display =
            'flex';
    }

    document
        .querySelectorAll('.form-message')
        .forEach(el => {

            el.style.display = 'none';
            el.textContent = '';

        });
}

function closeAuthModal() {

    if (authModalOverlay) {
        authModalOverlay.style.display =
            'none';
    }
}

function updateAuthUI() {

    const loggedIn =
        Boolean(
            authToken &&
            currentUser
        );

    if (loggedIn) {

        if (userNameDisplay) {
            userNameDisplay.textContent =
                currentUser.username;
        }

        if (myBookingsLink) {
            myBookingsLink.style.display =
                'block';
        }

        if (myFavouritesLink) {
            myFavouritesLink.style.display =
                'block';
        }

        if (logoutLink) {
            logoutLink.style.display =
                'block';
        }

        const bookName =
            document.getElementById(
                'bookName'
            );

        const bookPhone =
            document.getElementById(
                'bookPhone'
            );

        if (bookName) {
            bookName.value =
                currentUser.username || '';
        }

        if (
            bookPhone &&
            currentUser.phone
        ) {
            bookPhone.value =
                currentUser.phone;
        }

    } else {

        if (userNameDisplay) {
            userNameDisplay.textContent =
                'Account';
        }

        if (myBookingsLink) {
            myBookingsLink.style.display =
                'none';
        }

        if (myFavouritesLink) {
            myFavouritesLink.style.display =
                'none';
        }

        if (logoutLink) {
            logoutLink.style.display =
                'none';
        }

        const bookName =
            document.getElementById(
                'bookName'
            );

        const bookPhone =
            document.getElementById(
                'bookPhone'
            );

        if (bookName) {
            bookName.value = '';
        }

        if (bookPhone) {
            bookPhone.value = '';
        }

        const bookings =
            document.getElementById(
                'myBookingsSection'
            );

        const favourites =
            document.getElementById(
                'myFavouritesSection'
            );

        if (bookings) {
            bookings.style.display =
                'none';
        }

        if (favourites) {
            favourites.style.display =
                'none';
        }
    }
}

// ============================================================
// SECURITY QUESTION
// ============================================================

async function fetchSecurityQuestion() {

    const username =
        document
            .getElementById(
                'forgotUsername'
            )
            ?.value
            .trim();

    const display =
        document.getElementById(
            'securityQuestionDisplay'
        );

    if (!display) return;

    if (!username) {

        display.textContent = '';

        return;
    }

    try {

        const res = await fetch(
            `${API_BASE}/auth/security-question?username=${encodeURIComponent(username)}`
        );

        const data =
            await res.json();

        display.textContent =
            data.question
                ? `Security Question: ${data.question}`
                : '';

    } catch {

        display.textContent =
            '⚠️ Could not fetch the question.';

    }
}

// ============================================================
// LOGIN
// ============================================================

async function handleLogin(e) {

    e.preventDefault();

    const username =
        document
            .getElementById(
                'loginUsername'
            )
            .value
            .trim();

    const password =
        document.getElementById(
            'loginPassword'
        ).value;

    const msg =
        document.getElementById(
            'authMessage'
        );

    if (!username || !password) {

        return showFormMessage(
            msg,
            'Please fill in all fields.',
            'error'
        );
    }

    try {

        const res = await fetch(
            `${API_BASE}/auth/login`,
            {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json'
                },
                body: JSON.stringify({
                    username,
                    password
                })
            }
        );

        const data =
            await res.json();

        if (!res.ok) {
            throw new Error(
                data.detail ||
                'Login failed'
            );
        }

        authToken =
            data.access_token;

        localStorage.setItem(
            'foodies_token',
            authToken
        );

        currentUser = {
            id: data.user_id,
            username: data.username,
            phone: ''
        };

        await fetchUserProfile();

        if (!authToken || !currentUser) {

            return showToast(
                'Session error. Please try again.',
                'error'
            );
        }

        loadCartFromStorage();
        updateCartUI();

        loadFavouriteIds();

        updateAuthUI();

        closeAuthModal();

        showToast(
            `Welcome back, ${currentUser.username}!`,
            'success'
        );

    } catch (err) {

        showFormMessage(
            msg,
            err.message,
            'error'
        );
    }
}

// ============================================================
// REGISTER
// ============================================================

async function handleRegister(e) {

    e.preventDefault();

    const username =
        document
            .getElementById(
                'regUsername'
            )
            .value
            .trim();

    const phone =
        document
            .getElementById(
                'regPhone'
            )
            .value
            .trim();

    const email =
        document
            .getElementById(
                'regEmail'
            )
            .value
            .trim();

    const password =
        document.getElementById(
            'regPassword'
        ).value;

    const security_question =
        document
            .getElementById(
                'regSecurityQuestion'
            )
            .value
            .trim();

    const security_answer =
        document
            .getElementById(
                'regSecurityAnswer'
            )
            .value
            .trim();

    const msg =
        document.getElementById(
            'regMessage'
        );

    if (
        !username ||
        !phone ||
        !password ||
        !security_question ||
        !security_answer
    ) {

        return showFormMessage(
            msg,
            'All fields except email are required.',
            'error'
        );
    }

    if (!/^\d{10}$/.test(phone)) {

        return showFormMessage(
            msg,
            'Phone must be exactly 10 digits.',
            'error'
        );
    }

    if (
        password.length < 6 ||
        password.length > 72
    ) {

        return showFormMessage(
            msg,
            'Password must be 6–72 characters.',
            'error'
        );
    }

    try {

        const res = await fetch(
            `${API_BASE}/auth/register`,
            {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json'
                },
                body: JSON.stringify({
                    username,
                    phone,
                    email,
                    password,
                    security_question,
                    security_answer
                })
            }
        );

        const data =
            await res.json();

        if (!res.ok) {

            throw new Error(
                data.detail ||
                'Registration failed'
            );
        }

        showFormMessage(
            msg,
            'Registration successful! Please login.',
            'success'
        );

        setTimeout(
            () => openAuthModal('login'),
            1200
        );

    } catch (err) {

        showFormMessage(
            msg,
            err.message,
            'error'
        );
    }
}

// ============================================================
// FORGOT PASSWORD
// ============================================================

async function handleForgotPassword(e) {

    e.preventDefault();

    const username =
        document
            .getElementById(
                'forgotUsername'
            )
            .value
            .trim();

    const security_answer =
        document
            .getElementById(
                'forgotSecurityAnswer'
            )
            .value
            .trim();

    const new_password =
        document
            .getElementById(
                'forgotNewPassword'
            )
            .value;

    const msg =
        document.getElementById(
            'forgotMessage'
        );

    if (
        !username ||
        !security_answer ||
        !new_password
    ) {

        return showFormMessage(
            msg,
            'All fields are required.',
            'error'
        );
    }

    if (
        new_password.length < 6 ||
        new_password.length > 72
    ) {

        return showFormMessage(
            msg,
            'Password must be 6–72 characters.',
            'error'
        );
    }

    try {

        const res = await fetch(
            `${API_BASE}/auth/reset-password`,
            {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json'
                },
                body: JSON.stringify({
                    username,
                    security_answer,
                    new_password
                })
            }
        );

        const data =
            await res.json();

        if (!res.ok) {

            throw new Error(
                data.detail ||
                'Password reset failed'
            );
        }

        showFormMessage(
            msg,
            'Password reset successful! Please login.',
            'success'
        );

        setTimeout(
            () => openAuthModal('login'),
            1200
        );

    } catch (err) {

        showFormMessage(
            msg,
            err.message,
            'error'
        );
    }
}

// ============================================================
// USER PROFILE
// ============================================================

async function fetchUserProfile() {

    if (!authToken) return;

    try {

        const res = await fetch(
            `${API_BASE}/auth/me`,
            {
                headers: {
                    'Authorization':
                        `Bearer ${authToken}`
                },
                cache: 'no-store'
            }
        );

        if (res.status === 401) {

            logoutUser(
                'Session expired. Please log in again.',
                'error'
            );

            return;
        }

        if (!res.ok) {

            throw new Error(
                `Profile request failed (${res.status})`
            );
        }

        const data =
            await res.json();

        currentUser = {
            id: data.id,
            username: data.username,
            phone: data.phone,
            email: data.email
        };

        loadCartFromStorage();

        updateCartUI();
        updateAuthUI();

    } catch (e) {

        console.error(
            'Profile error:',
            e
        );

        showToast(
            'Could not fetch your profile. Please refresh and try again.',
            'error'
        );
    }
}

function logoutUser(
    message = 'Logged out.',
    type = 'success'
) {

    authToken = null;

    localStorage.removeItem(
        'foodies_token'
    );

    currentUser = null;
    favouriteIds = [];

    loadCartFromStorage();

    updateCartUI();
    updateAuthUI();

    const bookings =
        document.getElementById(
            'myBookingsSection'
        );

    const favourites =
        document.getElementById(
            'myFavouritesSection'
        );

    if (bookings) {
        bookings.style.display =
            'none';
    }

    if (favourites) {
        favourites.style.display =
            'none';
    }

    showToast(
        message,
        type
    );
}

function showFormMessage(
    element,
    text,
    type
) {

    if (!element) return;

    element.textContent = text;

    element.className =
        `form-message ${type}`;

    element.style.display =
        'block';
}

// ============================================================
// FAVOURITES
// ============================================================

async function loadFavouriteIds() {

    if (!authToken) return;

    try {

        const res = await fetch(
            `${API_BASE}/favourites/ids`,
            {
                headers: {
                    'Authorization':
                        `Bearer ${authToken}`
                },
                cache: 'no-store'
            }
        );

        if (res.status === 401) {

            logoutUser(
                'Session expired. Please log in again.',
                'error'
            );

            return;
        }

        if (!res.ok) {

            throw new Error(
                'Failed to load favourites'
            );
        }

        const ids =
            await res.json();

        favouriteIds =
            Array.isArray(ids)
                ? ids.map(Number)
                : [];

        updateFavouriteUI();

    } catch (e) {

        console.error(
            'Favourites error:',
            e
        );
    }
}

async function toggleFavourite(
    menuItemId
) {

    if (!authToken || !currentUser) {

        showToast(
            'Please login to add favourites.',
            'error'
        );

        openAuthModal('login');

        return;
    }

    try {

        const res = await fetch(
            `${API_BASE}/favourites/toggle`,
            {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json',
                    'Authorization':
                        `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    menu_item_id:
                        Number(menuItemId)
                })
            }
        );

        if (res.status === 401) {

            logoutUser(
                'Session expired. Please log in again.',
                'error'
            );

            return;
        }

        const data =
            await res.json();

        if (!res.ok) {

            throw new Error(
                data.detail ||
                'Failed to toggle favourite'
            );
        }

        if (data.favourite) {

            if (
                !favouriteIds.includes(
                    Number(menuItemId)
                )
            ) {

                favouriteIds.push(
                    Number(menuItemId)
                );
            }

            showToast(
                'Added to favourites ❤️',
                'success'
            );

        } else {

            favouriteIds =
                favouriteIds.filter(
                    id =>
                        id !==
                        Number(menuItemId)
                );

            showToast(
                'Removed from favourites',
                'success'
            );
        }

        updateFavouriteUI();

        const favouritesSection =
            document.getElementById(
                'myFavouritesSection'
            );

        if (
            favouritesSection &&
            favouritesSection.style.display ===
            'block'
        ) {

            loadMyFavourites();

        }

    } catch (e) {

        showToast(
            e.message ||
            'Error updating favourite.',
            'error'
        );
    }
}

function updateFavouriteUI() {

    document
        .querySelectorAll('.favourite-btn')
        .forEach(btn => {

            const id =
                Number(btn.dataset.id);

            const isFav =
                favouriteIds.includes(id);

            btn.textContent =
                isFav
                    ? '❤️'
                    : '🤍';

            btn.classList.toggle(
                'active',
                isFav
            );

            btn.setAttribute(
                'aria-pressed',
                String(isFav)
            );

        });
}

async function loadMyFavourites() {

    const grid =
        document.getElementById(
            'myFavouritesGrid'
        );

    if (!grid) return;

    if (!authToken || !currentUser) {

        grid.innerHTML = `
            <p class="menu-empty">
                Please login to see your favourites.
            </p>
        `;

        return;
    }

    try {

        const res = await fetch(
            `${API_BASE}/favourites`,
            {
                headers: {
                    'Authorization':
                        `Bearer ${authToken}`
                },
                cache: 'no-store'
            }
        );

        if (res.status === 401) {

            logoutUser(
                'Session expired. Please log in again.',
                'error'
            );

            return;
        }

        const items =
            await res.json();

        if (!res.ok) {

            throw new Error(
                items.detail ||
                'Failed to load favourites'
            );
        }

        cacheMenuItems(items);

        if (!items.length) {

            grid.innerHTML = `
                <p class="menu-empty">
                    You have not added any favourites yet.
                </p>
            `;

            return;
        }

        grid.innerHTML =
            items
                .map(renderMenuItemCard)
                .join('');

        attachFavouriteHandlers(grid);

        updateFavouriteUI();

    } catch (e) {

        console.error(e);

        grid.innerHTML = `
            <p class="menu-empty">
                Could not load favourites.
            </p>
        `;
    }
}

// ============================================================
// REQUESTS
// ============================================================

async function submitItemRequest(
    itemName
) {

    const cleanName =
        String(itemName || '')
            .trim();

    if (!cleanName) {

        return showToast(
            'Please enter a dish name.',
            'error'
        );
    }

    let phone =
        currentUser?.phone || '';

    if (!/^\d{10}$/.test(phone)) {

        phone =
            prompt(
                'Enter your phone number (10 digits) to request this dish:',
                ''
            ) || '';

        if (!/^\d{10}$/.test(phone)) {

            return showToast(
                'Please enter a valid 10-digit phone number.',
                'error'
            );
        }
    }

    const waWindow =
        window.open(
            'about:blank',
            '_blank'
        );

    if (!waWindow) {

        return showToast(
            'Please allow popups to open WhatsApp.',
            'error'
        );
    }

    try {
        waWindow.opener = null;
    } catch { }

    try {

        const headers = {
            'Content-Type':
                'application/json'
        };

        if (authToken) {

            headers.Authorization =
                `Bearer ${authToken}`;

        }

        const res = await fetch(
            `${API_BASE}/requests`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    item_name: cleanName,
                    phone,
                    message:
                        `Request for ${cleanName}`
                })
            }
        );

        const data =
            await res.json();

        if (res.status === 401) {

            waWindow.close();

            logoutUser(
                'Session expired. Please log in again.',
                'error'
            );

            return;
        }

        if (!res.ok) {

            throw new Error(
                data.detail ||
                'Failed to submit request'
            );
        }

        showToast(
            `Request for "${cleanName}" sent!`,
            'success'
        );

        const waMsg =
            `Hey Foodies, I requested "${cleanName}" (Request #${data.id}). Can you make it?`;

        waWindow.location.href =
            `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMsg)}`;

    } catch (e) {

        waWindow.close();

        showToast(
            e.message ||
            'Error submitting request.',
            'error'
        );
    }
}

// ============================================================
// TIZOLA
// ============================================================

function setupOrderNow() {

    orderNowBtn =
        document.getElementById(
            'orderNowBtn'
        );

    heroOrderNow =
        document.getElementById(
            'heroOrderNow'
        );

    orderNowBtn?.addEventListener(
        'click',
        redirectToTizola
    );

    heroOrderNow?.addEventListener(
        'click',
        redirectToTizola
    );
}

async function redirectToTizola() {

    const win =
        window.open(
            'about:blank',
            '_blank'
        );

    if (!win) {

        return showToast(
            'Please allow popups to open Tizola.',
            'error'
        );
    }

    try {
        win.opener = null;
    } catch { }

    try {

        const res = await fetch(
            `${API_BASE}/tizola-url`,
            {
                cache: 'no-store'
            }
        );

        const data =
            await res.json();

        if (
            !res.ok ||
            !data?.url ||
            !String(
                data.url
            ).startsWith('https://')
        ) {

            throw new Error(
                'Invalid ordering URL'
            );
        }

        win.location.href =
            data.url;

    } catch {

        win.location.href =
            'https://tizola.in/share/foodies2/5680';

    }
}

// ============================================================
// ASK FOODIES
// ============================================================

function setupAskFoodies() {

    askFoodiesBtn =
        document.getElementById(
            'askFoodiesBtn'
        );

    askFoodiesBtn?.addEventListener(
        'click',
        () => {

            const searchTerm =
                document
                    .getElementById(
                        'menuSearch'
                    )
                    ?.value
                    .trim();

            if (!searchTerm) {

                return showToast(
                    'Please enter a dish name first.',
                    'error'
                );
            }

            submitItemRequest(
                searchTerm
            );

        }
    );
}

// ============================================================
// MENU
// ============================================================

async function loadMenu(
    category = 'all',
    search = ''
) {

    const container =
        document.getElementById(
            'menuGrid'
        );

    const empty =
        document.getElementById(
            'menuEmpty'
        );

    if (!container || !empty) {
        return;
    }

    menuRequestController?.abort();

    menuRequestController =
        new AbortController();

    container.innerHTML = `
        <div class="menu-skeleton">

            ${Array(4)
            .fill(0)
            .map(
                () => `
                    <div class="skeleton-card">

                        <div class="skeleton-img"></div>

                        <div class="skeleton-text">

                            <div class="line"></div>

                            <div class="line short"></div>

                            <div class="line short"></div>

                        </div>

                    </div>
                `
            )
            .join('')}

        </div>
    `;

    try {

        const params =
            new URLSearchParams();

        if (
            category &&
            category !== 'all'
        ) {

            params.set(
                'category',
                category
            );
        }

        if (search) {

            params.set(
                'search',
                search.slice(0, 100)
            );
        }

        const query =
            params.toString();

        const res = await fetch(
            `${API_BASE}/menu${query ? `?${query}` : ''}`,
            {
                signal:
                    menuRequestController.signal,
                cache: 'no-store'
            }
        );

        if (!res.ok) {

            throw new Error(
                'Failed to fetch menu'
            );
        }

        const items =
            await res.json();

        allMenuItems =
            Array.isArray(items)
                ? items
                : [];

        cacheMenuItems(
            allMenuItems
        );

        if (!allMenuItems.length) {

            container.innerHTML = '';

            empty.style.display =
                'block';

            const askBtn =
                document.getElementById(
                    'askFoodiesBtn'
                );

            if (askBtn) {

                askBtn.style.display =
                    search
                        ? 'inline-block'
                        : 'none';

            }

            return;
        }

        empty.style.display =
            'none';

        container.innerHTML =
            allMenuItems
                .map(renderMenuItemCard)
                .join('');

        attachFavouriteHandlers(
            container
        );

        updateFavouriteUI();

    } catch (e) {

        if (e.name === 'AbortError') {
            return;
        }

        console.error(
            'Menu error:',
            e
        );

        container.innerHTML = `
            <p class="menu-empty">
                Something went wrong. Please try again.
            </p>
        `;

        empty.style.display =
            'none';
    }
}

function renderMenuItemCard(item) {

    cacheMenuItems([item]);

    const vegIcon =
        Number(item.veg)
            ? '🟢'
            : '🔴';

    const availabilityClass =
        Number(item.available)
            ? 'available'
            : 'unavailable';

    const availText =
        Number(item.available)
            ? 'Available'
            : 'Unavailable';

    let badges = '';

    if (Number(item.popular)) {

        badges += `
            <span class="badge popular">
                Popular
            </span>
        `;
    }

    if (Number(item.chef_special)) {

        badges += `
            <span class="badge chef">
                Chef’s Special
            </span>
        `;
    }

    const isFav =
        favouriteIds.includes(
            Number(item.id)
        );

    return `
        <div class="menu-card">

            <div class="card-image">

                ${imageHtml(
        item.image,
        item.name
    )}

                <span
                    class="veg-badge"
                    title="${Number(item.veg)
            ? 'Vegetarian'
            : 'Non-vegetarian'
        }"
                >
                    ${vegIcon}
                </span>

                <div class="badge-group">
                    ${badges}
                </div>

                <button
                    type="button"
                    class="favourite-btn"
                    data-id="${escapeHtml(item.id)}"
                    aria-label="Toggle ${escapeHtml(item.name)} favourite"
                    aria-pressed="${isFav}"
                >
                    ${isFav ? '❤️' : '🤍'}
                </button>

            </div>

            <div class="card-body">

                <h4>
                    ${escapeHtml(item.name)}
                </h4>

                <div class="desc">
                    ${escapeHtml(
            item.description || ''
        )}
                </div>

                <div class="card-footer">

                    <span class="price">
                        ₹${formatMoney(item.price)}
                    </span>

                    <span
                        class="availability ${availabilityClass}"
                    >
                        ${availText}
                    </span>

                </div>

                <button
                    type="button"
                    class="add-to-cart-btn"
                    onclick="addMenuItemToCart('${escapeHtml(item.id)}')"
                    ${!Number(item.available) ? 'disabled' : ''}
                >
                    🛒 Add to Cart
                </button>

            </div>

        </div>
    `;
}

function attachFavouriteHandlers(
    container
) {

    container
        .querySelectorAll(
            '.favourite-btn'
        )
        .forEach(btn => {

            btn.addEventListener(
                'click',
                e => {

                    e.stopPropagation();

                    toggleFavourite(
                        Number(
                            btn.dataset.id
                        )
                    );

                }
            );

        });
}

function renderSearchResults(query) {

    const results =
        document.getElementById('searchResults');

    if (!results) return;

    const search =
        String(query || '').trim().toLowerCase();

    if (!search) {
        results.innerHTML = '';
        results.style.display = 'none';
        return;
    }

    const matches =
        allMenuItems.filter(item =>
            String(item.name || '')
                .toLowerCase()
                .includes(search)
        );

    if (!matches.length) {
        results.innerHTML = `
            <div class="search-no-results">
                <p style="margin: 0 0 10px 0;">No items found for "<strong>${escapeHtml(search)}</strong>"</p>
                <button 
                    type="button" 
                    class="btn btn-primary" 
                    id="searchRequestBtn" 
                    style="padding: 8px 20px; font-size: 14px; border-radius: 6px; cursor: pointer;"
                >
                    🙋 Ask Foodies to Make It
                </button>
            </div>
        `;
        results.style.display = 'block';

        // Attach click handler to the new button
        const requestBtn = document.getElementById('searchRequestBtn');
        if (requestBtn) {
            requestBtn.addEventListener('click', function () {
                submitItemRequest(search);
            });
        }
        return;
    }

    results.innerHTML =
        matches.slice(0, 8).map(item => `

            <button
                type="button"
                class="search-result-item"
                data-id="${escapeHtml(item.id)}"
            >

                <span class="search-result-image">
                    ${imageHtml(
            item.image,
            item.name
        )}
                </span>

                <span class="search-result-name">
                    ${escapeHtml(item.name)}
                </span>

            </button>

        `).join('');

    results.style.display = 'block';

    results
        .querySelectorAll('.search-result-item')
        .forEach(result => {

            result.addEventListener(
                'click',
                () => {

                    const item =
                        menuItemCache.get(
                            String(
                                result.dataset.id
                            )
                        );

                    if (!item) return;

                    const searchInput =
                        document.getElementById(
                            'menuSearch'
                        );

                    if (searchInput) {
                        searchInput.value =
                            item.name;
                    }

                    currentSearch =
                        item.name;

                    results.innerHTML = '';
                    results.style.display =
                        'none';

                    loadMenu(
                        currentCategory,
                        item.name
                    );

                    // Scroll to menu section
                    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });

                }
            );

        });
}

function setupMenuFilters() {

    const filterBtns =
        document.querySelectorAll(
            '.filter-btn'
        );

    const searchInput =
        document.getElementById(
            'menuSearch'
        );

    filterBtns.forEach(btn => {

        btn.addEventListener(
            'click',
            () => {

                filterBtns.forEach(
                    b =>
                        b.classList.remove(
                            'active'
                        )
                );

                btn.classList.add(
                    'active'
                );

                currentCategory =
                    btn.dataset.category ||
                    'all';

                loadMenu(
                    currentCategory,
                    currentSearch
                );

            }
        );

    });

    if (searchInput) {

        let timeout;

        searchInput.addEventListener(
            'input',
            e => {

                clearTimeout(timeout);

                const value =
                    e.target.value.trim();

                // Live search suggestions
                renderSearchResults(value);

                timeout =
                    setTimeout(
                        () => {

                            currentSearch =
                                value;

                            loadMenu(
                                currentCategory,
                                currentSearch
                            );

                            const askBtn =
                                document.getElementById(
                                    'askFoodiesBtn'
                                );

                            if (askBtn) {

                                askBtn.style.display =
                                    currentSearch
                                        ? 'inline-block'
                                        : 'none';

                            }

                        },
                        300
                    );

            }
        );

        // Close results when clicking outside
        document.addEventListener(
            'click',
            e => {

                const results =
                    document.getElementById(
                        'searchResults'
                    );

                if (
                    !searchInput.contains(e.target) &&
                    !results?.contains(e.target)
                ) {

                    if (results) {
                        results.style.display =
                            'none';
                    }

                }

            }
        );
    }
}

// ============================================================
// FEATURED
// ============================================================

async function loadFeatured() {

    const container =
        document.getElementById(
            'featuredGrid'
        );

    if (!container) return;

    try {

        const res = await fetch(
            `${API_BASE}/featured`,
            {
                cache: 'no-store'
            }
        );

        if (!res.ok) {

            throw new Error(
                'Failed to fetch featured'
            );
        }

        const items =
            await res.json();

        if (
            !Array.isArray(items) ||
            !items.length
        ) {

            container.innerHTML = `
                <p class="menu-empty">
                    No featured items yet.
                </p>
            `;

            return;
        }

        container.innerHTML =
            items
                .map(
                    item => `
                    <div class="featured-card">

                        <div class="card-image">
                            ${imageHtml(
                        item.image,
                        item.name
                    )}
                        </div>

                        <div class="card-body">

                            <h4>
                                ${escapeHtml(
                        item.name
                    )}
                            </h4>

                            <p>
                                ${escapeHtml(
                        item.description || ''
                    )}
                            </p>

                            <div class="card-footer">

                                <span class="price">
                                    ₹${formatMoney(
                        item.price
                    )}
                                </span>

                            </div>

                        </div>

                    </div>
                `
                )
                .join('');

    } catch (e) {

        console.error(
            'Featured error:',
            e
        );

        container.innerHTML = `
            <p class="menu-empty">
                Could not load featured dishes.
            </p>
        `;
    }
}

// ============================================================
// REVIEWS
// ============================================================

async function loadReviews() {

    const container =
        document.getElementById(
            'reviewsGrid'
        );

    const stats =
        document.getElementById(
            'reviewsStats'
        );

    if (!container) return;

    try {

        const res = await fetch(
            `${API_BASE}/reviews`,
            {
                cache: 'no-store'
            }
        );

        if (!res.ok) {

            throw new Error(
                'Failed to fetch reviews'
            );
        }

        const reviews =
            await res.json();

        const total =
            Array.isArray(reviews)
                ? reviews.length
                : 0;

        const avg =
            total
                ? (
                    reviews.reduce(
                        (a, r) =>
                            a +
                            Number(r.rating),
                        0
                    ) / total
                ).toFixed(1)
                : '0.0';

        const full =
            Math.max(
                0,
                Math.min(
                    5,
                    Math.round(
                        Number(avg)
                    )
                )
            );

        if (stats) {

            const avgRating =
                stats.querySelector(
                    '#avgRating'
                );

            const avgStars =
                stats.querySelector(
                    '#avgStars'
                );

            const reviewCount =
                stats.querySelector(
                    '#reviewCount'
                );

            if (avgRating) {
                avgRating.textContent =
                    avg;
            }

            if (avgStars) {

                avgStars.textContent =
                    '★'.repeat(full) +
                    '☆'.repeat(5 - full);

            }

            if (reviewCount) {

                reviewCount.textContent =
                    `${total} review${total !== 1 ? 's' : ''}`;

            }
        }

        if (!total) {

            container.innerHTML = `
                <p class="menu-empty">
                    No reviews yet. Be the first!
                </p>
            `;

            return;
        }

        container.innerHTML =
            reviews
                .map(r => {

                    const rating =
                        Math.max(
                            1,
                            Math.min(
                                5,
                                Number(r.rating)
                            )
                        );

                    return `
                        <div class="review-card">

                            <div class="review-header">

                                <span class="review-name">
                                    ${escapeHtml(r.name)}
                                </span>

                                <span
                                    class="review-stars"
                                    aria-label="${rating} out of 5 stars"
                                >
                                    ${'★'.repeat(rating)}
                                    ${'☆'.repeat(5 - rating)}
                                </span>

                            </div>

                            <div class="review-comment">
                                ${escapeHtml(
                        r.comment
                    )}
                            </div>

                            <div class="review-date">
                                ${escapeHtml(
                        new Date(
                            r.created_at
                        ).toLocaleDateString()
                    )}
                            </div>

                        </div>
                    `;

                })
                .join('');

    } catch (e) {

        console.error(
            'Reviews error:',
            e
        );

        container.innerHTML = `
            <p class="menu-empty">
                Could not load reviews.
            </p>
        `;
    }
}

// ============================================================
// REVIEW FORM
// ============================================================

function setupReviewForm() {

    const form =
        document.getElementById(
            'reviewForm'
        );

    if (!form) return;

    const stars =
        form.querySelectorAll(
            '.star-rating button'
        );

    const ratingInput =
        document.getElementById(
            'reviewRatingInput'
        );

    const msg =
        document.getElementById(
            'reviewMessage'
        );

    stars.forEach(star => {

        star.addEventListener(
            'click',
            () => {

                const val =
                    Number(
                        star.dataset.value
                    );

                ratingInput.value =
                    String(val);

                stars.forEach(s => {

                    s.classList.toggle(
                        'active',
                        Number(
                            s.dataset.value
                        ) <= val
                    );

                });

            }
        );

    });

    form.addEventListener(
        'submit',
        async e => {

            e.preventDefault();

            const name =
                document
                    .getElementById(
                        'reviewName'
                    )
                    .value
                    .trim();

            const rating =
                Number(
                    ratingInput.value
                );

            const comment =
                document
                    .getElementById(
                        'reviewComment'
                    )
                    .value
                    .trim();

            if (
                !name ||
                !rating ||
                !comment
            ) {

                return showFormMessage(
                    msg,
                    'Please fill all fields and select a rating.',
                    'error'
                );
            }

            const btn =
                document.getElementById(
                    'reviewSubmitBtn'
                );

            btn.disabled = true;
            btn.textContent =
                'Submitting...';

            try {

                const res =
                    await fetch(
                        `${API_BASE}/reviews`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type':
                                    'application/json'
                            },
                            body: JSON.stringify({
                                name,
                                rating,
                                comment
                            })
                        }
                    );

                const data =
                    await res.json();

                if (!res.ok) {

                    throw new Error(
                        data.detail ||
                        'Submission failed'
                    );
                }

                showFormMessage(
                    msg,
                    '✅ Review submitted successfully!',
                    'success'
                );

                form.reset();

                stars.forEach(
                    s =>
                        s.classList.remove(
                            'active'
                        )
                );

                ratingInput.value = '0';

                loadReviews();

            } catch (err) {

                showFormMessage(
                    msg,
                    `❌ ${err.message}`,
                    'error'
                );

            } finally {

                btn.disabled = false;

                btn.textContent =
                    'Submit Review';

            }

        }
    );
}

// ============================================================
// BOOKINGS
// ============================================================

function getLocalDateInputValue() {

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, '0');

    const day =
        String(
            now.getDate()
        ).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function setupBookingForm() {

    const form =
        document.getElementById(
            'bookingForm'
        );

    const confirmBox =
        document.getElementById(
            'bookingConfirmation'
        );

    const msg =
        document.getElementById(
            'bookingMessage'
        );

    if (!form) return;

    const dateInput =
        document.getElementById(
            'bookDate'
        );

    if (dateInput) {

        dateInput.setAttribute(
            'min',
            getLocalDateInputValue()
        );
    }

    form.addEventListener(
        'submit',
        async e => {

            e.preventDefault();

            const name =
                document
                    .getElementById(
                        'bookName'
                    )
                    .value
                    .trim();

            const phone =
                document
                    .getElementById(
                        'bookPhone'
                    )
                    .value
                    .trim();

            const guests =
                Number(
                    document.getElementById(
                        'bookGuests'
                    ).value
                );

            const bookingDate =
                document.getElementById(
                    'bookDate'
                ).value;

            const time =
                document.getElementById(
                    'bookTime'
                ).value;

            const notes =
                document
                    .getElementById(
                        'bookNotes'
                    )
                    .value
                    .trim();

            if (
                !name ||
                !phone ||
                !guests ||
                !bookingDate ||
                !time
            ) {

                return showFormMessage(
                    msg,
                    'Please fill all required fields.',
                    'error'
                );
            }

            if (!/^\d{10}$/.test(phone)) {

                return showFormMessage(
                    msg,
                    'Phone must be exactly 10 digits.',
                    'error'
                );
            }

            if (
                !Number.isInteger(guests) ||
                guests < 1 ||
                guests > 50
            ) {

                return showFormMessage(
                    msg,
                    'Guests must be between 1 and 50.',
                    'error'
                );
            }

            if (
                bookingDate <
                getLocalDateInputValue()
            ) {

                return showFormMessage(
                    msg,
                    'Please choose today or a future date.',
                    'error'
                );
            }

            const btn =
                document.getElementById(
                    'bookSubmitBtn'
                );

            btn.disabled = true;
            btn.textContent =
                'Booking...';

            try {

                const headers = {
                    'Content-Type':
                        'application/json'
                };

                if (authToken) {

                    headers.Authorization =
                        `Bearer ${authToken}`;

                }

                const res =
                    await fetch(
                        `${API_BASE}/bookings`,
                        {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                name,
                                phone,
                                guests,
                                date: bookingDate,
                                time,
                                notes
                            })
                        }
                    );

                const data =
                    await res.json();

                if (res.status === 401) {

                    logoutUser(
                        'Session expired. Please log in again.',
                        'error'
                    );

                    return;
                }

                if (!res.ok) {

                    throw new Error(
                        data.detail ||
                        'Booking failed'
                    );
                }

                document.getElementById(
                    'confirmId'
                ).textContent =
                    `#${data.id}`;

                document.getElementById(
                    'confirmName'
                ).textContent =
                    data.name;

                document.getElementById(
                    'confirmDate'
                ).textContent =
                    data.date;

                document.getElementById(
                    'confirmTime'
                ).textContent =
                    data.time;

                document.getElementById(
                    'confirmGuests'
                ).textContent =
                    data.guests;

                document.getElementById(
                    'confirmStatus'
                ).textContent =
                    data.status;

                form.style.display =
                    'none';

                if (confirmBox) {
                    confirmBox.style.display =
                        'block';
                }

                msg.style.display =
                    'none';

            } catch (err) {

                showFormMessage(
                    msg,
                    `❌ ${err.message}`,
                    'error'
                );

            } finally {

                btn.disabled = false;

                btn.textContent =
                    'Book Now';

            }

        }
    );

    document
        .getElementById(
            'bookingNewBtn'
        )
        ?.addEventListener(
            'click',
            () => {

                form.style.display =
                    'block';

                if (confirmBox) {
                    confirmBox.style.display =
                        'none';
                }

                form.reset();

                if (dateInput) {

                    dateInput.setAttribute(
                        'min',
                        getLocalDateInputValue()
                    );

                }

                msg.style.display =
                    'none';

                if (currentUser) {

                    const name =
                        document.getElementById(
                            'bookName'
                        );

                    const phone =
                        document.getElementById(
                            'bookPhone'
                        );

                    if (name) {
                        name.value =
                            currentUser.username || '';
                    }

                    if (phone) {
                        phone.value =
                            currentUser.phone || '';
                    }

                }

            }
        );
}

async function loadMyBookings() {

    const container =
        document.getElementById(
            'myBookingsList'
        );

    if (!container) return;

    if (!authToken || !currentUser) {

        container.innerHTML = `
            <p class="menu-empty">
                Please login to view your bookings.
            </p>
        `;

        return;
    }

    try {

        const res =
            await fetch(
                `${API_BASE}/my-bookings`,
                {
                    headers: {
                        'Authorization':
                            `Bearer ${authToken}`
                    },
                    cache: 'no-store'
                }
            );

        if (res.status === 401) {

            logoutUser(
                'Session expired. Please log in again.',
                'error'
            );

            return;
        }

        const bookings =
            await res.json();

        if (!res.ok) {

            throw new Error(
                bookings.detail ||
                'Failed to fetch bookings'
            );
        }

        if (!bookings.length) {

            container.innerHTML = `
                <p class="menu-empty">
                    You have no bookings yet.
                </p>
            `;

            return;
        }

        container.innerHTML = `
            <div class="table-wrap">

                <table>

                    <thead>

                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Guests</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Status</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${bookings.map(
            b => `
                            <tr>

                                <td>
                                    ${escapeHtml(b.id)}
                                </td>

                                <td>
                                    ${escapeHtml(b.name)}
                                </td>

                                <td>
                                    ${escapeHtml(b.phone)}
                                </td>

                                <td>
                                    ${escapeHtml(b.guests)}
                                </td>

                                <td>
                                    ${escapeHtml(b.date)}
                                </td>

                                <td>
                                    ${escapeHtml(b.time)}
                                </td>

                                <td>

                                    <span
                                        class="badge ${escapeHtml(
                String(
                    b.status
                ).toLowerCase()
            )}"
                                    >
                                        ${escapeHtml(
                b.status
            )}
                                    </span>

                                </td>

                            </tr>
                        `
        ).join('')}

                    </tbody>

                </table>

            </div>
        `;

    } catch (e) {

        console.error(
            'My bookings error:',
            e
        );

        container.innerHTML = `
            <p class="menu-empty">
                Could not load bookings.
            </p>
        `;
    }
}

// ============================================================
// GALLERY
// ============================================================

function setupGallery() {

    const grid =
        document.getElementById(
            'galleryGrid'
        );

    if (!grid) return;

    const lightbox =
        document.getElementById(
            'lightbox'
        );

    const lightboxImage =
        document.getElementById(
            'lightboxImage'
        );

    const lightboxClose =
        document.getElementById(
            'lightboxClose'
        );

    const lightboxPrev =
        document.getElementById(
            'lightboxPrev'
        );

    const lightboxNext =
        document.getElementById(
            'lightboxNext'
        );

    let currentImages = [];
    let currentIndex = 0;

    const closeLightbox = () => {

        lightbox?.classList.remove(
            'open'
        );

    };

    const openLightbox = index => {

        if (
            !lightbox ||
            !lightboxImage ||
            !currentImages.length
        ) {
            return;
        }

        currentIndex = index;

        lightboxImage.src =
            currentImages[currentIndex];

        lightbox.classList.add(
            'open'
        );
    };

    lightboxClose?.addEventListener(
        'click',
        closeLightbox
    );

    lightbox?.addEventListener(
        'click',
        e => {

            if (e.target === lightbox) {
                closeLightbox();
            }

        }
    );

    lightboxPrev?.addEventListener(
        'click',
        e => {

            e.stopPropagation();

            if (!currentImages.length) {
                return;
            }

            currentIndex =
                (
                    currentIndex -
                    1 +
                    currentImages.length
                ) %
                currentImages.length;

            lightboxImage.src =
                currentImages[currentIndex];

        }
    );

    lightboxNext?.addEventListener(
        'click',
        e => {

            e.stopPropagation();

            if (!currentImages.length) {
                return;
            }

            currentIndex =
                (
                    currentIndex +
                    1
                ) %
                currentImages.length;

            lightboxImage.src =
                currentImages[currentIndex];

        }
    );

    document.addEventListener(
        'keydown',
        e => {

            if (
                !lightbox?.classList.contains(
                    'open'
                )
            ) {
                return;
            }

            if (e.key === 'Escape') {
                closeLightbox();
            }

            if (e.key === 'ArrowLeft') {
                lightboxPrev?.click();
            }

            if (e.key === 'ArrowRight') {
                lightboxNext?.click();
            }

        }
    );

    async function renderGallery(
        filter = 'all'
    ) {

        try {

            const res =
                await fetch(
                    `${API_BASE}/gallery`,
                    {
                        cache: 'no-store'
                    }
                );

            if (!res.ok) {

                throw new Error(
                    'Failed to fetch gallery'
                );
            }

            const items =
                await res.json();

            const filtered =
                filter === 'all'
                    ? items
                    : items.filter(
                        i =>
                            i.category ===
                            filter
                    );

            if (!filtered.length) {

                currentImages = [];

                grid.innerHTML = `
                    <p class="menu-empty">
                        No images in this category.
                    </p>
                `;

                return;
            }

            currentImages =
                filtered
                    .filter(
                        i =>
                            isSafeImageSource(
                                i.image
                            )
                    )
                    .map(
                        i => i.image
                    );

            grid.innerHTML =
                filtered
                    .map(
                        (item, idx) => {

                            const safeImage =
                                isSafeImageSource(
                                    item.image
                                );

                            return `
                                <button
                                    type="button"
                                    class="gallery-item"
                                    data-index="${idx}"
                                    aria-label="Open ${escapeHtml(
                                item.label ||
                                'Gallery image'
                            )}"
                                >

                                    ${safeImage
                                    ? `
                                            <img
                                                src="${escapeHtml(
                                        item.image
                                    )}"
                                                alt="${escapeHtml(
                                        item.label ||
                                        'Gallery'
                                    )}"
                                                loading="lazy"
                                            >
                                        `
                                    : `
                                            <span class="image-fallback">
                                                🍽️
                                            </span>
                                        `
                                }

                                    <span class="gallery-label">
                                        ${escapeHtml(
                                    item.label ||
                                    ''
                                )}
                                    </span>

                                </button>
                            `;
                        }
                    )
                    .join('');

            grid
                .querySelectorAll(
                    '.gallery-item'
                )
                .forEach(el => {

                    el.addEventListener(
                        'click',
                        () => {

                            const item =
                                filtered[
                                Number(
                                    el.dataset.index
                                )
                                ];

                            const safeIndex =
                                currentImages.indexOf(
                                    item?.image
                                );

                            if (
                                safeIndex >= 0
                            ) {

                                openLightbox(
                                    safeIndex
                                );

                            }

                        }
                    );

                });

        } catch (e) {

            console.error(
                'Gallery error:',
                e
            );

            grid.innerHTML = `
                <p class="menu-empty">
                    Could not load gallery.
                </p>
            `;
        }
    }

    document
        .querySelectorAll(
            '.gallery-tab'
        )
        .forEach(tab => {

            tab.addEventListener(
                'click',
                () => {

                    document
                        .querySelectorAll(
                            '.gallery-tab'
                        )
                        .forEach(
                            t =>
                                t.classList.remove(
                                    'active'
                                )
                        );

                    tab.classList.add(
                        'active'
                    );

                    renderGallery(
                        tab.dataset.category ||
                        'all'
                    );

                }
            );

        });

    renderGallery('all');
}

// ============================================================
// ABOUT IMAGE
// ============================================================

async function loadAboutImage() {

    const img =
        document.getElementById(
            'aboutImage'
        );

    if (!img) return;

    try {

        const res =
            await fetch(
                `${API_BASE}/about-image`,
                {
                    cache: 'no-store'
                }
            );

        if (!res.ok) {

            throw new Error(
                'Failed to fetch about image'
            );
        }

        const data =
            await res.json();

        if (
            data.image &&
            isSafeImageSource(
                data.image
            )
        ) {

            img.src =
                data.image;

            img.style.display =
                'block';

        } else {

            img.style.display =
                'none';

        }

    } catch (e) {

        console.error(
            'About image error:',
            e
        );

        img.style.display =
            'none';
    }
}

// ============================================================
// GLOBALS FOR INLINE BUTTONS
// ============================================================

window.showToast =
    showToast;

window.addToCart =
    addToCart;

window.addMenuItemToCart =
    addMenuItemToCart;

window.increaseCartItem =
    increaseCartItem;

window.decreaseCartItem =
    decreaseCartItem;

window.removeCartItem =
    removeCartItem;

window.openCart =
    openCart;

window.closeCart =
    closeCart;

window.orderCart =
    orderCart;

window.toggleFavourite =
    toggleFavourite;

window.submitItemRequest =
    submitItemRequest;