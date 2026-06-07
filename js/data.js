// ============================================
// Tìm Phòng Trọ - Mock Data & CRUD Operations
// ============================================

const STORAGE_KEY = 'phongtro_rooms';

// --- Placeholder Image Generator ---
function createPlaceholder(text, color1, color2, icon = '🏠') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="${color1}"/>
                <stop offset="100%" stop-color="${color2}"/>
            </linearGradient>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
            </pattern>
        </defs>
        <rect width="800" height="600" fill="url(#bg)"/>
        <rect width="800" height="600" fill="url(#grid)"/>
        <text x="400" y="270" text-anchor="middle" font-size="72">${icon}</text>
        <text x="400" y="340" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="24" font-family="sans-serif" font-weight="600">${text}</text>
        <text x="400" y="375" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="14" font-family="sans-serif">Tìm Phòng Trọ</text>
    </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// --- Default Mock Data ---
const colorPalettes = [
    ['#4f46e5', '#7c3aed'],   // Indigo -> Purple
    ['#0891b2', '#0d9488'],   // Cyan -> Teal
    ['#7c3aed', '#ec4899'],   // Purple -> Pink
    ['#059669', '#0d9488'],   // Emerald -> Teal
    ['#2563eb', '#7c3aed'],   // Blue -> Purple
    ['#d97706', '#dc2626'],   // Amber -> Red
    ['#0369a1', '#0891b2'],   // Sky -> Cyan
    ['#7c2d12', '#dc2626'],   // Brown -> Red
    ['#4338ca', '#6366f1'],   // Indigo deep
];

