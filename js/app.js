// ============================================
// Tìm Phòng Trọ - Main Application
// Router + Page Renderers + Event Handlers
// ============================================

import { initData, getRooms, getRoomById, addRoom, updateRoom, deleteRoom, getContactInfo, saveContactInfo, verifyAdmin, getNextRoomNumber, trackPageView, trackClick, getAnalyticsSummary } from './data.js';

// ============ UTILITIES ============

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
}

function isExpired(room) {
    if (!room.moveInDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(room.moveInDate) < today;
}

function formatDate(dateStr) {
    if (!dateStr) return 'Có thể vào ở luôn';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// getNextRoomNumber is now imported from data.js (async)

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-symbols-rounded">${icons[type] || 'info'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function navigateTo(hash) {
    window.location.hash = hash;
}

// ============ ROUTER ============

function getRoute() {
    const hash = window.location.hash || '#/';
    if (hash.match(/^#\/room\/\d+$/)) {
        const id = parseInt(hash.split('/')[2]);
        return { page: 'detail', params: { id } };
    }
    if (hash === '#/admin' || hash.startsWith('#/admin')) {
        return { page: 'admin' };
    }
    return { page: 'home' };
}

function updateActiveNav(page) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page || (page === 'detail' && link.dataset.page === 'home')) {
            link.classList.add('active');
        }
    });
}

// ============ ADMIN AUTH ============

let isAdminAuthenticated = sessionStorage.getItem('admin_auth') === 'true';

function renderAdminLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="admin-login-page">
            <div class="admin-login-card">
                <div class="admin-login-icon">
                    <span class="material-symbols-rounded">lock</span>
                </div>
                <h2>Đăng nhập quản trị</h2>
                <p>Vui lòng nhập mật khẩu để truy cập trang quản trị.</p>
                <form id="admin-login-form" autocomplete="off">
                    <div class="form-group">
                        <div class="password-input-wrapper">
                            <span class="material-symbols-rounded password-icon">key</span>
                            <input type="password" class="form-input" id="admin-password" placeholder="Nhập mật khẩu..." autofocus required>
                            <button type="button" class="password-toggle" id="toggle-password" aria-label="Hiện mật khẩu">
                                <span class="material-symbols-rounded">visibility</span>
                            </button>
                        </div>
                    </div>
                    <div class="admin-login-error hidden" id="login-error">
                        <span class="material-symbols-rounded">error</span>
                        <span>Mật khẩu không đúng. Vui lòng thử lại.</span>
                    </div>
                    <button type="submit" class="btn-primary admin-login-btn">
                        <span class="material-symbols-rounded">login</span>
                        Đăng nhập
                    </button>
                </form>
                <a href="#/" class="admin-login-back">
                    <span class="material-symbols-rounded">arrow_back</span>
                    Quay lại trang chủ
                </a>
            </div>
        </div>
    `;

    // Toggle password visibility
    document.getElementById('toggle-password')?.addEventListener('click', () => {
        const input = document.getElementById('admin-password');
        const icon = document.querySelector('#toggle-password .material-symbols-rounded');
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = 'visibility_off';
        } else {
            input.type = 'password';
            icon.textContent = 'visibility';
        }
    });

    // Login form submit
    document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('admin-password')?.value;
        const errorEl = document.getElementById('login-error');
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-symbols-rounded">hourglass_top</span> Đang xác thực...';

        const isValid = await verifyAdmin('admin', password);

        if (isValid) {
            isAdminAuthenticated = true;
            sessionStorage.setItem('admin_auth', 'true');
            handleRoute();
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-symbols-rounded">login</span> Đăng nhập';
            errorEl?.classList.remove('hidden');
            document.getElementById('admin-password').value = '';
            document.getElementById('admin-password').focus();
            const card = document.querySelector('.admin-login-card');
            card?.classList.add('shake');
            setTimeout(() => card?.classList.remove('shake'), 500);
        }
    });
}

// ============ HOME PAGE ============

let currentFilter = 'all';
let currentTypeFilter = 'all'; // 'all' | 'studio' | 'phongtro' | 'nhanguyencan'

function getRoomTypeName(type) {
    switch(type) {
        case 'phongtro': return 'Phòng trọ';
        case 'nhanguyencan': return 'Nhà nguyên căn';
        default: return 'Studio';
    }
}
let currentPriceSort = 'default'; // 'default' | 'asc' | 'desc'
let currentSearchQuery = ''; // search by address name

async function renderHome() {
    const app = document.getElementById('app');

    // Reset all filters when returning to home
    currentFilter = 'all';
    currentTypeFilter = 'all';
    currentSearchQuery = '';
    currentPriceSort = 'default';

    // Show loading
    app.innerHTML = '<div class="loading-spinner"><span class="material-symbols-rounded spinning">progress_activity</span><p>Đang tải phòng trọ...</p></div>';

    let rooms = [];
    try {
        rooms = await getRooms();
    } catch (err) {
        console.error('Failed to load rooms:', err);
    }
    const activeRooms = rooms.filter(r => !isExpired(r));

    app.innerHTML = `
        <div class="container">
            <div class="page-header">
                <h1 class="gradient-text">Tìm Phòng Phù Hợp</h1>
                <p>Tìm nhanh phòng trọ, studio và căn hộ phù hợp ngân sách. Cập nhật liên tục tình trạng phòng trống và thời gian có thể vào ở.</p>
            </div>

            <div class="filter-bar">
                <div class="filter-section" id="filter-section">
                    <button class="filter-btn active" data-filter="all">
                        <span>Tất cả</span>
                    </button>
                    <button class="filter-btn" data-filter="Vin 1">
                        <span>Vin 1</span>
                    </button>
                    <button class="filter-btn" data-filter="Vin 2">
                        <span>Vin 2</span>
                    </button>
                    <button class="filter-btn" data-filter="Vin 3">
                        <span>Vin 3</span>
                    </button>
                </div>

                <div class="filter-section" id="type-filter-section">
                    <button class="filter-btn filter-btn-type" data-type="studio">
                        <span class="material-symbols-rounded" style="font-size:16px">apartment</span>
                        <span>Studio</span>
                    </button>
                    <button class="filter-btn filter-btn-type" data-type="phongtro">
                        <span class="material-symbols-rounded" style="font-size:16px">house</span>
                        <span>Phòng trọ</span>
                    </button>
                    <button class="filter-btn filter-btn-type" data-type="nhanguyencan">
                        <span class="material-symbols-rounded" style="font-size:16px">home</span>
                        <span>Nhà nguyên căn</span>
                    </button>
                </div>

                <div class="search-address-wrapper" id="search-address-wrapper">
                    <span class="material-symbols-rounded search-address-icon">search</span>
                    <input type="text" class="search-address-input" id="search-address-input" placeholder="Tìm khu vực: VD Thời Đại, San Hô..." autocomplete="off">
                    <button class="search-clear-btn hidden" id="search-clear-btn">
                        <span class="material-symbols-rounded" style="font-size:18px">close</span>
                    </button>
                </div>

                <div class="price-sort-wrapper" id="price-sort-wrapper">
                    <span class="material-symbols-rounded price-sort-icon">sort</span>
                    <select class="price-sort-select" id="price-sort-select">
                        <option value="default">Sắp xếp giá</option>
                        <option value="asc">Giá thấp → cao</option>
                        <option value="desc">Giá cao → thấp</option>
                    </select>
                </div>
            </div>

            <div class="rooms-grid" id="rooms-grid">
                ${activeRooms.map((room, index) => renderRoomCard(room, index)).join('')}
            </div>

            <div class="contact-cta-banner" id="contact-cta-banner">
                <div class="cta-3d-frame">
                    <div class="cta-icon-pulse">
                        <span class="material-symbols-rounded">support_agent</span>
                    </div>
                    <p class="cta-main-text">Nếu bạn chưa tìm được phòng phù hợp với nhu cầu, liên hệ trực tiếp với <strong>Trần Xuân Đạt</strong> để tìm phòng nhé!</p>
                    <a href="https://zalo.me/84965278868" target="_blank" rel="noopener" class="cta-zalo-link">
                        <span class="material-symbols-rounded">chat</span>
                        Zalo: 0965278868
                    </a>
                </div>
            </div>
        </div>
    `;

    // Bind events
    bindHomeEvents();

    // Apply current filters instantly
    applyFilters();
}

function applyFilters() {
    const grid = document.getElementById('rooms-grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.room-card'));
    let visibleCount = 0;

    // Show/hide cards based on filters
    // Normalize search query: strip diacritics + numbers for matching
    const searchNorm = currentSearchQuery
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[0-9]+/g, '')
        .trim();

    cards.forEach(card => {
        const area = card.dataset.area;
        const type = card.dataset.type;
        const address = card.dataset.address || '';
        const matchArea = currentFilter === 'all' || area === currentFilter;
        const matchType = currentTypeFilter === 'all' || type === currentTypeFilter;

        // Match search: normalize address, strip numbers, compare
        let matchSearch = true;
        if (searchNorm) {
            const addrNorm = address
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/[0-9]+/g, '')
                .trim();
            matchSearch = addrNorm.includes(searchNorm);
        }

        const visible = matchArea && matchType && matchSearch;
        card.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
    });

    // Sort visible cards by reordering DOM nodes (no re-render)
    if (currentPriceSort !== 'default') {
        const sortedCards = cards
            .filter(c => c.style.display !== 'none')
            .sort((a, b) => {
                const pa = parseInt(a.dataset.price);
                const pb = parseInt(b.dataset.price);
                return currentPriceSort === 'asc' ? pa - pb : pb - pa;
            });
        sortedCards.forEach(card => grid.appendChild(card));
    }

    // Update filter button active states
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === currentFilter);
    });
    document.querySelectorAll('.filter-btn-type[data-type]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === currentTypeFilter);
    });

    // Update price sort select
    const sortSelect = document.getElementById('price-sort-select');
    if (sortSelect) sortSelect.value = currentPriceSort;
}

function bindHomeEvents() {
    // Area filter
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            applyFilters();
        });
    });

    // Type filter (toggle)
    document.querySelectorAll('.filter-btn-type[data-type]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTypeFilter = currentTypeFilter === btn.dataset.type ? 'all' : btn.dataset.type;
            applyFilters();
        });
    });

    // Price sort
    document.getElementById('price-sort-select')?.addEventListener('change', (e) => {
        currentPriceSort = e.target.value;
        applyFilters();
    });

    // Address search
    const searchInput = document.getElementById('search-address-input');
    const clearBtn = document.getElementById('search-clear-btn');

    searchInput?.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value;
        clearBtn?.classList.toggle('hidden', !currentSearchQuery);
        applyFilters();
    });

    clearBtn?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        currentSearchQuery = '';
        clearBtn.classList.add('hidden');
        applyFilters();
    });

    // Card clicks
    document.querySelectorAll('.room-card').forEach(card => {
        card.addEventListener('click', () => {
            navigateTo(`#/room/${card.dataset.roomId}`);
        });
    });
}

