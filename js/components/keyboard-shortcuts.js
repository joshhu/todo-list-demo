/**
 * 快捷鍵支援組件
 *
 * 負責管理應用程式的鍵盤快捷鍵，包括：
 * - 通用編輯快捷鍵
 * - 任務導航快捷鍵
 * - 快速操作組合鍵
 * - 自定義快捷鍵設定
 * - 快捷鍵幫助面板
 */

export class KeyboardShortcuts {
  constructor(elements, utils, storage) {
    this.elements = elements;
    this.utils = utils;
    this.storage = storage;

    // 快捷鍵配置
    this.shortcuts = new Map();
    this.customShortcuts = new Map();
    this.helpPanelVisible = false;

    // 預設快捷鍵
    this.defaultShortcuts = {
      // 通用編輯快捷鍵
      'Ctrl+S': {
        action: 'save',
        description: '保存當前編輯',
        category: '編輯',
        global: true
      },
      'Ctrl+Z': {
        action: 'undo',
        description: '撤銷上一步操作',
        category: '編輯',
        global: true
      },
      'Ctrl+Y': {
        action: 'redo',
        description: '重做上一步操作',
        category: '編輯',
        global: true
      },
      'Escape': {
        action: 'cancel',
        description: '取消當前操作或關閉對話框',
        category: '導航',
        global: true
      },

      // 任務操作快捷鍵
      'Ctrl+N': {
        action: 'newTask',
        description: '新增任務',
        category: '任務',
        global: true
      },
      'Ctrl+F': {
        action: 'search',
        description: '搜索任務',
        category: '導航',
        global: true
      },
      'Delete': {
        action: 'deleteTask',
        description: '刪除選中的任務',
        category: '任務',
        global: false
      },
      'Ctrl+Delete': {
        action: 'permanentDelete',
        description: '永久刪除選中的任務',
        category: '任務',
        global: false
      },
      'Shift+Delete': {
        action: 'quickDelete',
        description: '快速刪除（無確認）',
        category: '任務',
        global: false
      },

      // 任務導航快捷鍵
      'ArrowUp': {
        action: 'selectPrevious',
        description: '選擇上一個任務',
        category: '導航',
        global: false
      },
      'ArrowDown': {
        action: 'selectNext',
        description: '選擇下一個任務',
        category: '導航',
        global: false
      },
      'Enter': {
        action: 'editTask',
        description: '編輯選中的任務',
        category: '任務',
        global: false
      },
      'F2': {
        action: 'quickEdit',
        description: '快速編輯任務標題',
        category: '編輯',
        global: false
      },

      // 狀態快捷鍵
      'Space': {
        action: 'toggleStatus',
        description: '切換任務狀態',
        category: '任務',
        global: false
      },
      'Ctrl+1': {
        action: 'setPriorityLow',
        description: '設置為低優先級',
        category: '任務',
        global: false
      },
      'Ctrl+2': {
        action: 'setPriorityMedium',
        description: '設置為中優先級',
        category: '任務',
        global: false
      },
      'Ctrl+3': {
        action: 'setPriorityHigh',
        description: '設置為高優先級',
        category: '任務',
        global: false
      },

      // 視圖快捷鍵
      'Ctrl+0': {
        action: 'showAllTasks',
        description: '顯示所有任務',
        category: '視圖',
        global: true
      },
      'Ctrl+1': {
        action: 'showActiveTasks',
        description: '顯示進行中任務',
        category: '視圖',
        global: true
      },
      'Ctrl+2': {
        action: 'showCompletedTasks',
        description: '顯示已完成任務',
        category: '視圖',
        global: true
      },

      // 批量操作快捷鍵
      'Ctrl+A': {
        action: 'selectAll',
        description: '選擇所有任務',
        category: '批量操作',
        global: false
      },
      'Ctrl+D': {
        action: 'deselectAll',
        description: '取消選擇所有任務',
        category: '批量操作',
        global: false
      },

      // 應用程式快捷鍵
      'F1': {
        action: 'showHelp',
        description: '顯示幫助面板',
        category: '應用程式',
        global: true
      },
      'Ctrl+?': {
        action: 'showShortcuts',
        description: '顯示快捷鍵列表',
        category: '應用程式',
        global: true
      },
      'Ctrl+H': {
        action: 'toggleHistory',
        description: '顯示/隱藏歷史面板',
        category: '應用程式',
        global: true
      }
    };

    // 綁定事件處理器
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);

