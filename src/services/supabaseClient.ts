import { createClient } from '@supabase/supabase-js';

// Default connection parameters provided by user
const DEFAULT_SUPABASE_URL = 'https://dwpremcqguvpeheynvsk.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cHJlbWNxZ3V2cGVoZXludnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1Mjg1ODIsImV4cCI6MjEwNzEwNDU4Mn0.mRK4cHOyjjBZ7AedpM9azqE6JoJxVuGBfmVGmIwz0A4';

const STORAGE_KEYS = {
  URL: 'transport_billing_supabase_url',
  KEY: 'transport_billing_supabase_key',
  AUTO_SYNC: 'transport_billing_supabase_autosync',
};

// Normalize URL (strip trailing /rest/v1 or /rest/v1/)
export function sanitizeSupabaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  if (url.endsWith('/rest/v1')) {
    url = url.replace(/\/rest\/v1$/, '');
  }
  return url || DEFAULT_SUPABASE_URL;
}

export function getStoredSupabaseConfig() {
  const customUrl = localStorage.getItem(STORAGE_KEYS.URL);
  const customKey = localStorage.getItem(STORAGE_KEYS.KEY);
  const autoSync = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC) !== 'false'; // default true

  const url = sanitizeSupabaseUrl(customUrl || DEFAULT_SUPABASE_URL);
  const anonKey = (customKey || DEFAULT_SUPABASE_ANON_KEY).trim();

  return { url, anonKey, autoSync };
}

export function saveSupabaseConfig(url: string, anonKey: string, autoSync: boolean) {
  const cleanUrl = sanitizeSupabaseUrl(url);
  localStorage.setItem(STORAGE_KEYS.URL, cleanUrl);
  localStorage.setItem(STORAGE_KEYS.KEY, anonKey.trim());
  localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, String(autoSync));
  supabaseClientInstance = null; // Reset singleton
}

export function resetSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEYS.URL);
  localStorage.removeItem(STORAGE_KEYS.KEY);
  localStorage.removeItem(STORAGE_KEYS.AUTO_SYNC);
  supabaseClientInstance = null;
}

let supabaseClientInstance: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!supabaseClientInstance) {
    const { url, anonKey } = getStoredSupabaseConfig();
    supabaseClientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseClientInstance;
}

/**
 * Test connectivity with Supabase by checking a lightweight query or schema table
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  tablesFound?: string[];
  missingTables?: string[];
}> {
  const client = getSupabase();
  const requiredTables = [
    'transport_trips',
    'transport_diesel_prices',
    'transport_rate_cards',
    'transport_zone_mappings',
    'transport_quotations',
    'transport_fixed_customers',
  ];

  try {
    // Probe each table with limit 1
    const missing: string[] = [];
    const found: string[] = [];

    for (const table of requiredTables) {
      const { error } = await client.from(table).select('count', { count: 'exact', head: true });
      if (error) {
        // Code 42P01 means table does not exist
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
          missing.push(table);
        } else {
          // Other error (e.g. permission or network)
          missing.push(table);
        }
      } else {
        found.push(table);
      }
    }

    if (found.length === requiredTables.length) {
      return {
        success: true,
        message: 'เชื่อมต่อ Supabase สำเร็จ และพบตารางครบทุกตาราง (6/6 ตาราง)',
        tablesFound: found,
        missingTables: [],
      };
    } else if (found.length > 0) {
      return {
        success: true,
        message: `เชื่อมต่อ Supabase สำเร็จ แต่พบตารางเพียง ${found.length}/${requiredTables.length} ตาราง กรุณารัน SQL Script`,
        tablesFound: found,
        missingTables: missing,
      };
    } else {
      // Test basic rest connection
      const { data, error } = await client.from('transport_trips').select('id').limit(1);
      if (error && error.code === '42P01') {
        return {
          success: true,
          message: 'เชื่อมต่อกับ Supabase ได้สำเร็จ (Auth & API Key ถูกต้อง) แต่ยังไม่ได้สร้างตารางใน Database กรุณาก๊อปปี้ SQL Script ไปรันใน Supabase SQL Editor',
          tablesFound: [],
          missingTables: requiredTables,
        };
      } else if (error) {
        return {
          success: false,
          message: `เชื่อมต่อไม่สำเร็จ: ${error.message} (${error.hint || error.code || ''})`,
          tablesFound: [],
          missingTables: requiredTables,
        };
      }
      return {
        success: true,
        message: 'เชื่อมต่อ Supabase สำเร็จ',
        tablesFound: requiredTables,
        missingTables: [],
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `ไม่สามารถเชื่อมต่อได้: ${err?.message || 'Network Error'}`,
      tablesFound: [],
      missingTables: requiredTables,
    };
  }
}
