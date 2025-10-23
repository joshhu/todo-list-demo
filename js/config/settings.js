/**
 * 應用程式設定模組
 *
 * 負責管理應用程式的各種設定，包括：
 * - 預設設定值
 * - 使用者偏好設定
 * - 設定的儲存和載入
 * - 設定變更的事件通知
 */

export class Settings {
  constructor() {
    this.settings = {};
    this.listeners = new Map();
    this.storageKey = 'todolist-settings';
    this.defaultSettings = {
      // 應用程式基本設定
      app: {
        name: 'Todo List',
        version: '1.0.0',
        language: 'zh-TW',
        theme: 'auto', // 'light', 'dark', 'auto'
        autoSave: true,
        autoSaveInterval: 5000, // 5 秒
      },

      // 任務設定
      tasks: {
        defaultPriority: 'medium',
        autoSort: true,
        defaultSortBy: 'created-desc',
        pageSize: 20,
        showCompleted: true,
        compactMode: false,
        showDescription: true,
        showTags: true,
        showDueDate: true,
      },

      // UI 設定
      ui: {
        viewMode: 'list', // 'list', 'grid'
        sidebarWidth: 320,
        animations: true,
        soundEffects: false,
        notifications: true,
        confirmationDialogs: true,
        keyboardShortcuts: true,
      },

      // 資料設定
      data: {
        localStorage: true,
        syncEnabled: false,
        syncServer: '',
        lastBackup: null,
        autoBackup: false,
        backupInterval: 86400000, // 24 小時
      },

      // 開發設定（僅在開發模式下可用）
      debug: {
        enabled: false,
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        showPerformanceMetrics: false,
        enableConsoleLog: true,
      }
    };
  }