function renderRoomCard(room, index) {
    const thumbnail = room.images && room.images.length > 0
        ? room.images[0]
        : null;

    return `
        <div class="room-card animate-card" data-room-id="${room.id}" data-area="${room.area}" data-type="${room.roomType || 'studio'}" data-price="${room.price}" data-address="${(room.address || '').toLowerCase()}" style="animation-delay: ${index * 0.08}s" id="room-card-${room.id}">
            <div class="room-card-image watermark">
                ${thumbnail
                    ? `<img src="${thumbnail}" alt="${room.title}" loading="lazy">`
                    : `<div class="no-image-placeholder">
                        <span class="material-symbols-rounded">image</span>
                        <span>Chưa có ảnh</span>
                    </div>`
                }
                <div class="room-card-badge">${room.area}</div>
            </div>
            <div class="room-card-body">
                <h3 class="room-card-title">${room.title}</h3>
                <div class="room-card-price">
                    ${formatPrice(room.price)} <small>/tháng</small>
                </div>
                <div class="room-card-address">
                    <span class="material-symbols-rounded">location_on</span>
                    <span>${room.address}</span>
                </div>
            </div>
        </div>
    `;
}

// ============ DETAIL PAGE ============

let currentImageIndex = 0;
let currentDetailImages = [];

