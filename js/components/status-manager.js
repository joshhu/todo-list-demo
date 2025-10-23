/**
 * 任務狀態管理組件
 *
 * 負責處理任務狀態的各種交互和視覺回饋，包括：
 * - 單個任務狀態切換
 * - 批量狀態操作
 * - 狀態視覺化顯示
 * - 狀態統計和進度
 * - 狀態變更動畫
 */

export class StatusManager {
  constructor(elements, utils, storage) {
    this.elements = elements;
    this.utils = utils;
    this.storage = storage;
    this.selectedTasks = new Set();
    this.animations = new Map();
    this.isProcessing = false;

    // 狀態相關的樣式配置
    this.config = {
      animationDuration: 300,
      debounceDelay: 100,
      batchSize: 10,
      celebrationThreshold: 5
    };

    // 綁定事件處理器
    this.handleStatusToggle = this.handleStatusToggle.bind(this);
    this.handleBatchStatusUpdate = this.handleBatchStatusUpdate.bind(this);
    this.handleAnimationEnd = this.handleAnimationEnd.bind(this);
  }

  /**
   * 初始化狀態管理器
   */
  async initialize() {
    // 綁定全局事件監聽器
    this.bindEventListeners();

    // 初始化動畫系統
    this.initializeAnimations();

    // 載入狀態統計
    await this.updateStatusStatistics();

    console.log('✅ 狀態管理器初始化完成');
  }

  /**
   * 綁定事件監聽器
   */
  bindEventListeners() {
    // 委托事件監聽器處理動態生成的任務項目
    if (this.elements.taskList) {
      this.elements.taskList.addEventListener('click', this.handleTaskListClick.bind(this));
      this.elements.taskList.addEventListener('change', this.handleTaskListChange.bind(this));
    }

    // 批量操作事件
    if (this.elements.markCompleteBtn) {
      this.elements.markCompleteBtn.addEventListener('click', () => {
        this.handleBatchStatusUpdate('completed');
      });
    }

    if (this.elements.selectAllBtn) {
      this.elements.selectAllBtn.addEventListener('click', () => {
        this.toggleSelectAll();
      });
    }

    // 鍵盤快捷鍵
    document.addEventListener('keydown', this.handleKeyboardShortcut.bind(this));
  }

  /**
   * 處理任務列表點擊事件
   */
  handleTaskListClick(event) {
    const taskItem = event.target.closest('.task-item');
    if (!taskItem) return;

    const taskId = taskItem.dataset.taskId;
    if (!taskId) return;

    // 處理狀態切換點擊
    if (event.target.closest('.task-checkbox') ||
        event.target.closest('.task-status-toggle')) {
      event.preventDefault();
      this.handleStatusToggle(taskId, event);
      return;
    }

    // 處理選擇框點擊
    if (event.target.closest('.task-select')) {
      this.handleTaskSelection(taskId, event);
      return;
    }
  }

  /**
   * 處理任務列表變更事件
   */
  handleTaskListChange(event) {
    const taskItem = event.target.closest('.task-item');
    if (!taskItem) return;

    const taskId = taskItem.dataset.taskId;
    if (!taskId) return;

    // 處理選擇框變更
    if (event.target.classList.contains('task-select')) {
      this.handleTaskSelection(taskId, event);
    }
  }

