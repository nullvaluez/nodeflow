// Storage adapter for persisting automation configurations

/**
 * Generate a storage key for a given origin
 * @param {string} url
 * @returns {string}
 */
function getStorageKey(url) {
  try {
    const urlObj = new URL(url);
    const origin = urlObj.origin;
    // Simple hash for key
    let hash = 0;
    for (let i = 0; i < origin.length; i++) {
      const char = origin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `automation_config_${Math.abs(hash).toString(36)}`;
  } catch (e) {
    return 'automation_config_default';
  }
}

export const storageAdapter = {
  /**
   * Save automation configuration for a URL
   * @param {string} url - Page URL
   * @param {Object} config - Configuration to save
   */
  async saveConfig(url, config) {
    const key = getStorageKey(url);
    const data = {
      url,
      config,
      savedAt: Date.now()
    };
    
    await chrome.storage.sync.set({ [key]: data });
  },

  /**
   * Load automation configuration for a URL
   * @param {string} url - Page URL
   * @returns {Object|null} Saved configuration or null
   */
  async loadConfig(url) {
    const key = getStorageKey(url);
    const result = await chrome.storage.sync.get(key);
    
    if (result[key]) {
      return result[key].config;
    }
    
    return null;
  },

  /**
   * List all saved configurations
   * @returns {Array} Array of saved configs
   */
  async listConfigs() {
    const allData = await chrome.storage.sync.get(null);
    const configs = [];
    
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('automation_config_')) {
        configs.push({
          key,
          url: value.url,
          savedAt: value.savedAt
        });
      }
    }
    
    return configs.sort((a, b) => b.savedAt - a.savedAt);
  },

  /**
   * Delete a configuration
   * @param {string} url - Page URL
   */
  async deleteConfig(url) {
    const key = getStorageKey(url);
    await chrome.storage.sync.remove(key);
  }
};

