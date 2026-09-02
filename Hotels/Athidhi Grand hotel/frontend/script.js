"use strict";

/* =========================================================
   Configuration
   ========================================================= */

// Same-origin Flask deployment:
//     /api
//
// When using Live Server / separate frontend locally:
//     http://localhost:5000/api
//
// You can override this before this script loads with:
//     window.API_BASE = "https://your-backend.example.com/api";

const API_BASE =
    window.API_BASE ||
    (
        ["5173", "5500", "3000"].includes(
            window.location.port
        )
            ? "http://localhost:5000/api"
            : "/api"
    );


let csrfToken = "";
let siteData = {};
let roomsData = [];
let galleryData = [];
let isAdminLoggedIn = false;


/* =========================================================
   Generic Helpers
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatPrice(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "₹0";
    }

    return `₹${number.toLocaleString("en-IN")}`;
}


function getTodayISO() {
    const now = new Date();

    const local = new Date(
        now.getTime() -
        now.getTimezoneOffset() * 60000
    );

    return local.toISOString().split("T")[0];
}


function showElement(element) {
    if (element) {
        element.style.display = "";
    }
}


function hideElement(element) {
    if (element) {
        element.style.display = "none";
    }
}


/* =========================================================
   API Client
   ========================================================= */

async function apiCall(endpoint, options = {}) {

    const method = (
        options.method ||
        "GET"
    ).toUpperCase();

    const fetchOptions = {
        ...options,
        method,
        credentials: "include",
        headers: {
            ...(options.headers || {})
        }
    };


    // Do not manually set Content-Type for FormData.
    if (
        options.body &&
        options.body instanceof FormData
    ) {
        delete fetchOptions.headers["Content-Type"];
        delete fetchOptions.headers["content-type"];

        if (
            csrfToken &&
            !["GET", "HEAD", "OPTIONS"].includes(method)
        ) {
            fetchOptions.headers["X-CSRF-TOKEN"] =
                csrfToken;
        }

        fetchOptions.body = options.body;

    } else {

        fetchOptions.headers["Content-Type"] =
            "application/json";

        if (
            csrfToken &&
            !["GET", "HEAD", "OPTIONS"].includes(method)
        ) {
            fetchOptions.headers["X-CSRF-TOKEN"] =
                csrfToken;
        }

        if (
            options.body !== undefined &&
            options.body !== null
        ) {
            fetchOptions.body =
                JSON.stringify(options.body);
        }
    }


    let response;

    try {
        response = await fetch(
            API_BASE + endpoint,
            fetchOptions
        );
    } catch (error) {
        throw new Error(
            "Unable to connect to the server."
        );
    }


    let data;

    try {
        data = await response.json();
    } catch {
        data = {
            success: false,
            message: "Server returned an invalid response."
        };
    }


    if (!response.ok) {

        if (
            response.status === 401 &&
            window.location.pathname === "/admin"
        ) {
            isAdminLoggedIn = false;
        }

        throw new Error(
            data.message ||
            `Request failed (${response.status})`
        );
    }


    return data;
}


/* =========================================================
   Mobile Navigation
   ========================================================= */

function setupMobileMenu() {

    const publicToggle =
        $("mobile-menu-toggle");

    const publicLinks =
        $("nav-links");

    if (
        publicToggle &&
        publicLinks
    ) {

        publicToggle.addEventListener(
            "click",
            () => {

                const open =
                    publicLinks.classList.toggle(
                        "mobile-open"
                    );

                publicToggle.setAttribute(
                    "aria-expanded",
                    String(open)
                );
            }
        );


        publicLinks
            .querySelectorAll("a")
            .forEach(link => {

                link.addEventListener(
                    "click",
                    () => {

                        publicLinks.classList.remove(
                            "mobile-open"
                        );

                        publicToggle.setAttribute(
                            "aria-expanded",
                            "false"
                        );
                    }
                );
            });
    }


    const adminToggle =
        $("admin-mobile-menu-toggle");

    const adminLinks =
        $("admin-nav-links");

    if (
        adminToggle &&
        adminLinks
    ) {

        adminToggle.addEventListener(
            "click",
            () => {

                const open =
                    adminLinks.classList.toggle(
                        "mobile-open"
                    );

                adminToggle.setAttribute(
                    "aria-expanded",
                    String(open)
                );
            }
        );


        adminLinks
            .querySelectorAll("a")
            .forEach(link => {

                link.addEventListener(
                    "click",
                    () => {

                        adminLinks.classList.remove(
                            "mobile-open"
                        );

                        adminToggle.setAttribute(
                            "aria-expanded",
                            "false"
                        );
                    }
                );
            });
    }
}


/* =========================================================
   Public Site
   ========================================================= */

async function loadSiteInfo() {

    try {

        const response =
            await apiCall("/site");

        siteData =
            response.data || {};

        applySiteInfo();

    } catch (error) {

        console.error(
            "Site info load failed:",
            error
        );
    }
}