  /**
   * 處理任務狀態切換
   */
  async handleStatusToggle(taskId, event) {
    if (this.isProcessing) return;

    const taskItem = event.target.closest('.task-item');
    if (!taskItem) return;

    const isCompleted = taskItem.classList.contains('completed');
    const newStatus = isCompleted ? 'pending' : 'completed';

    // 立即更新視覺狀態（樂觀更新）
    this.updateTaskVisualState(taskId, newStatus, true);

    try {
      this.isProcessing = true;

      // 切換任務狀態
      const updatedTask = await this.storage.toggleTaskStatus(taskId);

      if (updatedTask) {
        // 觸發狀態變更成功事件
        this.notifyStatusChange(taskId, updatedTask.status, 'toggle');

        // 更新統計資訊
        await this.updateStatusStatistics();

        // 檢查是否需要慶祝動畫
        if (newStatus === 'completed') {
          this.checkMilestone();
        }
      } else {
        // 回滾視覺狀態
        this.updateTaskVisualState(taskId, isCompleted ? 'completed' : 'pending', false);
        this.showNotification('切換任務狀態失敗', 'error');
      }
    } catch (error) {
      console.error('切換任務狀態失敗:', error);

      // 回滾視覺狀態
      this.updateTaskVisualState(taskId, isCompleted ? 'completed' : 'pending', false);
      this.showNotification('切換任務狀態失敗: ' + error.message, 'error');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 處理批量狀態更新
   */
  async handleBatchStatusUpdate(status) {
    if (this.selectedTasks.size === 0) return;

    const taskIds = Array.from(this.selectedTasks);
    const action = status === 'completed' ? '標記為完成' : '標記為未完成';

    // 確認對話框
    const confirmed = await this.showConfirmDialog(
      `確定要${action} ${taskIds.length} 項任務嗎？`,
      action
    );

    if (!confirmed) return;

    // 立即更新視覺狀態
    taskIds.forEach(taskId => {
      this.updateTaskVisualState(taskId, status, true);
    });

    try {
      this.isProcessing = true;
      this.showLoadingIndicator(true);

      // 批量更新狀態
      const results = await this.storage.batchUpdateTaskStatus(taskIds, status);

      if (results.success > 0) {
        // 觸發批量狀態變更事件
        this.notifyBatchStatusChange(taskIds, status, results);

        // 更新統計資訊
        await this.updateStatusStatistics();

        // 清除選擇狀態
        this.clearSelection();

        // 顯示成功通知
        this.showNotification(
          `成功${action} ${results.success} 項任務`,
          'success'
        );

        // 檢查里程碑
        if (status === 'completed') {
          this.checkMilestone(results.success);
        }
      }

      // 顯示錯誤訊息
      if (results.failed > 0) {
        this.showNotification(
          `${results.failed} 項任務更新失敗`,
          'warning'
        );
      }
    } catch (error) {
      console.error('批量更新狀態失敗:', error);

      // 回滾視覺狀態
      taskIds.forEach(taskId => {
        const task = this.storage.getTask(taskId);
        if (task) {
          this.updateTaskVisualState(taskId, task.status, false);
        }
      });

      this.showNotification('批量更新失敗: ' + error.message, 'error');
    } finally {
      this.isProcessing = false;
      this.showLoadingIndicator(false);
    }
  }

  /**
   * 更新任務視覺狀態
   */
  updateTaskVisualState(taskId, status, isOptimistic = false) {
    const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!taskItem) return;

    const checkbox = taskItem.querySelector('.task-checkbox');
    const statusIcon = taskItem.querySelector('.task-status-icon');
    const taskContent = taskItem.querySelector('.task-content');

    // 添加動畫類
    taskItem.classList.add('status-changing');

    if (isOptimistic) {
      taskItem.classList.add('optimistic-update');
    }

    // 更新類別
    if (status === 'completed') {
      taskItem.classList.add('completed');
      taskItem.classList.remove('pending');

      if (checkbox) checkbox.checked = true;
      if (statusIcon) {
        statusIcon.textContent = '✅';
        statusIcon.setAttribute('aria-label', '已完成');
      }
    } else {
      taskItem.classList.remove('completed');
      taskItem.classList.add('pending');

      if (checkbox) checkbox.checked = false;
      if (statusIcon) {
        statusIcon.textContent = '⭕';
        statusIcon.setAttribute('aria-label', '未完成');
      }
    }

    // 設置動畫結束監聽器
    const animationId = `${taskId}-${Date.now()}`;
    this.animations.set(animationId, { taskId, status, isOptimistic });

    taskItem.addEventListener('animationend', () => {
      this.handleAnimationEnd(animationId);
    }, { once: true });

    // 設置無障礙屬性
    taskItem.setAttribute('aria-label', this.getTaskAriaLabel(taskId, status));
  }

  /**
   * 處理動畫結束
   */
  handleAnimationEnd(animationId) {
    const animation = this.animations.get(animationId);
    if (!animation) return;

    const { taskId } = animation;
    const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);

    if (taskItem) {
      taskItem.classList.remove('status-changing', 'optimistic-update');
    }

    this.animations.delete(animationId);
  }

  /**
   * 獲取任務無障礙標籤
   */
  getTaskAriaLabel(taskId, status) {
    const task = this.storage.getTask(taskId);
    if (!task) return '';

    const statusText = status === 'completed' ? '已完成' : '未完成';
    return `${task.title}，狀態：${statusText}`;
  }

  /**
   * 處理任務選擇
   */
  handleTaskSelection(taskId, event) {
    const isSelected = this.selectedTasks.has(taskId);

    if (isSelected) {
      this.selectedTasks.delete(taskId);
    } else {
      this.selectedTasks.add(taskId);
    }

    // 更新視覺狀態
    this.updateSelectionVisuals();

    // 更新批量操作 UI
    this.updateBulkActionsUI();
  }

