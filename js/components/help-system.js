/**
 * 用戶指引和幫助系統
 *
 * 負責提供用戶指引和幫助功能，包括：
 * - 互動式教程
 * - 快捷鍵指南
 * - 上下文幫助
 * - 常見問題解答
 * - 功能介紹
 */

export class HelpSystem {
  constructor(elements) {
    this.elements = elements;

    // 教程狀態
    this.isTutorialActive = false;
    this.currentTutorialStep = 0;
    this.tutorialCompleted = false;

    // 幫助面板狀態
    this.isHelpPanelVisible = false;

    // 上下文幫助
    this.contextHelpEnabled = true;
    this.activeContextHelp = null;

    // 快捷鍵指南
    this.shortcutsGuideVisible = false;

    // 教程配置
    this.tutorials = {
      firstTime: {
        name: '首次使用教程',
        steps: [
          {
            element: '[data-section="task-input"]',
            title: '新增任務',
            description: '在這裡輸入您的任務標題和詳細描述。點擊「添加任務」或按 Ctrl+Enter 來創建新任務。',
            position: 'bottom',
            action: 'next'
          },
          {
            element: '[data-section="priority-select"]',
            title: '設置優先級',
            description: '選擇任務的優先級：低（綠色）、中（黃色）或高（紅色）。這有助於您專注於重要任務。',
            position: 'bottom',
            action: 'next'
          },
          {
            element: '[data-section="filter-controls"]',
            title: '篩選任務',
            description: '使用這些按鈕來查看所有任務、進行中的任務或已完成的任務。',
            position: 'top',
            action: 'next'
          },
          {
            element: '[data-section="task-list"]',
            title: '任務列表',
            description: '您的所有任務都會顯示在這裡。點擊複選框標記完成，或點擊編輯按鈕來修改任務。',
            position: 'right',
            action: 'next'
          },
          {
            element: '[data-section="shortcuts-help"]',
            title: '快捷鍵',
            description: '使用鍵盤快捷鍵可以大大提高您的效率。按 Ctrl+? 查看所有可用的快捷鍵。',
            position: 'top',
            action: 'complete'
          }
        ]
      },
      advanced: {
        name: '進階功能教程',
        steps: [
          {
            element: '[data-section="bulk-actions"]',
            title: '批量操作',
            description: '選擇多個任務後，您可以批量標記完成或刪除它們。',
            position: 'top',
            action: 'next'
          },
          {
            element: '[data-section="sort-controls"]',
            title: '排序功能',
            description: '按創建時間、優先級、截止日期或標題來排序您的任務。',
            position: 'top',
            action: 'next'
          },
          {
            element: '[data-section="progress-section"]',
            title: '進度統計',
            description: '查看您的任務完成進度和趨勢分析。',
            position: 'left',
            action: 'complete'
          }
        ]
      }
    };

    // 快捷鍵配置
    this.shortcuts = {
      navigation: [
        { key: 'Ctrl+N', description: '新增任務', category: '基本操作' },
        { key: 'Ctrl+/', description: '顯示快捷鍵列表', category: '幫助' },
        { key: '/', description: '聚焦搜索框', category: '導航' },
        { key: 'Escape', description: '取消當前操作', category: '基本操作' }
      ],
      taskManagement: [
        { key: 'Space', description: '切換任務完成狀態', category: '任務操作' },
        { key: 'Enter', description: '編輯選中的任務', category: '任務操作' },
        { key: 'Delete', description: '刪除選中的任務', category: '任務操作' },
        { key: 'Ctrl+A', description: '選擇所有任務', category: '批量操作' },
        { key: 'Ctrl+1/2/3', description: '設置優先級（低/中/高）', category: '任務操作' }
      ],
      filtering: [
        { key: 'Ctrl+0', description: '顯示所有任務', category: '篩選' },
        { key: 'Ctrl+1', description: '顯示進行中任務', category: '篩選' },
        { key: 'Ctrl+2', description: '顯示已完成任務', category: '篩選' }
      ]
    };

    // 常見問題
    this.faq = [
      {
        question: '如何添加任務？',
        answer: '在左側的「新增任務」區域輸入任務標題，可選填寫描述、設置優先級和截止日期，然後點擊「添加任務」或按 Ctrl+Enter。',
        category: '基本操作'
      },
      {
        question: '如何編輯任務？',
        answer: '點擊任務項目右側的編輯按鈕（✏️），或使用鍵盤選中任務後按 Enter 鍵進行編輯。',
        category: '基本操作'
      },
      {
        question: '如何設置任務優先級？',
        answer: '在新增任務時選擇優先級，或編輯現有任務時修改優先級。高優先級的任務會以紅色顯示。',
        category: '任務管理'
      },
      {
        question: '如何查看任務統計？',
        answer: '在左側的「進度統計」區域可以查看任務完成進度、趨勢圖和熱力圖等統計信息。',
        category: '統計分析'
      },
      {
        question: '資料會自動保存嗎？',
        answer: '是的，您的所有任務資料都會自動保存到瀏覽器的本地存儲中。',
        category: '資料管理'
      }
    ];

    // 綁定事件處理器
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleHelpRequest = this.handleHelpRequest.bind(this);
    this.handleContextHelp = this.handleContextHelp.bind(this);
  }

