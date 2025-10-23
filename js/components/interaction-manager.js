/**
 * 交互管理組件
 *
 * 負責增強用戶交互體驗，包括：
 * - 手勢操作支援
 * - 觸控回饋
 * - 鍵盤導航增強
 * - 微交互效果
 * - 拖曳功能
 */

export class InteractionManager {
  constructor(elements) {
    this.elements = elements;

    // 觸控相關
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.swipeThreshold = 50;

    // 長按相關
    this.longPressTimer = null;
    this.longPressThreshold = 500;

    // 拖曳相關
    this.draggedElement = null;
    this.dragPlaceholder = null;

    // 狀態
    this.isInitialized = false;

    // 綁定事件處理器
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  /**
   * 初始化交互管理器
   */
  async initialize() {
    try {
      // 檢測設備類型
      this.detectDeviceCapabilities();

      // 初始化觸控手勢
      this.initializeTouchGestures();

      // 初始化鍵盤導航
      this.initializeKeyboardNavigation();

      // 初始化拖曳功能
      this.initializeDragAndDrop();

      // 添加微交互效果
      this.addMicroInteractions();

      console.log('✅ 交互管理器初始化完成');
    } catch (error) {
      console.error('❌ 交互管理器初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 檢測設備能力
   */
  detectDeviceCapabilities() {
    this.isTouchDevice = 'ontouchstart' in window;
    this.isPointerCoarse = window.matchMedia('(pointer: coarse)').matches;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    console.log('設備能力:', {
      isTouchDevice: this.isTouchDevice,
      isPointerCoarse: this.isPointerCoarse,
      prefersReducedMotion: this.prefersReducedMotion
    });
  }

  /**
   * 初始化觸控手勢
   */
  initializeTouchGestures() {
    if (!this.isTouchDevice) return;

    // 為任務項目添加滑動手勢
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach(item => {
      this.addSwipeGestures(item);
    });

    // 為需要長按的元素添加長按手勢
    const longPressElements = document.querySelectorAll('.long-press');
    longPressElements.forEach(element => {
      this.addLongPressGesture(element);
    });
  }

  /**
   * 添加滑動手勢
   */
  addSwipeGestures(element) {
    element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    element.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    element.addEventListener('touchend', this.handleTouchEnd);
  }

  /**
   * 添加長按手勢
   */
  addLongPressGesture(element) {
    element.addEventListener('touchstart', (e) => {
      this.startLongPress(element, e);
    }, { passive: true });

    element.addEventListener('touchend', () => {
      this.endLongPress(element);
    });

    element.addEventListener('touchmove', () => {
      this.endLongPress(element);
    });
  }

  /**
   * 處理觸控開始
   */
  handleTouchStart(event) {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;

    // 添加觸控回饋
    event.target.classList.add('touching');
  }

  /**
   * 處理觸控移動
   */
  handleTouchMove(event) {
    const touch = event.touches[0];
    this.touchEndX = touch.clientX;
    this.touchEndY = touch.clientY;
  }

  /**
   * 處理觸控結束
   */
  handleTouchEnd(event) {
    // 移除觸控回饋
    event.target.classList.remove('touching');

    // 計算滑動方向
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;

    // 檢測水平滑動
    if (Math.abs(deltaX) > this.swipeThreshold && Math.abs(deltaY) < this.swipeThreshold) {
      if (deltaX > 0) {
        this.handleSwipeRight(event.target);
      } else {
        this.handleSwipeLeft(event.target);
      }
    }
  }

  /**
   * 處理向右滑動
   */
  handleSwipeRight(element) {
    if (element.classList.contains('task-item')) {
      // 顯示任務操作選單
      element.classList.add('swiped');
      this.showTaskActions(element);
    }
  }

  /**
   * 處理向左滑動
   */
  handleSwipeLeft(element) {
    if (element.classList.contains('task-item')) {
      // 隱藏任務操作選單
      element.classList.remove('swiped');
    }
  }

  /**
   * 顯示任務操作
   */
  showTaskActions(taskElement) {
    // 創建滑動操作區域
    if (!taskElement.querySelector('.swipe-actions')) {
      const swipeActions = document.createElement('div');
      swipeActions.className = 'swipe-actions';

      const deleteAction = document.createElement('button');
      deleteAction.className = 'swipe-action';
      deleteAction.setAttribute('aria-label', '刪除任務');
      deleteAction.textContent = '刪除';
      deleteAction.addEventListener('click', () => {
        this.handleTaskDelete(taskElement);
      });

      swipeActions.appendChild(deleteAction);
      taskElement.appendChild(swipeActions);
    }
  }

  /**
   * 處理任務刪除
   */
  handleTaskDelete(taskElement) {
    // 觸發刪除事件
    const taskId = taskElement.getAttribute('data-task-id');
    if (taskId) {
      const event = new CustomEvent('task:delete', {
        detail: { taskId, element: taskElement }
      });
      document.dispatchEvent(event);
    }
  }

  /**
   * 開始長按
   */
  startLongPress(element, event) {
    element.classList.add('pressing');

    this.longPressTimer = setTimeout(() => {
      this.handleLongPress(element, event);
    }, this.longPressThreshold);
  }

  /**
   * 結束長按
   */
  endLongPress(element) {
    element.classList.remove('pressing');

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /**
   * 處理長按
   */
  handleLongPress(element, event) {
    // 觸發長按事件
    const customEvent = new CustomEvent('longPress', {
      detail: { element, originalEvent: event }
    });
    element.dispatchEvent(customEvent);

    // 添加震動回饋（如果支援）
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  /**
   * 初始化鍵盤導航
   */
  initializeKeyboardNavigation() {
    // 為可聚焦元素添加鍵盤導航增強
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
      this.enhanceKeyboardNavigation(element);
    });

    // 監聽鍵盤事件
    document.addEventListener('keydown', this.handleKeyPress);
  }

  /**
   * 增強鍵盤導航
   */
  enhanceKeyboardNavigation(element) {
    // 添加可見的焦點指示器
    element.addEventListener('focus', () => {
      element.classList.add('keyboard-focused');
    });

    element.addEventListener('blur', () => {
      element.classList.remove('keyboard-focused');
    });

    // 為任務項目添加鍵盤快捷鍵
    if (element.classList.contains('task-item')) {
      this.addTaskKeyboardShortcuts(element);
    }
  }

  /**
   * 添加任務鍵盤快捷鍵
   */
  addTaskKeyboardShortcuts(taskElement) {
    taskElement.addEventListener('keydown', (event) => {
      switch (event.key) {
        case ' ':
        case 'Enter':
          event.preventDefault();
          this.toggleTaskComplete(taskElement);
          break;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          this.handleTaskDelete(taskElement);
          break;
        case 'e':
        case 'E':
          event.preventDefault();
          this.editTask(taskElement);
          break;
      }
    });
  }

  /**
   * 切換任務完成狀態
   */
  toggleTaskComplete(taskElement) {
    const checkbox = taskElement.querySelector('.task-checkbox');
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /**
   * 編輯任務
   */
  editTask(taskElement) {
    const editBtn = taskElement.querySelector('.edit-btn');
    if (editBtn) {
      editBtn.click();
    }
  }

  /**
   * 初始化拖曳功能
   */
  initializeDragAndDrop() {
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach(item => {
      this.makeDraggable(item);
    });

    // 設置拖曳區域
    const taskList = document.querySelector('.task-list');
    if (taskList) {
      this.setupDropZone(taskList);
    }
  }

  /**
   * 使元素可拖曳
   */
  makeDraggable(element) {
    const dragHandle = element.querySelector('.drag-handle') || element;

    dragHandle.draggable = true;
    dragHandle.addEventListener('dragstart', (e) => {
      this.handleDragStart(e, element);
    });

    dragHandle.addEventListener('dragend', (e) => {
      this.handleDragEnd(e, element);
    });
  }

  /**
   * 設置放置區域
   */
  setupDropZone(container) {
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.handleDragOver(e);
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      this.handleDrop(e);
    });
  }

  /**
   * 處理拖曳開始
   */
  handleDragStart(event, element) {
    this.draggedElement = element;
    element.classList.add('dragging');

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', element.outerHTML);
  }

  /**
   * 處理拖曳結束
   */
  handleDragEnd(event, element) {
    element.classList.remove('dragging');
    this.draggedElement = null;

    // 清理所有拖曳相關的類
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  }

  /**
   * 處理拖曳懸停
   */
  handleDragOver(event) {
    const target = event.target.closest('.task-item');
    if (target && target !== this.draggedElement) {
      // 移除其他元素的拖曳懸停狀態
      document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });

      target.classList.add('drag-over');
    }
  }

  /**
   * 處理放置
   */
  handleDrop(event) {
    const target = event.target.closest('.task-item');
    if (target && this.draggedElement && target !== this.draggedElement) {
      // 重新排列任務
      this.reorderTasks(this.draggedElement, target);
    }
  }

  /**
   * 重新排列任務
   */
  reorderTasks(draggedElement, targetElement) {
    const taskList = document.querySelector('.task-list');
    const allTasks = Array.from(taskList.querySelectorAll('.task-item'));

    const draggedIndex = allTasks.indexOf(draggedElement);
    const targetIndex = allTasks.indexOf(targetElement);

    if (draggedIndex < targetIndex) {
      targetElement.parentNode.insertBefore(draggedElement, targetElement.nextSibling);
    } else {
      targetElement.parentNode.insertBefore(draggedElement, targetElement);
    }

    // 觸發重新排序事件
    const event = new CustomEvent('tasks:reordered', {
      detail: { draggedElement, targetElement }
    });
    document.dispatchEvent(event);
  }

  /**
   * 添加微交互效果
   */
  addMicroInteractions() {
    // 按鈕點擊回饋
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
      this.addClickFeedback(button);
    });