  /**
   * 切換全選狀態
   */
  toggleSelectAll() {
    const allTaskItems = document.querySelectorAll('.task-item');
    const allTaskIds = Array.from(allTaskItems).map(item => item.dataset.taskId);

    if (this.selectedTasks.size === allTaskIds.length) {
      // 取消全選
      this.clearSelection();
    } else {
      // 全選
      this.selectedTasks.clear();
      allTaskIds.forEach(taskId => this.selectedTasks.add(taskId));
    }

    this.updateSelectionVisuals();
    this.updateBulkActionsUI();
  }

  /**
   * 清除選擇
   */
  clearSelection() {
    this.selectedTasks.clear();
    this.updateSelectionVisuals();
    this.updateBulkActionsUI();
  }

  /**
   * 更新選擇視覺狀態
   */
  updateSelectionVisuals() {
    document.querySelectorAll('.task-item').forEach(taskItem => {
      const taskId = taskItem.dataset.taskId;
      const checkbox = taskItem.querySelector('.task-select');

      if (checkbox) {
        checkbox.checked = this.selectedTasks.has(taskId);
      }

      if (this.selectedTasks.has(taskId)) {
        taskItem.classList.add('selected');
      } else {
        taskItem.classList.remove('selected');
      }
    });
  }

  /**
   * 更新批量操作 UI
   */
  updateBulkActionsUI() {
    const { bulkActions, selectedCount } = this.elements;

    if (bulkActions) {
      if (this.selectedTasks.size > 0) {
        bulkActions.style.display = 'block';
        if (selectedCount) {
          selectedCount.textContent = this.selectedTasks.size;
        }
      } else {
        bulkActions.style.display = 'none';
      }
    }
  }

  /**
   * 更新狀態統計
   */
  async updateStatusStatistics() {
    try {
      const stats = this.storage.getTaskStats();
      const statusStats = this.storage.getStatusStatistics();

      // 更新基本統計
      if (this.elements.totalTasksCount) {
        this.elements.totalTasksCount.textContent = stats.total;
      }

      if (this.elements.completedTasksCount) {
        this.elements.completedTasksCount.textContent = stats.completed;
      }

      // 更新篩選計數
      this.updateFilterCounts();

      // 觸發統計更新事件
      this.notifyStatisticsUpdate(stats, statusStats);
    } catch (error) {
      console.error('更新狀態統計失敗:', error);
    }
  }

  /**
   * 更新篩選計數
   */
  updateFilterCounts() {
    const allTasks = this.storage.getTasks();
    const stats = this.storage.getTaskStats();

    const counts = {
      all: allTasks.length,
      active: stats.pending,
      completed: stats.completed
    };

    // 更新 UI 中的篩選計數
    Object.keys(counts).forEach(filter => {
      const element = document.querySelector(`[data-count="${filter}"]`);
      if (element) {
        element.textContent = counts[filter];
      }
    });
  }

  /**
   * 檢查里程碑
   */
  checkMilestone(count = 1) {
    const stats = this.storage.getTaskStats();
    const milestones = [1, 5, 10, 25, 50, 100];

    if (milestones.includes(stats.completed)) {
      this.celebrateMilestone(stats.completed);
    }
  }

  /**
   * 慶祝里程碑
   */
  celebrateMilestone(completedCount) {
    // 創建慶祝動畫
    this.createCelebrationAnimation();

    // 顯祝通知
    this.showNotification(
      `🎉 恭喜！已完成 ${completedCount} 項任務！`,
      'success',
      '里程碑達成'
    );

    // 觸發里程碑事件
    this.notifyMilestoneReached(completedCount);
  }