  /**
   * 初始化設定
   */
  async initialize() {
    try {
      // 載入設定
      await this.loadSettings();

      // 應用主題設定
      this.applyTheme();

      // 監聽系統主題變更
      this.watchSystemTheme();

      console.log('✅ 設定模組初始化完成');
    } catch (error) {
      console.error('❌ 設定模組初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取設定值
   * @param {string} path - 設定路徑，例如 'tasks.defaultPriority'
   * @param {*} defaultValue - 預設值
   * @returns {*} 設定值
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let current = this.settings;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * 設定值
   * @param {string} path - 設定路徑
   * @param {*} value - 要設定的值
   * @param {boolean} save - 是否立即儲存
   */
  set(path, value, save = true) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = this.settings;

    // 創建嵌套對象路徑
    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    const oldValue = current[lastKey];
    current[lastKey] = value;

    // 觸發變更事件
    this.notifyListeners(path, value, oldValue);

    // 儲存設定
    if (save) {
      this.saveSettings();
    }

    // 處理特殊設定
    this.handleSpecialSettingChange(path, value);
  }

  /**
   * 更新多個設定
   * @param {Object} updates - 要更新的設定對象
   * @param {boolean} save - 是否立即儲存
   */
  update(updates, save = true) {
    Object.entries(updates).forEach(([path, value]) => {
      this.set(path, value, false);
    });

    if (save) {
      this.saveSettings();
    }
  }

  /**
   * 重置設定到預設值
   * @param {string} path - 要重置的設定路徑，如果為空則重置所有設定
   */
  reset(path = null) {
    if (path) {
      const defaultValue = this.getDefault(path);
      this.set(path, defaultValue);
    } else {
      this.settings = this.deepClone(this.defaultSettings);
      this.saveSettings();
      this.notifyListeners('*', this.settings, null);
    }
  }

  /**
   * 獲取預設設定值
   * @param {string} path - 設定路徑
   * @returns {*} 預設值
   */
  getDefault(path) {
    const keys = path.split('.');
    let current = this.defaultSettings;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * 監聽設定變更
   * @param {string} path - 要監聽的設定路徑，'*' 表示監聽所有變更
   * @param {Function} callback - 回調函數
   * @returns {Function} 取消監聽的函數
   */
  onChange(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }

    this.listeners.get(path).add(callback);

    // 返回取消監聽的函數
    return () => {
      const pathListeners = this.listeners.get(path);
      if (pathListeners) {
        pathListeners.delete(callback);
        if (pathListeners.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }

  /**
   * 從本地儲存載入設定
   */
  async loadSettings() {
    try {
      const savedSettings = localStorage.getItem(this.storageKey);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // 合併預設設定和儲存的設定
        this.settings = this.mergeSettings(this.defaultSettings, parsed);
      } else {
        this.settings = this.deepClone(this.defaultSettings);
      }
    } catch (error) {
      console.warn('載入設定失敗，使用預設設定:', error);
      this.settings = this.deepClone(this.defaultSettings);
    }
  }

  /**
   * 儲存設定到本地儲存
   */
  async saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.error('儲存設定失敗:', error);
    }
  }

  /**
   * 合併設定對象
   * @param {Object} defaultSettings - 預設設定
   * @param {Object} savedSettings - 儲存的設定
   * @returns {Object} 合併後的設定
   */
  mergeSettings(defaultSettings, savedSettings) {
    const merged = this.deepClone(defaultSettings);

    function merge(target, source) {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
          }
          merge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }

    merge(merged, savedSettings);
    return merged;
  }

  /**
   * 深度複製對象
   * @param {*} obj - 要複製的對象
   * @returns {*} 複製後的對象
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }

    if (typeof obj === 'object') {
      const cloned = {};
      Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone(obj[key]);
      });
      return cloned;
    }

    return obj;
  }

  /**
   * 通知設定變更監聽器
   * @param {string} path - 變更的設定路徑
   * @param {*} newValue - 新值
   * @param {*} oldValue - 舊值
   */
  notifyListeners(path, newValue, oldValue) {
    // 通知特定路徑的監聽器
    if (this.listeners.has(path)) {
      this.listeners.get(path).forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error(`設定變更監聽器執行失敗 (${path}):`, error);
        }
      });
    }

    // 通知全域監聽器
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error('全域設定變更監聽器執行失敗:', error);
        }
      });
    }
  }

  /**
   * 處理特殊設定變更
   * @param {string} path - 設定路徑
   * @param {*} value - 新值
   */
  handleSpecialSettingChange(path, value) {
    switch (path) {
      case 'app.theme':
        this.applyTheme();
        break;
      case 'ui.animations':
        this.toggleAnimations(value);
        break;
      case 'data.autoSave':
        if (value) {
          this.startAutoSave();
        } else {
          this.stopAutoSave();
        }
        break;
    }
  }

  /**
   * 應用主題設定
   */
  applyTheme() {
    const theme = this.get('app.theme', 'auto');
    const root = document.documentElement;

    // 移除所有主題類名
    root.classList.remove('theme-light', 'theme-dark');

    if (theme === 'auto') {
      // 根據系統偏好自動設定
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('theme-dark');
      } else {
        root.classList.add('theme-light');
      }
    } else {
      root.classList.add(`theme-${theme}`);
    }
  }

  /**
   * 監聽系統主題變更
   */
  watchSystemTheme() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = () => {
        if (this.get('app.theme') === 'auto') {
          this.applyTheme();
        }
      };

      mediaQuery.addEventListener('change', handleChange);
    }
  }

  /**
   * 切換動畫效果
   * @param {boolean} enabled - 是否啟用動畫
   */
  toggleAnimations(enabled) {
    const root = document.documentElement;
    if (enabled) {
      root.style.removeProperty('--transition-duration');
    } else {
      root.style.setProperty('--transition-duration', '0s');
    }
  }

  /**
   * 開始自動儲存
   */
  startAutoSave() {
    this.stopAutoSave(); // 確保沒有重複的定時器

    const interval = this.get('app.autoSaveInterval', 5000);
    this.autoSaveTimer = setInterval(() => {
      this.saveSettings();
    }, interval);
  }

  /**
   * 停止自動儲存
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * 匯出設定
   * @returns {string} JSON 格式的設定
   */
  exportSettings() {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * 匯入設定
   * @param {string} settingsJson - JSON 格式的設定
   * @returns {boolean} 是否成功匯入
   */
  importSettings(settingsJson) {
    try {
      const importedSettings = JSON.parse(settingsJson);
      this.settings = this.mergeSettings(this.defaultSettings, importedSettings);
      this.saveSettings();
      this.notifyListeners('*', this.settings, null);
      return true;
    } catch (error) {
      console.error('匯入設定失敗:', error);
      return false;
    }
  }

  /**
   * 獲取設定統計資訊
   * @returns {Object} 設定統計
   */
  getSettingsStats() {
    return {
      totalSettings: this.countSettings(this.settings),
      customSettings: this.countCustomSettings(),
      lastModified: localStorage.getItem(`${this.storageKey}-last-modified`) || null,
      storageKey: this.storageKey,
    };
  }

  /**
   * 計算設定數量
   * @param {Object} obj - 設定對象
   * @returns {number} 設定數量
   */
  countSettings(obj) {
    let count = 0;
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        count += this.countSettings(obj[key]);
      } else {
        count++;
      }
    }
    return count;
  }

  /**
   * 計算自定義設定數量
   * @returns {number} 自定義設定數量
   */
  countCustomSettings() {
    return this.countSettings(this.settings) - this.countSettings(this.defaultSettings);
  }

  /**
   * 清理設定
   */
  destroy() {
    this.stopAutoSave();
    this.listeners.clear();
  }
}