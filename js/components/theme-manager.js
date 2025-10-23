/**
 * 主題管理組件
 *
 * 負責管理應用程式的主題系統，包括：
 * - 深色/淺色主題切換
 * - 自定義顏色主題
 * - 字體大小調整
 * - 高對比度模式
 * - 主題偏好設定保存
 */

export class ThemeManager {
  constructor() {
    // 當前主題
    this.currentTheme = 'light';
    this.currentFontSize = 'normal';

    // 主題配置
    this.themes = {
      light: {
        name: '淺色主題',
        description: '明亮清新的界面風格',
        icon: '☀️',
        auto: false
      },
      dark: {
        name: '深色主題',
        description: '護眼的深色界面風格',
        icon: '🌙',
        auto: false
      },
      'high-contrast': {
        name: '高對比度',
        description: '高對比度無障礙界面',
        icon: '🔲',
        auto: false
      },
      warm: {
        name: '溫和主題',
        description: '溫暖舒適的橙調主題',
        icon: '🧡',
        auto: false
      },
      cool: {
        name: '冷色主題',
        description: '清涼專業的藍調主題',
        icon: '💙',
        auto: false
      },
      auto: {
        name: '自動切換',
        description: '跟隨系統主題設定',
        icon: '🔄',
        auto: true
      }
    };

    // 字體大小配置
    this.fontSizes = {
      small: {
        name: '小',
        scale: 0.875
      },
      normal: {
        name: '正常',
        scale: 1
      },
      large: {
        name: '大',
        scale: 1.125
      },
      'extra-large': {
        name: '特大',
        scale: 1.25
      }
    };

    // 預設顏色主題
    this.colorPresets = [
      { name: 'blue', primary: '#4f46e5', secondary: '#7c3aed' },
      { name: 'green', primary: '#059669', secondary: '#047857' },
      { name: 'purple', primary: '#7c3aed', secondary: '#6d28d9' },
      { name: 'red', primary: '#dc2626', secondary: '#b91c1c' },
      { name: 'orange', primary: '#ea580c', secondary: '#c2410c' },
      { name: 'pink', primary: '#db2777', secondary: '#be185d' },
      { name: 'teal', primary: '#0d9488', secondary: '#0f766e' },
      { name: 'indigo', primary: '#4f46e5', secondary: '#4338ca' },
      { name: 'yellow', primary: '#ca8a04', secondary: '#a16207' },
      { name: 'gray', primary: '#6b7280', secondary: '#4b5563' },
      { name: 'slate', primary: '#475569', secondary: '#334155' },
      { name: 'zinc', primary: '#71717a', secondary: '#52525b' }
    ];

    // UI 元素
    this.elements = {};

    // 狀態
    this.isSelectorVisible = false;
    this.isFontSizeControlsVisible = false;

    // 綁定事件處理器
    this.handleThemeToggle = this.handleThemeToggle.bind(this);
    this.handleThemeSelect = this.handleThemeSelect.bind(this);
    this.handleFontSizeChange = this.handleFontSizeChange.bind(this);
    this.handleColorPresetClick = this.handleColorPresetClick.bind(this);
    this.handleSystemThemeChange = this.handleSystemThemeChange.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
  }