    // 按鍵狀態
    this.pressedKeys = new Set();
    this.keySequence = [];
    this.lastKeyTime = 0;
  }

  /**
   * 初始化快捷鍵系統
   */
  async initialize() {
    try {
      // 載入自定義快捷鍵
      await this.loadCustomShortcuts();

      // 設置預設快捷鍵
      this.setupDefaultShortcuts();

      // 創建幫助面板
      this.createHelpPanel();

      // 綁定事件監聽器
      this.bindEventListeners();

      console.log('✅ 快捷鍵支援系統初始化完成');
    } catch (error) {
      console.error('❌ 快捷鍵支援系統初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 載入自定義快捷鍵
   */
  async loadCustomShortcuts() {
    try {
      const data = localStorage.getItem('todolist-custom-shortcuts');
      if (data) {
        const custom = JSON.parse(data);
        this.customShortcuts = new Map(Object.entries(custom));
      }
    } catch (error) {
      console.error('載入自定義快捷鍵失敗:', error);
    }
  }

  /**
   * 設置預設快捷鍵
   */
  setupDefaultShortcuts() {
    for (const [keyCombo, config] of Object.entries(this.defaultShortcuts)) {
      // 檢查是否有自定義設置
      const customCombo = this.getCustomKeyCombo(config.action);
      const combo = customCombo || keyCombo;

      this.shortcuts.set(combo, config);
    }
  }

  /**
   * 獲取自定義按鍵組合
   */
  getCustomKeyCombo(action) {
    for (const [combo, config] of this.customShortcuts) {
      if (config.action === action) {
        return combo;
      }
    }
    return null;
  }

  /**
   * 創建幫助面板
   */
  createHelpPanel() {
    const panel = document.createElement('div');
    panel.className = 'shortcuts-help-panel';
    panel.style.display = 'none';

    const content = document.createElement('div');
    content.className = 'shortcuts-help__content';

    // 頭部
    const header = document.createElement('div');
    header.className = 'shortcuts-help__header';

    const title = document.createElement('h3');
    title.className = 'shortcuts-help__title';
    title.textContent = '鍵盤快捷鍵';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'shortcuts-help__close';
    closeBtn.setAttribute('aria-label', '關閉');
    closeBtn.textContent = '×';

    header.appendChild(title);
    header.appendChild(closeBtn);

    // 主體
    const body = document.createElement('div');
    body.className = 'shortcuts-help__body';

    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'shortcuts-categories';

    // 按分類顯示快捷鍵
    const categories = this.getShortcutCategories();
    for (const [category, shortcuts] of Object.entries(categories)) {
      const categorySection = this.createCategorySection(category, shortcuts);
      categoriesContainer.appendChild(categorySection);
    }

    body.appendChild(categoriesContainer);

    // 底部
    const footer = document.createElement('div');
    footer.className = 'shortcuts-help__footer';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn--secondary';
    resetBtn.textContent = '重置為預設';

    footer.appendChild(resetBtn);

    // 組裝
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);

    panel.appendChild(content);

    // 添加到 DOM
    document.body.appendChild(panel);
    this.elements.shortcutsHelpPanel = panel;

    // 綁定事件
    this.bindHelpPanelEvents();
  }

  /**
   * 創建分類區塊
   */
  createCategorySection(category, shortcuts) {
    const section = document.createElement('div');
    section.className = 'shortcuts-category';

    const title = document.createElement('h4');
    title.className = 'shortcuts-category__title';
    title.textContent = category;

    const list = document.createElement('div');
    list.className = 'shortcuts-list';

    shortcuts.forEach(shortcut => {
      const item = this.createShortcutItem(shortcut);
      list.appendChild(item);
    });

    section.appendChild(title);
    section.appendChild(list);

    return section;
  }

  /**
   * 創建快捷鍵項目
   */
  createShortcutItem(shortcut) {
    const item = document.createElement('div');
    item.className = 'shortcut-item';

    const keys = document.createElement('kbd');
    keys.className = 'shortcut-keys';
    keys.textContent = shortcut.keyCombo;

    const description = document.createElement('div');
    description.className = 'shortcut-description';
    description.textContent = shortcut.description;

    item.appendChild(keys);
    item.appendChild(description);

    return item;
  }

  /**
   * 綁定幫助面板事件
   */
  bindHelpPanelEvents() {
    const panel = this.elements.shortcutsHelpPanel;
    const closeBtn = panel.querySelector('.shortcuts-help__close');
    const resetBtn = panel.querySelector('.shortcuts-help__footer button');

    closeBtn.addEventListener('click', () => {
      this.hideHelpPanel();
    });

    resetBtn.addEventListener('click', () => {
      this.resetToDefaults();
    });

    // 點擊背景關閉
    panel.addEventListener('click', (e) => {
      if (e.target === panel) {
        this.hideHelpPanel();
      }
    });

    // ESC 鍵關閉
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideHelpPanel();
      }
    });
  }

  /**
   * 綁定事件監聽器
   */
  bindEventListeners() {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);

    // 防止在輸入框中觸發快捷鍵
    document.addEventListener('keydown', (e) => {
      if (this.isInputElement(e.target)) {
        this.pressedKeys.clear();
      }
    });
  }

  /**
   * 處理按鍵按下事件
   */
  handleKeyDown(e) {
    // 忽略在輸入框中的按鍵（除非是全局快捷鍵）
    if (this.isInputElement(e.target) && !this.isGlobalShortcut(e)) {
      return;
    }

    // 記錄按下的鍵
    this.pressedKeys.add(e.key);
    this.keySequence.push(e.key);

    // 清理舊的按鍵序列
    const now = Date.now();
    if (now - this.lastKeyTime > 1000) {
      this.keySequence = [e.key];
    }
    this.lastKeyTime = now;

    // 生成按鍵組合
    const keyCombo = this.generateKeyCombo(e);

    // 查找對應的快捷鍵
    const shortcut = this.shortcuts.get(keyCombo);
    if (shortcut) {
      e.preventDefault();
      this.executeShortcut(shortcut, e);
    }
  }

  /**
   * 處理按鍵釋放事件
   */
  handleKeyUp(e) {
    this.pressedKeys.delete(e.key);
  }

  /**
   * 生成按鍵組合
   */
  generateKeyCombo(e) {
    const parts = [];

    // 修飾鍵
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');

    // 主鍵
    let key = e.key;

    // 特殊鍵映射
    const keyMap = {
      ' ': 'Space',
      'ArrowUp': 'ArrowUp',
      'ArrowDown': 'ArrowDown',
      'ArrowLeft': 'ArrowLeft',
      'ArrowRight': 'ArrowRight',
      'Enter': 'Enter',
      'Escape': 'Escape',
      'Delete': 'Delete',
      'Backspace': 'Backspace',
      'Tab': 'Tab'
    };

    if (keyMap[key]) {
      key = keyMap[key];
    }

    parts.push(key);

    return parts.join('+');
  }

  /**
   * 檢查是否為輸入元素
   */
  isInputElement(element) {
    const inputTypes = [
      'input', 'textarea', 'select',
      '[contenteditable="true"]'
    ];

    return inputTypes.some(selector => {
      try {
        return element.matches && element.matches(selector);
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * 檢查是否為全局快捷鍵
   */
  isGlobalShortcut(e) {
    const keyCombo = this.generateKeyCombo(e);
    const shortcut = this.shortcuts.get(keyCombo);
    return shortcut && shortcut.global;
  }

  /**
   * 執行快捷鍵動作
   */
  executeShortcut(shortcut, event) {
    const { action } = shortcut;

    // 觸發快捷鍵事件
    const shortcutEvent = new CustomEvent('keyboardShortcut', {
      detail: {
        action,
        shortcut,
        originalEvent: event
      }
    });
    document.dispatchEvent(shortcutEvent);

    // 執行預設動作
    switch (action) {
      case 'save':
        this.handleSave();
        break;

      case 'undo':
        this.handleUndo();
        break;

      case 'redo':
        this.handleRedo();
        break;

      case 'cancel':
        this.handleCancel();
        break;

      case 'newTask':
        this.handleNewTask();
        break;

      case 'search':
        this.handleSearch();
        break;

      case 'deleteTask':
        this.handleDeleteTask();
        break;

      case 'permanentDelete':
        this.handlePermanentDelete();
        break;

      case 'quickDelete':
        this.handleQuickDelete();
        break;

      case 'selectPrevious':
        this.handleSelectPrevious();
        break;

      case 'selectNext':
        this.handleSelectNext();
        break;

      case 'editTask':
        this.handleEditTask();
        break;

      case 'quickEdit':
        this.handleQuickEdit();
        break;

      case 'toggleStatus':
        this.handleToggleStatus();
        break;

      case 'setPriorityLow':
        this.handleSetPriority('low');
        break;

      case 'setPriorityMedium':
        this.handleSetPriority('medium');
        break;

      case 'setPriorityHigh':
        this.handleSetPriority('high');
        break;

      case 'showAllTasks':
        this.handleShowAllTasks();
        break;

      case 'showActiveTasks':
        this.handleShowActiveTasks();
        break;

      case 'showCompletedTasks':
        this.handleShowCompletedTasks();
        break;

      case 'selectAll':
        this.handleSelectAll();
        break;

      case 'deselectAll':
        this.handleDeselectAll();
        break;

      case 'showHelp':
        this.handleShowHelp();
        break;

      case 'showShortcuts':
        this.handleShowShortcuts();
        break;

      case 'toggleHistory':
        this.handleToggleHistory();
        break;

      default:
        console.log(`未知的快捷鍵動作: ${action}`);
    }
  }

  // 處理方法
  handleSave() {
    const event = new CustomEvent('shortcut:save', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleUndo() {
    const event = new CustomEvent('shortcut:undo', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleRedo() {
    const event = new CustomEvent('shortcut:redo', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleCancel() {
    const event = new CustomEvent('shortcut:cancel', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleNewTask() {
    const event = new CustomEvent('shortcut:newTask', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleSearch() {
    const searchInput = this.elements.searchInput;
    if (searchInput) {
      searchInput.focus();
    }
  }

  handleDeleteTask() {
    const event = new CustomEvent('shortcut:deleteTask', { bubbles: true });
    document.dispatchEvent(event);
  }

  handlePermanentDelete() {
    const event = new CustomEvent('shortcut:permanentDelete', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleQuickDelete() {
    const event = new CustomEvent('shortcut:quickDelete', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleSelectPrevious() {
    const event = new CustomEvent('shortcut:selectPrevious', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleSelectNext() {
    const event = new CustomEvent('shortcut:selectNext', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleEditTask() {
    const event = new CustomEvent('shortcut:editTask', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleQuickEdit() {
    const event = new CustomEvent('shortcut:quickEdit', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleToggleStatus() {
    const event = new CustomEvent('shortcut:toggleStatus', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleSetPriority(priority) {
    const event = new CustomEvent('shortcut:setPriority', {
      detail: { priority },
      bubbles: true
    });
    document.dispatchEvent(event);
  }

  handleShowAllTasks() {
    const event = new CustomEvent('shortcut:showAllTasks', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleShowActiveTasks() {
    const event = new CustomEvent('shortcut:showActiveTasks', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleShowCompletedTasks() {
    const event = new CustomEvent('shortcut:showCompletedTasks', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleSelectAll() {
    const event = new CustomEvent('shortcut:selectAll', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleDeselectAll() {
    const event = new CustomEvent('shortcut:deselectAll', { bubbles: true });
    document.dispatchEvent(event);
  }

  handleShowHelp() {
    // TODO: 實現幫助系統
    console.log('顯示幫助');
  }

  handleShowShortcuts() {
    this.toggleHelpPanel();
  }

  handleToggleHistory() {
    const event = new CustomEvent('shortcut:toggleHistory', { bubbles: true });
    document.dispatchEvent(event);
  }

  /**
   * 切換幫助面板顯示
   */
  toggleHelpPanel() {
    if (this.helpPanelVisible) {
      this.hideHelpPanel();
    } else {
      this.showHelpPanel();
    }
  }

  /**
   * 顯示幫助面板
   */
  showHelpPanel() {
    const panel = this.elements.shortcutsHelpPanel;
    panel.style.display = 'block';
    this.helpPanelVisible = true;

    // 聚焦到關閉按鈕
    const closeBtn = panel.querySelector('.shortcuts-help__close');
    setTimeout(() => closeBtn.focus(), 100);
  }

  /**
   * 隱藏幫助面板
   */
  hideHelpPanel() {
    const panel = this.elements.shortcutsHelpPanel;
    panel.style.display = 'none';
    this.helpPanelVisible = false;
  }

  /**
   * 獲取快捷鍵分類
   */
  getShortcutCategories() {
    const categories = {};

    for (const [keyCombo, config] of this.shortcuts) {
      const category = config.category;
      if (!categories[category]) {
        categories[category] = [];
      }

      categories[category].push({
        keyCombo,
        action: config.action,
        description: config.description
      });
    }

    // 按優先級排序
    const categoryOrder = ['編輯', '任務', '導航', '視圖', '批量操作', '應用程式'];
    const sortedCategories = {};

    categoryOrder.forEach(category => {
      if (categories[category]) {
        sortedCategories[category] = categories[category].sort((a, b) => {
          return a.description.localeCompare(b.description);
        });
      }
    });

    // 添加其他分類
    for (const [category, shortcuts] of Object.entries(categories)) {
      if (!sortedCategories[category]) {
        sortedCategories[category] = shortcuts.sort((a, b) => {
          return a.description.localeCompare(b.description);
        });
      }
    }

    return sortedCategories;
  }

  /**
   * 註冊自定義快捷鍵
   */
  registerCustomShortcut(keyCombo, action, description, category = '自定義', global = true) {
    const config = {
      action,
      description,
      category,
      global
    };

    this.customShortcuts.set(keyCombo, config);
    this.shortcuts.set(keyCombo, config);

    this.saveCustomShortcuts();
    this.updateHelpPanel();

    console.log(`已註冊自定義快捷鍵: ${keyCombo} - ${description}`);
  }

  /**
   * 移除快捷鍵
   */
  removeShortcut(keyCombo) {
    if (this.shortcuts.has(keyCombo)) {
      this.shortcuts.delete(keyCombo);
    }

    if (this.customShortcuts.has(keyCombo)) {
      this.customShortcuts.delete(keyCombo);
      this.saveCustomShortcuts();
      this.updateHelpPanel();
    }
  }

  /**
   * 重置為預設快捷鍵
   */
  resetToDefaults() {
    this.customShortcuts.clear();
    this.shortcuts.clear();

    this.setupDefaultShortcuts();
    this.saveCustomShortcuts();
    this.updateHelpPanel();

    this.showNotification('已重置為預設快捷鍵', 'success');
  }

  /**
   * 更新幫助面板
   */
  updateHelpPanel() {
    const body = this.elements.shortcutsHelpPanel.querySelector('.shortcuts-help__body');
    const categoriesContainer = body.querySelector('.shortcuts-categories');

    // 清空現有內容
    while (categoriesContainer.firstChild) {
      categoriesContainer.removeChild(categoriesContainer.firstChild);
    }

    // 重新生成內容
    const categories = this.getShortcutCategories();
    for (const [category, shortcuts] of Object.entries(categories)) {
      const categorySection = this.createCategorySection(category, shortcuts);
      categoriesContainer.appendChild(categorySection);
    }
  }

  /**
   * 保存自定義快捷鍵
   */
  saveCustomShortcuts() {
    try {
      const custom = {};
      for (const [keyCombo, config] of this.customShortcuts) {
        custom[keyCombo] = config;
      }
      localStorage.setItem('todolist-custom-shortcuts', JSON.stringify(custom));
    } catch (error) {
      console.error('保存自定義快捷鍵失敗:', error);
    }
  }

  /**
   * 顯示通知
   */
  showNotification(message, type = 'info') {
    // TODO: 實現通知系統
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * 獲取快捷鍵信息
   */
  getShortcutInfo() {
    const info = [];
    for (const [keyCombo, config] of this.shortcuts) {
      info.push({
        keyCombo,
        action: config.action,
        description: config.description,
        category: config.category,
        global: config.global
      });
    }
    return info;
  }

  /**
   * 檢查快捷鍵是否可用
   */
  isShortcutAvailable(keyCombo) {
    return !this.shortcuts.has(keyCombo);
  }

  /**
   * 清理資源
   */
  destroy() {
    // 移除事件監聽器
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);

    // 清理狀態
    this.pressedKeys.clear();
    this.keySequence = [];
    this.helpPanelVisible = false;
  }
}