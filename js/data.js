// ============================================
// Tìm Phòng Trọ - Supabase Data Layer
// All CRUD operations via Supabase Database + Storage
// ============================================

import { supabase } from './supabase.js';

// ============ HELPERS ============

// Map DB row (snake_case) → JS object (camelCase)
function mapRoom(row) {
    return {
        id: row.id,
        title: row.title,
        price: row.price,
        address: row.address,
        area: row.area,
        roomType: row.room_type,
        roomConfig: row.room_config || null,
        description: row.description || '',
        adminNote: row.admin_note || '',
        moveInDate: row.move_in_date || '',
        images: (row.room_images || [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(img => img.image_url),
        video: row.video_url || null,
    };
}

// Convert base64 data URL to Blob
function base64ToBlob(base64) {
    const [meta, data] = base64.split(',');
    const mime = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bytes = atob(data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

// Upload a single file to Supabase Storage
async function uploadToStorage(base64, folder) {
    const blob = base64ToBlob(base64);
    const ext = blob.type.split('/')[1] || 'jpg';
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
        .from('room-media')
        .upload(filename, blob, { cacheControl: '3600', upsert: false });

    if (error) throw error;

    const { data: urlData } = supabase.storage
        .from('room-media')
        .getPublicUrl(filename);

    return urlData.publicUrl;
}

// Delete a file from Supabase Storage by URL
async function deleteFromStorage(url) {
    try {
        const base = supabase.storage.from('room-media').getPublicUrl('').data.publicUrl;
        const path = url.replace(base, '');
        if (path) {
            await supabase.storage.from('room-media').remove([path]);
        }
    } catch (e) {
        console.warn('Failed to delete media:', e);
    }
}

// ============ ROOM CRUD ============

export async function initData() {
    // No-op: data lives in Supabase, not localStorage
}

export async function getRooms() {
    const { data, error } = await supabase
        .from('rooms')
        .select('*, room_images(*)')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('getRooms error:', error);
        return [];
    }
    return data.map(mapRoom);
}

export async function getRoomById(id) {
    const { data, error } = await supabase
        .from('rooms')
        .select('*, room_images(*)')
        .eq('id', id)
        .single();

    if (error || !data) return null;
    return mapRoom(data);
}

export async function addRoom(roomData) {
    // 1. Upload images to Storage
    const imageUrls = [];
    for (const img of (roomData.images || [])) {
        if (img.startsWith('data:')) {
            const url = await uploadToStorage(img, 'images');
            imageUrls.push(url);
        } else {
            imageUrls.push(img); // Already a URL
        }
    }

    // 2. Upload video if exists
    let videoUrl = null;
    if (roomData.video) {
        if (roomData.video.startsWith('data:')) {
            videoUrl = await uploadToStorage(roomData.video, 'videos');
        } else {
            videoUrl = roomData.video;
        }
    }

    // 3. Insert room record
    const { data: room, error } = await supabase
        .from('rooms')
        .insert({
            title: roomData.title,
            price: roomData.price,
            address: roomData.address,
            area: roomData.area,
            room_type: roomData.roomType,
            room_config: roomData.roomConfig || null,
            description: roomData.description || '',
            admin_note: roomData.adminNote || '',
            move_in_date: roomData.moveInDate || null,
            video_url: videoUrl,
        })
        .select()
        .single();

    if (error) throw error;

    // 4. Insert room_images records
    if (imageUrls.length > 0) {
        const { error: imgError } = await supabase
            .from('room_images')
            .insert(imageUrls.map((url, i) => ({
                room_id: room.id,
                image_url: url,
                sort_order: i,
            })));
        if (imgError) console.error('Insert images error:', imgError);
    }

    return { ...room, images: imageUrls, video: videoUrl };
}

export async function updateRoom(id, roomData) {
    // 1. Handle images: upload new ones, keep existing URLs
    const imageUrls = [];
    for (const img of (roomData.images || [])) {
        if (img.startsWith('data:')) {
            const url = await uploadToStorage(img, 'images');
            imageUrls.push(url);
        } else {
            imageUrls.push(img);
        }
    }

    // 2. Handle video
    let videoUrl = roomData.video || null;
    if (videoUrl && videoUrl.startsWith('data:')) {
        videoUrl = await uploadToStorage(videoUrl, 'videos');
    }

    // 3. Update room record
    const { error } = await supabase
        .from('rooms')
        .update({
            title: roomData.title,
            price: roomData.price,
            address: roomData.address,
            area: roomData.area,
            room_type: roomData.roomType,
            room_config: roomData.roomConfig || null,
            description: roomData.description || '',
            admin_note: roomData.adminNote || '',
            move_in_date: roomData.moveInDate || null,
            video_url: videoUrl,
        })
        .eq('id', id);

    if (error) throw error;

    // 4. Replace room_images: delete old, insert new
    await supabase.from('room_images').delete().eq('room_id', id);

    if (imageUrls.length > 0) {
        await supabase.from('room_images').insert(
            imageUrls.map((url, i) => ({
                room_id: id,
                image_url: url,
                sort_order: i,
            }))
        );
    }

    return { id, ...roomData, images: imageUrls, video: videoUrl };
}

export async function deleteRoom(id) {
    // Get room to find media files to delete
    const room = await getRoomById(id);
    if (room) {
        // Delete images from storage
        for (const img of (room.images || [])) {
            await deleteFromStorage(img);
        }
        // Delete video from storage
        if (room.video) {
            await deleteFromStorage(room.video);
        }
    }

    // Delete room (room_images cascade-deleted)
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (error) throw error;
}

// ============ CONTACT INFO ============

const defaultContact = {
    phone: '0965278868',
    zaloLink: 'https://zalo.me/84965278868',
};

export async function getContactInfo() {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'contact')
        .single();

    if (error || !data) return { ...defaultContact };
    return data.value;
}

export async function saveContactInfo(contact) {
    const { error } = await supabase
        .from('settings')
        .update({ value: contact, updated_at: new Date().toISOString() })
        .eq('key', 'contact');

    if (error) throw error;
}

// ============ ADMIN AUTH ============

export async function verifyAdmin(username, password) {
    const { data, error } = await supabase
        .rpc('verify_admin', { p_username: username, p_password: password });

    if (error) {
        console.error('Auth error:', error);
        return false;
    }
    return data === true;
}

// ============ ROOM COUNTING (for auto title) ============

export async function getNextRoomNumber(type, excludeId = null) {
    const rooms = await getRooms();
    let maxNum = 0;
    rooms.forEach(r => {
        if (r.roomType === type && r.id !== excludeId) {
            const match = r.title.match(/(\d+)\s*$/);
            if (match) {
                maxNum = Math.max(maxNum, parseInt(match[1]));
            }
        }
    });
    if (maxNum === 0) {
        maxNum = rooms.filter(r => r.roomType === type && r.id !== excludeId).length;
    }
    return maxNum + 1;
}

// ============ ANALYTICS ============

function isAdmin() {
    return sessionStorage.getItem('admin_auth') === 'true';
}

export async function trackPageView(page) {
    if (isAdmin()) return; // Don't track admin views
    try {
        await supabase.from('page_views').insert({
            page,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent || null,
        });
    } catch (e) {
        // silent fail — don't break the app for analytics
    }
}

export async function trackClick(eventType, roomId = null) {
    if (isAdmin()) return; // Don't track admin clicks
    try {
        await supabase.from('click_events').insert({
            event_type: eventType,
            room_id: roomId,
        });
    } catch (e) {
        // silent fail
    }
}

export async function getAnalyticsSummary() {
    // Helper: fetch ALL rows from a table (bypasses Supabase 1000-row limit)
    async function fetchAll(table, selectCols) {
        const PAGE_SIZE = 1000;
        let all = [];
        let offset = 0;
        while (true) {
            const { data, error } = await supabase
                .from(table)
                .select(selectCols)
                .range(offset, offset + PAGE_SIZE - 1)
                .order('created_at', { ascending: true });
            if (error || !data || data.length === 0) break;
            all = all.concat(data);
            if (data.length < PAGE_SIZE) break; // last page
            offset += PAGE_SIZE;
        }
        return all;
    }

    const allPageViews = await fetchAll('page_views', 'created_at');
    const allClicks = await fetchAll('click_events', 'event_type, room_id, created_at');

    return { allPageViews: allPageViews || [], allClicks: allClicks || [] };
}