async function renderDetail(id) {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="loading-spinner"><span class="material-symbols-rounded spinning">progress_activity</span><p>Đang tải...</p></div>';

    let room = null;
    try {
        room = await getRoomById(id);
    } catch (err) {
        console.error('Failed to load room:', err);
    }
    if (!room) {
        app.innerHTML = `
            <div class="container">
                <div class="empty-state">
                    <span class="material-symbols-rounded">error</span>
                    <p>Không tìm thấy phòng trọ này</p>
                    <a href="#/" style="color: var(--accent-light); margin-top: 12px; display: inline-block;">← Quay lại trang chủ</a>
                </div>
            </div>
        `;
        return;
    }

    currentDetailImages = room.images || [];
    currentImageIndex = 0;

    const mainImage = currentDetailImages.length > 0
        ? `<img src="${currentDetailImages[0]}" alt="${room.title}" id="gallery-main-img">`
        : `<div class="no-image-placeholder"><span class="material-symbols-rounded">image</span><span>Chưa có ảnh</span></div>`;


    app.innerHTML = `
        <div class="detail-page">
            <a href="#/" class="detail-back-btn" id="detail-back">
                <span class="material-symbols-rounded">arrow_back</span>
                Quay lại danh sách
            </a>

            <!-- Gallery -->
            ${currentDetailImages.length > 0 ? `
            <div class="gallery-section">
                <div class="gallery-main watermark watermark-lg" id="gallery-main">
                    ${mainImage}
                </div>
                ${currentDetailImages.length > 1 ? `
                <div class="gallery-thumbs" id="gallery-thumbs">
                    ${currentDetailImages.map((img, i) => `
                        <div class="gallery-thumb ${i === 0 ? 'active' : ''}" data-index="${i}" id="thumb-${i}">
                            <img src="${img}" alt="Ảnh ${i + 1}">
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Video -->
            ${room.video ? `
            <div class="video-section">
                <h2>
                    <span class="material-symbols-rounded">videocam</span>
                    Video phòng trọ
                </h2>
                <div class="video-wrapper watermark watermark-lg">
                    <video controls preload="metadata" id="room-video">
                        <source src="${room.video}" type="video/mp4">
                        Trình duyệt không hỗ trợ video.
                    </video>
                </div>
            </div>
            ` : ''}

            <!-- Room Info -->
            <div class="detail-info">
                <h1>${room.title}</h1>

                <div class="detail-info-grid">
                    <div class="detail-info-item">
                        <span class="label">
                            <span class="material-symbols-rounded">payments</span>
                            Giá thuê
                        </span>
                        <span class="value price">${formatPrice(room.price)}/tháng</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="label">
                            <span class="material-symbols-rounded">location_on</span>
                            Địa chỉ
                        </span>
                        <span class="value">${room.address}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="label">
                            <span class="material-symbols-rounded">apartment</span>
                            Khu vực
                        </span>
                        <span class="value area-badge">${room.area}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="label">
                            <span class="material-symbols-rounded">home_work</span>
                            Loại phòng
                        </span>
                        <span class="value"><span class="type-tag type-${room.roomType || 'studio'}" style="font-size: 0.85rem; padding: 4px 12px;">${getRoomTypeName(room.roomType)}</span></span>
                    </div>
                    <div class="detail-info-item">
                        <span class="label">
                            <span class="material-symbols-rounded">calendar_month</span>
                            Ngày có thể vào ở
                        </span>
                        <span class="value">${formatDate(room.moveInDate)}</span>
                    </div>
                </div>

                <div class="detail-description">
                    <h3>
                        <span class="material-symbols-rounded">description</span>
                        Mô tả chi tiết
                    </h3>
                    <p>${room.description}</p>
                </div>
            </div>
        </div>
    `;

    // Bind gallery events
    bindGalleryEvents();
}

function bindGalleryEvents() {
    // Thumbnail clicks
    document.querySelectorAll('.gallery-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => {
            const index = parseInt(thumb.dataset.index);
            setMainImage(index);
        });
    });

    // Main image click -> lightbox
    const galleryMain = document.getElementById('gallery-main');
    if (galleryMain) {
        galleryMain.addEventListener('click', () => {
            openLightbox(currentImageIndex);
        });
    }
}

function setMainImage(index) {
    if (index < 0 || index >= currentDetailImages.length) return;
    currentImageIndex = index;
    const mainImg = document.getElementById('gallery-main-img');
    if (mainImg) {
        mainImg.src = currentDetailImages[index];
    }
    // Update active thumb
    document.querySelectorAll('.gallery-thumb').forEach((t, i) => {
        t.classList.toggle('active', i === index);
    });
}

// ============ LIGHTBOX ============

let lightboxImages = [];
let lightboxIndex = 0;

function openLightbox(index) {
    lightboxImages = currentDetailImages;
    lightboxIndex = index;
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    img.src = lightboxImages[lightboxIndex];
    counter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
}

function lightboxNav(direction) {
    lightboxIndex += direction;
    if (lightboxIndex < 0) lightboxIndex = lightboxImages.length - 1;
    if (lightboxIndex >= lightboxImages.length) lightboxIndex = 0;
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    img.src = lightboxImages[lightboxIndex];
    counter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
}

// Lightbox global events
document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
document.getElementById('lightbox-prev')?.addEventListener('click', () => lightboxNav(-1));
document.getElementById('lightbox-next')?.addEventListener('click', () => lightboxNav(1));
document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('lightbox');
    if (lightbox && !lightbox.classList.contains('hidden')) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') lightboxNav(-1);
        if (e.key === 'ArrowRight') lightboxNav(1);
    }
});

// ============ ADMIN PAGE ============

async function renderAdmin() {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="loading-spinner"><span class="material-symbols-rounded spinning">progress_activity</span><p>Đang tải quản trị...</p></div>';

    let rooms = [];
    let contact = { phone: '0965278868', zaloLink: 'https://zalo.me/84965278868' };
    try {
        rooms = await getRooms();
        contact = await getContactInfo();
    } catch (err) {
        console.error('Failed to load admin data:', err);
        showToast('Lỗi kết nối database. Vui lòng tải lại trang.', 'error');
    }

    // Split rooms into active and expired
    const activeRooms = rooms.filter(r => !isExpired(r));
    const expiredRooms = rooms.filter(r => isExpired(r));

    app.innerHTML = `
        <div class="admin-page">
            <div class="admin-header">
                <h1>
                    <span class="material-symbols-rounded">admin_panel_settings</span>
                    <span class="gradient-text">Quản trị phòng trọ</span>
                </h1>
            </div>

            <!-- Tab Navigation -->
            <div class="admin-tabs" id="admin-tabs">
                <button class="admin-tab" id="tab-add" data-action="add">
                    <span class="material-symbols-rounded">add_circle</span>
                    <span class="admin-tab-text">Thêm phòng mới</span>
                </button>
                <button class="admin-tab active" id="tab-manage" data-tab="manage">
                    <span class="material-symbols-rounded">dashboard</span>
                    <span class="admin-tab-text">Quản lý phòng</span>
                    <span class="admin-tab-badge">${rooms.length}</span>
                </button>
                <button class="admin-tab" id="tab-search" data-tab="search">
                    <span class="material-symbols-rounded">search</span>
                    <span class="admin-tab-text">Tìm kiếm phòng</span>
                </button>
                <button class="admin-tab" id="tab-contact" data-tab="contact">
                    <span class="material-symbols-rounded">contact_phone</span>
                    <span class="admin-tab-text">Cài đặt liên hệ</span>
                </button>
                <button class="admin-tab" id="tab-analytics" data-tab="analytics">
                    <span class="material-symbols-rounded">analytics</span>
                    <span class="admin-tab-text">Thống kê</span>
                </button>
            </div>

            <!-- TAB CONTENT: Quản lý phòng -->
            <div class="admin-tab-content active" id="content-manage">
                <!-- Active Rooms -->
                <div class="admin-section-label">
                    <span class="material-symbols-rounded" style="color: var(--success);">check_circle</span>
                    Phòng đang hoạt động
                    <span class="admin-count-badge">${activeRooms.length}</span>
                </div>
                ${activeRooms.length > 0 ? `
                <div class="admin-room-list" id="admin-active-list">
                    ${activeRooms.map(room => renderAdminRoomItem(room, false)).join('')}
                </div>
                ` : `
                <div class="empty-state" style="padding: 40px 20px;">
                    <span class="material-symbols-rounded">inventory_2</span>
                    <p>Chưa có phòng trọ nào đang hoạt động.</p>
                </div>
                `}

                <!-- Expired Rooms -->
                ${expiredRooms.length > 0 ? `
                <div class="admin-section expired-section" style="margin-top: 28px;">
                    <div class="admin-section-header">
                        <div class="admin-section-label" style="margin-bottom: 0;">
                            <span class="material-symbols-rounded" style="color: var(--danger);">schedule</span>
                            Phòng hết hạn vào ở
                            <span class="admin-count-badge expired-badge">${expiredRooms.length}</span>
                        </div>
                        <button class="btn-danger" id="btn-delete-all-expired">
                            <span class="material-symbols-rounded" style="font-size: 16px;">delete_sweep</span>
                            Xóa tất cả (${expiredRooms.length})
                        </button>
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
                        Những phòng này đã quá ngày vào ở và không hiển thị trên trang chủ.
                    </p>
                    <div class="admin-room-list" id="admin-expired-list">
                        ${expiredRooms.map(room => renderAdminRoomItem(room, true)).join('')}
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- TAB CONTENT: Tìm kiếm phòng -->
            <div class="admin-tab-content" id="content-search">
                <div class="admin-search-bar" id="admin-search-bar">
                    <span class="material-symbols-rounded admin-search-icon">search</span>
                    <input type="text" class="admin-search-input" id="admin-search-input" placeholder="Nhập tên phòng, địa chỉ, khu vực để tìm..." autocomplete="off">
                    <button class="admin-search-clear hidden" id="admin-search-clear" aria-label="Xóa tìm kiếm">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div id="search-results">
                    <div class="empty-state" style="padding: 40px 20px;" id="search-placeholder">
                        <span class="material-symbols-rounded">manage_search</span>
                        <p>Nhập từ khóa để tìm kiếm phòng trọ</p>
                    </div>
                    <div class="admin-room-list hidden" id="search-results-list">
                        ${rooms.map(room => renderAdminRoomItem(room, isExpired(room))).join('')}
                    </div>
                    <div class="empty-state hidden" style="padding: 40px 20px;" id="search-no-result">
                        <span class="material-symbols-rounded">search_off</span>
                        <p>Không tìm thấy phòng nào phù hợp</p>
                    </div>
                </div>
            </div>

            <!-- TAB CONTENT: Cài đặt liên hệ -->
            <div class="admin-tab-content" id="content-contact">
                <div class="admin-section" style="margin-top: 0; border-top: none; padding-top: 0;">
                    <div class="admin-section-label" style="margin-bottom: 20px;">
                        <span class="material-symbols-rounded" style="color: var(--accent-2);">contact_phone</span>
                        Thông tin liên hệ hiển thị cho khách
                    </div>
                    <div class="contact-settings-form" id="contact-settings-form">
                        <div class="form-group">
                            <label class="form-label">Số điện thoại</label>
                            <input type="tel" class="form-input" id="contact-phone" placeholder="VD: 0965278868" value="${contact.phone}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Link Zalo</label>
                            <input type="url" class="form-input" id="contact-zalo" placeholder="VD: https://zalo.me/84965278868" value="${contact.zaloLink}">
                        </div>
                    </div>
                    <button class="btn-primary" id="btn-save-contact" style="margin-top: 20px;">
                        <span class="material-symbols-rounded">save</span>
                        Lưu thông tin liên hệ
                    </button>
                </div>
            </div>

            <!-- TAB CONTENT: Thống kê -->
            <div class="admin-tab-content" id="content-analytics">
                <div class="analytics-loading" id="analytics-loading">
                    <div class="loading-spinner"><span class="material-symbols-rounded spinning">progress_activity</span><p>Đang tải thống kê...</p></div>
                </div>
                <div id="analytics-dashboard" style="display:none;"></div>
            </div>
        </div>
    `;

    // ---- TAB SWITCHING ----
    const tabs = document.querySelectorAll('.admin-tab[data-tab]');
    const contents = document.querySelectorAll('.admin-tab-content');
    let analyticsLoaded = false;

    function switchTab(tabName) {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        contents.forEach(c => c.classList.toggle('active', c.id === `content-${tabName}`));
        // Load analytics on first open
        if (tabName === 'analytics' && !analyticsLoaded) {
            analyticsLoaded = true;
            loadAnalyticsDashboard();
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // "Thêm phòng mới" is an action button, not a tab
    document.getElementById('tab-add')?.addEventListener('click', () => {
        openRoomForm(null);
    });

    // ---- MANAGE TAB: Bind edit/delete ----
    document.querySelectorAll('#content-manage .btn-edit-room').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.roomId);
            const room = await getRoomById(id);
            if (room) openRoomForm(room);
        });
    });

    document.querySelectorAll('#content-manage .btn-delete-room').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.roomId);
            const room = await getRoomById(id);
            if (room) openDeleteConfirm(room);
        });
    });

    // Bind delete all expired
    document.getElementById('btn-delete-all-expired')?.addEventListener('click', async () => {
        if (!confirm(`Bạn có chắc muốn xóa tất cả ${expiredRooms.length} phòng hết hạn?`)) return;
        for (const r of expiredRooms) { await deleteRoom(r.id); }
        showToast(`Đã xóa ${expiredRooms.length} phòng hết hạn!`, 'success');
        renderAdmin();
    });

    // ---- SEARCH TAB: Bind search ----
    const searchInput = document.getElementById('admin-search-input');
    const searchClear = document.getElementById('admin-search-clear');
    const searchResultsList = document.getElementById('search-results-list');
    const searchPlaceholder = document.getElementById('search-placeholder');
    const searchNoResult = document.getElementById('search-no-result');

    // Bind search tab edit/delete buttons
    document.querySelectorAll('#search-results-list .btn-edit-room').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.roomId);
            const room = await getRoomById(id);
            if (room) openRoomForm(room);
        });
    });

    document.querySelectorAll('#search-results-list .btn-delete-room').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.roomId);
            const room = await getRoomById(id);
            if (room) openDeleteConfirm(room);
        });
    });

    searchInput?.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        searchClear.classList.toggle('hidden', !query);

        if (!query) {
            searchResultsList.classList.add('hidden');
            searchNoResult.classList.add('hidden');
            searchPlaceholder.classList.remove('hidden');
            return;
        }

        searchPlaceholder.classList.add('hidden');

        // Filter search results
        const items = searchResultsList.querySelectorAll('.admin-room-item');
        let visibleCount = 0;
        items.forEach(item => {
            const title = item.querySelector('h3')?.textContent.toLowerCase() || '';
            const meta = item.querySelector('.admin-room-meta')?.textContent.toLowerCase() || '';
            const addr = item.dataset.address?.toLowerCase() || '';
            const match = title.includes(query) || meta.includes(query) || addr.includes(query);
            item.style.display = match ? '' : 'none';
            if (match) visibleCount++;
        });

        searchResultsList.classList.toggle('hidden', visibleCount === 0);
        searchNoResult.classList.toggle('hidden', visibleCount > 0);
    });

    searchClear?.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.focus();
    });

    // ---- CONTACT TAB: Bind save ----
    document.getElementById('btn-save-contact')?.addEventListener('click', async () => {
        const phone = document.getElementById('contact-phone')?.value.trim();
        const zaloLink = document.getElementById('contact-zalo')?.value.trim();
        if (!phone) { showToast('Vui lòng nhập số điện thoại', 'error'); return; }
        if (!zaloLink) { showToast('Vui lòng nhập link Zalo', 'error'); return; }
        await saveContactInfo({ phone, zaloLink });
        showToast('Đã lưu thông tin liên hệ thành công!', 'success');
    });
}

