// ============================================================
// FILE: frontend/script.js
// Complete frontend functionality for FOODIES
// Includes:
// - Navbar
// - Featured dishes
// - Menu
// - Search & filters
// - Shopping cart
// - + / - quantity controls
// - Cart total
// - WhatsApp ordering
// - Reviews
// - Booking
// - Gallery
// - About image
// - Toast notifications
// ============================================================

const API_BASE = '/api';

// ============================================================
// GLOBAL STATE
// ============================================================

let allMenuItems = [];
let cart = [];

let currentCategory = 'all';
let currentSearch = '';

// Cart DOM elements
let navCartBtn = null;
let navCartCount = null;

let cartFloatingBtn = null;
let cartFloatingCount = null;

let cartOverlay = null;
let cartPanel = null;
let cartClose = null;
let cartItems = null;
let cartTotal = null;
let cartOrderBtn = null;


// ============================================================
// DOM READY
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    // --------------------------------------------------------
    // Loading Screen
    // --------------------------------------------------------

    const loadingScreen =
        document.getElementById('loading-screen');

    if (loadingScreen) {

        setTimeout(() => {

            loadingScreen.classList.add('hidden');

        }, 600);
    }


    // --------------------------------------------------------
    // Navbar
    // --------------------------------------------------------

    const navbar =
        document.getElementById('navbar');

    const navToggle =
        document.getElementById('navToggle');

    const navLinks =
        document.getElementById('navLinks');


    window.addEventListener('scroll', () => {

        if (!navbar) return;

        if (window.scrollY > 80) {

            navbar.classList.add('scrolled');

        } else {

            navbar.classList.remove('scrolled');

        }

    });


    if (navToggle && navLinks) {

        navToggle.addEventListener('click', () => {

            navToggle.classList.toggle('open');
            navLinks.classList.toggle('open');

            navToggle.setAttribute(
                'aria-expanded',
                navLinks.classList.contains('open')
            );

        });


        navLinks.querySelectorAll('a').forEach(link => {

            link.addEventListener('click', () => {

                navToggle.classList.remove('open');
                navLinks.classList.remove('open');

                navToggle.setAttribute(
                    'aria-expanded',
                    'false'
                );

            });

        });

    }


    // --------------------------------------------------------
    // Scroll To Top
    // --------------------------------------------------------

    const scrollBtn =
        document.getElementById('scrollTop');


    if (scrollBtn) {

        window.addEventListener('scroll', () => {

            if (window.scrollY > 400) {

                scrollBtn.classList.add('visible');

            } else {

                scrollBtn.classList.remove('visible');

            }

        });


        scrollBtn.addEventListener('click', () => {

            window.scrollTo({

                top: 0,

                behavior: 'smooth'

            });

        });

    }


    // --------------------------------------------------------
    // Cart Setup
    // --------------------------------------------------------

    setupCart();


    // --------------------------------------------------------
    // Load Featured Dishes
    // --------------------------------------------------------

    loadFeatured();


    // --------------------------------------------------------
    // Load Menu
    // --------------------------------------------------------

    loadMenu();


    // --------------------------------------------------------
    // Menu Filters & Search
    // --------------------------------------------------------

    setupMenuFilters();


    // --------------------------------------------------------
    // Reviews
    // --------------------------------------------------------

    loadReviews();

    setupReviewForm();


    // --------------------------------------------------------
    // Booking
    // --------------------------------------------------------

    setupBookingForm();


    // --------------------------------------------------------
    // Gallery
    // --------------------------------------------------------

    setupGallery();


    // --------------------------------------------------------
    // About Image
    // --------------------------------------------------------

    loadAboutImage();


    // --------------------------------------------------------
    // Smooth Scroll
    // --------------------------------------------------------

    document
        .querySelectorAll('a[href^="#"]')
        .forEach(anchor => {

            anchor.addEventListener('click', function (e) {

                const targetId =
                    this.getAttribute('href');

                if (
                    !targetId ||
                    targetId === '#'
                ) {
                    return;
                }


                const targetElement =
                    document.querySelector(targetId);


                if (targetElement) {

                    e.preventDefault();

                    targetElement.scrollIntoView({

                        behavior: 'smooth',

                        block: 'start'

                    });

                }

            });

        });

});


// ============================================================
// CART SETUP
// ============================================================