function applySiteInfo() {

    const siteName =
        $("site-name");

    const tagline =
        $("site-tagline");

    const footerName =
        $("footer-name");

    const footerBottomName =
        $("footer-name-bottom");

    const year =
        $("year");

    const callNow =
        $("call-now");

    const footerPhone =
        $("footer-phone-link");

    const bookingCall =
        $("booking-call");

    const footerAddress =
        $("footer-address");

    const about =
        $("about-text");

    const amenitiesList =
        $("amenities-list");

    const contactInfo =
        $("contact-info");

    const mapContainer =
        $("map-container");


    if (siteName) {
        siteName.textContent =
            siteData.lodge_name ||
            "Athidhi Grand";
    }


    if (tagline) {
        tagline.textContent =
            siteData.tagline ||
            "Comfortable Stay in Kodad";
    }


    if (footerName) {
        footerName.textContent =
            siteData.lodge_name ||
            "Athidhi Grand";
    }


    if (footerBottomName) {
        footerBottomName.textContent =
            siteData.lodge_name ||
            "Athidhi Grand";
    }


    if (year) {
        year.textContent =
            new Date().getFullYear();
    }


    const phone =
        String(
            siteData.phone ||
            "08985705777"
        ).trim();


    if (callNow) {
        callNow.href =
            `tel:${phone}`;
    }


    if (footerPhone) {
        footerPhone.textContent =
            phone;

        footerPhone.href =
            `tel:${phone}`;
    }


    if (bookingCall) {
        bookingCall.href =
            `tel:${phone}`;

        bookingCall.textContent =
            `📞 Call Now — ${phone}`;
    }


    if (footerAddress) {
        footerAddress.textContent =
            siteData.address ||
            "Kodad, Telangana";
    }


    if (about) {

        about.textContent =
            siteData.about_text ||
            "Athidhi Grand provides comfortable accommodation in Kodad.";
    }


    if (amenitiesList) {

        const amenities =
            Array.isArray(
                siteData.amenities
            )
                ? siteData.amenities
                : [];


        amenitiesList.innerHTML = "";


        if (amenities.length === 0) {

            const empty =
                document.createElement("p");

            empty.textContent =
                "Amenities information will be updated soon.";

            amenitiesList.appendChild(
                empty
            );

        } else {

            amenities.forEach(amenity => {

                const span =
                    document.createElement("span");

                span.textContent =
                    `✓ ${amenity}`;

                amenitiesList.appendChild(
                    span
                );
            });
        }
    }


    if (mapContainer) {

        mapContainer.innerHTML = "";

        const mapURL =
            String(
                siteData.map_embed_url || ""
            ).trim();


        if (mapURL) {

            const iframe =
                document.createElement("iframe");

            iframe.src =
                mapURL;

            iframe.width =
                "100%";

            iframe.height =
                "350";

            iframe.style.border =
                "0";

            iframe.allowFullscreen =
                true;

            iframe.loading =
                "lazy";

            iframe.referrerPolicy =
                "no-referrer-when-downgrade";

            mapContainer.appendChild(
                iframe
            );
        }
    }


    const hero =
        document.querySelector(
            ".hero-section"
        );

    if (hero) {

        const heroURL =
            String(
                siteData.hero_image_url ||
                "/hero.jpg"
            ).trim();

        hero.style.backgroundImage =
            `url("${heroURL.replaceAll(
                '"',
                "%22"
            )}")`;
    }


    if (contactInfo) {

        contactInfo.innerHTML = "";


        const items = [
            [
                "Address",
                siteData.address ||
                "Town Center Plaza, Kodad"
            ],
            [
                "Phone",
                siteData.phone ||
                "08985705777"
            ],
            [
                "Email",
                siteData.email ||
                ""
            ]
        ];


        items.forEach(
            ([label, value]) => {

                const row =
                    document.createElement("p");

                const strong =
                    document.createElement("strong");

                strong.textContent =
                    `${label}: `;

                row.appendChild(
                    strong
                );


                if (
                    label === "Phone" &&
                    value
                ) {

                    const link =
                        document.createElement("a");

                    link.href =
                        `tel:${value}`;

                    link.textContent =
                        value;

                    row.appendChild(
                        link
                    );

                } else if (
                    label === "Email" &&
                    value
                ) {

                    const link =
                        document.createElement("a");

                    link.href =
                        `mailto:${value}`;

                    link.textContent =
                        value;

                    row.appendChild(
                        link
                    );

                } else {

                    row.appendChild(
                        document.createTextNode(
                            value
                        )
                    );
                }


                contactInfo.appendChild(
                    row
                );
            }
        );
    }
}


/* =========================================================
   Rooms
   ========================================================= */

async function loadRooms() {

    try {

        const response =
            await apiCall("/rooms");

        roomsData =
            Array.isArray(
                response.data
            )
                ? response.data
                : [];


        renderRooms();
        populateRoomSelect();

    } catch (error) {

        console.error(
            "Rooms load failed:",
            error
        );

        const container =
            $("room-list");

        if (container) {
            container.innerHTML =
                `<p class="error-msg">
                    Unable to load rooms.
                 </p>`;
        }
    }
}


function getRoomImage(room) {

    if (
        room &&
        Array.isArray(room.images) &&
        room.images.length > 0
    ) {

        const image =
            room.images[0];

        if (
            typeof image === "object" &&
            image.url
        ) {
            return image.url;
        }

        if (
            typeof image === "string"
        ) {
            return image;
        }
    }

    return "/placeholder.jpg";
}