    // 輸入框交互相強
    const inputs = document.querySelectorAll('.form-input, .form-textarea');
    inputs.forEach(input => {
      this.addInputInteractions(input);
    });

    // 卡片懸停效果
    const cards = document.querySelectorAll('.card, .task-item');
    cards.forEach(card => {
      this.addHoverEffect(card);
    });
  }

  /**
   * 添加點擊回饋
   */
  addClickFeedback(element) {
    element.addEventListener('click', (e) => {
      // 創建漣漪效果
      this.createRipple(e, element);

      // 添加震動回饋（如果支援）
      if (this.isTouchDevice && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    });
  }

  /**
   * 創建漣漪效果
   */
  createRipple(event, element) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';

    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';

    element.appendChild(ripple);

    // 動畫結束後移除
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  /**
   * 添加輸入框交互
   */
  addInputInteractions(input) {
    // 輸入時的即時驗證
    input.addEventListener('input', () => {
      this.validateInput(input);
    });

    // 聚焦時的增強效果
    input.addEventListener('focus', () => {
      this.enhanceFocus(input);
    });
  }

  /**
   * 驗證輸入
   */
  validateInput(input) {
    // 移除之前的驗證狀態
    input.classList.remove('error', 'success');

    // 基本驗證邏輯
    if (input.hasAttribute('required') && !input.value.trim()) {
      input.classList.add('error');
      this.showInputError(input, '此欄位為必填');
    } else if (input.value.trim()) {
      input.classList.add('success');
    }
  }

  /**
   * 顯示輸入錯誤
   */
  showInputError(input, message) {
    // 尋找或創建錯誤訊息元素
    let errorElement = input.parentNode.querySelector('.error-message');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      input.parentNode.appendChild(errorElement);
    }

    errorElement.textContent = message;
  }

  /**
   * 增強聚焦效果
   */
  enhanceFocus(input) {
    // 可以添加聚焦時的輔助功能
    if (input.hasAttribute('aria-describedby')) {
      const describedBy = document.getElementById(input.getAttribute('aria-describedby'));
      if (describedBy) {
        describedBy.classList.add('visible');
      }
    }
  }

  /**
   * 添加懸停效果
   */
  addHoverEffect(element) {
    element.addEventListener('mouseenter', () => {
      if (!this.prefersReducedMotion) {
        element.style.transform = 'translateY(-2px)';
      }
    });

    element.addEventListener('mouseleave', () => {
      element.style.transform = '';
    });
  }

  /**
   * 處理鍵盤事件
   */
  handleKeyPress(event) {
    // 全局鍵盤快捷鍵
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'a':
          if (event.shiftKey) {
            event.preventDefault();
            this.selectAllTasks();
          }
          break;
      }
    }
  }

  /**
   * 選擇所有任務
   */
  selectAllTasks() {
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach(item => {
      item.classList.add('selected');
    });

    // 觸發選擇事件
    const event = new CustomEvent('tasks:selectAll', {
      detail: { selectedTasks: Array.from(taskItems) }
    });
    document.dispatchEvent(event);
  }

  /**
   * 設置觸控回饋
   */
  setHapticFeedback(type) {
    if (!this.isTouchDevice || !('vibrate' in navigator)) return;

    const patterns = {
      light: [10],
      medium: [25],
      heavy: [50],
      success: [10, 50, 10],
      error: [100, 50, 100],
      warning: [50]
    };

    const pattern = patterns[type] || patterns.light;
    navigator.vibrate(pattern);
  }

  /**
   * 清理資源
   */
  destroy() {
    // 移除事件監聽器
    document.removeEventListener('keydown', this.handleKeyPress);

    // 清理觸控事件
    const elementsWithTouch = document.querySelectorAll('.task-item, .long-press');
    elementsWithTouch.forEach(element => {
      element.removeEventListener('touchstart', this.handleTouchStart);
      element.removeEventListener('touchmove', this.handleTouchMove);
      element.removeEventListener('touchend', this.handleTouchEnd);
    });

    // 清理長按定時器
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }

    // 重置狀態
    this.draggedElement = null;
    this.isInitialized = false;
  }
}