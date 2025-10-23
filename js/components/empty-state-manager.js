/**
 * 空狀態管理組件
 *
 * 負責管理和顯示各種空狀態，包括：
 * - 空任務列表
 * - 搜索無結果
 * - 錯誤狀態
 * - 載入狀態
 * - 新用戶引導
 * - 離線狀態
 */

export class EmptyStateManager {
  constructor(elements, utils) {
    this.elements = elements;
    this.utils = utils;

    // 狀態追蹤
    this.currentState = null;
    this.isVisible = false;

    // 空狀態配置
    this.stateConfigs = {
      empty: {
        type: 'empty',
        icon: '📝',
        title: '還沒有待辦事項',
        description: '開始添加你的第一個任務，讓生活更有條理！',
        actions: [
          {
            text: '添加第一個任務',
            action: 'addFirstTask',
            primary: true,
            icon: '➕'
          },
          {
            text: '查看使用指南',
            action: 'showGuide',
            primary: false,
            icon: '📖'
          }
        ]
      },

      noResults: {
        type: 'no-results',
        icon: '🔍',
        title: '找不到匹配的任務',
        description: '試試調整搜索關鍵字或篩選條件',
        suggestions: [
          {
            title: '檢查拼寫',
            text: '確保搜索關鍵字拼寫正確'
          },
          {
            title: '使用更寬泛的詞語',
            text: '嘗試使用更簡單或更通用的關鍵字'
          },
          {
            title: '清除篩選條件',
            text: '檢查是否有篩選條件限制了搜索結果'
          }
        ],
        actions: [
          {
            text: '清除搜索',
            action: 'clearSearch',
            primary: true,
            icon: '✕'
          },
          {
            text: '查看所有任務',
            action: 'showAllTasks',
            primary: false,
            icon: '📋'
          }
        ]
      },

      error: {
        type: 'error',
        icon: '⚠️',
        title: '發生了一些問題',
        description: '無法載入任務數據，請檢查網路連接後重試',
        actions: [
          {
            text: '重新載入',
            action: 'retry',
            primary: true,
            icon: '🔄'
          },
          {
            text: '離線模式',
            action: 'offlineMode',
            primary: false,
            icon: '📶'
          }
        ]
      },

      offline: {
        type: 'offline',
        icon: '📶',
        title: '離線模式',
        description: '目前處於離線狀態，您仍可以查看和編輯本地任務',
        actions: [
          {
            text: '檢查連線狀態',
            action: 'checkConnection',
            primary: true,
            icon: '🔄'
          }
        ]
      },

      loading: {
        type: 'loading',
        icon: '⏳',
        title: '載入中...',
        description: '正在為您準備任務列表',
        actions: []
      },

      welcome: {
        type: 'welcome',
        icon: '👋',
        title: '歡迎使用 Todo List！',
        description: '讓我們開始管理您的任務，提高工作效率',
        features: [
          {
            icon: '✅',
            title: '簡單易用',
            description: '直觀的界面，讓您快速上手'
          },
          {
            icon: '🎯',
            title: '優先級管理',
            description: '設置任務優先級，專注重要事項'
          },
          {
            icon: '📊',
            title: '進度追蹤',
            description: '實時查看完成進度和統計'
          },
          {
            icon: '⌨️',
            title: '快捷鍵支援',
            description: '使用鍵盤快捷鍵提高效率'
          }
        ],
        actions: [
          {
            text: '開始使用',
            action: 'getStarted',
            primary: true,
            icon: '🚀'
          },
          {
            text: '觀看教學',
            action: 'watchTutorial',
            primary: false,
            icon: '🎥'
          }
        ]
      }
    };

    // 新用戶引導
    this.isFirstTimeUser = false;
    this.tourStep = 0;
    this.tourSteps = [];

    // 綁定事件處理器
    this.handleActionClick = this.handleActionClick.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  /**
   * 初始化空狀態管理器
   */
  async initialize() {
    try {
      // 檢查是否為新用戶
      await this.checkFirstTimeUser();

      // 創建空狀態容器
      this.createEmptyStateContainer();

      // 綁定事件監聽器
      this.bindEventListeners();

      // 初始化引導系統
      this.initializeTour();

      console.log('✅ 空狀態管理器初始化完成');
    } catch (error) {
      console.error('❌ 空狀態管理器初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 檢查是否為新用戶
   */
  async checkFirstTimeUser() {
    const hasVisited = localStorage.getItem('todolist-has-visited');
    this.isFirstTimeUser = !hasVisited;

    if (this.isFirstTimeUser) {
      localStorage.setItem('todolist-has-visited', 'true');
    }
  }

  /**
   * 創建空狀態容器
   */
  createEmptyStateContainer() {
    const container = document.createElement('div');
    container.className = 'empty-state-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    container.style.display = 'none';

    // 插入到任務列表容器
    const taskListContainer = this.elements.taskListContainer;
    if (taskListContainer) {
      taskListContainer.appendChild(container);
    }

    this.emptyStateContainer = container;
  }

  /**
   * 綁定事件監聽器
   */
  bindEventListeners() {
    // 點擊事件委託
    this.emptyStateContainer.addEventListener('click', this.handleActionClick);

    // 鍵盤事件
    document.addEventListener('keydown', this.handleKeyPress);

    // 監聽在線/離線狀態
    window.addEventListener('online', () => {
      if (this.currentState === 'offline') {
        this.hide();
      }
    });

    window.addEventListener('offline', () => {
      if (this.elements.taskList && this.elements.taskList.children.length === 0) {
        this.show('offline');
      }
    });
  }

  /**
   * 顯示空狀態
   */
  show(stateType, customData = {}) {
    const config = this.getStateConfig(stateType, customData);
    if (!config) {
      console.error(`未知的空狀態類型: ${stateType}`);
      return;
    }

    this.currentState = stateType;
    this.isVisible = true;

    // 清空容器
    this.emptyStateContainer.innerHTML = '';

    // 生成空狀態元素
    const stateElement = this.createEmptyStateElement(config);
    this.emptyStateContainer.appendChild(stateElement);

    // 顯示容器
    this.emptyStateContainer.style.display = 'flex';

    // 添加動畫類
    this.emptyStateContainer.classList.add('empty-state-enter-active');

    // 聚焦到主要操作按鈕
    setTimeout(() => {
      const primaryButton = this.emptyStateContainer.querySelector('.btn-primary');
      if (primaryButton) {
        primaryButton.focus();
      }
    }, 100);

    // 觸發事件
    this.dispatchEvent('emptyState:show', { stateType, config });
  }

  /**
   * 隱藏空狀態
   */
  hide() {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.currentState = null;

    // 添加離開動畫
    this.emptyStateContainer.classList.add('empty-state-exit');

    setTimeout(() => {
      this.emptyStateContainer.style.display = 'none';
      this.emptyStateContainer.classList.remove('empty-state-enter-active', 'empty-state-exit');
    }, 300);

    // 觸發事件
    this.dispatchEvent('emptyState:hide');
  }

  /**
   * 獲取狀態配置
   */
  getStateConfig(stateType, customData = {}) {
    const baseConfig = this.stateConfigs[stateType];
    if (!baseConfig) return null;

    return { ...baseConfig, ...customData };
  }

  /**
   * 創建空狀態元素
   */
  createEmptyStateElement(config) {
    const isWelcome = config.type === 'welcome';
    const containerClass = isWelcome ? 'welcome-state' : `${config.type}-state`;

    const container = document.createElement('div');
    container.className = containerClass;

    // 圖標
    const icon = document.createElement('div');
    icon.className = `${config.type}-icon`;
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = config.icon;
    container.appendChild(icon);

    // 標題
    const title = document.createElement('h2');
    title.className = `${config.type}-title`;
    title.textContent = config.title;
    container.appendChild(title);

    // 描述
    const description = document.createElement('p');
    description.className = `${config.type}-description`;
    description.textContent = config.description;
    container.appendChild(description);

    // 添加建議（搜索無結果時）
    if (config.suggestions && config.suggestions.length > 0) {
      container.appendChild(this.createSuggestionsElement(config.suggestions));
    }

    // 添加功能卡片（歡迎狀態時）
    if (config.features && config.features.length > 0) {
      container.appendChild(this.createFeatureCardsElement(config.features));
    }

    // 添加操作按鈕
    if (config.actions && config.actions.length > 0) {
      container.appendChild(this.createActionsElement(config.actions));
    }

    // 添加快捷鍵提示（歡迎狀態時）
    if (isWelcome) {
      container.appendChild(this.createShortcutsHintElement());
    }

    // 添加同步狀態（離線狀態時）
    if (config.type === 'offline') {
      container.appendChild(this.createSyncStatusElement());
    }

    return container;
  }

  /**
   * 創建建議元素
   */
  createSuggestionsElement(suggestions) {
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'suggestions';

    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';

      const title = document.createElement('div');
      title.className = 'suggestion-title';
      title.textContent = suggestion.title;

      const text = document.createElement('div');
      text.className = 'suggestion-text';
      text.textContent = suggestion.text;

      item.appendChild(title);
      item.appendChild(text);
      suggestionsDiv.appendChild(item);
    });

    return suggestionsDiv;
  }

  /**
   * 創建功能卡片元素
   */
  createFeatureCardsElement(features) {
    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'feature-cards';

    features.forEach(feature => {
      const card = document.createElement('div');
      card.className = 'feature-card';

      const icon = document.createElement('span');
      icon.className = 'feature-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = feature.icon;

      const title = document.createElement('h3');
      title.className = 'feature-title';
      title.textContent = feature.title;

      const description = document.createElement('p');
      description.className = 'feature-description';
      description.textContent = feature.description;

      card.appendChild(icon);
      card.appendChild(title);
      card.appendChild(description);
      cardsDiv.appendChild(card);
    });

    return cardsDiv;
  }

  /**
   * 創建操作按鈕元素
   */
  createActionsElement(actions) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'empty-state-actions';

    actions.forEach(action => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.primary ? 'btn btn-primary' : 'btn btn-secondary';
      button.setAttribute('data-action', action.action);
      button.setAttribute('aria-label', action.text);

      const icon = document.createElement('span');
      icon.className = 'btn-icon';
      icon.textContent = action.icon;

      const text = document.createElement('span');
      text.className = 'btn-text';
      text.textContent = action.text;

      button.appendChild(icon);
      button.appendChild(text);
      actionsDiv.appendChild(button);
    });

    return actionsDiv;
  }