function renderAdminRoomItem(room, expired = false) {
    const thumb = room.images && room.images.length > 0 ? room.images[0] : null;
    return `
        <div class="admin-room-item ${expired ? 'admin-room-expired' : ''}" id="admin-item-${room.id}" data-address="${room.address || ''}">
            <div class="admin-room-thumb">
                ${thumb
                    ? `<img src="${thumb}" alt="${room.title}">`
                    : `<div class="no-image-placeholder" style="font-size: 0.6rem;"><span class="material-symbols-rounded" style="font-size: 24px;">image</span></div>`
                }
            </div>
            <div class="admin-room-info">
                <h3>${room.title}${expired ? ' <span class="expired-tag">Hết hạn</span>' : ''}</h3>
                <div class="admin-room-meta">
                    <span class="price-text">${formatPrice(room.price)}/tháng</span>
                    <span class="area-text">${room.area}</span>
                    ${room.address ? `<span>📍 ${room.address}</span>` : ''}
                    <span class="type-tag type-${room.roomType || 'studio'}">${getRoomTypeName(room.roomType)}</span>
                    <span class="${expired ? 'expired-date' : ''}">📅 ${formatDate(room.moveInDate)}</span>
                    <span>${room.images ? room.images.length : 0} ảnh</span>
                    <span>${room.video ? '🎬 Có video' : ''}</span>
                </div>
            </div>
            <div class="admin-room-actions">
                <button class="btn-secondary btn-edit-room" data-room-id="${room.id}">
                    <span class="material-symbols-rounded" style="font-size: 16px;">edit</span>
                    Sửa
                </button>
                <button class="btn-danger btn-delete-room" data-room-id="${room.id}">
                    <span class="material-symbols-rounded" style="font-size: 16px;">delete</span>
                    Xóa
                </button>
            </div>
        </div>
    `;
}