  /**
   * 初始化幫助系統
   */
  async initialize() {
    try {
      // 檢查是否為新用戶
      this.checkFirstTimeUser();

      // 創建幫助按鈕
      this.createHelpButton();

      // 創建幫助面板
      this.createHelpPanel();

      // 創建快捷鍵指南
      this.createShortcutsGuide();

      // 創建上下文幫助系統
      this.createContextHelp();

      // 綁定事件監聽器
      this.bindEventListeners();

      console.log('✅ 幫助系統初始化完成');
    } catch (error) {
      console.error('❌ 幫助系統初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 檢查是否為新用戶
   */
  checkFirstTimeUser() {
    const hasCompletedTutorial = localStorage.getItem('todolist-tutorial-completed');
    this.tutorialCompleted = !!hasCompletedTutorial;

    // 如果是新用戶且未完成教程，自動啟動教程
    const isFirstTime = !localStorage.getItem('todolist-has-visited');
    if (isFirstTime && !this.tutorialCompleted) {
      setTimeout(() => {
        this.startTutorial('firstTime');
      }, 2000);
    }
  }

  /**
   * 創建幫助按鈕
   */
  createHelpButton() {
    const helpButton = document.createElement('button');
    helpButton.className = 'help-button';
    helpButton.setAttribute('aria-label', '獲取幫助');
    helpButton.setAttribute('title', '獲取幫助 (Ctrl+?)');
    helpButton.textContent = '❓';

    // 定位樣式
    Object.assign(helpButton.style, {
      position: 'fixed',
      bottom: 'var(--spacing-4)',
      left: 'var(--spacing-4)',
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      background: 'var(--color-primary-500)',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      fontSize: 'var(--font-size-lg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 'var(--z-index-fixed)',
      transition: 'all var(--transition-base)'
    });

    // 懸停效果
    helpButton.addEventListener('mouseenter', () => {
      helpButton.style.transform = 'scale(1.1)';
      helpButton.style.background = 'var(--color-primary-600)';
    });

    helpButton.addEventListener('mouseleave', () => {
      helpButton.style.transform = 'scale(1)';
      helpButton.style.background = 'var(--color-primary-500)';
    });

    helpButton.addEventListener('click', () => {
      this.toggleHelpPanel();
    });

    document.body.appendChild(helpButton);
    this.elements.helpButton = helpButton;
  }

  /**
   * 創建幫助面板
   */
  createHelpPanel() {
    const panel = document.createElement('div');
    panel.className = 'help-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '幫助面板');
    panel.setAttribute('aria-hidden', 'true');

    // 面板內容
    const content = this.createHelpPanelContent();
    panel.appendChild(content);

    // 添加樣式
    Object.assign(panel.style, {
      position: 'fixed',
      top: '0',
      right: '0',
      bottom: '0',
      width: '400px',
      background: 'var(--color-surface)',
      borderLeft: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-xl)',
      zIndex: 'var(--z-index-modal)',
      transform: 'translateX(100%)',
      transition: 'transform var(--duration-300) var(--ease-out)',
      display: 'flex',
      flexDirection: 'column'
    });

    document.body.appendChild(panel);
    this.elements.helpPanel = panel;
  }

  /**
   * 創建幫助面板內容
   */
  createHelpPanelContent() {
    const content = document.createElement('div');
    Object.assign(content.style, {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    });

    // 頭部
    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: 'var(--spacing-4)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    });

    const title = document.createElement('h3');
    title.textContent = '幫助中心';
    Object.assign(title.style, {
      margin: '0',
      fontSize: 'var(--font-size-lg)',
      fontWeight: 'var(--font-weight-semibold)',
      color: 'var(--color-text-primary)'
    });

    const closeButton = document.createElement('button');
    closeButton.textContent = '✕';
    Object.assign(closeButton.style, {
      background: 'none',
      border: 'none',
      fontSize: 'var(--font-size-lg)',
      cursor: 'pointer',
      color: 'var(--color-text-secondary)',
      padding: 'var(--spacing-1)',
      borderRadius: 'var(--radius-md)'
    });

    closeButton.addEventListener('click', () => {
      this.hideHelpPanel();
    });

    header.appendChild(title);
    header.appendChild(closeButton);

    // 主體
    const body = document.createElement('div');
    Object.assign(body.style, {
      flex: '1',
      overflowY: 'auto',
      padding: 'var(--spacing-4)'
    });

    // 幫助選項卡
    const tabs = this.createHelpTabs();
    const tabContent = document.createElement('div');
    tabContent.id = 'helpTabContent';
    Object.assign(tabContent.style, {
      marginTop: 'var(--spacing-4)'
    });

    body.appendChild(tabs);
    body.appendChild(tabContent);

    // 組裝
    content.appendChild(header);
    content.appendChild(body);

    return content;
  }

  /**
   * 創建幫助選項卡
   */
  createHelpTabs() {
    const tabsContainer = document.createElement('div');
    Object.assign(tabsContainer.style, {
      display: 'flex',
      gap: 'var(--spacing-2)',
      borderBottom: '1px solid var(--color-border)'
    });

    const tabs = [
      { id: 'getting-started', label: '快速開始', active: true },
      { id: 'shortcuts', label: '快捷鍵' },
      { id: 'faq', label: '常見問題' },
      { id: 'tutorial', label: '教程' }
    ];

    tabs.forEach(tab => {
      const button = document.createElement('button');
      button.textContent = tab.label;
      Object.assign(button.style, {
        padding: 'var(--spacing-2) var(--spacing-3)',
        background: 'none',
        border: 'none',
        borderBottom: `2px solid ${tab.active ? 'var(--color-primary-500)' : 'transparent'}`,
        color: tab.active ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        fontWeight: tab.active ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
        transition: 'all var(--transition-base)'
      });

      button.addEventListener('click', () => {
        this.switchHelpTab(tab.id);
      });

      tabsContainer.appendChild(button);
    });

    return tabsContainer;
  }

  /**
   * 切換幫助選項卡
   */
  switchHelpTab(tabId) {
    const tabContent = document.getElementById('helpTabContent');

    // 更新選項卡樣式
    const tabs = document.querySelectorAll('.help-panel button');
    tabs.forEach(tab => {
      if (tab.textContent.includes(this.getTabLabel(tabId))) {
        tab.style.borderBottomColor = 'var(--color-primary-500)';
        tab.style.color = 'var(--color-primary-600)';
        tab.style.fontWeight = 'var(--font-weight-semibold)';
      } else {
        tab.style.borderBottomColor = 'transparent';
        tab.style.color = 'var(--color-text-secondary)';
        tab.style.fontWeight = 'var(--font-weight-normal)';
      }
    });

    // 更新內容
    tabContent.innerHTML = ''; // 清空現有內容

    switch (tabId) {
      case 'getting-started':
        tabContent.appendChild(this.createGettingStartedContent());
        break;
      case 'shortcuts':
        tabContent.appendChild(this.createShortcutsContent());
        break;
      case 'faq':
        tabContent.appendChild(this.createFAQContent());
        break;
      case 'tutorial':
        tabContent.appendChild(this.createTutorialContent());
        break;
    }
  }

  /**
   * 獲取選項卡標籤
   */
  getTabLabel(tabId) {
    const labels = {
      'getting-started': '快速開始',
      'shortcuts': '快捷鍵',
      'faq': '常見問題',
      'tutorial': '教程'
    };
    return labels[tabId] || '';
  }

  /**
   * 創建快速開始內容
   */
  createGettingStartedContent() {
    const container = document.createElement('div');
    Object.assign(container.style, { lineHeight: '1.6' });

    const title = document.createElement('h4');
    title.textContent = '歡迎使用 Todo List！';
    Object.assign(title.style, {
      marginTop: '0',
      color: 'var(--color-text-primary)'
    });

    const intro = document.createElement('p');
    intro.textContent = 'Todo List 是一個簡潔高效的任務管理工具，幫助您更好地組織工作和生活。';
    Object.assign(intro.style, {
      margin: 'var(--spacing-3) 0',
      color: 'var(--color-text-secondary)'
    });

    const featuresTitle = document.createElement('h5');
    featuresTitle.textContent = '基本功能';
    Object.assign(featuresTitle.style, {
      margin: 'var(--spacing-4) 0 var(--spacing-2) 0',
      color: 'var(--color-text-primary)'
    });

    const featuresList = document.createElement('ul');
    Object.assign(featuresList.style, {
      margin: '0',
      paddingLeft: 'var(--spacing-4)',
      color: 'var(--color-text-secondary)'
    });

    const features = [
      '✅ 創建和管理任務',
      '🎯 設置任務優先級',
      '📅 設定截止日期',
      '🏷️ 添加標籤分類',
      '📊 查看完成進度'
    ];

    features.forEach(feature => {
      const li = document.createElement('li');
      li.textContent = feature;
      Object.assign(li.style, { marginBottom: 'var(--spacing-1)' });
      featuresList.appendChild(li);
    });

    const tipsTitle = document.createElement('h5');
    tipsTitle.textContent = '快速提示';
    Object.assign(tipsTitle.style, {
      margin: 'var(--spacing-4) 0 var(--spacing-2) 0',
      color: 'var(--color-text-primary)'
    });

    const tipsList = document.createElement('ul');
    Object.assign(tipsList.style, {
      margin: '0',
      paddingLeft: 'var(--spacing-4)',
      color: 'var(--color-text-secondary)'
    });

    const tips = [
      { text: '按 Ctrl+N 快速新增任務', key: 'Ctrl+N' },
      { text: '按 / 快速搜索', key: '/' },
      { text: '按 Ctrl+? 查看所有快捷鍵', key: 'Ctrl+?' }
    ];

    tips.forEach(tip => {
      const li = document.createElement('li');
      Object.assign(li.style, { marginBottom: 'var(--spacing-1)' });

      const kbd = document.createElement('kbd');
      kbd.textContent = tip.key;
      Object.assign(kbd.style, {
        background: 'var(--color-gray-100)',
        border: '1px solid var(--color-gray-300)',
        borderRadius: 'var(--radius-sm)',
        padding: '2px 6px',
        fontFamily: 'monospace',
        fontSize: 'var(--font-size-xs)',
        marginRight: 'var(--spacing-2)'
      });

      const span = document.createElement('span');
      span.textContent = tip.text;

      li.appendChild(kbd);
      li.appendChild(span);
      tipsList.appendChild(li);
    });

    const tutorialButton = document.createElement('button');
    tutorialButton.textContent = '開始互動教程';
    Object.assign(tutorialButton.style, {
      marginTop: 'var(--spacing-4)',
      padding: 'var(--spacing-2) var(--spacing-4)',
      background: 'var(--color-primary-500)',
      color: 'white',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      fontWeight: 'var(--font-weight-medium)'
    });

    tutorialButton.addEventListener('click', () => {
      this.startTutorial('firstTime');
    });

    container.appendChild(title);
    container.appendChild(intro);
    container.appendChild(featuresTitle);
    container.appendChild(featuresList);
    container.appendChild(tipsTitle);
    container.appendChild(tipsList);
    container.appendChild(tutorialButton);

    return container;
  }

  /**
   * 創建快捷鍵內容
   */
  createShortcutsContent() {
    const container = document.createElement('div');
    Object.assign(container.style, { lineHeight: '1.6' });

    const categoryNames = {
      navigation: '導航操作',
      taskManagement: '任務管理',
      filtering: '篩選操作'
    };

    Object.entries(this.shortcuts).forEach(([category, shortcuts]) => {
      const categoryTitle = document.createElement('h5');
      categoryTitle.textContent = categoryNames[category];
      Object.assign(categoryTitle.style, {
        margin: 'var(--spacing-3) 0 var(--spacing-2) 0',
        color: 'var(--color-text-primary)'
      });

      const categoryContainer = document.createElement('div');
      Object.assign(categoryContainer.style, { marginBottom: 'var(--spacing-4)' });

      shortcuts.forEach(shortcut => {
        const item = document.createElement('div');
        Object.assign(item.style, {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--spacing-2) 0',
          borderBottom: '1px solid var(--color-gray-100)'
        });

        const left = document.createElement('div');

        const kbd = document.createElement('kbd');
        kbd.textContent = shortcut.key;
        Object.assign(kbd.style, {
          background: 'var(--color-gray-100)',
          border: '1px solid var(--color-gray-300)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 6px',
          fontFamily: 'monospace',
          fontSize: 'var(--font-size-xs)',
          marginRight: 'var(--spacing-2)'
        });

        const description = document.createElement('span');
        description.textContent = shortcut.description;
        Object.assign(description.style, {
          color: 'var(--color-text-secondary)'
        });

        left.appendChild(kbd);
        left.appendChild(description);

        const category = document.createElement('span');
        category.textContent = shortcut.category;
        Object.assign(category.style, {
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-muted)',
          background: 'var(--color-gray-100)',
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)'
        });

        item.appendChild(left);
        item.appendChild(category);
        categoryContainer.appendChild(item);
      });

      container.appendChild(categoryTitle);
      container.appendChild(categoryContainer);
    });