  /**
   * 創建快捷鍵提示元素
   */
  createShortcutsHintElement() {
    const shortcuts = [
      { key: 'Ctrl+N', description: '新增任務' },
      { key: '/', description: '搜索' },
      { key: 'Ctrl+/', description: '顯示快捷鍵' }
    ];

    const hintDiv = document.createElement('div');
    hintDiv.className = 'shortcuts-hint';

    const title = document.createElement('div');
    title.className = 'shortcuts-hint-title';

    const icon = document.createElement('span');
    icon.textContent = '⌨️';

    const text = document.createElement('span');
    text.textContent = '快速開始';

    title.appendChild(icon);
    title.appendChild(text);
    hintDiv.appendChild(title);

    const list = document.createElement('div');
    list.className = 'shortcuts-list';

    shortcuts.forEach(shortcut => {
      const item = document.createElement('div');
      item.className = 'shortcut-item';

      const key = document.createElement('kbd');
      key.className = 'shortcut-key';
      key.textContent = shortcut.key;

      const description = document.createElement('span');
      description.textContent = shortcut.description;

      item.appendChild(key);
      item.appendChild(description);
      list.appendChild(item);
    });

    hintDiv.appendChild(list);
    return hintDiv;
  }

  /**
   * 創建同步狀態元素
   */
  createSyncStatusElement() {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'sync-status';

    const dot = document.createElement('span');
    dot.className = 'sync-dot';

    const text = document.createElement('span');
    text.textContent = '離線模式';

    statusDiv.appendChild(dot);
    statusDiv.appendChild(text);

    return statusDiv;
  }