function renderRooms() {

    const container =
        $("room-list");

    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (roomsData.length === 0) {

        const empty =
            document.createElement("p");

        empty.className =
            "empty-state";

        empty.textContent =
            "No rooms are currently listed.";

        container.appendChild(
            empty
        );

        return;
    }


    roomsData.forEach(room => {

        const card =
            document.createElement("article");

        card.className =
            "room-card";


        const image =
            document.createElement("img");

        image.src =
            getRoomImage(room);

        image.alt =
            room.name ||
            "Room";

        image.loading =
            "lazy";


        const info =
            document.createElement("div");

        info.className =
            "info";


        const title =
            document.createElement("h3");

        title.textContent =
            room.name ||
            "Room";


        const price =
            document.createElement("div");

        price.className =
            "price";

        price.textContent =
            `${formatPrice(
                room.price_per_night
            )} / night`;


        const description =
            document.createElement("p");

        description.className =
            "room-description";

        description.textContent =
            room.description ||
            "Comfortable accommodation.";


        const amenities =
            document.createElement("div");

        amenities.className =
            "amenities";

        amenities.textContent =
            Array.isArray(room.amenities)
                ? room.amenities.join(" • ")
                : "";


        const button =
            document.createElement("button");

        button.type =
            "button";

        button.className =
            "btn btn-dark room-detail-button";

        button.textContent =
            "View Room";


        button.addEventListener(
            "click",
            () => showRoomDetail(room)
        );


        info.appendChild(title);
        info.appendChild(price);
        info.appendChild(description);
        info.appendChild(amenities);
        info.appendChild(button);


        card.appendChild(image);
        card.appendChild(info);


        container.appendChild(card);
    });
}


function showRoomDetail(room) {

    const details = [
        `Room: ${room.name || "Room"}`,
        `Description: ${room.description || "N/A"}`,
        `Price: ${formatPrice(room.price_per_night)} / night`,
        `Amenities: ${Array.isArray(room.amenities)
            ? room.amenities.join(", ")
            : "N/A"
        }`,
        `Available: ${room.is_available
            ? "Yes"
            : "No"
        }`
    ];


    window.alert(
        details.join("\n")
    );
}


function populateRoomSelect() {

    const select =
        $("preferred-room");

    if (!select) {
        return;
    }


    select.innerHTML =
        `<option value="">
            Any Available Room
         </option>`;


    roomsData
        .filter(room => room.is_available !== false)
        .forEach(room => {

            const option =
                document.createElement("option");

            option.value =
                room.id;

            option.textContent =
                `${room.name} — ${formatPrice(
                    room.price_per_night
                )
                }/night`;

            select.appendChild(
                option
            );
        });
}


/* =========================================================
   Gallery
   ========================================================= */

async function loadGallery() {

    try {

        const response =
            await apiCall("/gallery");

        galleryData =
            Array.isArray(
                response.data
            )
                ? response.data
                : [];


        renderGallery();

    } catch (error) {

        console.error(
            "Gallery load failed:",
            error
        );
    }
}


function getGalleryImage(item) {

    if (
        item &&
        item.image &&
        typeof item.image === "object"
    ) {
        return item.image.url ||
            "/placeholder.jpg";
    }

    if (
        item &&
        typeof item.image === "string"
    ) {
        return item.image;
    }

    return "/placeholder.jpg";
}


function renderGallery() {

    const container =
        $("gallery-grid");

    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (galleryData.length === 0) {

        const empty =
            document.createElement("p");

        empty.className =
            "empty-state";

        empty.textContent =
            "Gallery images will be added soon.";

        container.appendChild(
            empty
        );

        return;
    }


    galleryData.forEach(item => {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "gallery-item";


        const image =
            document.createElement("img");

        image.src =
            getGalleryImage(item);

        image.alt =
            item.title ||
            "Athidhi Grand";

        image.loading =
            "lazy";


        wrapper.appendChild(
            image
        );

        container.appendChild(
            wrapper
        );
    });
}


/* =========================================================
   Booking
   ========================================================= */

function setupBookingForm() {

    const form =
        $("booking-form");

    if (!form) {
        return;
    }


    const checkIn =
        $("check-in");

    const checkOut =
        $("check-out");


    const today =
        getTodayISO();


    if (checkIn) {
        checkIn.min =
            today;

        if (!checkIn.value) {
            checkIn.value =
                today;
        }
    }


    if (checkOut) {

        const tomorrowDate =
            new Date();

        tomorrowDate.setDate(
            tomorrowDate.getDate() + 1
        );


        const tomorrow =
            new Date(
                tomorrowDate.getTime() -
                tomorrowDate.getTimezoneOffset() *
                60000
            )
                .toISOString()
                .split("T")[0];


        checkOut.min =
            tomorrow;

        if (!checkOut.value) {
            checkOut.value =
                tomorrow;
        }
    }


    if (checkIn && checkOut) {

        checkIn.addEventListener(
            "change",
            () => {

                if (
                    !checkIn.value
                ) {
                    return;
                }


                const selected =
                    new Date(
                        `${checkIn.value}T00:00:00`
                    );

                selected.setDate(
                    selected.getDate() + 1
                );


                const minimumCheckout =
                    new Date(
                        selected.getTime() -
                        selected.getTimezoneOffset() *
                        60000
                    )
                        .toISOString()
                        .split("T")[0];


                checkOut.min =
                    minimumCheckout;


                if (
                    !checkOut.value ||
                    checkOut.value <= checkIn.value
                ) {
                    checkOut.value =
                        minimumCheckout;
                }
            }
        );
    }


    form.addEventListener(
        "submit",
        handleBookingSubmit
    );
}