function setupCart() {

    // --------------------------------------------------------
    // Navbar Cart
    // --------------------------------------------------------

    navCartBtn =
        document.getElementById('navCartBtn');

    navCartCount =
        document.getElementById('navCartCount');


    // --------------------------------------------------------
    // Optional Floating Cart
    // --------------------------------------------------------

    cartFloatingBtn =
        document.getElementById('cartFloatingBtn');

    cartFloatingCount =
        document.getElementById('cartCount');


    // --------------------------------------------------------
    // Cart Panel
    // --------------------------------------------------------

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

    cartOrderBtn =
        document.getElementById('cartOrderBtn');


    // --------------------------------------------------------
    // Open Navbar Cart
    // --------------------------------------------------------

    if (navCartBtn) {

        navCartBtn.addEventListener('click', () => {

            openCart();

        });

    }


    // --------------------------------------------------------
    // Open Floating Cart
    // --------------------------------------------------------

    if (cartFloatingBtn) {

        cartFloatingBtn.addEventListener('click', () => {

            openCart();

        });

    }


    // --------------------------------------------------------
    // Close Cart
    // --------------------------------------------------------

    if (cartClose) {

        cartClose.addEventListener('click', () => {

            closeCart();

        });

    }


    // --------------------------------------------------------
    // Close By Overlay
    // --------------------------------------------------------

    if (cartOverlay) {

        cartOverlay.addEventListener('click', () => {

            closeCart();

        });

    }


    // --------------------------------------------------------
    // Order Now
    // --------------------------------------------------------

    if (cartOrderBtn) {

        cartOrderBtn.addEventListener('click', () => {

            orderCart();

        });

    }


    // --------------------------------------------------------
    // Escape Key
    // --------------------------------------------------------

    document.addEventListener('keydown', event => {

        if (event.key === 'Escape') {

            closeCart();

        }

    });


    // Initial UI
    updateCartUI();

}


// ============================================================
// OPEN CART
// ============================================================

function openCart() {

    if (cartPanel) {

        cartPanel.classList.add('open');

        cartPanel.setAttribute(
            'aria-hidden',
            'false'
        );

    }


    if (cartOverlay) {

        cartOverlay.classList.add('open');

        cartOverlay.setAttribute(
            'aria-hidden',
            'false'
        );

    }


    if (navCartBtn) {

        navCartBtn.setAttribute(
            'aria-expanded',
            'true'
        );

    }


    document.body.classList.add('cart-open');


    updateCartUI();

}


// ============================================================
// CLOSE CART
// ============================================================

function closeCart() {

    if (cartPanel) {

        cartPanel.classList.remove('open');

        cartPanel.setAttribute(
            'aria-hidden',
            'true'
        );

    }


    if (cartOverlay) {

        cartOverlay.classList.remove('open');

        cartOverlay.setAttribute(
            'aria-hidden',
            'true'
        );

    }


    if (navCartBtn) {

        navCartBtn.setAttribute(
            'aria-expanded',
            'false'
        );

    }


    document.body.classList.remove('cart-open');

}


// ============================================================
// ADD TO CART
// ============================================================

function addToCart(item) {

    if (!item) {

        showToast(
            'Unable to add this item.',
            'error'
        );

        return;
    }


    // Prevent unavailable items
    if (item.available === false) {

        showToast(
            `${item.name} is currently unavailable.`,
            'error'
        );

        return;
    }


    const existingItem =
        cart.find(cartItem => {

            return String(cartItem.id) ===
                String(item.id);

        });


    if (existingItem) {

        existingItem.quantity += 1;

    } else {

        cart.push({

            id: item.id,

            name: item.name,

            price: Number(item.price) || 0,

            quantity: 1

        });

    }


    // Update count + cart panel + total
    updateCartUI();


    showToast(
        `${item.name} added to cart`,
        'success'
    );

}


// ============================================================
// ADD MENU ITEM TO CART
// ============================================================

function addMenuItemToCart(id) {

    const item =
        allMenuItems.find(menuItem => {

            return String(menuItem.id) ===
                String(id);

        });


    if (!item) {

        showToast(
            'Item could not be found.',
            'error'
        );

        return;
    }


    addToCart(item);

}


// ============================================================
// INCREASE QUANTITY
// ============================================================

function increaseCartItem(id) {

    const item =
        cart.find(cartItem => {

            return String(cartItem.id) ===
                String(id);

        });


    if (!item) {
        return;
    }


    item.quantity += 1;


    updateCartUI();

}


// ============================================================
// DECREASE QUANTITY
// ============================================================