const defaultRooms = [
    {
        id: 1,
        title: 'Phòng studio 1',
        price: 4500000,
        address: 'Tòa S1.02, Vinhomes Grand Park, TP. Thủ Đức',
        area: 'Vin 1',
        roomType: 'studio',
        size: 30,
        description: 'Phòng trọ studio cao cấp, full nội thất mới 100%. View trực diện hồ bơi, thoáng mát. Bao gồm: giường, tủ quần áo, bàn làm việc, máy lạnh, tủ lạnh, máy giặt riêng.\n\nTiện ích xung quanh: hồ bơi, gym, công viên, siêu thị, trường học.\n\nLiên hệ xem phòng: 0901 234 567',
        images: [
            createPlaceholder('Studio View Hồ Bơi', '#4f46e5', '#7c3aed', '🏊'),
            createPlaceholder('Phòng Ngủ', '#7c3aed', '#ec4899', '🛏️'),
            createPlaceholder('Phòng Bếp', '#0891b2', '#0d9488', '🍳'),
        ],
        video: null,
        moveInDate: '2026-07-01',
    },
    {
        id: 2,
        title: 'Phòng trọ 1',
        price: 3200000,
        address: 'Tòa S1.05, Vinhomes Grand Park, TP. Thủ Đức',
        area: 'Vin 1',
        roomType: 'phongtro',
        size: 22,
        description: 'Phòng trọ sạch sẽ, an ninh 24/7. Giá thuê đã bao gồm phí quản lý. Thích hợp cho sinh viên và người đi làm.\n\nNội thất cơ bản: giường, tủ, máy lạnh. Gần trường Đại học, bệnh viện, chợ.\n\nGiá điện: 3.500đ/kWh, nước: 80.000đ/người.',
        images: [
            createPlaceholder('Phòng Tiện Nghi', '#0891b2', '#0d9488', '📚'),
            createPlaceholder('Góc Học Tập', '#059669', '#0d9488', '💻'),
        ],
        video: null,
        moveInDate: '2026-06-15',
    },
    {
        id: 3,
        title: 'Phòng studio 2',
        price: 5500000,
        address: 'Tòa S1.08, Vinhomes Grand Park, TP. Thủ Đức',
        area: 'Vin 1',
        roomType: 'studio',
        size: 35,
        description: 'Căn hộ mini cao cấp với ban công rộng view thành phố. Full nội thất nhập khẩu. Bảo vệ 24/7, thang máy, hầm gửi xe.\n\nBao gồm: giường king size, sofa, TV 50 inch, tủ lạnh, máy giặt, bếp từ.\n\nPhù hợp cho cặp đôi hoặc người đi làm.',
        images: [
            createPlaceholder('Căn Hộ Sang Trọng', '#7c3aed', '#ec4899', '✨'),
            createPlaceholder('Ban Công View', '#2563eb', '#7c3aed', '🌆'),
            createPlaceholder('Phòng Tắm', '#4338ca', '#6366f1', '🚿'),
            createPlaceholder('Bếp Hiện Đại', '#d97706', '#dc2626', '🍽️'),
        ],
        video: null,
        moveInDate: '2026-07-10',
    },
    {
        id: 4,
        title: 'Phòng trọ 2',
        price: 2800000,
        address: 'Tòa S2.03, Vinhomes Grand Park, TP. Thủ Đức',
        area: 'Vin 2',
        roomType: 'phongtro',
        size: 20,
        description: 'Phòng trọ mới xây hoàn toàn, chưa qua sử dụng. Sơn mới, sàn gạch men sạch sẽ. Camera an ninh 24/7.\n\nNội thất: giường, tủ, bàn ghế, máy lạnh. Khu vực yên tĩnh, gần công viên.\n\nGiá thuê chưa bao gồm điện nước.',
        images: [
            createPlaceholder('Phòng Mới 100%', '#059669', '#0d9488', '🆕'),
            createPlaceholder('Khu Vực Chung', '#0369a1', '#0891b2', '🏢'),
        ],
        video: null,
        moveInDate: '2026-06-20',
    },
    {
        id: 5,
        title: 'Phòng studio 3',
        price: 4200000,
        address: 'Tòa S2.01, Vinhomes Grand Park, TP. Thủ Đức',
        area: 'Vin 2',
        roomType: 'studio',
        size: 28,
        description: 'Studio thiết kế hiện đại, tone màu trắng - xám sang trọng. Full nội thất cao cấp.\n\nTiện ích: hồ bơi, gym, sân tennis, công viên BBQ, siêu thị, nhà thuốc.\n\nĐặc biệt: có chỗ để xe hơi riêng.',
        images: [
            createPlaceholder('Studio Cao Cấp', '#2563eb', '#7c3aed', '🏠'),
            createPlaceholder('Nội Thất', '#4f46e5', '#7c3aed', '🪑'),
            createPlaceholder('View Đêm', '#0369a1', '#0891b2', '🌙'),
        ],
        video: null,
        moveInDate: '2026-08-01',
    },
    {
        id: 6,
        title: 'Phòng trọ 3',
        price: 2500000,
        address: 'Tòa S2.07, Vinhomes Grand Park, TP. Thủ Đức',
        area: 'Vin 2',
        roomType: 'phongtro',
        size: 18,
        description: 'Phòng trọ giá rẻ dành cho sinh viên. Gần các trường Đại học lớn. Khu vực an ninh, có bảo vệ.\n\nBao gồm: giường tầng, quạt trần, nhà vệ sinh riêng.\n\nWifi miễn phí, giữ xe miễn phí.',
        images: [
            createPlaceholder('Phòng Sinh Viên', '#d97706', '#dc2626', '🎓'),
        ],
        video: null,
        moveInDate: '2026-06-10',
    },
    {
        id: 7,
        title: 'Phòng studio 4',
        price: 7500000,
        address: 'Tòa S3.02, Vinhomes Grand Park, TP. Thủ Đức',
        area: 'Vin 3',
        roomType: 'studio',
        size: 45,
        description: 'Penthouse mini tầng cao nhất, view 360 độ toàn cảnh thành phố. Thiết kế mở, trần cao 3.5m.\n\nFull nội thất nhập khẩu: bếp đảo, phòng tắm kính, ban công BBQ riêng.\n\nPhù hợp cho khách VIP, doanh nhân.',
        images: [
            createPlaceholder('Penthouse View 360°', '#7c3aed', '#ec4899', '🌇'),
            createPlaceholder('Phòng Khách', '#4f46e5', '#7c3aed', '🛋️'),
            createPlaceholder('Bếp Đảo', '#d97706', '#dc2626', '👨‍🍳'),
            createPlaceholder('Phòng Tắm Kính', '#0891b2', '#0d9488', '🪞'),
        ],
        video: null,
        moveInDate: '2026-07-15',
    },
    {
        id: 8,
        title: 'Phòng studio 5',
        price: 5000000,
        address: 'Tòa S3.05, Vinhomes Grand Park, TP. Thủ Đức',
        area: 'Vin 3',
        roomType: 'studio',
        size: 32,
        description: 'Studio thiết kế hiện đại theo phong cách Scandinavian. Gần trung tâm thương mại Vincom.\n\nNội thất: giường gấp thông minh, bàn làm việc, tủ âm tường, máy lạnh inverter.\n\nPhí quản lý: 300.000đ/tháng.',
        images: [
            createPlaceholder('Studio Hiện Đại', '#4338ca', '#6366f1', '🏬'),
            createPlaceholder('Không Gian Mở', '#059669', '#0d9488', '🪟'),
            createPlaceholder('Phòng Ngủ Ấm Cúng', '#7c2d12', '#dc2626', '💤'),
        ],
        video: null,
        moveInDate: '2026-07-20',
    },
    {
        id: 9,
        title: 'Phòng studio 6',
        price: 6200000,
        address: 'Tòa S3.01, Vinhomes Grand Park, TP. Thủ Đức',
        area: 'Vin 3',
        roomType: 'studio',
        size: 40,
        description: 'Duplex mini 2 tầng độc đáo. Tầng dưới: phòng khách + bếp. Tầng trên: phòng ngủ + phòng tắm.\n\nThiết kế tối ưu không gian, cầu thang gỗ tự nhiên. Cửa sổ lớn đón ánh sáng tự nhiên.\n\nPhù hợp cho gia đình nhỏ hoặc cặp đôi.',
        images: [
            createPlaceholder('Duplex 2 Tầng', '#0369a1', '#0891b2', '🏡'),
            createPlaceholder('Tầng Dưới', '#059669', '#0d9488', '🪴'),
            createPlaceholder('Tầng Trên', '#7c3aed', '#ec4899', '🌟'),
        ],
        video: null,
        moveInDate: '2026-08-15',
    },
];