async function handleBookingSubmit(event) {

    event.preventDefault();


    const errorElement =
        $("booking-error");

    const submitButton =
        $("booking-submit");


    const data = {
        guestName:
            $("guest-name")?.value.trim() || "",

        phone:
            $("guest-phone")?.value
                .trim()
                .replace(/\s+/g, "") || "",

        checkIn:
            $("check-in")?.value || "",

        checkOut:
            $("check-out")?.value || "",

        guests:
            Number.parseInt(
                $("guests")?.value || "1",
                10
            ),

        rooms:
            Number.parseInt(
                $("rooms")?.value || "1",
                10
            ),

        preferredRoom:
            $("preferred-room")?.value || null,

        specialRequest:
            $("special-request")?.value.trim() || ""
    };


    if (errorElement) {
        errorElement.textContent =
            "";
    }


    if (
        !/^[6-9]\d{9}$/.test(
            data.phone
        )
    ) {

        if (errorElement) {
            errorElement.textContent =
                "Enter a valid 10-digit Indian mobile number.";
        }

        return;
    }


    if (
        data.guests < 1 ||
        data.guests > 100
    ) {

        if (errorElement) {
            errorElement.textContent =
                "Guests must be between 1 and 100.";
        }

        return;
    }


    if (
        data.rooms < 1 ||
        data.rooms > 100
    ) {

        if (errorElement) {
            errorElement.textContent =
                "Rooms must be between 1 and 100.";
        }

        return;
    }


    if (submitButton) {
        submitButton.disabled =
            true;

        submitButton.textContent =
            "Submitting...";
    }


    try {

        const response =
            await apiCall(
                "/bookings",
                {
                    method: "POST",
                    body: data
                }
            );


        showBookingSuccess(
            response.data
        );


        const form =
            $("booking-form");

        if (form) {
            form.style.display =
                "none";
        }

    } catch (error) {

        if (errorElement) {
            errorElement.textContent =
                error.message ||
                "Booking submission failed.";
        }

    } finally {

        if (submitButton) {
            submitButton.disabled =
                false;

            submitButton.textContent =
                "Submit Booking Request";
        }
    }
}


function showBookingSuccess(booking) {

    const successDiv =
        $("booking-success");

    if (!successDiv) {
        return;
    }


    showElement(
        successDiv
    );


    const reference =
        $("booking-ref");

    if (reference) {
        reference.textContent =
            `Booking Reference: ${booking.bookingReference
            }`;
    }


    const details =
        $("booking-details");

    if (details) {

        details.innerHTML = "";


        const fields = [
            [
                "Name",
                booking.guestName
            ],
            [
                "Phone",
                booking.phone
            ],
            [
                "Check-in",
                booking.checkIn
            ],
            [
                "Check-out",
                booking.checkOut
            ],
            [
                "Guests",
                booking.guests
            ],
            [
                "Rooms",
                booking.rooms
            ],
            [
                "Preferred Room",
                booking.preferredRoom?.name ||
                "Any"
            ]
        ];


        fields.forEach(
            ([label, value]) => {

                const p =
                    document.createElement("p");

                const strong =
                    document.createElement("strong");

                strong.textContent =
                    `${label}: `;

                p.appendChild(
                    strong
                );

                p.appendChild(
                    document.createTextNode(
                        String(value)
                    )
                );

                details.appendChild(
                    p
                );
            }
        );


        if (
            booking.specialRequest
        ) {

            const p =
                document.createElement("p");

            const strong =
                document.createElement("strong");

            strong.textContent =
                "Special Request: ";

            p.appendChild(
                strong
            );

            p.appendChild(
                document.createTextNode(
                    booking.specialRequest
                )
            );

            details.appendChild(
                p
            );
        }
    }


    const bookingCall =
        $("booking-call");

    if (bookingCall) {

        const phone =
            siteData.phone ||
            "08985705777";

        bookingCall.href =
            `tel:${phone}`;

        bookingCall.textContent =
            `📞 Call Now — ${phone}`;
    }


    successDiv.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================================================
   Admin Authentication
   ========================================================= */

async function checkAdminAuth() {

    try {

        const response =
            await apiCall(
                "/admin/check"
            );


        csrfToken =
            response.csrfToken ||
            "";


        isAdminLoggedIn =
            true;


        showAdminView(
            "dashboard"
        );

    } catch {

        isAdminLoggedIn =
            false;

        csrfToken =
            "";

        showAdminView(
            "login"
        );
    }
}


function showAdminView(view) {

    const views = [
        "login",
        "dashboard",
        "rooms",
        "gallery",
        "bookings",
        "site"
    ];


    views.forEach(name => {

        const element =
            $(
                `admin-${name}-view`
            );

        if (element) {
            element.style.display =
                name === view
                    ? "block"
                    : "none";
        }
    });


    const nav =
        $("admin-nav");

    if (nav) {

        nav.style.display =
            view === "login"
                ? "none"
                : "block";
    }


    if (
        view !== "login" &&
        !isAdminLoggedIn
    ) {
        showAdminView(
            "login"
        );

        return;
    }


    if (view === "rooms") {
        loadAdminRooms();
    }

    if (view === "gallery") {
        loadAdminGallery();
    }

    if (view === "bookings") {
        loadAdminBookings();
    }

    if (view === "site") {
        loadAdminSite();
    }
}


function setupAdminAuth() {

    const loginForm =
        $("admin-login-form");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleAdminLogin
        );
    }


    const logoutButton =
        $("admin-logout");

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            handleAdminLogout
        );
    }
}


async function handleAdminLogin(event) {

    event.preventDefault();


    const username =
        $("login-username")?.value
            .trim() || "";

    const password =
        $("login-password")?.value || "";


    const errorElement =
        $("login-error");

    const submitButton =
        $("admin-login-submit");


    if (errorElement) {
        errorElement.textContent =
            "";
    }


    if (submitButton) {
        submitButton.disabled =
            true;

        submitButton.textContent =
            "Signing in...";
    }


    try {

        const response =
            await apiCall(
                "/admin/login",
                {
                    method: "POST",
                    body: {
                        username,
                        password
                    }
                }
            );


        csrfToken =
            response.csrfToken ||
            "";


        isAdminLoggedIn =
            true;


        showAdminView(
            "dashboard"
        );


    } catch (error) {

        if (errorElement) {
            errorElement.textContent =
                error.message ||
                "Login failed.";
        }

    } finally {

        if (submitButton) {
            submitButton.disabled =
                false;

            submitButton.textContent =
                "Login";
        }
    }
}