  /**
   * 處理操作按鈕點擊
   */
  handleActionClick(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;

    const action = actionButton.dataset.action;
    this.executeAction(action);
  }

  /**
   * 處理鍵盤事件
   */
  handleKeyPress(event) {
    if (!this.isVisible) return;

    // ESC 鍵隱藏空狀態（如果適用）
    if (event.key === 'Escape') {
      const closableStates = ['noResults', 'error'];
      if (closableStates.includes(this.currentState)) {
        this.hide();
      }
    }

    // Enter 鍵執行主要操作
    if (event.key === 'Enter') {
      const primaryButton = this.emptyStateContainer.querySelector('.btn-primary');
      if (primaryButton && document.activeElement === primaryButton) {
        const action = primaryButton.dataset.action;
        this.executeAction(action);
      }
    }
  }

  /**
   * 執行操作
   */
  executeAction(action) {
    switch (action) {
      case 'addFirstTask':
        this.handleAddFirstTask();
        break;

      case 'showGuide':
        this.handleShowGuide();
        break;

      case 'clearSearch':
        this.handleClearSearch();
        break;

      case 'showAllTasks':
        this.handleShowAllTasks();
        break;

      case 'retry':
        this.handleRetry();
        break;

      case 'offlineMode':
        this.handleOfflineMode();
        break;

      case 'checkConnection':
        this.handleCheckConnection();
        break;

      case 'getStarted':
        this.handleGetStarted();
        break;

      case 'watchTutorial':
        this.handleWatchTutorial();
        break;

      default:
        console.log(`未知的操作: ${action}`);
    }
  }