function decreaseCartItem(id) {

    const item =
        cart.find(cartItem => {

            return String(cartItem.id) ===
                String(id);

        });


    if (!item) {
        return;
    }


    if (item.quantity > 1) {

        item.quantity -= 1;

    } else {

        cart =
            cart.filter(cartItem => {

                return String(cartItem.id) !==
                    String(id);

            });

    }


    updateCartUI();

}


// ============================================================
// REMOVE ITEM
// ============================================================

function removeCartItem(id) {

    cart =
        cart.filter(cartItem => {

            return String(cartItem.id) !==
                String(id);

        });


    updateCartUI();

}


// ============================================================
// UPDATE CART UI
// ============================================================

function updateCartUI() {

    updateCartCount();

    renderCart();

    updateCartTotal();

}


// ============================================================
// UPDATE CART COUNT
// ============================================================

function updateCartCount() {

    const totalItems =
        cart.reduce(
            (sum, item) => {

                return (
                    sum +
                    Number(item.quantity)
                );

            },
            0
        );


    // Navbar cart count
    if (navCartCount) {

        navCartCount.textContent =
            totalItems;

        navCartCount.style.display =
            'inline-flex';

    }


    // Floating cart count
    if (cartFloatingCount) {

        cartFloatingCount.textContent =
            totalItems;

        cartFloatingCount.style.display =
            totalItems > 0
                ? 'inline-flex'
                : 'none';

    }

}


// ============================================================
// RENDER CART
// ============================================================

function renderCart() {

    if (!cartItems) {
        return;
    }


    // --------------------------------------------------------
    // Empty
    // --------------------------------------------------------

    if (cart.length === 0) {

        cartItems.innerHTML = `

            <div class="cart-empty">

                <span>🛒</span>

                <p>
                    Your cart is empty
                </p>

                <small>
                    Add dishes from the menu
                </small>

            </div>

        `;

        return;
    }


    // --------------------------------------------------------
    // Items
    // --------------------------------------------------------

    cartItems.innerHTML =
        cart
            .map(item => {

                const subtotal =
                    Number(item.price) *
                    Number(item.quantity);


                return `

                    <div class="cart-item">

                        <div class="cart-item-info">

                            <h4>
                                ${escapeHtml(item.name)}
                            </h4>

                            <span class="cart-item-price">
                                ₹${formatMoney(item.price)}
                                each
                            </span>

                        </div>


                        <div class="cart-item-actions">

                            <div class="quantity-control">

                                <button
                                    type="button"
                                    class="quantity-btn"
                                    onclick="decreaseCartItem('${item.id}')"
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
                                    onclick="increaseCartItem('${item.id}')"
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
                                onclick="removeCartItem('${item.id}')"
                                aria-label="Remove item"
                            >
                                ✕
                            </button>

                        </div>

                    </div>

                `;

            })
            .join('');

}


// ============================================================
// UPDATE CART TOTAL
// ============================================================

function updateCartTotal() {

    if (!cartTotal) {
        return;
    }


    const total =
        cart.reduce(
            (sum, item) => {

                return (
                    sum +
                    (
                        Number(item.price) *
                        Number(item.quantity)
                    )
                );

            },
            0
        );


    cartTotal.textContent =
        `₹${formatMoney(total)}`;


    if (cartOrderBtn) {

        cartOrderBtn.disabled =
            cart.length === 0;

    }

}


// ============================================================
// ORDER CART THROUGH WHATSAPP
// ============================================================

function orderCart() {

    if (cart.length === 0) {

        showToast(
            'Your cart is empty.',
            'error'
        );

        return;
    }


    let total = 0;


    let message =
        'Hello Foodies! 👋\n\n' +
        'I would like to place the following order:\n\n';


    cart.forEach((item, index) => {

        const subtotal =
            Number(item.price) *
            Number(item.quantity);


        total += subtotal;


        message +=
            `${index + 1}. ${item.name}\n` +
            `   Quantity: ${item.quantity}\n` +
            `   Price: ₹${formatMoney(item.price)}\n` +
            `   Subtotal: ₹${formatMoney(subtotal)}\n\n`;

    });


    message +=
        `Total: ₹${formatMoney(total)}\n\n` +
        'Please confirm my order.';


    const whatsappNumber =
        '919951000029';


    const whatsappURL =
        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;


    window.open(
        whatsappURL,
        '_blank',
        'noopener,noreferrer'
    );

}


// ============================================================
// FORMAT MONEY
// ============================================================

