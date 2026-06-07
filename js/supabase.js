// ============================================
// Tìm Phòng Trọ - Supabase Client
// Uses global supabase-js loaded via CDN <script> tag
// window.supabase is set by: cdn.jsdelivr.net/npm/@supabase/supabase-js@2
// ============================================

const SUPABASE_URL = 'https://hrerxwayzwokxbruvmnr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZXJ4d2F5endva3hicnV2bW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Nzg2OTksImV4cCI6MjA5NjM1NDY5OX0.bocN5I07n070AaBtSZjr4rplGRpc-TibD9mOgImSiFM';

// window.supabase is the global object from the UMD CDN script
const { createClient } = window.supabase;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