// ============ ANALYTICS DASHBOARD ============

async function loadAnalyticsDashboard() {
    const loading = document.getElementById('analytics-loading');
    const dashboard = document.getElementById('analytics-dashboard');
    if (!dashboard) return;

    try {
        const stats = await getAnalyticsSummary();

        dashboard.innerHTML = `
            <div class="analytics-grid">
                <div class="analytics-card analytics-card-primary">
                    <div class="analytics-card-icon">
                        <span class="material-symbols-rounded">visibility</span>
                    </div>
                    <div class="analytics-card-content">
                        <div class="analytics-card-value">${stats.totalViews.toLocaleString()}</div>
                        <div class="analytics-card-label">Tổng lượt xem</div>
                    </div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-card-icon" style="background:rgba(34,197,94,0.12);color:#22c55e;">
                        <span class="material-symbols-rounded">today</span>
                    </div>
                    <div class="analytics-card-content">
                        <div class="analytics-card-value">${stats.todayViews.toLocaleString()}</div>
                        <div class="analytics-card-label">Hôm nay</div>
                    </div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-card-icon" style="background:rgba(249,115,22,0.12);color:#f97316;">
                        <span class="material-symbols-rounded">date_range</span>
                    </div>
                    <div class="analytics-card-content">
                        <div class="analytics-card-value">${stats.weekViews.toLocaleString()}</div>
                        <div class="analytics-card-label">7 ngày qua</div>
                    </div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-card-icon" style="background:rgba(139,92,246,0.12);color:#8b5cf6;">
                        <span class="material-symbols-rounded">calendar_month</span>
                    </div>
                    <div class="analytics-card-content">
                        <div class="analytics-card-value">${stats.monthViews.toLocaleString()}</div>
                        <div class="analytics-card-label">30 ngày qua</div>
                    </div>
                </div>
            </div>

            <h3 style="margin: 28px 0 16px; color: var(--text-primary); font-size: 1.05rem;">
                <span class="material-symbols-rounded" style="vertical-align:middle;margin-right:6px;">ads_click</span>
                Lượt click liên hệ
            </h3>
            <div class="analytics-grid analytics-grid-3">
                <div class="analytics-card">
                    <div class="analytics-card-icon" style="background:rgba(6,182,212,0.12);color:#06b6d4;">
                        <span class="material-symbols-rounded">chat</span>
                    </div>
                    <div class="analytics-card-content">
                        <div class="analytics-card-value">${stats.zaloClicks.toLocaleString()}</div>
                        <div class="analytics-card-label">Click Zalo</div>
                    </div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-card-icon" style="background:rgba(34,197,94,0.12);color:#22c55e;">
                        <span class="material-symbols-rounded">call</span>
                    </div>
                    <div class="analytics-card-content">
                        <div class="analytics-card-value">${stats.phoneClicks.toLocaleString()}</div>
                        <div class="analytics-card-label">Click gọi điện</div>
                    </div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-card-icon" style="background:rgba(249,115,22,0.12);color:#f97316;">
                        <span class="material-symbols-rounded">pageview</span>
                    </div>
                    <div class="analytics-card-content">
                        <div class="analytics-card-value">${stats.roomViews.toLocaleString()}</div>
                        <div class="analytics-card-label">Lượt xem phòng</div>
                    </div>
                </div>
            </div>

            ${stats.topRoomsList.length > 0 ? `
            <h3 style="margin: 28px 0 16px; color: var(--text-primary); font-size: 1.05rem;">
                <span class="material-symbols-rounded" style="vertical-align:middle;margin-right:6px;">trending_up</span>
                Phòng được xem nhiều nhất (30 ngày)
            </h3>
            <div class="analytics-top-rooms">
                ${stats.topRoomsList.map(([roomId, count], i) => `
                    <div class="analytics-top-room-item">
                        <span class="analytics-rank">#${i + 1}</span>
                        <span class="analytics-room-id">Phòng ID: ${roomId.substring(0, 8)}...</span>
                        <span class="analytics-room-count">${count} lượt xem</span>
                    </div>
                `).join('')}
            </div>
            ` : ''}

            <button class="btn-primary" id="btn-refresh-analytics" style="margin-top: 20px;">
                <span class="material-symbols-rounded">refresh</span>
                Tải lại thống kê
            </button>
        `;

        if (loading) loading.style.display = 'none';
        dashboard.style.display = 'block';

        document.getElementById('btn-refresh-analytics')?.addEventListener('click', () => {
            if (loading) loading.style.display = 'block';
            dashboard.style.display = 'none';
            loadAnalyticsDashboard();
        });

    } catch (err) {
        console.error('Analytics error:', err);
        if (loading) loading.innerHTML = '<p style="color:var(--text-muted);text-align:center;">Chưa có dữ liệu thống kê. Hãy chạy SQL tạo bảng page_views và click_events trước.</p>';
    }
}

// ============ ROOM FORM MODAL ============

let formImages = [];
let formVideo = null;

