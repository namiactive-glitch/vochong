
/**
 * Persistence service to handle saving and loading state to localStorage
 */

export const saveState = (key: string, state: any) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(key, serializedState);
  } catch (err) {
    console.error(`Error saving state for key ${key}:`, err);
  }
};

export const loadState = <T>(key: string, defaultValue: T): T => {
  try {
    const serializedState = localStorage.getItem(key);
    if (serializedState === null) {
      return defaultValue;
    }
    return JSON.parse(serializedState) as T;
  } catch (err) {
    console.error(`Error loading state for key ${key}:`, err);
    return defaultValue;
  }
};

export const clearState = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`Error clearing state for key ${key}:`, err);
  }
};
