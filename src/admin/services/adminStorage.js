export const ADMIN_STORAGE_KEY = "klean-admin-content-clean-v1";

export const adminStorage = {
  load() {
    try {
      const value = localStorage.getItem(ADMIN_STORAGE_KEY);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },
  save(content) {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(content));
  },
};