// --- CRUD Operations ---

const DATA_VERSION = 5; // Bump to force re-init on all devices
const VERSION_KEY = 'phongtro_version';

export function initData() {
    const currentVersion = parseInt(localStorage.getItem(VERSION_KEY) || '0');
    if (!localStorage.getItem(STORAGE_KEY) || currentVersion < DATA_VERSION) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultRooms));
        localStorage.setItem(VERSION_KEY, DATA_VERSION.toString());
    }
}

export function getRooms() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : defaultRooms;
}

function saveRooms(rooms) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

export function getRoomById(id) {
    const rooms = getRooms();
    return rooms.find(r => r.id === id) || null;
}

export function addRoom(room) {
    const rooms = getRooms();
    const maxId = rooms.length > 0 ? Math.max(...rooms.map(r => r.id)) : 0;
    room.id = maxId + 1;
    rooms.push(room);
    saveRooms(rooms);
    return room;
}

export function updateRoom(id, updatedData) {
    const rooms = getRooms();
    const index = rooms.findIndex(r => r.id === id);
    if (index === -1) return null;
    rooms[index] = { ...rooms[index], ...updatedData, id };
    saveRooms(rooms);
    return rooms[index];
}

export function deleteRoom(id) {
    let rooms = getRooms();
    rooms = rooms.filter(r => r.id !== id);
    saveRooms(rooms);
}

export function resetData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultRooms));
}

// --- Contact Info ---
const CONTACT_KEY = 'phongtro_contact';

const defaultContact = {
    phone: '0965278868',
    zaloLink: 'https://zalo.me/84965278868',
};

export function getContactInfo() {
    const data = localStorage.getItem(CONTACT_KEY);
    return data ? JSON.parse(data) : { ...defaultContact };
}

export function saveContactInfo(contact) {
    localStorage.setItem(CONTACT_KEY, JSON.stringify(contact));
}