function openRoomForm(room) {
    const isEdit = room !== null;
    formImages = isEdit && room.images ? [...room.images] : [];
    formVideo = isEdit ? room.video : null;

    const modal = document.getElementById('modal');
    const overlay = document.getElementById('modal-overlay');

    modal.innerHTML = `
        <div class="modal-header">
            <h2>
                <span class="material-symbols-rounded">${isEdit ? 'edit' : 'add_home'}</span>
                ${isEdit ? 'Chỉnh sửa phòng trọ' : 'Thêm phòng trọ mới'}
            </h2>
            <button class="modal-close" id="modal-close-btn">
                <span class="material-symbols-rounded">close</span>
            </button>
        </div>
        <div class="modal-body">
            <form id="room-form">
                <div class="form-group">
                    <label class="form-label">Loại phòng & Tiêu đề *</label>
                    <div class="title-type-selector" id="title-type-selector">
                        <label class="type-radio-card ${isEdit && room.roomType === 'phongtro' ? 'selected' : ''}" id="radio-phongtro">
                            <input type="radio" name="form-room-type" value="phongtro" ${isEdit && room.roomType === 'phongtro' ? 'checked' : ''}>
                            <span class="material-symbols-rounded">house</span>
                            <span>Phòng trọ</span>
                        </label>
                        <label class="type-radio-card ${isEdit && room.roomType === 'studio' ? 'selected' : ''}" id="radio-studio">
                            <input type="radio" name="form-room-type" value="studio" ${isEdit && room.roomType === 'studio' ? 'checked' : ''}>
                            <span class="material-symbols-rounded">apartment</span>
                            <span>Phòng studio</span>
                        </label>
                        <label class="type-radio-card ${isEdit && room.roomType === 'nhanguyencan' ? 'selected' : ''}" id="radio-nhanguyencan">
                            <input type="radio" name="form-room-type" value="nhanguyencan" ${isEdit && room.roomType === 'nhanguyencan' ? 'checked' : ''}>
                            <span class="material-symbols-rounded">home</span>
                            <span>Nhà nguyên căn</span>
                        </label>
                    </div>
                    <div class="title-auto-preview" id="title-auto-preview">
                        ${isEdit
                            ? `<span class="material-symbols-rounded">badge</span> Tiêu đề: <strong>${room.title}</strong>`
                            : '<span class="material-symbols-rounded">info</span> Chọn loại phòng để tạo tiêu đề tự động'
                        }
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Giá thuê (VNĐ/tháng) *</label>
                        <input type="number" class="form-input" id="form-price" placeholder="VD: 3500000" value="${isEdit ? room.price : ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ngày có thể vào ở</label>
                        <input type="date" class="form-input" id="form-move-in-date" value="${isEdit && room.moveInDate ? room.moveInDate : ''}">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Địa chỉ *</label>
                    <input type="text" class="form-input" id="form-address" placeholder="VD: San Hô 9, Tòa S1.02" value="${isEdit ? room.address : ''}" required>
                </div>

                <div class="form-row">
                    <div class="form-group" style="flex:1">
                        <label class="form-label">Khu vực *</label>
                        <select class="form-select" id="form-area" required>
                            <option value="" disabled ${!isEdit ? 'selected' : ''}>Chọn khu vực</option>
                            <option value="Vin 1" ${isEdit && room.area === 'Vin 1' ? 'selected' : ''}>Vin 1</option>
                            <option value="Vin 2" ${isEdit && room.area === 'Vin 2' ? 'selected' : ''}>Vin 2</option>
                            <option value="Vin 3" ${isEdit && room.area === 'Vin 3' ? 'selected' : ''}>Vin 3</option>
                        </select>
                    </div>
                    <div class="form-group" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;">
                        <label class="auto-detect-toggle" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 0;">
                            <span style="position:relative;display:inline-block;width:40px;height:22px;">
                                <input type="checkbox" id="auto-detect-area" checked style="opacity:0;width:0;height:0;">
                                <span class="auto-detect-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#ccd5e0;border-radius:22px;transition:0.3s;"></span>
                            </span>
                            <span style="font-size:0.82rem;color:var(--text-secondary);">Tự quét khu vực</span>
                        </label>
                        <div id="area-detect-result" style="font-size:0.78rem;color:var(--accent-light);min-height:18px;margin-top:2px;"></div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Mô tả</label>
                    <textarea class="form-textarea" id="form-description" placeholder="Mô tả chi tiết về phòng trọ..." rows="5">${isEdit ? room.description : ''}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        <span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;margin-right:4px;color:var(--accent-2)">lock</span>
                        Ghi chú nội bộ <small style="color:var(--text-muted);font-weight:400">(chỉ admin thấy)</small>
                    </label>
                    <textarea class="form-textarea" id="form-admin-note" placeholder="Ghi chú riêng cho bạn: tên khách, số điện thoại, tiền cọc..." rows="3" style="border-style:dashed;background:rgba(8,145,178,0.03)">${isEdit ? (room.adminNote || '') : ''}</textarea>
                </div>

                <!-- Image Upload -->
                <div class="form-group">
                    <label class="form-label">Ảnh phòng trọ</label>
                    <div class="upload-area" id="upload-images-area">
                        <span class="material-symbols-rounded">add_photo_alternate</span>
                        <p>Kéo thả ảnh vào đây hoặc <strong>click để chọn</strong></p>
                        <p style="font-size: 0.75rem; margin-top: 4px;">Hỗ trợ: JPG, PNG, WebP</p>
                        <input type="file" id="input-images" multiple accept="image/*">
                    </div>
                    <div class="upload-preview" id="images-preview">
                        ${formImages.map((img, i) => `
                            <div class="upload-preview-item" data-index="${i}">
                                <img src="${img}" alt="Ảnh ${i + 1}">
                                <button type="button" class="remove-btn remove-image" data-index="${i}">&times;</button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Video Upload -->
                <div class="form-group">
                    <label class="form-label">Video phòng trọ</label>
                    <div class="upload-area" id="upload-video-area">
                        <span class="material-symbols-rounded">video_call</span>
                        <p>Kéo thả video vào đây hoặc <strong>click để chọn</strong></p>
                        <p style="font-size: 0.75rem; margin-top: 4px;">Hỗ trợ: MP4, WebM (tối đa 50MB)</p>
                        <input type="file" id="input-video" accept="video/*">
                    </div>
                    ${formVideo ? `
                    <div class="video-preview" id="video-preview">
                        <video controls style="width: 100%; max-height: 200px;">
                            <source src="${formVideo}" type="video/mp4">
                        </video>
                        <button type="button" class="btn-danger remove-video" id="remove-video-btn" style="margin: 8px;">
                            <span class="material-symbols-rounded" style="font-size: 16px;">delete</span>
                            Xóa video
                        </button>
                    </div>
                    ` : `<div id="video-preview"></div>`}
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn-cancel" id="modal-cancel-btn">Hủy</button>
            <button class="btn-primary" id="modal-save-btn">
                <span class="material-symbols-rounded">${isEdit ? 'save' : 'add'}</span>
                ${isEdit ? 'Lưu thay đổi' : 'Thêm phòng'}
            </button>
        </div>
    `;

    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Bind modal events
    bindModalEvents(isEdit ? room.id : null);
}

function bindModalEvents(editId) {
    const overlay = document.getElementById('modal-overlay');
    const closeModal = () => {
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    };

    // Close buttons
    document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);

    // Click overlay to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Escape key to close
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Room type radio buttons → auto-generate title
    document.querySelectorAll('input[name="form-room-type"]').forEach(radio => {
        radio.addEventListener('change', async () => {
            // Update visual selection
            document.querySelectorAll('.type-radio-card').forEach(c => c.classList.remove('selected'));
            radio.closest('.type-radio-card').classList.add('selected');

            // Calculate next number
            const type = radio.value;
            const prefix = getRoomTypeName(type);
            const nextNum = await getNextRoomNumber(type, editId);
            const generatedTitle = `${prefix} ${nextNum}`;

            // Update preview
            const preview = document.getElementById('title-auto-preview');
            if (preview) {
                preview.innerHTML = `<span class="material-symbols-rounded">badge</span> Tiêu đề: <strong>${generatedTitle}</strong>`;
                preview.dataset.title = generatedTitle;
                preview.dataset.roomType = type;
            }
        });
    });

    // ===== AUTO-DETECT AREA FROM ADDRESS =====
    const areaMap = {
        'Vin 2': ['chà là', 'cha la', 'kinh đô ánh sáng', 'kinh do anh sang', 'san hô', 'san ho', 'cọ xanh', 'co xanh', 'hải âu', 'hai au', 'đảo dừa', 'dao dua', 'sao biển', 'sao bien', 'ngọc trai', 'ngoc trai'],
        'Vin 3': ['phố biển', 'pho bien', 'thời đại', 'thoi dai', 'vịnh thiên đường', 'vinh thien duong', 'vịnh tây', 'vinh tay', 'vịnh xanh', 'vinh xanh', 'ánh dương', 'anh duong', 'hải đăng', 'hai dang', 'đảo ngọc', 'dao ngoc']
    };

    function detectAreaFromAddress(address) {
        const normalized = address.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove diacritics
            .replace(/đ/g, 'd').replace(/Đ/g, 'D');
        const rawLower = address.toLowerCase();

        for (const [area, keywords] of Object.entries(areaMap)) {
            for (const keyword of keywords) {
                const keyNorm = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
                // Match keyword at word boundary, ignore trailing numbers/spaces
                const regex = new RegExp('(^|[\\s,.])'  + keyNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|\\d|,|\\.|$)', 'i');
                if (regex.test(normalized) || rawLower.includes(keyword)) {
                    // Find the matching original keyword for display
                    const displayKeyword = keyword.charAt(0).toUpperCase() + keyword.slice(1);
                    return { area, keyword: displayKeyword };
                }
            }
        }
        return null;
    }

    const addressInput = document.getElementById('form-address');
    const areaSelect = document.getElementById('form-area');
    const autoDetectCheckbox = document.getElementById('auto-detect-area');
    const detectResult = document.getElementById('area-detect-result');

    autoDetectCheckbox?.addEventListener('change', () => {
        if (autoDetectCheckbox.checked && addressInput?.value) {
            runAutoDetect(addressInput.value);
        } else if (detectResult) {
            detectResult.textContent = '';
        }
    });

    function runAutoDetect(value) {
        if (!autoDetectCheckbox?.checked) return;
        const result = detectAreaFromAddress(value);
        if (result && areaSelect) {
            areaSelect.value = result.area;
            if (detectResult) {
                detectResult.innerHTML = `<span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle;">check_circle</span> Nhận diện: <strong>${result.keyword}</strong> → ${result.area}`;
                detectResult.style.color = '#059669';
            }
        } else if (detectResult) {
            if (value.trim()) {
                detectResult.innerHTML = `<span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle;">info</span> Không nhận diện được khu vực`;
                detectResult.style.color = 'var(--text-muted)';
            } else {
                detectResult.textContent = '';
            }
        }
    }

    addressInput?.addEventListener('input', (e) => {
        runAutoDetect(e.target.value);
    });

    // Run detection on load if editing
    if (editId && addressInput?.value) {
        runAutoDetect(addressInput.value);
    }

    // Trigger preview if editing
    const checkedRadio = document.querySelector('input[name="form-room-type"]:checked');
    if (checkedRadio && editId) {
        // Keep original title for edit
        const preview = document.getElementById('title-auto-preview');
        if (preview) {
            preview.dataset.roomType = checkedRadio.value;
        }
    }

    // Image upload
    const imageInput = document.getElementById('input-images');
    const uploadImagesArea = document.getElementById('upload-images-area');

    imageInput?.addEventListener('change', (e) => {
        handleImageFiles(e.target.files);
    });

    // Drag & drop for images
    uploadImagesArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadImagesArea.classList.add('dragover');
    });
    uploadImagesArea?.addEventListener('dragleave', () => {
        uploadImagesArea.classList.remove('dragover');
    });
    uploadImagesArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadImagesArea.classList.remove('dragover');
        handleImageFiles(e.dataTransfer.files);
    });

    // Remove image buttons (use event delegation)
    document.getElementById('images-preview')?.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-image');
        if (removeBtn) {
            const index = parseInt(removeBtn.dataset.index);
            formImages.splice(index, 1);
            updateImagePreviews();
        }
    });

    // Video upload
    const videoInput = document.getElementById('input-video');
    const uploadVideoArea = document.getElementById('upload-video-area');

    videoInput?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleVideoFile(e.target.files[0]);
        }
    });

    uploadVideoArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadVideoArea.classList.add('dragover');
    });
    uploadVideoArea?.addEventListener('dragleave', () => {
        uploadVideoArea.classList.remove('dragover');
    });
    uploadVideoArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadVideoArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleVideoFile(e.dataTransfer.files[0]);
        }
    });

    // Remove video button
    document.getElementById('remove-video-btn')?.addEventListener('click', () => {
        formVideo = null;
        document.getElementById('video-preview').innerHTML = '';
    });

    // Save button
    document.getElementById('modal-save-btn')?.addEventListener('click', () => {
        saveRoomForm(editId, closeModal);
    });
}