async function handleAdminLogout(event) {

    event.preventDefault();


    try {

        await apiCall(
            "/admin/logout",
            {
                method: "POST"
            }
        );

    } catch (error) {

        console.error(
            "Logout failed:",
            error
        );
    }


    csrfToken =
        "";

    isAdminLoggedIn =
        false;

    showAdminView(
        "login"
    );
}


/* =========================================================
   Admin Navigation
   ========================================================= */

function setupAdminNavigation() {

    document
        .querySelectorAll(
            "[data-view]"
        )
        .forEach(element => {

            element.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const view =
                        element.dataset.view;

                    if (
                        view &&
                        isAdminLoggedIn
                    ) {

                        showAdminView(
                            view
                        );
                    }
                }
            );
        });
}


/* =========================================================
   Admin Rooms
   ========================================================= */

async function loadAdminRooms() {

    try {

        const response =
            await apiCall(
                "/rooms"
            );

        roomsData =
            Array.isArray(
                response.data
            )
                ? response.data
                : [];


        renderAdminRooms();

    } catch (error) {

        console.error(
            "Admin rooms load failed:",
            error
        );
    }
}


function renderAdminRooms() {

    const container =
        $("room-list-admin");

    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (roomsData.length === 0) {

        const empty =
            document.createElement("p");

        empty.className =
            "empty-state";

        empty.textContent =
            "No rooms created yet.";

        container.appendChild(
            empty
        );

        return;
    }


    roomsData.forEach(room => {

        const card =
            document.createElement("article");

        card.className =
            "room-card admin-room-card";


        const image =
            document.createElement("img");

        image.src =
            getRoomImage(room);

        image.alt =
            room.name ||
            "Room";

        image.loading =
            "lazy";


        const info =
            document.createElement("div");

        info.className =
            "info";


        const title =
            document.createElement("h3");

        title.textContent =
            room.name;


        const price =
            document.createElement("div");

        price.className =
            "price";

        price.textContent =
            `${formatPrice(
                room.price_per_night
            )} / night`;


        const description =
            document.createElement("p");

        description.className =
            "room-description";

        description.textContent =
            room.description;


        const amenities =
            document.createElement("div");

        amenities.className =
            "amenities";

        amenities.textContent =
            Array.isArray(
                room.amenities
            )
                ? room.amenities.join(" • ")
                : "";


        const status =
            document.createElement("p");

        status.className =
            "room-status";

        status.textContent =
            room.is_available
                ? `✓ Available • ${room.total_units} unit(s)`
                : "✕ Not Available";


        const actions =
            document.createElement("div");

        actions.className =
            "admin-actions";


        const editButton =
            document.createElement("button");

        editButton.type =
            "button";

        editButton.className =
            "btn btn-secondary";

        editButton.textContent =
            "Edit";

        editButton.addEventListener(
            "click",
            () => editRoom(room.id)
        );


        const deleteButton =
            document.createElement("button");

        deleteButton.type =
            "button";

        deleteButton.className =
            "btn btn-danger";

        deleteButton.textContent =
            "Delete";

        deleteButton.addEventListener(
            "click",
            () => deleteRoom(room.id)
        );


        actions.appendChild(
            editButton
        );

        actions.appendChild(
            deleteButton
        );


        const uploadLabel =
            document.createElement("label");

        uploadLabel.className =
            "upload-label";

        uploadLabel.textContent =
            "Add room image";


        const uploadInput =
            document.createElement("input");

        uploadInput.type =
            "file";

        uploadInput.accept =
            ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

        uploadInput.addEventListener(
            "change",
            () => uploadRoomImage(
                room.id,
                uploadInput
            )
        );


        uploadLabel.appendChild(
            uploadInput
        );


        const imageList =
            document.createElement("div");

        imageList.className =
            "admin-room-images";


        if (
            Array.isArray(room.images)
        ) {

            room.images.forEach(
                (img, index) => {

                    const wrapper =
                        document.createElement("div");

                    wrapper.className =
                        "admin-room-image";


                    const thumb =
                        document.createElement("img");

                    thumb.src =
                        typeof img === "object"
                            ? img.url
                            : img;

                    thumb.alt =
                        `${room.name} image ${index + 1}`;


                    const removeButton =
                        document.createElement("button");

                    removeButton.type =
                        "button";

                    removeButton.className =
                        "image-delete-button";

                    removeButton.textContent =
                        "×";

                    removeButton.title =
                        "Delete image";

                    removeButton.addEventListener(
                        "click",
                        () =>
                            deleteRoomImage(
                                room.id,
                                index
                            )
                    );


                    wrapper.appendChild(
                        thumb
                    );

                    wrapper.appendChild(
                        removeButton
                    );

                    imageList.appendChild(
                        wrapper
                    );
                }
            );
        }


        info.appendChild(
            title
        );

        info.appendChild(
            price
        );

        info.appendChild(
            description
        );

        info.appendChild(
            amenities
        );

        info.appendChild(
            status
        );

        info.appendChild(
            actions
        );

        info.appendChild(
            uploadLabel
        );

        info.appendChild(
            imageList
        );


        card.appendChild(
            image
        );

        card.appendChild(
            info
        );


        container.appendChild(
            card
        );
    });
}