  // 操作處理方法
  handleAddFirstTask() {
    this.hide();
    // 聚焦到任務標題輸入框
    const titleInput = this.elements.taskTitle;
    if (titleInput) {
      titleInput.focus();
    }

    this.dispatchEvent('emptyState:addFirstTask');
  }

  handleShowGuide() {
    this.startTour();
    this.dispatchEvent('emptyState:showGuide');
  }

  handleClearSearch() {
    const searchInput = this.elements.searchInput;
    if (searchInput) {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
    }

    this.dispatchEvent('emptyState:clearSearch');
  }

  handleShowAllTasks() {
    // 觸發顯示所有任務的篩選器
    const allFilter = document.querySelector('[data-filter="all"]');
    if (allFilter) {
      allFilter.click();
    }

    this.dispatchEvent('emptyState:showAllTasks');
  }

  handleRetry() {
    this.dispatchEvent('emptyState:retry');
  }

  handleOfflineMode() {
    this.dispatchEvent('emptyState:offlineMode');
  }

  handleCheckConnection() {
    // 檢查連線狀態
    if (navigator.onLine) {
      this.hide();
      this.dispatchEvent('emptyState:connectionRestored');
    } else {
      this.showNotification('仍處於離線狀態', 'warning');
    }
  }

  handleGetStarted() {
    this.handleAddFirstTask();
    this.dispatchEvent('emptyState:getStarted');
  }

  handleWatchTutorial() {
    this.startTour();
    this.dispatchEvent('emptyState:watchTutorial');
  }

  /**
   * 初始化引導系統
   */
  initializeTour() {
    this.tourSteps = [
      {
        element: '[data-section="task-input"]',
        title: '新增任務',
        description: '在這裡輸入您的任務標題和詳細信息',
        position: 'bottom'
      },
      {
        element: '[data-section="filter-controls"]',
        title: '篩選任務',
        description: '使用篩選器查看不同狀態的任務',
        position: 'bottom'
      },
      {
        element: '[data-section="task-list"]',
        title: '任務列表',
        description: '您的所有任務都會顯示在這裡',
        position: 'top'
      }
    ];
  }

  /**
   * 開始引導
   */
  startTour() {
    if (!this.isFirstTimeUser && this.currentState !== 'welcome') {
      return;
    }

    this.tourStep = 0;
    this.showTourStep();
  }

  /**
   * 顯示引導步驟
   */
  showTourStep() {
    if (this.tourStep >= this.tourSteps.length) {
      this.endTour();
      return;
    }

    const step = this.tourSteps[this.tourStep];
    const element = document.querySelector(step.element);

    if (!element) {
      this.tourStep++;
      this.showTourStep();
      return;
    }

    // 創建引導提示
    this.createTourTooltip(step, element);

    // 高亮元素
    this.highlightElement(element);
  }