function handleImageFiles(files) {
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            formImages.push(e.target.result);
            updateImagePreviews();
        };
        reader.readAsDataURL(file);
    });
}

function updateImagePreviews() {
    const container = document.getElementById('images-preview');
    if (!container) return;
    container.innerHTML = formImages.map((img, i) => `
        <div class="upload-preview-item" data-index="${i}">
            <img src="${img}" alt="Ảnh ${i + 1}">
            <button type="button" class="remove-btn remove-image" data-index="${i}">&times;</button>
        </div>
    `).join('');
}

function handleVideoFile(file) {
    if (!file.type.startsWith('video/')) {
        showToast('Vui lòng chọn file video', 'error');
        return;
    }
    if (file.size > 50 * 1024 * 1024) {
        showToast('Video quá lớn (tối đa 50MB)', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        formVideo = e.target.result;
        const preview = document.getElementById('video-preview');
        if (preview) {
            preview.innerHTML = `
                <div class="video-preview">
                    <video controls style="width: 100%; max-height: 200px;">
                        <source src="${formVideo}" type="${file.type}">
                    </video>
                    <button type="button" class="btn-danger" id="remove-video-btn" style="margin: 8px;">
                        <span class="material-symbols-rounded" style="font-size: 16px;">delete</span>
                        Xóa video
                    </button>
                </div>
            `;
            document.getElementById('remove-video-btn')?.addEventListener('click', () => {
                formVideo = null;
                preview.innerHTML = '';
            });
        }
    };
    reader.readAsDataURL(file);
}

async function saveRoomForm(editId, closeCallback) {
    const preview = document.getElementById('title-auto-preview');
    const roomTypeRadio = document.querySelector('input[name="form-room-type"]:checked');
    const roomType = roomTypeRadio?.value || preview?.dataset?.roomType;

    if (!roomType) { showToast('Vui lòng chọn loại phòng', 'error'); return; }

    // Generate title
    const prefix = getRoomTypeName(roomType);
    let title;

    if (editId !== null) {
        // Editing: keep original number if same type, recalculate if type changed
        const existingRoom = await getRoomById(editId);
        if (existingRoom && existingRoom.roomType === roomType) {
            title = existingRoom.title; // Keep original title
        } else {
            title = `${prefix} ${await getNextRoomNumber(roomType, editId)}`;
        }
    } else {
        title = preview?.dataset?.title || `${prefix} ${await getNextRoomNumber(roomType)}`;
    }

    const price = parseInt(document.getElementById('form-price')?.value);
    const moveInDate = document.getElementById('form-move-in-date')?.value || '';
    const area = document.getElementById('form-area')?.value;
    const address = document.getElementById('form-address')?.value.trim();
    const description = document.getElementById('form-description')?.value.trim();
    const adminNote = document.getElementById('form-admin-note')?.value.trim();

    // Validation
    if (!price || price <= 0) { showToast('Vui lòng nhập giá thuê hợp lệ', 'error'); return; }
    if (!area) { showToast('Vui lòng chọn khu vực', 'error'); return; }
    if (!address) { showToast('Vui lòng nhập địa chỉ', 'error'); return; }

    const roomData = {
        title,
        price,
        moveInDate,
        area,
        roomType,
        address,
        description: description || '',
        adminNote: adminNote || '',
        images: formImages,
        video: formVideo,
    };

    // Show saving state
    const submitBtn = document.querySelector('#room-form-container .btn-primary');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-symbols-rounded spinning">progress_activity</span> Đang lưu...';
    }

    try {
        if (editId !== null) {
            await updateRoom(editId, roomData);
            showToast('Đã cập nhật phòng trọ thành công!', 'success');
        } else {
            await addRoom(roomData);
            showToast('Đã thêm phòng trọ mới thành công!', 'success');
        }
        closeCallback();
        renderAdmin();
    } catch (err) {
        console.error('Save error:', err);
        showToast('Lỗi khi lưu phòng trọ. Vui lòng thử lại.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-symbols-rounded">save</span> Lưu phòng trọ';
        }
    }
}