function setupRoomForm() {

    const form =
        $("room-form");

    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const errorElement =
                $("room-error");

            if (errorElement) {
                errorElement.textContent =
                    "";
            }


            const editId =
                $("room-edit-id")?.value || "";


            const price =
                Number(
                    $("room-price")?.value
                );


            if (
                !Number.isFinite(price) ||
                price < 0
            ) {

                if (errorElement) {
                    errorElement.textContent =
                        "Enter a valid price.";
                }

                return;
            }


            const data = {
                name:
                    $("room-name")?.value
                        .trim() || "",

                description:
                    $("room-desc")?.value
                        .trim() || "",

                pricePerNight:
                    price,

                totalUnits:
                    Number.parseInt(
                        $("room-units")?.value ||
                        "1",
                        10
                    ),

                amenities:
                    $("room-amenities")?.value
                        .split(",")
                        .map(value =>
                            value.trim()
                        )
                        .filter(Boolean) || [],

                isAvailable:
                    $("room-available")?.checked ||
                    false
            };


            try {

                if (editId) {

                    await apiCall(
                        `/rooms/${editId}`,
                        {
                            method: "PUT",
                            body: data
                        }
                    );

                } else {

                    await apiCall(
                        "/rooms",
                        {
                            method: "POST",
                            body: data
                        }
                    );
                }


                resetRoomForm();

                await loadAdminRooms();

            } catch (error) {

                if (errorElement) {
                    errorElement.textContent =
                        error.message;
                }
            }
        }
    );
}


function resetRoomForm() {

    const form =
        $("room-form");

    if (form) {
        form.reset();
    }


    const editId =
        $("room-edit-id");

    if (editId) {
        editId.value =
            "";
    }


    const title =
        $("room-form-title");

    if (title) {
        title.textContent =
            "Add Room";
    }


    const submit =
        $("room-submit");

    if (submit) {
        submit.textContent =
            "Create Room";
    }


    const cancel =
        $("room-cancel");

    if (cancel) {
        cancel.style.display =
            "none";
    }


    const available =
        $("room-available");

    if (available) {
        available.checked =
            true;
    }
}


function setupRoomCancel() {

    const cancel =
        $("room-cancel");

    if (cancel) {

        cancel.addEventListener(
            "click",
            resetRoomForm
        );
    }
}


function editRoom(id) {

    const room =
        roomsData.find(
            value => value.id === id
        );

    if (!room) {
        return;
    }


    $("room-edit-id").value =
        room.id;

    $("room-name").value =
        room.name || "";

    $("room-desc").value =
        room.description || "";

    $("room-price").value =
        room.price_per_night ?? "";

    $("room-units").value =
        room.total_units || 1;

    $("room-amenities").value =
        Array.isArray(
            room.amenities
        )
            ? room.amenities.join(", ")
            : "";

    $("room-available").checked =
        room.is_available !== false;

    $("room-form-title").textContent =
        "Edit Room";

    $("room-submit").textContent =
        "Update Room";

    $("room-cancel").style.display =
        "inline-block";


    $("room-form").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


async function deleteRoom(id) {

    if (
        !window.confirm(
            "Delete this room and all its stored images?"
        )
    ) {
        return;
    }


    try {

        await apiCall(
            `/rooms/${id}`,
            {
                method: "DELETE"
            }
        );


        await loadAdminRooms();

    } catch (error) {

        window.alert(
            error.message
        );
    }
}


async function uploadRoomImage(
    roomId,
    input
) {

    if (
        !input ||
        !input.files ||
        !input.files[0]
    ) {
        return;
    }


    const file =
        input.files[0];


    if (
        file.size > 5 * 1024 * 1024
    ) {

        window.alert(
            "Image must be 5MB or smaller."
        );

        input.value =
            "";

        return;
    }


    const formData =
        new FormData();

    formData.append(
        "image",
        file
    );


    try {

        await apiCall(
            `/rooms/${roomId}/images`,
            {
                method: "POST",
                body: formData
            }
        );


        await loadAdminRooms();

    } catch (error) {

        window.alert(
            error.message
        );

    } finally {

        input.value =
            "";
    }
}


async function deleteRoomImage(
    roomId,
    index
) {

    if (
        !window.confirm(
            "Delete this room image?"
        )
    ) {
        return;
    }


    try {

        await apiCall(
            `/rooms/${roomId}/images/${index}`,
            {
                method: "DELETE"
            }
        );


        await loadAdminRooms();

    } catch (error) {

        window.alert(
            error.message
        );
    }
}


/* =========================================================
   Admin Gallery
   ========================================================= */

async function loadAdminGallery() {

    try {

        const response =
            await apiCall(
                "/gallery"
            );

        galleryData =
            Array.isArray(
                response.data
            )
                ? response.data
                : [];


        renderAdminGallery();

    } catch (error) {

        console.error(
            "Admin gallery load failed:",
            error
        );
    }
}


function renderAdminGallery() {

    const container =
        $("gallery-list-admin");

    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (galleryData.length === 0) {

        const empty =
            document.createElement("p");

        empty.className =
            "empty-state";

        empty.textContent =
            "No gallery images yet.";

        container.appendChild(
            empty
        );

        return;
    }


    galleryData.forEach(item => {

        const card =
            document.createElement("div");

        card.className =
            "admin-gallery-item";


        const image =
            document.createElement("img");

        image.src =
            getGalleryImage(item);

        image.alt =
            item.title ||
            "Gallery image";

        image.loading =
            "lazy";


        const content =
            document.createElement("div");

        content.className =
            "admin-gallery-content";


        const title =
            document.createElement("h4");

        title.textContent =
            item.title ||
            "Untitled";


        const category =
            document.createElement("small");

        category.textContent =
            item.category ||
            "property";


        const deleteButton =
            document.createElement("button");

        deleteButton.type =
            "button";

        deleteButton.className =
            "btn btn-danger";

        deleteButton.textContent =
            "Delete";

        deleteButton.addEventListener(
            "click",
            () =>
                deleteGallery(
                    item.id
                )
        );


        content.appendChild(
            title
        );

        content.appendChild(
            category
        );

        content.appendChild(
            deleteButton
        );


        card.appendChild(
            image
        );

        card.appendChild(
            content
        );


        container.appendChild(
            card
        );
    });
}


function setupGalleryForm() {

    const form =
        $("gallery-form");

    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const errorElement =
                $("gallery-error");


            if (errorElement) {
                errorElement.textContent =
                    "";
            }


            const fileInput =
                $("gallery-image");


            if (
                !fileInput ||
                !fileInput.files ||
                !fileInput.files[0]
            ) {

                if (errorElement) {
                    errorElement.textContent =
                        "Please select an image.";
                }

                return;
            }


            const file =
                fileInput.files[0];


            if (
                file.size >
                5 * 1024 * 1024
            ) {

                if (errorElement) {
                    errorElement.textContent =
                        "Image must be 5MB or smaller.";
                }

                return;
            }


            const formData =
                new FormData();

            formData.append(
                "image",
                file
            );

            formData.append(
                "title",
                $("gallery-title")
                    ?.value
                    .trim() || ""
            );

            formData.append(
                "category",
                $("gallery-category")
                    ?.value || "property"
            );


            try {

                await apiCall(
                    "/gallery",
                    {
                        method: "POST",
                        body: formData
                    }
                );


                form.reset();

                await loadAdminGallery();

            } catch (error) {

                if (errorElement) {
                    errorElement.textContent =
                        error.message;
                }
            }
        }
    );
}


