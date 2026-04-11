
import { GoogleGenAI } from "@google/genai";

const STORAGE_KEY = 'koc_studio_api_keys_v2';

interface ApiKeyInfo {
  key: string;
  exhaustedUntil: number | null; // Timestamp
}

export const getStoredKeys = (): ApiKeyInfo[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    const keys: ApiKeyInfo[] = JSON.parse(saved);
    // Reset exhausted status if it's a new day
    const now = Date.now();
    let changed = false;
    const updatedKeys = keys.map(k => {
      if (k.exhaustedUntil && k.exhaustedUntil < now) {
        changed = true;
        return { ...k, exhaustedUntil: null };
      }
      return k;
    });
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedKeys));
    }
    return updatedKeys;
  } catch (e) {
    // Fallback for old format
    const oldKeys = saved.split('\n').map(k => k.trim()).filter(k => k.length > 0);
    return oldKeys.map(key => ({ key, exhaustedUntil: null }));
  }
};

export const saveStoredKeys = (keys: string[] | ApiKeyInfo[]) => {
  if (Array.isArray(keys) && typeof keys[0] === 'string') {
    const newKeys = (keys as string[]).map(key => ({ key, exhaustedUntil: null }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  }
};

export const markKeyExhausted = (key: string) => {
  const keys = getStoredKeys();
  const now = new Date();
  // Set exhausted until end of today (midnight)
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  
  const updatedKeys = keys.map(k => {
    if (k.key === key) {
      return { ...k, exhaustedUntil: tomorrow.getTime() };
    }
    return k;
  });
  saveStoredKeys(updatedKeys);
};

export const getAiClient = (): { client: GoogleGenAI, key: string } => {
  const keys = getStoredKeys();
  const availableKey = keys.find(k => !k.exhaustedUntil);
  
  if (!availableKey) {
    if (keys.length > 0) {
      throw new Error('Tất cả API Key hiện tại đều đã hết lượt truy cập trong ngày hôm nay. Vui lòng thêm Key mới hoặc quay lại vào ngày mai.');
    }
    throw new Error('Không tìm thấy API Key. Vui lòng đăng nhập và nhập API Key.');
  }

  return { 
    client: new GoogleGenAI({ apiKey: availableKey.key }), 
    key: availableKey.key 
  };
};