  /**
   * 創建引導提示
   */
  createTourTooltip(step, element) {
    // 移除現有提示
    const existingTooltip = document.querySelector('.tour-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'tour-tooltip';

    const content = document.createElement('div');
    content.className = 'tour-tooltip-content';

    const title = document.createElement('h3');
    title.className = 'tour-tooltip-title';
    title.textContent = step.title;

    const description = document.createElement('p');
    description.className = 'tour-tooltip-description';
    description.textContent = step.description;

    const actions = document.createElement('div');
    actions.className = 'tour-tooltip-actions';

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'tour-tooltip-next';
    nextBtn.textContent = '下一步';

    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'tour-tooltip-skip';
    skipBtn.textContent = '跳過';

    const progress = document.createElement('div');
    progress.className = 'tour-tooltip-progress';
    progress.textContent = `${this.tourStep + 1} / ${this.tourSteps.length}`;

    actions.appendChild(nextBtn);
    actions.appendChild(skipBtn);

    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(actions);
    content.appendChild(progress);

    tooltip.appendChild(content);

    // 定位提示
    this.positionTooltip(tooltip, element, step.position);

    // 添加到 DOM
    document.body.appendChild(tooltip);

    // 綁定事件
    nextBtn.addEventListener('click', () => {
      this.tourStep++;
      this.showTourStep();
    });

    skipBtn.addEventListener('click', () => {
      this.endTour();
    });
  }

  /**
   * 定位提示框
   */
  positionTooltip(tooltip, element, position) {
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    // 基礎定位邏輯
    switch (position) {
      case 'top':
        tooltip.style.top = `${rect.top - tooltipRect.height - 10}px`;
        tooltip.style.left = `${rect.left + (rect.width - tooltipRect.width) / 2}px`;
        break;
      case 'bottom':
        tooltip.style.top = `${rect.bottom + 10}px`;
        tooltip.style.left = `${rect.left + (rect.width - tooltipRect.width) / 2}px`;
        break;
      default:
        tooltip.style.top = `${rect.bottom + 10}px`;
        tooltip.style.left = `${rect.left}px`;
    }
  }

  /**
   * 高亮元素
   */
  highlightElement(element) {
    // 移除現有高亮
    const existingHighlight = document.querySelector('.tour-highlight');
    if (existingHighlight) {
      existingHighlight.remove();
    }

    const highlight = document.createElement('div');
    highlight.className = 'tour-highlight';

    const rect = element.getBoundingClientRect();
    highlight.style.top = `${rect.top}px`;
    highlight.style.left = `${rect.left}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;

    document.body.appendChild(highlight);
  }

  /**
   * 結束引導
   */
  endTour() {
    // 移除引導相關元素
    const tooltip = document.querySelector('.tour-tooltip');
    const highlight = document.querySelector('.tour-highlight');

    if (tooltip) tooltip.remove();
    if (highlight) highlight.remove();

    // 標記為已完成引導
    localStorage.setItem('todolist-tour-completed', 'true');

    this.dispatchEvent('emptyState:tourCompleted');
  }

  /**
   * 顯示通知
   */
  showNotification(message, type = 'info') {
    // 使用現有的通知系統
    const event = new CustomEvent('showNotification', {
      detail: { message, type }
    });
    document.dispatchEvent(event);
  }

  /**
   * 觸發自定義事件
   */
  dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
  }

  /**
   * 獲取當前狀態
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * 檢查是否可見
   */
  isStateVisible() {
    return this.isVisible;
  }

  /**
   * 更新狀態配置
   */
  updateStateConfig(stateType, updates) {
    if (this.stateConfigs[stateType]) {
      this.stateConfigs[stateType] = { ...this.stateConfigs[stateType], ...updates };
    }
  }

  /**
   * 添加自定義狀態
   */
  addCustomState(name, config) {
    this.stateConfigs[name] = config;
  }

  /**
   * 清理資源
   */
  destroy() {
    // 移除事件監聽器
    this.emptyStateContainer.removeEventListener('click', this.handleActionClick);
    document.removeEventListener('keydown', this.handleKeyPress);

    // 清理引導
    this.endTour();

    // 移除 DOM 元素
    if (this.emptyStateContainer && this.emptyStateContainer.parentNode) {
      this.emptyStateContainer.parentNode.removeChild(this.emptyStateContainer);
    }

    // 重置狀態
    this.currentState = null;
    this.isVisible = false;
  }
}