function formatMoney(value) {

    const number =
        Number(value) || 0;


    return number.toLocaleString(
        'en-IN',
        {
            maximumFractionDigits: 2
        }
    );

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

}


// ============================================================
// FEATURED DISHES
// ============================================================

async function loadFeatured() {

    const container =
        document.getElementById(
            'featuredGrid'
        );


    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/featured`
            );


        if (!response.ok) {

            throw new Error(
                'Failed to fetch featured'
            );

        }


        const items =
            await response.json();


        if (!items.length) {

            container.innerHTML = `

                <p class="menu-empty">
                    No featured items yet.
                </p>

            `;

            return;
        }


        container.innerHTML =
            items
                .map(item => {

                    return `

                        <div class="featured-card">

                            <div class="card-image">

                                ${item.image &&
                            (
                                item.image.startsWith(
                                    'data:image'
                                ) ||
                                item.image.startsWith(
                                    'http'
                                )
                            )
                            ?
                            `
                                        <img
                                            src="${item.image}"
                                            alt="${escapeHtml(item.name)}"
                                            style="width:100%;height:100%;object-fit:cover;"
                                        >
                                    `
                            :
                            (
                                item.image ||
                                '🍽️'
                            )
                        }

                            </div>


                            <div class="card-body">

                                <h4>
                                    ${escapeHtml(item.name)}
                                </h4>


                                <p>
                                    ${escapeHtml(
                            item.description ||
                            ''
                        )}
                                </p>


                                <div class="card-footer">

                                    <span class="price">
                                        ₹${formatMoney(
                            item.price
                        )}
                                    </span>


                                    ${item.popular
                            ?
                            `
                                            <span class="badge">
                                                Popular
                                            </span>
                                        `
                            :
                            ''
                        }


                                    ${item.chef_special
                            ?
                            `
                                            <span class="badge">
                                                Chef’s Special
                                            </span>
                                        `
                            :
                            ''
                        }

                                </div>

                            </div>

                        </div>

                    `;

                })
                .join('');


    } catch (error) {

        console.error(
            'Featured error:',
            error
        );


        container.innerHTML = `

            <p class="menu-empty">
                Could not load featured dishes.
            </p>

        `;

    }

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


    if (!container) {
        return;
    }


    // --------------------------------------------------------
    // Skeleton
    // --------------------------------------------------------

    container.innerHTML = `

        <div class="menu-skeleton">

            ${Array(4)
            .fill(0)
            .map(() => {

                return `

                        <div class="skeleton-card">

                            <div class="skeleton-img"></div>

                            <div class="skeleton-text">

                                <div class="line"></div>

                                <div class="line short"></div>

                                <div class="line short"></div>

                            </div>

                        </div>

                    `;

            })
            .join('')
        }

        </div>

    `;


    try {

        let url =
            `${API_BASE}/menu?`;


        if (
            category &&
            category !== 'all'
        ) {

            url +=
                `category=${encodeURIComponent(
                    category
                )}&`;

        }


        if (search) {

            url +=
                `search=${encodeURIComponent(
                    search
                )}&`;

        }


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                'Failed to fetch menu'
            );

        }


        const items =
            await response.json();


        allMenuItems =
            items;


        // ----------------------------------------------------
        // No Results
        // ----------------------------------------------------

        if (!items.length) {

            container.innerHTML = '';


            if (empty) {
                empty.style.display =
                    'block';
            }


            return;

        }


        if (empty) {
            empty.style.display =
                'none';
        }


        // ----------------------------------------------------
        // Render Menu
        // ----------------------------------------------------

        container.innerHTML =
            items
                .map(item => {

                    const vegIcon =
                        item.veg
                            ? '🟢'
                            : '🔴';


                    const availabilityClass =
                        item.available
                            ? 'available'
                            : 'unavailable';


                    const availabilityText =
                        item.available
                            ? 'Available'
                            : 'Unavailable';


                    const badges = [];


                    if (item.popular) {

                        badges.push(`

                            <span class="badge popular">
                                Popular
                            </span>

                        `);

                    }


                    if (item.chef_special) {

                        badges.push(`

                            <span class="badge chef">
                                Chef’s Special
                            </span>

                        `);

                    }


                    return `

                        <div class="menu-card">

                            <div class="card-image">

                                ${item.image &&
                            (
                                item.image.startsWith(
                                    'data:image'
                                ) ||
                                item.image.startsWith(
                                    'http'
                                )
                            )
                            ?
                            `
                                        <img
                                            src="${item.image}"
                                            alt="${escapeHtml(item.name)}"
                                            style="width:100%;height:100%;object-fit:cover;"
                                        >
                                    `
                            :
                            (
                                item.image ||
                                '🍽️'
                            )
                        }


                                <span class="veg-badge">
                                    ${vegIcon}
                                </span>


                                <div class="badge-group">
                                    ${badges.join('')}
                                </div>

                            </div>


                            <div class="card-body">

                                <h4>
                                    ${escapeHtml(item.name)}
                                </h4>


                                <div class="desc">
                                    ${escapeHtml(
                            item.description ||
                            ''
                        )}
                                </div>


                                <div class="card-footer">

                                    <span class="price">
                                        ₹${formatMoney(
                            item.price
                        )}
                                    </span>


                                    <span
                                        class="availability
                                        ${availabilityClass}"
                                    >
                                        ${availabilityText}
                                    </span>

                                </div>


                                <button
                                    type="button"
                                    class="add-to-cart-btn"
                                    onclick="addMenuItemToCart('${item.id}')"
                                    ${!item.available
                            ? 'disabled'
                            : ''
                        }
                                >
                                    🛒 Add to Cart
                                </button>

                            </div>

                        </div>

                    `;

                })
                .join('');


    } catch (error) {

        console.error(
            'Menu error:',
            error
        );


        container.innerHTML = `

            <p class="menu-empty">
                Something went wrong.
                Please try again.
            </p>

        `;


        if (empty) {

            empty.style.display =
                'none';

        }

    }

}


// ============================================================
// MENU FILTERS
// ============================================================

function setupMenuFilters() {

    const filterButtons =
        document.querySelectorAll(
            '.filter-btn'
        );


    const searchInput =
        document.getElementById(
            'menuSearch'
        );


    filterButtons.forEach(button => {

        button.addEventListener(
            'click',
            () => {

                filterButtons.forEach(
                    item => {

                        item.classList.remove(
                            'active'
                        );

                    }
                );


                button.classList.add(
                    'active'
                );


                currentCategory =
                    button.dataset.category;


                loadMenu(
                    currentCategory,
                    currentSearch
                );

            }
        );

    });


    if (searchInput) {

        let searchTimeout;


        searchInput.addEventListener(
            'input',
            event => {

                clearTimeout(
                    searchTimeout
                );


                searchTimeout =
                    setTimeout(() => {

                        currentSearch =
                            event.target.value.trim();


                        loadMenu(
                            currentCategory,
                            currentSearch
                        );

                    }, 300);

            }
        );

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


    const statsContainer =
        document.getElementById(
            'reviewsStats'
        );


    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/reviews`
            );


        if (!response.ok) {

            throw new Error(
                'Failed to fetch reviews'
            );

        }


        const reviews =
            await response.json();


        const total =
            reviews.length;


        let average =
            0;


        if (total > 0) {

            const sum =
                reviews.reduce(
                    (acc, review) =>
                        acc + Number(
                            review.rating
                        ),
                    0
                );


            average =
                (
                    sum /
                    total
                ).toFixed(1);

        }


        // ----------------------------------------------------
        // Review Statistics
        // ----------------------------------------------------

        if (statsContainer) {

            const ratingElement =
                statsContainer.querySelector(
                    '#avgRating'
                );


            const starsElement =
                statsContainer.querySelector(
                    '#avgStars'
                );


            const countElement =
                statsContainer.querySelector(
                    '#reviewCount'
                );


            if (ratingElement) {

                ratingElement.textContent =
                    average || '0.0';

            }


            if (starsElement) {

                const fullStars =
                    Math.round(
                        Number(average)
                    );


                starsElement.textContent =
                    '★'.repeat(
                        fullStars
                    ) +
                    '☆'.repeat(
                        5 - fullStars
                    );

            }


            if (countElement) {

                countElement.textContent =
                    `${total} review${total !== 1
                        ? 's'
                        : ''
                    }`;

            }

        }


        // ----------------------------------------------------
        // Empty Reviews
        // ----------------------------------------------------

        if (!reviews.length) {

            container.innerHTML = `

                <p class="menu-empty">
                    No reviews yet.
                    Be the first!
                </p>

            `;

            return;

        }


        // ----------------------------------------------------
        // Render Reviews
        // ----------------------------------------------------

        container.innerHTML =
            reviews
                .map(review => {

                    return `

                        <div class="review-card">

                            <div class="review-header">

                                <span class="review-name">
                                    ${escapeHtml(
                        review.name
                    )}
                                </span>


                                <span class="review-stars">

                                    ${'★'.repeat(
                        Number(
                            review.rating
                        )
                    )
                        }

                                    ${'☆'.repeat(
                            5 -
                            Number(
                                review.rating
                            )
                        )
                        }

                                </span>

                            </div>


                            <div class="review-comment">
                                ${escapeHtml(
                            review.comment
                        )}
                            </div>


                            <div class="review-date">

                                ${new Date(
                            review.created_at
                        )
                            .toLocaleDateString()
                        }

                            </div>

                        </div>

                    `;

                })
                .join('');


    } catch (error) {

        console.error(
            'Reviews error:',
            error
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


    if (!form) {
        return;
    }


    const stars =
        form.querySelectorAll(
            '.star-rating span'
        );


    const ratingInput =
        document.getElementById(
            'reviewRatingInput'
        );


    const messageElement =
        document.getElementById(
            'reviewMessage'
        );


    stars.forEach(star => {

        star.addEventListener(
            'click',
            () => {

                const value =
                    parseInt(
                        star.dataset.value
                    );


                ratingInput.value =
                    value;


                stars.forEach(item => {

                    item.classList.toggle(
                        'active',
                        parseInt(
                            item.dataset.value
                        ) <= value
                    );

                });

            }
        );


        star.addEventListener(
            'mouseenter',
            () => {

                const value =
                    parseInt(
                        star.dataset.value
                    );


                stars.forEach(item => {

                    item.style.color =
                        parseInt(
                            item.dataset.value
                        ) <= value
                            ? '#C99A52'
                            : '';

                });

            }
        );


        star.addEventListener(
            'mouseleave',
            () => {

                stars.forEach(item => {

                    item.style.color =
                        '';

                });

            }
        );

    });


    form.addEventListener(
        'submit',
        async event => {

            event.preventDefault();


            const name =
                document
                    .getElementById(
                        'reviewName'
                    )
                    .value
                    .trim();


            const rating =
                parseInt(
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

                showMessage(
                    messageElement,
                    'Please fill in all fields and select a rating.',
                    'error'
                );

                return;

            }


            const submitButton =
                document.getElementById(
                    'reviewSubmitBtn'
                );


            submitButton.disabled =
                true;


            submitButton.textContent =
                'Submitting...';


            try {

                const response =
                    await fetch(
                        `${API_BASE}/reviews`,
                        {

                            method: 'POST',

                            headers: {

                                'Content-Type':
                                    'application/json'

                            },

                            body:
                                JSON.stringify({

                                    name,

                                    rating,

                                    comment

                                })

                        }
                    );


                if (!response.ok) {

                    const errorData =
                        await response.json();


                    throw new Error(
                        errorData.detail ||
                        'Failed to submit'
                    );

                }


                showMessage(
                    messageElement,
                    '✅ Review submitted successfully!',
                    'success'
                );


                form.reset();


                stars.forEach(
                    star =>
                        star.classList.remove(
                            'active'
                        )
                );


                ratingInput.value =
                    0;


                loadReviews();


            } catch (error) {

                showMessage(
                    messageElement,
                    '❌ ' + error.message,
                    'error'
                );


            } finally {

                submitButton.disabled =
                    false;


                submitButton.textContent =
                    'Submit Review';

            }

        }
    );

}


// ============================================================
// SHOW MESSAGE
// ============================================================

function showMessage(
    element,
    text,
    type
) {

    if (!element) {
        return;
    }


    element.textContent =
        text;


    element.className =
        `form-message ${type}`;


    element.style.display =
        'block';


    setTimeout(() => {

        element.style.display =
            'none';

    }, 5000);

}


// ============================================================
// BOOKING
// ============================================================

function setupBookingForm() {

    const form =
        document.getElementById(
            'bookingForm'
        );


    const confirmation =
        document.getElementById(
            'bookingConfirmation'
        );


    const messageElement =
        document.getElementById(
            'bookingMessage'
        );


    if (!form) {
        return;
    }


    const dateInput =
        document.getElementById(
            'bookDate'
        );


    if (dateInput) {

        const today =
            new Date()
                .toISOString()
                .split('T')[0];


        dateInput.setAttribute(
            'min',
            today
        );

    }


    form.addEventListener(
        'submit',
        async event => {

            event.preventDefault();


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
                parseInt(
                    document
                        .getElementById(
                            'bookGuests'
                        )
                        .value
                );


            const date =
                document
                    .getElementById(
                        'bookDate'
                    )
                    .value;


            const time =
                document
                    .getElementById(
                        'bookTime'
                    )
                    .value;


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
                !date ||
                !time
            ) {

                showMessage(
                    messageElement,
                    'Please fill in all required fields.',
                    'error'
                );

                return;
            }


            const submitButton =
                document.getElementById(
                    'bookSubmitBtn'
                );


            submitButton.disabled =
                true;


            submitButton.textContent =
                'Booking...';


            try {

                const response =
                    await fetch(
                        `${API_BASE}/bookings`,
                        {

                            method: 'POST',

                            headers: {

                                'Content-Type':
                                    'application/json'

                            },

                            body:
                                JSON.stringify({

                                    name,

                                    phone,

                                    guests,

                                    date,

                                    time,

                                    notes

                                })

                        }
                    );


                if (!response.ok) {

                    const errorData =
                        await response.json();


                    throw new Error(
                        errorData.detail ||
                        'Booking failed'
                    );

                }


                const data =
                    await response.json();


                const confirmId =
                    document.getElementById(
                        'confirmId'
                    );


                const confirmName =
                    document.getElementById(
                        'confirmName'
                    );


                const confirmDate =
                    document.getElementById(
                        'confirmDate'
                    );


                const confirmTime =
                    document.getElementById(
                        'confirmTime'
                    );


                const confirmGuests =
                    document.getElementById(
                        'confirmGuests'
                    );


                const confirmStatus =
                    document.getElementById(
                        'confirmStatus'
                    );


                if (confirmId) {

                    confirmId.textContent =
                        '#' + data.id;

                }


                if (confirmName) {

                    confirmName.textContent =
                        data.name;

                }


                if (confirmDate) {

                    confirmDate.textContent =
                        data.date;

                }


                if (confirmTime) {

                    confirmTime.textContent =
                        data.time;

                }


                if (confirmGuests) {

                    confirmGuests.textContent =
                        data.guests;

                }


                if (confirmStatus) {

                    confirmStatus.textContent =
                        data.status;

                }


                form.style.display =
                    'none';


                if (confirmation) {

                    confirmation.style.display =
                        'block';

                }


                if (messageElement) {

                    messageElement.style.display =
                        'none';

                }


            } catch (error) {

                showMessage(
                    messageElement,
                    '❌ ' + error.message,
                    'error'
                );


            } finally {

                submitButton.disabled =
                    false;


                submitButton.textContent =
                    'Book Now';

            }

        }
    );


    const newBookingButton =
        document.getElementById(
            'bookingNewBtn'
        );


    if (newBookingButton) {

        newBookingButton.addEventListener(
            'click',
            () => {

                form.style.display =
                    'block';


                if (confirmation) {

                    confirmation.style.display =
                        'none';

                }


                form.reset();


                if (messageElement) {

                    messageElement.style.display =
                        'none';

                }

            }
        );

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


    if (!grid) {
        return;
    }


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


    let currentGalleryImages = [];
    let currentGalleryIndex = 0;


    // --------------------------------------------------------
    // Open Lightbox
    // --------------------------------------------------------

    function openLightbox(index) {

        if (
            !lightbox ||
            !lightboxImage ||
            !currentGalleryImages.length
        ) {
            return;
        }


        currentGalleryIndex =
            index;


        lightboxImage.src =
            currentGalleryImages[
            currentGalleryIndex
            ];


        lightbox.classList.add(
            'open'
        );

    }


    // --------------------------------------------------------
    // Close Lightbox
    // --------------------------------------------------------

    function closeLightbox() {

        if (!lightbox) {
            return;
        }


        lightbox.classList.remove(
            'open'
        );

    }


    // --------------------------------------------------------
    // Gallery Rendering
    // --------------------------------------------------------

    async function renderGallery(
        filter = 'all'
    ) {

        try {

            const response =
                await fetch(
                    `${API_BASE}/gallery`
                );


            if (!response.ok) {

                throw new Error(
                    'Failed to fetch gallery'
                );

            }


            const items =
                await response.json();


            const filtered =
                filter === 'all'
                    ? items
                    : items.filter(
                        item =>
                            item.category ===
                            filter
                    );


            if (!filtered.length) {

                currentGalleryImages = [];


                grid.innerHTML = `

                    <p class="menu-empty">

                        No images in this category.

                    </p>

                `;

                return;

            }


            currentGalleryImages =
                filtered.map(
                    item => item.image
                );


            grid.innerHTML =
                filtered
                    .map((item, index) => {

                        return `

                            <div
                                class="gallery-item"
                                data-index="${index}"
                            >

                                <img
                                    src="${item.image}"
                                    alt="${escapeHtml(
                            item.label ||
                            'Gallery'
                        )}"
                                    loading="lazy"
                                >

                                <div class="gallery-label">

                                    ${escapeHtml(
                            item.label ||
                            ''
                        )}

                                </div>

                            </div>

                        `;

                    })
                    .join('');


            grid
                .querySelectorAll(
                    '.gallery-item'
                )
                .forEach(item => {

                    item.addEventListener(
                        'click',
                        () => {

                            const index =
                                Number(
                                    item.dataset.index
                                );


                            openLightbox(
                                index
                            );

                        }
                    );

                });


        } catch (error) {

            console.error(
                'Gallery error:',
                error
            );


            grid.innerHTML = `

                <p class="menu-empty">

                    Could not load gallery.

                </p>

            `;

        }

    }


    // --------------------------------------------------------
    // Gallery Tabs
    // --------------------------------------------------------

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
                        .forEach(item => {

                            item.classList.remove(
                                'active'
                            );

                        });


                    tab.classList.add(
                        'active'
                    );


                    renderGallery(
                        tab.dataset.category
                    );

                }
            );

        });


    // --------------------------------------------------------
    // Lightbox Controls
    // --------------------------------------------------------

    if (lightboxClose) {

        lightboxClose.addEventListener(
            'click',
            closeLightbox
        );

    }


    if (lightbox) {

        lightbox.addEventListener(
            'click',
            event => {

                if (
                    event.target ===
                    lightbox
                ) {

                    closeLightbox();

                }

            }
        );

    }


    if (lightboxPrev) {

        lightboxPrev.addEventListener(
            'click',
            event => {

                event.stopPropagation();


                if (!currentGalleryImages.length) {
                    return;
                }


                currentGalleryIndex =
                    (
                        currentGalleryIndex -
                        1 +
                        currentGalleryImages.length
                    ) %
                    currentGalleryImages.length;


                if (lightboxImage) {

                    lightboxImage.src =
                        currentGalleryImages[
                        currentGalleryIndex
                        ];

                }

            }
        );

    }


    if (lightboxNext) {

        lightboxNext.addEventListener(
            'click',
            event => {

                event.stopPropagation();


                if (!currentGalleryImages.length) {
                    return;
                }


                currentGalleryIndex =
                    (
                        currentGalleryIndex +
                        1
                    ) %
                    currentGalleryImages.length;


                if (lightboxImage) {

                    lightboxImage.src =
                        currentGalleryImages[
                        currentGalleryIndex
                        ];

                }

            }
        );

    }


    // --------------------------------------------------------
    // Keyboard Lightbox
    // --------------------------------------------------------

    document.addEventListener(
        'keydown',
        event => {

            if (
                !lightbox ||
                !lightbox.classList.contains('open')
            ) {
                return;
            }


            if (event.key === 'Escape') {

                closeLightbox();

            }


            if (event.key === 'ArrowLeft' &&
                lightboxPrev) {

                lightboxPrev.click();

            }


            if (event.key === 'ArrowRight' &&
                lightboxNext) {

                lightboxNext.click();

            }

        }
    );


    renderGallery('all');

}


// ============================================================
// ABOUT IMAGE
// ============================================================

async function loadAboutImage() {

    const image =
        document.getElementById(
            'aboutImage'
        );


    if (!image) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/about-image`
            );


        if (!response.ok) {

            throw new Error(
                'Failed to fetch about image'
            );

        }


        const data =
            await response.json();


        if (data.image) {

            image.src =
                data.image;


            image.style.display =
                'block';

        } else {

            image.style.display =
                'none';

        }


    } catch (error) {

        console.error(
            'About image error:',
            error
        );


        image.style.display =
            'none';

    }

}


// ============================================================
// TOAST
// ============================================================

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
            document.createElement(
                'div'
            );


        container.className =
            'toast-container';


        document.body.appendChild(
            container
        );

    }


    const toast =
        document.createElement(
            'div'
        );


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


        setTimeout(() => {

            toast.remove();

        }, 400);

    }, 3000);

}


// ============================================================
// GLOBAL FUNCTIONS
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