async function deleteGallery(id) {

    if (
        !window.confirm(
            "Delete this gallery image?"
        )
    ) {
        return;
    }


    try {

        await apiCall(
            `/gallery/${id}`,
            {
                method: "DELETE"
            }
        );


        await loadAdminGallery();

    } catch (error) {

        window.alert(
            error.message
        );
    }
}


/* =========================================================
   Admin Bookings
   ========================================================= */

async function loadAdminBookings() {

    const container =
        $("booking-list-admin");

    if (!container) {
        return;
    }


    container.innerHTML =
        `<div class="loading-state">
            Loading bookings...
         </div>`;


    try {

        const response =
            await apiCall(
                "/bookings"
            );


        renderAdminBookings(
            Array.isArray(
                response.data
            )
                ? response.data
                : []
        );

    } catch (error) {

        container.innerHTML =
            `<div class="error-msg">
                ${escapeHTML(
                error.message ||
                "Unable to load bookings."
            )}
             </div>`;
    }
}


function getStatusClass(status) {

    switch (status) {

        case "Confirmed":
            return "status-confirmed";

        case "Cancelled":
            return "status-cancelled";

        case "Contacted":
            return "status-contacted";

        default:
            return "status-new";
    }
}


function renderAdminBookings(
    bookings
) {

    const container =
        $("booking-list-admin");

    if (!container) {
        return;
    }


    if (bookings.length === 0) {

        container.innerHTML =
            `<div class="empty-state">
                No booking requests yet.
             </div>`;

        return;
    }


    const wrapper =
        document.createElement("div");

    wrapper.className =
        "booking-table-wrapper";


    const table =
        document.createElement("table");

    table.className =
        "booking-table";


    table.innerHTML = `
        <thead>
            <tr>
                <th>Reference</th>
                <th>Guest</th>
                <th>Phone</th>
                <th>Dates</th>
                <th>Guests</th>
                <th>Rooms</th>
                <th>Preferred Room</th>
                <th>Status</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;


    const tbody =
        table.querySelector(
            "tbody"
        );


    bookings.forEach(booking => {

        const row =
            document.createElement("tr");


        row.innerHTML = `
            <td>
                <strong>
                    ${escapeHTML(
            booking.bookingReference
        )}
                </strong>
            </td>

            <td>
                ${escapeHTML(
            booking.guestName
        )}
            </td>

            <td>
                <a href="tel:${escapeHTML(
            booking.phone
        )}">
                    ${escapeHTML(
            booking.phone
        )}
                </a>
            </td>

            <td>
                ${escapeHTML(
            booking.checkIn
        )}
                →
                ${escapeHTML(
            booking.checkOut
        )}
            </td>

            <td>
                ${escapeHTML(
            booking.guests
        )}
            </td>

            <td>
                ${escapeHTML(
            booking.rooms
        )}
            </td>

            <td>
                ${escapeHTML(
            booking.preferredRoom?.name ||
            "Any"
        )}
            </td>

            <td>
                <span class="status-badge ${getStatusClass(
            booking.status
        )
            }">
                    ${escapeHTML(
                booking.status
            )}
                </span>
            </td>

            <td>
                <select
                    class="booking-status-select"
                    data-id="${Number(
                booking.id
            )}"
                >
                    <option value="New">
                        New
                    </option>

                    <option value="Contacted">
                        Contacted
                    </option>

                    <option value="Confirmed">
                        Confirmed
                    </option>

                    <option value="Cancelled">
                        Cancelled
                    </option>
                </select>
            </td>
        `;


        const select =
            row.querySelector(
                "select"
            );


        select.value =
            booking.status;


        select.addEventListener(
            "change",
            () =>
                updateBookingStatus(
                    booking.id,
                    select.value
                )
        );


        tbody.appendChild(
            row
        );
    });


    wrapper.appendChild(
        table
    );


    container.innerHTML =
        "";

    container.appendChild(
        wrapper
    );
}


async function updateBookingStatus(
    id,
    status
) {

    try {

        await apiCall(
            `/bookings/${id}`,
            {
                method: "PUT",
                body: {
                    status
                }
            }
        );


        await loadAdminBookings();

    } catch (error) {

        window.alert(
            error.message
        );

        await loadAdminBookings();
    }
}


/* =========================================================
   Admin Site Manager
   ========================================================= */

async function loadAdminSite() {

    try {

        const response =
            await apiCall(
                "/site"
            );

        const data =
            response.data || {};


        if ($("site-name")) {
            $("site-name").value =
                data.lodge_name || "";
        }


        if ($("site-tagline")) {
            $("site-tagline").value =
                data.tagline || "";
        }


        if ($("site-about")) {
            $("site-about").value =
                data.about_text || "";
        }


        if ($("site-phone")) {
            $("site-phone").value =
                data.phone || "";
        }


        if ($("site-email")) {
            $("site-email").value =
                data.email || "";
        }


        if ($("site-address")) {
            $("site-address").value =
                data.address || "";
        }


        if ($("site-map")) {
            $("site-map").value =
                data.map_embed_url || "";
        }


        if ($("site-amenities")) {
            $("site-amenities").value =
                Array.isArray(
                    data.amenities
                )
                    ? data.amenities.join(", ")
                    : "";
        }


        if ($("hero-img")) {
            $("hero-img").src =
                data.hero_image_url ||
                "/hero.jpg";
        }


        siteData =
            data;

    } catch (error) {

        console.error(
            "Admin site load failed:",
            error
        );
    }
}


function setupSiteForm() {

    const form =
        $("site-form");

    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const errorElement =
                $("site-error");


            if (errorElement) {
                errorElement.textContent =
                    "";
            }


            const data = {
                lodge_name:
                    $("site-name")
                        ?.value
                        .trim() || "",

                tagline:
                    $("site-tagline")
                        ?.value
                        .trim() || "",

                about_text:
                    $("site-about")
                        ?.value
                        .trim() || "",

                phone:
                    $("site-phone")
                        ?.value
                        .trim() || "",

                email:
                    $("site-email")
                        ?.value
                        .trim() || "",

                address:
                    $("site-address")
                        ?.value
                        .trim() || "",

                map_embed_url:
                    $("site-map")
                        ?.value
                        .trim() || "",

                amenities:
                    $("site-amenities")
                        ?.value
                        .split(",")
                        .map(
                            value =>
                                value.trim()
                        )
                        .filter(Boolean) || []
            };


            try {

                await apiCall(
                    "/site",
                    {
                        method: "PUT",
                        body: data
                    }
                );


                await loadAdminSite();

                window.alert(
                    "Site information updated successfully."
                );

            } catch (error) {

                if (errorElement) {
                    errorElement.textContent =
                        error.message;
                }
            }
        }
    );
}


function setupHeroUpload() {

    const input =
        $("hero-upload");

    if (!input) {
        return;
    }


    input.addEventListener(
        "change",
        async event => {

            const file =
                event.target.files?.[0];


            if (!file) {
                return;
            }


            if (
                file.size >
                5 * 1024 * 1024
            ) {

                window.alert(
                    "Image must be 5MB or smaller."
                );

                input.value =
                    "";

                return;
            }


            const formData =
                new FormData();

            formData.append(
                "image",
                file
            );


            try {

                await apiCall(
                    "/site/hero",
                    {
                        method: "POST",
                        body: formData
                    }
                );


                await loadAdminSite();

                window.alert(
                    "Hero image updated successfully."
                );

            } catch (error) {

                window.alert(
                    error.message
                );

            } finally {

                input.value =
                    "";
            }
        }
    );
}


function setupHeroDelete() {

    const button =
        $("hero-delete");

    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async () => {

            if (
                !window.confirm(
                    "Reset the hero image to the default image?"
                )
            ) {
                return;
            }


            try {

                await apiCall(
                    "/site/hero",
                    {
                        method: "DELETE"
                    }
                );


                await loadAdminSite();

                window.alert(
                    "Hero image reset successfully."
                );

            } catch (error) {

                window.alert(
                    error.message
                );
            }
        }
    );
}


/* =========================================================
   Initialization
   ========================================================= */

async function initPublic() {

    setupMobileMenu();
    setupBookingForm();

    await loadSiteInfo();
    await loadRooms();
    await loadGallery();
}


async function initAdmin() {

    setupMobileMenu();
    setupAdminAuth();
    setupAdminNavigation();
    setupRoomForm();
    setupRoomCancel();
    setupGalleryForm();
    setupSiteForm();
    setupHeroUpload();
    setupHeroDelete();

    await checkAdminAuth();
}


document.addEventListener(
    "DOMContentLoaded",
    () => {

        const isAdminPage =
            window.location.pathname === "/admin";


        if (isAdminPage) {

            initAdmin()
                .catch(error => {

                    console.error(
                        "Admin initialization failed:",
                        error
                    );
                });

        } else {

            initPublic()
                .catch(error => {

                    console.error(
                        "Public initialization failed:",
                        error
                    );
                });
        }
    }
);