    return container;
  }

  /**
   * 創建FAQ內容
   */
  createFAQContent() {
    const container = document.createElement('div');
    Object.assign(container.style, { lineHeight: '1.6' });

    this.faq.forEach((item, index) => {
      const faqItem = document.createElement('div');
      Object.assign(faqItem.style, {
        marginBottom: 'var(--spacing-4)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden'
      });

      const questionButton = document.createElement('button');
      questionButton.innerHTML = `
        <span>${item.question}</span>
        <span id="faq-arrow-${index}">▼</span>
      `;
      Object.assign(questionButton.style, {
        width: '100%',
        padding: 'var(--spacing-3)',
        background: 'var(--color-gray-50)',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-primary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      });

      const answer = document.createElement('div');
      answer.id = `faq-answer-${index}`;
      answer.textContent = item.answer;
      Object.assign(answer.style, {
        padding: 'var(--spacing-3)',
        background: 'white',
        color: 'var(--color-text-secondary)',
        display: 'none',
        borderTop: '1px solid var(--color-border)'
      });

      questionButton.addEventListener('click', () => {
        this.toggleFAQItem(index);
      });

      faqItem.appendChild(questionButton);
      faqItem.appendChild(answer);
      container.appendChild(faqItem);
    });

    return container;
  }

  /**
   * 創建教程內容
   */
  createTutorialContent() {
    const container = document.createElement('div');
    Object.assign(container.style, { lineHeight: '1.6' });

    const title = document.createElement('h4');
    title.textContent = '互動教程';
    Object.assign(title.style, {
      marginTop: '0',
      color: 'var(--color-text-primary)'
    });

    const intro = document.createElement('p');
    intro.textContent = '選擇一個教程來學習如何使用 Todo List 的各種功能。';
    Object.assign(intro.style, {
      margin: 'var(--spacing-3) 0',
      color: 'var(--color-text-secondary)'
    });

    const buttonContainer = document.createElement('div');
    Object.assign(buttonContainer.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-3)'
    });

    // 首次使用教程按鈕
    const firstTimeButton = this.createTutorialButton(
      '🚀 首次使用教程',
      '學習基本功能和使用方法',
      'var(--color-primary-500)',
      'white',
      () => this.startTutorial('firstTime')
    );

    // 進階功能教程按鈕
    const advancedButton = this.createTutorialButton(
      '⚡ 進階功能教程',
      '學習批量操作和統計功能',
      'var(--color-gray-100)',
      'var(--color-text-primary)',
      () => this.startTutorial('advanced')
    );

    buttonContainer.appendChild(firstTimeButton);
    buttonContainer.appendChild(advancedButton);

    container.appendChild(title);
    container.appendChild(intro);
    container.appendChild(buttonContainer);

    if (this.tutorialCompleted) {
      const completedMessage = document.createElement('div');
      completedMessage.textContent = '✅ 您已完成所有教程';
      Object.assign(completedMessage.style, {
        marginTop: 'var(--spacing-4)',
        padding: 'var(--spacing-3)',
        background: 'var(--color-success-50)',
        border: '1px solid var(--color-success-200)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--color-success-700)',
        fontSize: 'var(--font-size-sm)'
      });
      container.appendChild(completedMessage);
    }

    return container;
  }

  /**
   * 創建教程按鈕
   */
  createTutorialButton(title, description, bg, color, onClick) {
    const button = document.createElement('button');
    Object.assign(button.style, {
      padding: 'var(--spacing-3)',
      background: bg,
      color: color,
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      textAlign: 'left',
      fontWeight: 'var(--font-weight-medium)'
    });

    button.innerHTML = `
      <div>${title}</div>
      <div style="
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-normal);
        ${color === 'white' ? 'opacity: 0.9' : 'color: var(--color-text-secondary)'};
        margin-top: var(--spacing-1);
      ">${description}</div>
    `;

    button.addEventListener('click', onClick);
    return button;
  }

  /**
   * 創建快捷鍵指南
   */
  createShortcutsGuide() {
    const guide = document.createElement('div');
    guide.className = 'shortcuts-guide';
    guide.setAttribute('role', 'dialog');
    guide.setAttribute('aria-label', '快捷鍵指南');
    guide.setAttribute('aria-hidden', 'true');

    Object.assign(guide.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xl)',
      zIndex: 'var(--z-index-modal)',
      maxWidth: '600px',
      maxHeight: '80vh',
      overflowY: 'auto',
      padding: '0',
      display: 'none'
    });

    document.body.appendChild(guide);
    this.elements.shortcutsGuide = guide;
  }

  /**
   * 創建上下文幫助系統
   */
  createContextHelp() {
    // 為需要幫助的元素添加上下文幫助
    const helpElements = document.querySelectorAll('[data-help]');
    helpElements.forEach(element => {
      this.addContextHelp(element);
    });
  }

  /**
   * 添加上下文幫助
   */
  addContextHelp(element) {
    const helpText = element.getAttribute('data-help');
    if (!helpText) return;

    element.addEventListener('mouseenter', (e) => {
      if (this.contextHelpEnabled) {
        this.showContextHelp(e.target, helpText);
      }
    });

    element.addEventListener('mouseleave', () => {
      this.hideContextHelp();
    });

    element.addEventListener('focus', (e) => {
      if (this.contextHelpEnabled) {
        this.showContextHelp(e.target, helpText);
      }
    });

    element.addEventListener('blur', () => {
      this.hideContextHelp();
    });
  }

  /**
   * 顯示上下文幫助
   */
  showContextHelp(element, text) {
    this.hideContextHelp(); // 先隱藏現有的幫助

    const tooltip = document.createElement('div');
    tooltip.className = 'context-help-tooltip';
    tooltip.textContent = text;

    Object.assign(tooltip.style, {
      position: 'absolute',
      background: 'var(--color-gray-900)',
      color: 'white',
      padding: 'var(--spacing-2) var(--spacing-3)',
      borderRadius: 'var(--radius-md)',
      fontSize: 'var(--font-size-sm)',
      maxWidth: '250px',
      zIndex: 'var(--z-index-tooltip)',
      pointerEvents: 'none',
      opacity: '0',
      transform: 'translateY(5px)',
      transition: 'all var(--duration-200) var(--ease-out)'
    });

    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + 8}px`;
    tooltip.style.left = `${rect.left}px`;

    document.body.appendChild(tooltip);

    // 觸發動畫
    setTimeout(() => {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
    }, 10);

    this.activeContextHelp = tooltip;
  }

  /**
   * 隱藏上下文幫助
   */
  hideContextHelp() {
    if (this.activeContextHelp) {
      this.activeContextHelp.style.opacity = '0';
      this.activeContextHelp.style.transform = 'translateY(5px)';
      setTimeout(() => {
        if (this.activeContextHelp && this.activeContextHelp.parentNode) {
          this.activeContextHelp.parentNode.removeChild(this.activeContextHelp);
        }
      }, 200);
      this.activeContextHelp = null;
    }
  }

  /**
   * 綁定事件監聽器
   */
  bindEventListeners() {
    // 鍵盤快捷鍵
    document.addEventListener('keydown', this.handleKeyPress);

    // 幫助請求事件
    document.addEventListener('helpRequest', this.handleHelpRequest);

    // 上下文幫助事件
    document.addEventListener('contextHelp', this.handleContextHelp);

    // 幫助系統全域引用
    window.helpSystem = this;
  }

  /**
   * 處理鍵盤事件
   */
  handleKeyPress(event) {
    // Ctrl+? 顯示快捷鍵指南
    if (event.ctrlKey && event.shiftKey && event.key === '?') {
      event.preventDefault();
      this.toggleShortcutsGuide();
    }

    // F1 顯示幫助面板
    if (event.key === 'F1') {
      event.preventDefault();
      this.toggleHelpPanel();
    }
  }

  /**
   * 處理幫助請求
   */
  handleHelpRequest(event) {
    const { type, context } = event.detail;

    switch (type) {
      case 'tutorial':
        this.startTutorial(context);
        break;
      case 'shortcuts':
        this.showShortcutsGuide();
        break;
      case 'faq':
        this.showHelpPanel();
        this.switchHelpTab('faq');
        break;
    }
  }

  /**
   * 處理上下文幫助
   */
  handleContextHelp(event) {
    const { element, text } = event.detail;
    this.showContextHelp(element, text);
  }

  /**
   * 開始教程
   */
  startTutorial(tutorialId) {
    const tutorial = this.tutorials[tutorialId];
    if (!tutorial || this.isTutorialActive) return;

    this.isTutorialActive = true;
    this.currentTutorialStep = 0;

    // 隱藏幫助面板
    this.hideHelpPanel();

    // 開始教程
    this.showTutorialStep(tutorial);
  }

  /**
   * 顯示教程步驟
   */
  showTutorialStep(tutorial) {
    const step = tutorial.steps[this.currentTutorialStep];
    if (!step) {
      this.completeTutorial();
      return;
    }

    // 查找目標元素
    const targetElement = document.querySelector(step.element);
    if (!targetElement) {
      // 如果找不到元素，跳到下一步
      this.currentTutorialStep++;
      this.showTutorialStep(tutorial);
      return;
    }

    // 創建教程提示框
    this.createTutorialTooltip(step, targetElement);

    // 高亮目標元素
    this.highlightElement(targetElement);
  }

  /**
   * 創建教程提示框
   */
  createTutorialTooltip(step, targetElement) {
    // 移除現有的提示框
    this.removeTutorialTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'tutorial-tooltip';
    tooltip.setAttribute('role', 'tooltip');

    // 創建內容
    const content = document.createElement('div');
    content.className = 'tutorial-tooltip-content';

    const title = document.createElement('h4');
    title.className = 'tutorial-tooltip-title';
    title.textContent = step.title;

    const description = document.createElement('p');
    description.className = 'tutorial-tooltip-description';
    description.textContent = step.description;

    const actions = document.createElement('div');
    actions.className = 'tutorial-tooltip-actions';

    // 按鈕
    if (this.currentTutorialStep > 0) {
      const prevBtn = document.createElement('button');
      prevBtn.className = 'tutorial-btn tutorial-btn-secondary';
      prevBtn.textContent = '上一步';
      prevBtn.onclick = () => this.previousTutorialStep();
      actions.appendChild(prevBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'tutorial-btn tutorial-btn-primary';
    nextBtn.textContent = this.currentTutorialStep === this.getCurrentTutorial().steps.length - 1 ? '完成' : '下一步';
    nextBtn.onclick = () => this.nextTutorialStep();
    actions.appendChild(nextBtn);

    const skipBtn = document.createElement('button');
    skipBtn.className = 'tutorial-btn tutorial-btn-ghost';
    skipBtn.textContent = '跳過';
    skipBtn.onclick = () => this.skipTutorial();
    actions.appendChild(skipBtn);

    const progress = document.createElement('div');
    progress.className = 'tutorial-tooltip-progress';
    progress.textContent = `${this.currentTutorialStep + 1} / ${this.getCurrentTutorial().steps.length}`;

    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(actions);
    content.appendChild(progress);
    tooltip.appendChild(content);

    // 添加樣式
    Object.assign(tooltip.style, {
      position: 'fixed',
      background: 'white',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xl)',
      zIndex: 'var(--z-index-modal)',
      maxWidth: '350px',
      padding: '0'
    });

    // 定位提示框
    this.positionTutorialTooltip(tooltip, targetElement, step.position);

    document.body.appendChild(tooltip);
    this.currentTutorialTooltip = tooltip;
  }

  /**
   * 定位教程提示框
   */
  positionTutorialTooltip(tooltip, targetElement, position) {
    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 16;

    let top, left;

    switch (position) {
      case 'top':
        top = targetRect.top - tooltipRect.height - margin;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + margin;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - margin;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + margin;
        break;
      default:
        top = targetRect.bottom + margin;
        left = targetRect.left;
    }

    // 確保提示框不超出視窗
    if (top < 0) top = margin;
    if (left < 0) left = margin;
    if (top + tooltipRect.height > window.innerHeight) {
      top = window.innerHeight - tooltipRect.height - margin;
    }
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - margin;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  /**
   * 高亮元素
   */
  highlightElement(element) {
    this.removeHighlight();

    const highlight = document.createElement('div');
    highlight.className = 'tutorial-highlight';
    Object.assign(highlight.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--z-index-modal')) - 1,
      border: '3px solid var(--color-primary-500)',
      borderRadius: 'var(--radius-md)',
      boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.5)',
      transition: 'all var(--duration-300) var(--ease-out)'
    });

    const rect = element.getBoundingClientRect();
    highlight.style.top = `${rect.top - 3}px`;
    highlight.style.left = `${rect.left - 3}px`;
    highlight.style.width = `${rect.width + 6}px`;
    highlight.style.height = `${rect.height + 6}px`;

    document.body.appendChild(highlight);
    this.currentHighlight = highlight;
  }

  /**
   * 移除教程提示框
   */
  removeTutorialTooltip() {
    if (this.currentTutorialTooltip && this.currentTutorialTooltip.parentNode) {
      this.currentTutorialTooltip.parentNode.removeChild(this.currentTutorialTooltip);
      this.currentTutorialTooltip = null;
    }
  }

  /**
   * 移除高亮
   */
  removeHighlight() {
    if (this.currentHighlight && this.currentHighlight.parentNode) {
      this.currentHighlight.parentNode.removeChild(this.currentHighlight);
      this.currentHighlight = null;
    }
  }

  /**
   * 下一步教程
   */
  nextTutorialStep() {
    const tutorial = this.getCurrentTutorial();
    if (!tutorial) return;

    this.currentTutorialStep++;

    if (this.currentTutorialStep >= tutorial.steps.length) {
      this.completeTutorial();
    } else {
      this.showTutorialStep(tutorial);
    }
  }

  /**
   * 上一步教程
   */
  previousTutorialStep() {
    if (this.currentTutorialStep > 0) {
      this.currentTutorialStep--;
      const tutorial = this.getCurrentTutorial();
      if (tutorial) {
        this.showTutorialStep(tutorial);
      }
    }
  }

  /**
   * 跳過教程
   */
  skipTutorial() {
    this.isTutorialActive = false;
    this.removeTutorialTooltip();
    this.removeHighlight();
  }

  /**
   * 完成教程
   */
  completeTutorial() {
    this.isTutorialActive = false;
    this.tutorialCompleted = true;

    // 保存完成狀態
    localStorage.setItem('todolist-tutorial-completed', 'true');

    // 清理
    this.removeTutorialTooltip();
    this.removeHighlight();

    // 顯示完成訊息
    this.showTutorialCompleteMessage();
  }

  /**
   * 顯示教程完成訊息
   */
  showTutorialCompleteMessage() {
    const message = document.createElement('div');
    message.className = 'tutorial-complete-message';

    const content = document.createElement('div');
    Object.assign(content.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'var(--color-success-500)',
      color: 'white',
      padding: 'var(--spacing-4) var(--spacing-6)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xl)',
      zIndex: 'var(--z-index-modal)',
      textAlign: 'center',
      animation: 'fadeInUp 0.3s var(--ease-out)'
    });

    const icon = document.createElement('div');
    icon.textContent = '🎉';
    Object.assign(icon.style, { fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-2)' });

    const title = document.createElement('h3');
    title.textContent = '教程完成！';
    Object.assign(title.style, { margin: '0 0 var(--spacing-2) 0' });

    const text = document.createElement('p');
    text.textContent = '您已經掌握了 Todo List 的基本功能';
    Object.assign(text.style, { margin: '0' });

    content.appendChild(icon);
    content.appendChild(title);
    content.appendChild(text);
    message.appendChild(content);

    document.body.appendChild(message);

    // 自動移除
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  }

  /**
   * 獲取當前教程
   */
  getCurrentTutorial() {
    // 根據當前步驟推斷教程類型
    for (const tutorial of Object.values(this.tutorials)) {
      if (this.currentTutorialStep < tutorial.steps.length) {
        return tutorial;
      }
    }
    return null;
  }

  /**
   * 切換FAQ項目
   */
  toggleFAQItem(index) {
    const answer = document.getElementById(`faq-answer-${index}`);
    const arrow = document.getElementById(`faq-arrow-${index}`);

    if (answer.style.display === 'none') {
      answer.style.display = 'block';
      arrow.textContent = '▲';
    } else {
      answer.style.display = 'none';
      arrow.textContent = '▼';
    }
  }

  /**
   * 切換幫助面板
   */
  toggleHelpPanel() {
    if (this.isHelpPanelVisible) {
      this.hideHelpPanel();
    } else {
      this.showHelpPanel();
    }
  }

  /**
   * 顯示幫助面板
   */
  showHelpPanel() {
    this.isHelpPanelVisible = true;
    this.elements.helpPanel.style.transform = 'translateX(0)';
    this.elements.helpPanel.setAttribute('aria-hidden', 'false');
  }

  /**
   * 隱藏幫助面板
   */
  hideHelpPanel() {
    this.isHelpPanelVisible = false;
    this.elements.helpPanel.style.transform = 'translateX(100%)';
    this.elements.helpPanel.setAttribute('aria-hidden', 'true');
  }

  /**
   * 切換快捷鍵指南
   */
  toggleShortcutsGuide() {
    if (this.shortcutsGuideVisible) {
      this.hideShortcutsGuide();
    } else {
      this.showShortcutsGuide();
    }
  }

  /**
   * 顯示快捷鍵指南
   */
  showShortcutsGuide() {
    // 創建快捷鍵指南內容
    const content = document.createElement('div');
    Object.assign(content.style, { padding: 'var(--spacing-4)' });

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 'var(--spacing-4)'
    });

    const title = document.createElement('h3');
    title.textContent = '快捷鍵指南';
    Object.assign(title.style, {
      margin: '0',
      color: 'var(--color-text-primary)'
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      fontSize: 'var(--font-size-lg)',
      cursor: 'pointer',
      color: 'var(--color-text-secondary)'
    });
    closeBtn.onclick = () => this.hideShortcutsGuide();

    header.appendChild(title);
    header.appendChild(closeBtn);
    content.appendChild(header);
    content.appendChild(this.createShortcutsContent());

    this.elements.shortcutsGuide.innerHTML = '';
    this.elements.shortcutsGuide.appendChild(content);
    this.elements.shortcutsGuide.style.display = 'block';
    this.shortcutsGuideVisible = true;
  }

  /**
   * 隱藏快捷鍵指南
   */
  hideShortcutsGuide() {
    this.elements.shortcutsGuide.style.display = 'none';
    this.shortcutsGuideVisible = false;
  }

  /**
   * 清理資源
   */
  destroy() {
    // 清理教程
    this.skipTutorial();
    this.removeTutorialTooltip();
    this.removeHighlight();

    // 清理上下文幫助
    this.hideContextHelp();

    // 清理幫助面板
    if (this.elements.helpPanel && this.elements.helpPanel.parentNode) {
      this.elements.helpPanel.parentNode.removeChild(this.elements.helpPanel);
    }

    // 清理快捷鍵指南
    if (this.elements.shortcutsGuide && this.elements.shortcutsGuide.parentNode) {
      this.elements.shortcutsGuide.parentNode.removeChild(this.elements.shortcutsGuide);
    }

    // 清理幫助按鈕
    if (this.elements.helpButton && this.elements.helpButton.parentNode) {
      this.elements.helpButton.parentNode.removeChild(this.elements.helpButton);
    }

    // 移除事件監聽器
    document.removeEventListener('keydown', this.handleKeyPress);
    document.removeEventListener('helpRequest', this.handleHelpRequest);
    document.removeEventListener('contextHelp', this.handleContextHelp);

    // 清理全域引用
    delete window.helpSystem;

    // 重置狀態
    this.isTutorialActive = false;
    this.isHelpPanelVisible = false;
    this.shortcutsGuideVisible = false;
  }
}