// ============ DELETE CONFIRMATION ============

function openDeleteConfirm(room) {
    const modal = document.getElementById('modal');
    const overlay = document.getElementById('modal-overlay');

    modal.innerHTML = `
        <div class="modal-body">
            <div class="confirm-dialog">
                <span class="material-symbols-rounded">warning</span>
                <h3>Xác nhận xóa phòng trọ</h3>
                <p>Bạn có chắc chắn muốn xóa "<strong>${room.title}</strong>"?<br>Hành động này không thể hoàn tác.</p>
                <div class="btn-group">
                    <button class="btn-cancel" id="confirm-cancel">Hủy bỏ</button>
                    <button class="btn-confirm-delete" id="confirm-delete">
                        <span class="material-symbols-rounded" style="font-size: 18px; vertical-align: middle;">delete</span>
                        Xóa phòng
                    </button>
                </div>
            </div>
        </div>
    `;

    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const closeModal = () => {
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    };

    document.getElementById('confirm-cancel')?.addEventListener('click', closeModal);
    document.getElementById('confirm-delete')?.addEventListener('click', async () => {
        await deleteRoom(room.id);
        closeModal();
        showToast('Đã xóa phòng trọ thành công!', 'success');
        renderAdmin();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
}

// ============ ROUTE HANDLER ============

async function handleRoute() {
    const route = getRoute();
    updateActiveNav(route.page);

    // Instant scroll to top
    window.scrollTo(0, 0);

    try {
        switch (route.page) {
            case 'detail':
                await renderDetail(route.params.id);
                if (!isAdminAuthenticated) {
                    trackPageView('detail:' + route.params.id);
                    trackClick('room_view', route.params.id);
                }
                break;
            case 'admin':
                if (isAdminAuthenticated) {
                    await renderAdmin();
                } else {
                    renderAdminLogin();
                }
                break;
            default:
                await renderHome();
                if (!isAdminAuthenticated) {
                    trackPageView('home');
                }
        }
    } catch (err) {
        console.error('Route error:', err);
        const app = document.getElementById('app');
        app.innerHTML = '<div class="loading-spinner"><span class="material-symbols-rounded">error</span><p>Đã xảy ra lỗi. Vui lòng tải lại trang.</p></div>';
    }

    // Show/hide floating contact buttons (hide on admin page)
    try {
        await updateFloatingButtons(route.page);
    } catch (e) {
        console.error('Floating buttons error:', e);
    }
}

// ============ NAVBAR SCROLL EFFECT ============

window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 10) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ============ INITIALIZATION ============

window.addEventListener('hashchange', handleRoute);

window.addEventListener('DOMContentLoaded', async () => {
    await initData();
    await updateFloatingButtons('home');
    await handleRoute();
});

// Welcome popup fires independently
window.addEventListener('load', () => {
    setTimeout(() => showWelcomePopup(), 800);
});

// ============ WELCOME POPUP ============

function showWelcomePopup() {
    // Don't show for admin or if already shown this session
    if (isAdminAuthenticated) return;
    if (sessionStorage.getItem('welcome_shown')) return;
    sessionStorage.setItem('welcome_shown', 'true');

    const popup = document.createElement('div');
    popup.className = 'welcome-popup';
    popup.innerHTML = `
        <div class="welcome-popup-card">
            <button class="welcome-close" id="welcome-close-btn">
                <span class="material-symbols-rounded">close</span>
            </button>
            <div class="welcome-emoji">👋</div>
            <h3>Xin chào mọi người!</h3>
            <p>Chào mừng đến với <strong>Tìm Nhà của Trần Xuân Đạt</strong>.</p>
            <p>Mọi người tìm kiếm phòng, nếu chưa tìm được phòng ưng ý nhắn tin Zalo em Đạt để nhận nhiều phòng hơn nha.</p>
            <p class="welcome-thanks">Cám ơn mọi người ❤️</p>
            <a href="https://zalo.me/84965278868" target="_blank" rel="noopener" class="welcome-zalo-btn">
                <span class="material-symbols-rounded">chat</span>
                Nhắn Zalo Đạt
            </a>
            <div class="welcome-timer-bar" id="welcome-timer-bar"></div>
        </div>
    `;

    document.body.appendChild(popup);

    // Auto close after 10s
    let timer = setTimeout(() => closeWelcome(popup), 10000);

    // Close button
    popup.querySelector('#welcome-close-btn').addEventListener('click', () => {
        clearTimeout(timer);
        closeWelcome(popup);
    });

    // Click overlay to close
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            clearTimeout(timer);
            closeWelcome(popup);
        }
    });
}

function closeWelcome(popup) {
    popup.classList.add('welcome-closing');
    setTimeout(() => popup.remove(), 400);
}

// ============ FLOATING CONTACT BUTTONS ============

async function updateFloatingButtons(page) {
    const container = document.getElementById('floating-contact');
    if (!container) return;

    if (page === 'admin') {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    const contact = await getContactInfo();
    const phoneBtn = document.getElementById('float-phone');
    const zaloBtn = document.getElementById('float-zalo');

    if (phoneBtn && contact.phone) {
        phoneBtn.href = `tel:${contact.phone}`;
        phoneBtn.addEventListener('click', () => trackClick('phone_click'));
    }
    if (zaloBtn && contact.zaloLink) {
        zaloBtn.href = contact.zaloLink;
        zaloBtn.addEventListener('click', () => trackClick('zalo_click'));
    }
}