  /**
   * 初始化主題管理器
   */
  async initialize() {
    try {
      // 載入保存的主題設定
      this.loadThemeSettings();

      // 創建主題切換UI
      this.createThemeToggle();

      // 創建主題選擇器
      this.createThemeSelector();

      // 創建字體大小控制
      this.createFontSizeControls();

      // 應用當前主題
      this.applyTheme(this.currentTheme);

      // 應用當前字體大小
      this.applyFontSize(this.currentFontSize);

      // 監聽系統主題變化
      this.bindSystemThemeListener();

      // 綁定事件監聽器
      this.bindEventListeners();

      console.log('✅ 主題管理器初始化完成');
    } catch (error) {
      console.error('❌ 主題管理器初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 載入主題設定
   */
  loadThemeSettings() {
    try {
      // 載入主題
      const savedTheme = localStorage.getItem('todolist-theme');
      if (savedTheme && this.themes[savedTheme]) {
        this.currentTheme = savedTheme;
      } else {
        // 檢查系統主題偏好
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.currentTheme = prefersDark ? 'dark' : 'light';
      }

      // 載入字體大小
      const savedFontSize = localStorage.getItem('todolist-font-size');
      if (savedFontSize && this.fontSizes[savedFontSize]) {
        this.currentFontSize = savedFontSize;
      }

      // 載入自定義顏色
      const savedColors = localStorage.getItem('todolist-custom-colors');
      if (savedColors) {
        try {
          this.customColors = JSON.parse(savedColors);
        } catch (e) {
          this.customColors = null;
        }
      }
    } catch (error) {
      console.error('載入主題設定失敗:', error);
    }
  }

  /**
   * 保存主題設定
   */
  saveThemeSettings() {
    try {
      localStorage.setItem('todolist-theme', this.currentTheme);
      localStorage.setItem('todolist-font-size', this.currentFontSize);

      if (this.customColors) {
        localStorage.setItem('todolist-custom-colors', JSON.stringify(this.customColors));
      }
    } catch (error) {
      console.error('保存主題設定失敗:', error);
    }
  }

  /**
   * 創建主題切換按鈕
   */
  createThemeToggle() {
    const toggle = document.createElement('button');
    toggle.className = 'theme-toggle';
    toggle.setAttribute('aria-label', '切換主題');
    toggle.setAttribute('title', '切換主題 (Ctrl+Shift+T)');

    const icon = document.createElement('span');
    icon.className = 'theme-icon';
    icon.textContent = this.themes[this.currentTheme].icon;

    toggle.appendChild(icon);
    document.body.appendChild(toggle);

    this.elements.themeToggle = toggle;
    this.elements.themeIcon = icon;
  }

  /**
   * 創建主題選擇器
   */
  createThemeSelector() {
    const selector = document.createElement('div');
    selector.className = 'theme-selector';
    selector.setAttribute('role', 'dialog');
    selector.setAttribute('aria-label', '選擇主題');
    selector.setAttribute('aria-hidden', 'true');

    // 標題
    const header = document.createElement('div');
    header.className = 'theme-selector-header';
    header.textContent = '選擇主題';

    // 主題選項
    const options = document.createElement('div');
    options.className = 'theme-options';

    Object.entries(this.themes).forEach(([key, theme]) => {
      const option = this.createThemeOption(key, theme);
      options.appendChild(option);
    });

    // 自定義顏色區域
    const customColorSection = this.createCustomColorSection();

    selector.appendChild(header);
    selector.appendChild(options);
    selector.appendChild(customColorSection);
    document.body.appendChild(selector);

    this.elements.themeSelector = selector;
  }

  /**
   * 創建主題選項
   */
  createThemeOption(themeKey, theme) {
    const option = document.createElement('div');
    option.className = 'theme-option';
    option.setAttribute('data-theme', themeKey);
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', themeKey === this.currentTheme);

    // 預覽
    const preview = document.createElement('div');
    preview.className = 'theme-option-preview';

    // 名稱
    const name = document.createElement('div');
    name.className = 'theme-option-name';
    name.textContent = theme.name;

    option.appendChild(preview);
    option.appendChild(name);

    // 標記為活動狀態
    if (themeKey === this.currentTheme) {
      option.classList.add('active');
    }

    return option;
  }

  /**
   * 創建自定義顏色區域
   */
  createCustomColorSection() {
    const section = document.createElement('div');
    section.className = 'custom-color-section';

    const label = document.createElement('div');
    label.className = 'custom-color-label';
    label.textContent = '自定義顏色';

    const presets = document.createElement('div');
    presets.className = 'color-presets';

    this.colorPresets.forEach((preset) => {
      const presetBtn = document.createElement('button');
      presetBtn.className = 'color-preset';
      presetBtn.setAttribute('data-color', preset.name);
      presetBtn.setAttribute('aria-label', `選擇 ${preset.name} 顏色主題`);
      presetBtn.style.background = `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`;

      presets.appendChild(presetBtn);
    });

    section.appendChild(label);
    section.appendChild(presets);

    return section;
  }

  /**
   * 創建字體大小控制
   */
  createFontSizeControls() {
    const controls = document.createElement('div');
    controls.className = 'font-size-controls';

    const label = document.createElement('div');
    label.className = 'font-size-label';
    label.textContent = '字體大小';

    const buttons = document.createElement('div');
    buttons.className = 'font-size-buttons';

    // 減小按鈕
    const decreaseBtn = document.createElement('button');
    decreaseBtn.className = 'font-size-btn';
    decreaseBtn.setAttribute('aria-label', '減小字體');
    decreaseBtn.textContent = 'A-';

    // 重置按鈕
    const resetBtn = document.createElement('button');
    resetBtn.className = 'font-size-btn';
    resetBtn.setAttribute('aria-label', '重置字體大小');
    resetBtn.textContent = 'A';

    // 增大按鈕
    const increaseBtn = document.createElement('button');
    increaseBtn.className = 'font-size-btn';
    increaseBtn.setAttribute('aria-label', '增大字體');
    increaseBtn.textContent = 'A+';

    buttons.appendChild(decreaseBtn);
    buttons.appendChild(resetBtn);
    buttons.appendChild(increaseBtn);

    controls.appendChild(label);
    controls.appendChild(buttons);
    document.body.appendChild(controls);

    this.elements.fontSizeControls = controls;
    this.elements.fontSizeDecrease = decreaseBtn;
    this.elements.fontSizeReset = resetBtn;
    this.elements.fontSizeIncrease = increaseBtn;
  }

  /**
   * 綁定系統主題監聽器
   */
  bindSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', this.handleSystemThemeChange);
    this.systemThemeMediaQuery = mediaQuery;
  }

  /**
   * 綁定事件監聽器
   */
  bindEventListeners() {
    // 主題切換按鈕
    this.elements.themeToggle.addEventListener('click', this.handleThemeToggle);

    // 主題選項
    this.elements.themeSelector.addEventListener('click', this.handleThemeSelect);

    // 字體大小控制
    this.elements.fontSizeDecrease.addEventListener('click', () => {
      this.changeFontSize('decrease');
    });

    this.elements.fontSizeReset.addEventListener('click', () => {
      this.changeFontSize('reset');
    });

    this.elements.fontSizeIncrease.addEventListener('click', () => {
      this.changeFontSize('increase');
    });

    // 顏色預設
    const colorPresets = this.elements.themeSelector.querySelectorAll('.color-preset');
    colorPresets.forEach(preset => {
      preset.addEventListener('click', this.handleColorPresetClick);
    });

    // 鍵盤快捷鍵
    document.addEventListener('keydown', this.handleKeyPress);

    // 點擊外部關閉選擇器
    document.addEventListener('click', this.handleOutsideClick);
  }

  /**
   * 處理主題切換
   */
  handleThemeToggle(event) {
    event.stopPropagation();

    if (this.isSelectorVisible) {
      this.hideThemeSelector();
    } else {
      this.showThemeSelector();
    }
  }

  /**
   * 處理主題選擇
   */
  handleThemeSelect(event) {
    const option = event.target.closest('.theme-option');
    if (!option) return;

    const theme = option.getAttribute('data-theme');
    if (theme && this.themes[theme]) {
      this.setTheme(theme);
      this.hideThemeSelector();
    }
  }

  /**
   * 處理字體大小變化
   */
  handleFontSizeChange(action) {
    this.changeFontSize(action);
  }

  /**
   * 處理顏色預設點擊
   */
  handleColorPresetClick(event) {
    const preset = event.target;
    const colorName = preset.getAttribute('data-color');

    if (colorName) {
      this.applyColorPreset(colorName);
    }
  }

  /**
   * 處理系統主題變化
   */
  handleSystemThemeChange(mediaQuery) {
    if (this.currentTheme === 'auto') {
      const newTheme = mediaQuery.matches ? 'dark' : 'light';
      this.applyTheme(newTheme);
    }
  }

  /**
   * 處理鍵盤事件
   */
  handleKeyPress(event) {
    // Ctrl+Shift+T: 切換主題
    if (event.ctrlKey && event.shiftKey && event.key === 'T') {
      event.preventDefault();
      this.handleThemeToggle(event);
    }

    // Ctrl+Shift+Plus/Minus: 調整字體大小
    if (event.ctrlKey && event.shiftKey) {
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        this.changeFontSize('increase');
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        this.changeFontSize('decrease');
      } else if (event.key === '0') {
        event.preventDefault();
        this.changeFontSize('reset');
      }
    }

    // ESC: 關閉選擇器
    if (event.key === 'Escape') {
      if (this.isSelectorVisible) {
        this.hideThemeSelector();
      }
    }
  }

  /**
   * 處理外部點擊
   */
  handleOutsideClick(event) {
    if (this.isSelectorVisible &&
        !this.elements.themeToggle.contains(event.target) &&
        !this.elements.themeSelector.contains(event.target)) {
      this.hideThemeSelector();
    }
  }

  /**
   * 設置主題
   */
  setTheme(theme) {
    if (!this.themes[theme]) {
      console.error(`未知的主題: ${theme}`);
      return;
    }

    this.currentTheme = theme;
    this.applyTheme(theme);
    this.saveThemeSettings();
    this.updateThemeUI();
    this.showThemeChangeNotification(theme);
  }

  /**
   * 應用主題
   */
  applyTheme(theme) {
    const root = document.documentElement;

    if (theme === 'auto') {
      // 自動主題：移除 data-theme 屬性，使用系統偏好
      root.removeAttribute('data-theme');
      const prefersDark = this.systemThemeMediaQuery.matches;
      this.applyThemeValues(prefersDark ? 'dark' : 'light');
    } else {
      // 手動主題：設置 data-theme 屬性
      root.setAttribute('data-theme', theme);
      this.applyThemeValues(theme);
    }
  }

  /**
   * 應用主題值
   */
  applyThemeValues(theme) {
    // 這裡可以添加主題特定的邏輯
    // 大部分主題值已經通過 CSS 變數處理
  }

  /**
   * 更新主題UI
   */
  updateThemeUI() {
    // 更新切換按鈕圖標
    if (this.elements.themeIcon) {
      const theme = this.currentTheme === 'auto' ?
        (this.systemThemeMediaQuery.matches ? 'dark' : 'light') :
        this.currentTheme;
      this.elements.themeIcon.textContent = this.themes[theme].icon;
    }

    // 更新選擇器中的活動狀態
    const options = this.elements.themeSelector.querySelectorAll('.theme-option');
    options.forEach(option => {
      const optionTheme = option.getAttribute('data-theme');
      const isActive = optionTheme === this.currentTheme;

      option.classList.toggle('active', isActive);
      option.setAttribute('aria-selected', isActive);
    });
  }

  /**
   * 顯示主題選擇器
   */
  showThemeSelector() {
    this.isSelectorVisible = true;
    this.elements.themeSelector.classList.add('visible');
    this.elements.themeSelector.setAttribute('aria-hidden', 'false');

    // 聚焦到當前主題選項
    const activeOption = this.elements.themeSelector.querySelector('.theme-option.active');
    if (activeOption) {
      setTimeout(() => activeOption.focus(), 100);
    }
  }

  /**
   * 隱藏主題選擇器
   */
  hideThemeSelector() {
    this.isSelectorVisible = false;
    this.elements.themeSelector.classList.remove('visible');
    this.elements.themeSelector.setAttribute('aria-hidden', 'true');

    // 返回焦點到切換按鈕
    setTimeout(() => this.elements.themeToggle.focus(), 100);
  }

  /**
   * 改變字體大小
   */
  changeFontSize(action) {
    const sizes = Object.keys(this.fontSizes);
    let currentIndex = sizes.indexOf(this.currentFontSize);

    switch (action) {
      case 'increase':
        currentIndex = Math.min(currentIndex + 1, sizes.length - 1);
        break;
      case 'decrease':
        currentIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'reset':
        currentIndex = 1; // normal
        break;
    }

    const newSize = sizes[currentIndex];
    this.setFontSize(newSize);
  }

  /**
   * 設置字體大小
   */
  setFontSize(size) {
    if (!this.fontSizes[size]) return;

    this.currentFontSize = size;
    this.applyFontSize(size);
    this.saveThemeSettings();
    this.showFontSizeChangeNotification(size);
  }

  /**
   * 應用字體大小
   */
  applyFontSize(size) {
    const root = document.documentElement;

    if (size === 'normal') {
      root.removeAttribute('data-font-size');
    } else {
      root.setAttribute('data-font-size', size);
    }
  }

  /**
   * 應用顏色預設
   */
  applyColorPreset(colorName) {
    const preset = this.colorPresets.find(p => p.name === colorName);
    if (!preset) return;

    this.customColors = preset;
    this.applyCustomColors();
    this.saveThemeSettings();
    this.updateColorPresetUI(colorName);
    this.showColorChangeNotification(colorName);
  }

  /**
   * 應用自定義顏色
   */
  applyCustomColors() {
    if (!this.customColors) return;

    const root = document.documentElement;
    root.style.setProperty('--color-primary-500', this.customColors.primary);
    root.style.setProperty('--color-primary-600', this.customColors.secondary);
  }

  /**
   * 更新顏色預設UI
   */
  updateColorPresetUI(activeColorName) {
    const presets = this.elements.themeSelector.querySelectorAll('.color-preset');
    presets.forEach(preset => {
      const colorName = preset.getAttribute('data-color');
      const isActive = colorName === activeColorName;

      preset.classList.toggle('active', isActive);
    });
  }

  /**
   * 顯示主題變更通知
   */
  showThemeChangeNotification(theme) {
    const themeConfig = this.themes[theme];
    const message = `已切換至 ${themeConfig.name}`;
    this.showNotification(message, 'success');
  }

  /**
   * 顯示字體大小變更通知
   */
  showFontSizeChangeNotification(size) {
    const sizeConfig = this.fontSizes[size];
    const message = `字體大小已設為 ${sizeConfig.name}`;
    this.showNotification(message, 'info');
  }

  /**
   * 顯示顏色變更通知
   */
  showColorChangeNotification(colorName) {
    const message = '顏色主題已更改';
    this.showNotification(message, 'success');
  }

  /**
   * 顯示通知
   */
  showNotification(message, type = 'info') {
    // 觸發通知事件
    const event = new CustomEvent('showNotification', {
      detail: { message, type }
    });
    document.dispatchEvent(event);
  }

  /**
   * 獲取當前主題
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * 獲取當前字體大小
   */
  getCurrentFontSize() {
    return this.currentFontSize;
  }

  /**
   * 檢查是否為深色主題
   */
  isDarkTheme() {
    if (this.currentTheme === 'auto') {
      return this.systemThemeMediaQuery.matches;
    }
    return this.currentTheme === 'dark';
  }

  /**
   * 重置為預設主題
   */
  resetToDefault() {
    this.setTheme('light');
    this.setFontSize('normal');

    if (this.customColors) {
      this.customColors = null;
      document.documentElement.style.removeProperty('--color-primary-500');
      document.documentElement.style.removeProperty('--color-primary-600');
    }

    this.saveThemeSettings();
  }

  /**
   * 獲取主題配置
   */
  getThemeConfig(theme) {
    return this.themes[theme];
  }

  /**
   * 獲取所有可用主題
   */
  getAvailableThemes() {
    return Object.keys(this.themes);
  }

  /**
   * 清理資源
   */
  destroy() {
    // 移除事件監聽器
    this.elements.themeToggle.removeEventListener('click', this.handleThemeToggle);
    this.elements.themeSelector.removeEventListener('click', this.handleThemeSelect);
    document.removeEventListener('keydown', this.handleKeyPress);
    document.removeEventListener('click', this.handleOutsideClick);

    // 移除系統主題監聽器
    if (this.systemThemeMediaQuery) {
      this.systemThemeMediaQuery.removeEventListener('change', this.handleSystemThemeChange);
    }

    // 移除DOM元素
    if (this.elements.themeToggle) {
      this.elements.themeToggle.remove();
    }
    if (this.elements.themeSelector) {
      this.elements.themeSelector.remove();
    }
    if (this.elements.fontSizeControls) {
      this.elements.fontSizeControls.remove();
    }

    // 清理狀態
    this.elements = {};
    this.isSelectorVisible = false;
    this.isFontSizeControlsVisible = false;
  }
}