  /**
   * 創建慶祝動畫
   */
  createCelebrationAnimation() {
    // 創建彩紙效果
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        this.createConfettiPiece();
      }, i * 50);
    }
  }

  /**
   * 創建彩紙片
   */
  createConfettiPiece() {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: ${this.getRandomColor()};
      left: ${Math.random() * 100}%;
      top: -10px;
      opacity: 0.8;
      transform: rotate(${Math.random() * 360}deg);
      animation: confetti-fall 2s ease-out forwards;
      z-index: 9999;
    `;

    document.body.appendChild(confetti);

    // 動畫結束後移除
    setTimeout(() => confetti.remove(), 2000);
  }

  /**
   * 獲取隨機顏色
   */
  getRandomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 處理鍵盤快捷鍵
   */
  handleKeyboardShortcut(event) {
    // Space 鍵：切換當前任務狀態
    if (event.key === ' ' && !event.ctrlKey && !event.metaKey) {
      const focusedElement = document.activeElement;
      const taskItem = focusedElement?.closest('.task-item');

      if (taskItem) {
        event.preventDefault();
        const taskId = taskItem.dataset.taskId;
        if (taskId) {
          this.handleStatusToggle(taskId, event);
        }
      }
    }

    // Ctrl+A：全選
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      if (!event.target.matches('input, textarea')) {
        event.preventDefault();
        this.selectAll();
      }
    }

    // Ctrl+Enter：標記選中任務為完成
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      if (this.selectedTasks.size > 0) {
        event.preventDefault();
        this.handleBatchStatusUpdate('completed');
      }
    }
  }

  /**
   * 初始化動畫系統
   */
  initializeAnimations() {
    // 添加 CSS 動畫樣式
    this.addAnimationStyles();
  }

  /**
   * 添加動畫樣式
   */
  addAnimationStyles() {
    const styleId = 'status-manager-animations';

    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .status-changing {
        animation: status-change ${this.config.animationDuration}ms ease-in-out;
      }

      .optimistic-update {
        opacity: 0.7;
      }

      @keyframes status-change {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }

      @keyframes confetti-fall {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }

      .task-item.completed .task-content {
        transition: all 0.3s ease-in-out;
        opacity: 0.7;
        text-decoration: line-through;
        color: #64748b;
      }

      .task-item.selected {
        background-color: #eff6ff;
        border-color: #3b82f6;
      }

      .confetti-piece {
        pointer-events: none;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 顯示載入指示器
   */
  showLoadingIndicator(show) {
    const indicator = document.getElementById('loadingOverlay');
    if (indicator) {
      indicator.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
  }

  /**
   * 顯示通知
   */
  showNotification(message, type = 'info', title = null) {
    // 使用全局通知系統
    if (window.showNotification) {
      window.showNotification(message, type, title);
    } else {
      console.log(`[${type.toUpperCase()}] ${title ? title + ': ' : ''}${message}`);
    }
  }

  /**
   * 顯示確認對話框
   */
  showConfirmDialog(message, action) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirmModal');
      const titleEl = document.getElementById('confirmModalTitle');
      const descEl = document.getElementById('confirmModalDescription');
      const confirmBtn = document.getElementById('confirmModalConfirm');
      const cancelBtn = document.getElementById('confirmModalCancel');

      if (modal && titleEl && descEl && confirmBtn && cancelBtn) {
        titleEl.textContent = `確認${action}`;
        descEl.textContent = message;

        const handleConfirm = () => {
          cleanup();
          resolve(true);
        };

        const handleCancel = () => {
          cleanup();
          resolve(false);
        };

        const cleanup = () => {
          modal.setAttribute('aria-hidden', 'true');
          confirmBtn.removeEventListener('click', handleConfirm);
          cancelBtn.removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        modal.setAttribute('aria-hidden', 'false');
      } else {
        // 如果模態框不可用，使用原生確認
        resolve(confirm(message));
      }
    });
  }

  /**
   * 事件通知方法
   */
  notifyStatusChange(taskId, newStatus, action) {
    const event = new CustomEvent('taskStatusChanged', {
      detail: { taskId, newStatus, action }
    });
    document.dispatchEvent(event);
  }

  notifyBatchStatusChange(taskIds, status, results) {
    const event = new CustomEvent('batchStatusChanged', {
      detail: { taskIds, status, results }
    });
    document.dispatchEvent(event);
  }

  notifyStatisticsUpdate(basicStats, statusStats) {
    const event = new CustomEvent('statisticsUpdated', {
      detail: { basicStats, statusStats }
    });
    document.dispatchEvent(event);
  }

  notifyMilestoneReached(count) {
    const event = new CustomEvent('milestoneReached', {
      detail: { completedCount: count }
    });
    document.dispatchEvent(event);
  }

  /**
   * 清理資源
   */
  destroy() {
    // 清理動畫
    this.animations.clear();

    // 移除事件監聽器
    if (this.elements.taskList) {
      this.elements.taskList.removeEventListener('click', this.handleTaskListClick.bind(this));
      this.elements.taskList.removeEventListener('change', this.handleTaskListChange.bind(this));
    }

    // 清理選擇狀態
    this.selectedTasks.clear();
  }
}