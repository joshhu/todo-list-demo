/**
 * 任務刪除組件
 *
 * 負責處理任務的各種刪除操作，包括：
 * - 安全刪除確認對話框
 * - 批量刪除功能
 * - 軟刪除（回收站）機制
 * - 刪除歷史記錄
 * - 恢復功能
 */

export class TaskDeleter {
  constructor(elements, utils, storage) {
    this.elements = elements;
    this.utils = utils;
    this.storage = storage;

    // 刪除狀態管理
    this.selectedForDeletion = new Set();
    this.deletingTasks = new Set();
    this.recycleBin = [];
    this.deleteHistory = new Map(); // taskId -> delete record

    // 刪除器配置
    this.config = {
      confirmTimeout: 3000, // 確認對話框超時時間 (ms)
      batchDeleteDelay: 500, // 批量刪除間隔 (ms)
      recycleBinRetention: 30, // 回收站保留天數
      maxBatchSize: 50, // 最大批量刪除數量
      animationDuration: 300 // 刪除動畫持續時間
    };

    // 綁定事件處理器
    this.handleDeleteClick = this.handleDeleteClick.bind(this);
    this.handleBatchDelete = this.handleBatchDelete.bind(this);
    this.handleConfirmDelete = this.handleConfirmDelete.bind(this);
    this.handleCancelDelete = this.handleCancelDelete.bind(this);
    this.handleRestoreTask = this.handleRestoreTask.bind(this);
    this.handlePermanentDelete = this.handlePermanentDelete.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * 初始化刪除器
   */
  async initialize() {
    try {
      // 綁定事件監聽器
      this.bindEventListeners();

      // 初始化刪除 UI
      this.initializeDeletionUI();

      // 載入回收站
      await this.loadRecycleBin();

      // 清理過期的回收站項目
      await this.cleanupExpiredRecycleBin();

      console.log('✅ 任務刪除器初始化完成');
    } catch (error) {
      console.error('❌ 任務刪除器初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 綁定事件監聽器
   */
  bindEventListeners() {
    // 全局鍵盤事件
    document.addEventListener('keydown', this.handleKeyDown);

    // 任務列表事件委託
    if (this.elements.taskList) {
      this.elements.taskList.addEventListener('click', (e) => {
        this.handleDeleteClick(e);
      });
    }

    // 批量刪除按鈕
    if (this.elements.batchDeleteBtn) {
      this.elements.batchDeleteBtn.addEventListener('click', this.handleBatchDelete);
    }

    // 回收站相關事件
    if (this.elements.recycleBin) {
      this.elements.recycleBin.addEventListener('click', (e) => {
        this.handleRecycleBinClick(e);
      });
    }
  }

  /**
   * 初始化刪除 UI
   */
  initializeDeletionUI() {
    // 創建確認對話框
    if (!this.elements.confirmDialog) {
      this.createConfirmDialog();
    }

    // 創建回收站界面
    if (!this.elements.recycleBin) {
      this.createRecycleBinUI();
    }

    // 添加刪除器樣式
    this.addDeletionStyles();
  }

  /**
   * 處理刪除點擊事件
   */
  handleDeleteClick(e) {
    const deleteBtn = e.target.closest('[data-action="delete"]');
    if (!deleteBtn) return;

    const taskElement = deleteBtn.closest('[data-task-id]');
    if (!taskElement) return;

    const taskId = taskElement.dataset.taskId;
    e.preventDefault();
    e.stopPropagation();

    // 檢查是否按下 Shift 鍵（跳過確認）
    if (e.shiftKey) {
      this.deleteTask(taskId, { skipConfirmation: true });
    } else {
      this.showDeleteConfirmation([taskId]);
    }
  }

  /**
   * 處理批量刪除
   */
  handleBatchDelete() {
    const selectedTasks = this.getSelectedTasks();
    if (selectedTasks.length === 0) {
      this.showNotification('請先選擇要刪除的任務', 'warning');
      return;
    }

    if (selectedTasks.length > this.config.maxBatchSize) {
      this.showNotification(`一次最多只能刪除 ${this.config.maxBatchSize} 個任務`, 'error');
      return;
    }

    this.showDeleteConfirmation(selectedTasks);
  }

  /**
   * 顯示刪除確認對話框
   */
  showDeleteConfirmation(taskIds, options = {}) {
    const isBatch = taskIds.length > 1;
    const isPermanent = options.permanent || false;

    // 創建確認對話框
    const dialog = this.createConfirmDialog(taskIds, {
      isBatch,
      isPermanent,
      timeout: options.timeout || this.config.confirmTimeout
    });

    // 顯示對話框
    document.body.appendChild(dialog);
    this.elements.confirmDialog = dialog;

    // 聚焦到取消按鈕
    const cancelBtn = dialog.querySelector('.confirm-dialog__cancel');
    if (cancelBtn) {
      setTimeout(() => cancelBtn.focus(), 100);
    }

    // 添加動畫
    requestAnimationFrame(() => {
      dialog.classList.add('confirm-dialog--visible');
    });

    return new Promise((resolve, reject) => {
      dialog.resolve = resolve;
      dialog.reject = reject;
    });
  }

  /**
   * 創建確認對話框
   */
  createConfirmDialog(taskIds, options) {
    const { isBatch, isPermanent, timeout } = options;
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'confirm-dialog-title');

    // 對話框標題
    const title = document.createElement('h2');
    title.id = 'confirm-dialog-title';
    title.className = 'confirm-dialog__title';
    title.textContent = isPermanent ? '永久刪除確認' : '刪除確認';

    // 對話框圖標
    const icon = document.createElement('div');
    icon.className = 'confirm-dialog__icon';
    icon.textContent = isPermanent ? '⚠️' : '🗑️';

    // 對話框訊息
    const message = document.createElement('p');
    message.className = 'confirm-dialog__message';
    message.textContent = this.getDeleteMessage(taskIds.length, isPermanent);

    // 對話框內容容器
    const content = document.createElement('div');
    content.className = 'confirm-dialog__content';

    // 頭部
    const header = document.createElement('div');
    header.className = 'confirm-dialog__header';
    header.appendChild(icon);
    header.appendChild(title);

    // 主體
    const body = document.createElement('div');
    body.className = 'confirm-dialog__body';
    body.appendChild(message);

    // 資訊或警告
    if (!isPermanent) {
      const info = document.createElement('div');
      info.className = 'confirm-dialog__info';
      const infoText = document.createElement('p');
      infoText.textContent = '💡 任務將被移至回收站，可在 30 天內恢復';
      info.appendChild(infoText);
      body.appendChild(info);
    } else {
      const warning = document.createElement('div');
      warning.className = 'confirm-dialog__warning';
      const warningText = document.createElement('p');
      warningText.textContent = '⚠️ 此操作無法撤銷，請謹慎操作';
      warning.appendChild(warningText);
      body.appendChild(warning);
    }

    // 倒計時
    let countdownElement = null;
    if (timeout > 0) {
      const countdown = document.createElement('div');
      countdown.className = 'confirm-dialog__countdown';
      const countdownText = document.createElement('p');
      countdownText.innerHTML = `請在 <span class="countdown-number">${timeout / 1000}</span> 秒後確認`;
      countdown.appendChild(countdownText);
      body.appendChild(countdown);
      countdownElement = countdownText.querySelector('.countdown-number');
    }

    // 按鈕容器
    const footer = document.createElement('div');
    footer.className = 'confirm-dialog__footer';

    // 取消按鈕
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn--secondary confirm-dialog__cancel';
    cancelBtn.textContent = '取消';

    // 確認按鈕
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = `btn btn--${isPermanent ? 'danger' : 'primary'} confirm-dialog__confirm`;
    confirmBtn.textContent = isPermanent ? '永久刪除' : '確認刪除';
    if (timeout > 0) {
      confirmBtn.disabled = true;
    }

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    // 組裝對話框
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);

    // 背景遮罩
    const backdrop = document.createElement('div');
    backdrop.className = 'confirm-dialog__backdrop';

    dialog.appendChild(content);
    dialog.appendChild(backdrop);

    // 綁定事件
    confirmBtn.addEventListener('click', () => {
      this.handleConfirmDelete(taskIds, options);
    });

    cancelBtn.addEventListener('click', () => {
      this.handleCancelDelete();
    });

    backdrop.addEventListener('click', () => {
      this.handleCancelDelete();
    });

    // 倒計時功能
    if (timeout > 0 && countdownElement) {
      this.startCountdown(countdownElement, timeout, () => {
        confirmBtn.disabled = false;
        confirmBtn.focus();
      });
    }

    // ESC 鍵關閉
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.handleCancelDelete();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    dialog.handleKeyDown = handleKeyDown;

    return dialog;
  }

  /**
   * 獲取刪除訊息
   */
  getDeleteMessage(count, isPermanent) {
    if (count === 1) {
      return isPermanent
        ? '確定要永久刪除這個任務嗎？'
        : '確定要刪除這個任務嗎？';
    } else {
      return isPermanent
        ? `確定要永久刪除這 ${count} 個任務嗎？`
        : `確定要刪除這 ${count} 個任務嗎？`;
    }
  }

  /**
   * 開始倒計時
   */
  startCountdown(element, timeout, callback) {
    let remaining = Math.ceil(timeout / 1000);
    const interval = setInterval(() => {
      remaining--;
      element.textContent = remaining;

      if (remaining <= 0) {
        clearInterval(interval);
        callback();
      }
    }, 1000);

    // 保存 interval ID 以便清理
    element.intervalId = interval;
  }

  /**
   * 處理確認刪除
   */
  async handleConfirmDelete(taskIds, options) {
    try {
      // 關閉對話框
      this.closeConfirmDialog();

      // 執行刪除
      if (options.permanent) {
        await this.permanentDeleteTasks(taskIds);
      } else {
        await this.deleteTasks(taskIds);
      }

    } catch (error) {
      console.error('刪除失敗:', error);
      this.showNotification('刪除失敗，請重試', 'error');
    }
  }

  /**
   * 處理取消刪除
   */
  handleCancelDelete() {
    this.closeConfirmDialog();
  }

  /**
   * 關閉確認對話框
   */
  closeConfirmDialog() {
    if (!this.elements.confirmDialog) return;

    const dialog = this.elements.confirmDialog;

    // 清理倒計時
    const countdownElement = dialog.querySelector('.countdown-number');
    if (countdownElement && countdownElement.intervalId) {
      clearInterval(countdownElement.intervalId);
    }

    // 清理鍵盤事件
    if (dialog.handleKeyDown) {
      document.removeEventListener('keydown', dialog.handleKeyDown);
    }

    // 添加關閉動畫
    dialog.classList.remove('confirm-dialog--visible');

    // 延遲移除 DOM
    setTimeout(() => {
      if (dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
      }
    }, this.config.animationDuration);

    this.elements.confirmDialog = null;
  }

  /**
   * 刪除任務（軟刪除）
   */
  async deleteTasks(taskIds) {
    const deletePromises = taskIds.map(taskId =>
      this.deleteTask(taskId)
    );

    try {
      await Promise.all(deletePromises);

      const message = taskIds.length === 1
        ? '任務已移至回收站'
        : `${taskIds.length} 個任務已移至回收站`;

      this.showNotification(message, 'success');
    } catch (error) {
      throw error;
    }
  }

  /**
   * 刪除單個任務
   */
  async deleteTask(taskId, options = {}) {
    if (this.deletingTasks.has(taskId)) {
      return; // 已在刪除中
    }

    const task = this.storage.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('任務不存在');
    }

    this.deletingTasks.add(taskId);

    try {
      // 添加刪除動畫
      if (!options.skipAnimation) {
        await this.addDeleteAnimation(taskId);
      }

      // 創建回收站記錄
      const recycleRecord = {
        taskId,
        task: { ...task },
        deletedAt: Date.now(),
        deletedBy: 'user', // TODO: 實現用戶系統
        expiresAt: Date.now() + (this.config.recycleBinRetention * 24 * 60 * 60 * 1000)
      };

      // 添加到回收站
      this.recycleBin.push(recycleRecord);

      // 軟刪除任務（添加 deletedAt 標記）
      await this.storage.softDeleteTask(taskId);

      // 記錄刪除歷史
      this.recordDeleteHistory(taskId, recycleRecord);

      // 觸發刪除事件
      this.dispatchDeleteEvent('taskDeleted', {
        taskId,
        task,
        recycleRecord,
        isPermanent: false
      });

      // 如果沒有跳過確認，顯示通知
      if (!options.skipConfirmation) {
        this.showNotification('任務已移至回收站', 'success');
      }

    } finally {
      this.deletingTasks.delete(taskId);
    }
  }

  /**
   * 永久刪除任務
   */
  async permanentDeleteTasks(taskIds) {
    const deletePromises = taskIds.map(taskId =>
      this.permanentDeleteTask(taskId)
    );

    try {
      await Promise.all(deletePromises);

      const message = taskIds.length === 1
        ? '任務已永久刪除'
        : `${taskIds.length} 個任務已永久刪除`;

      this.showNotification(message, 'success');
    } catch (error) {
      throw error;
    }
  }

  /**
   * 永久刪除單個任務
   */
  async permanentDeleteTask(taskId) {
    if (this.deletingTasks.has(taskId)) {
      return;
    }

    const task = this.storage.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('任務不存在');
    }

    this.deletingTasks.add(taskId);

    try {
      // 從回收站移除
      this.recycleBin = this.recycleBin.filter(record => record.taskId !== taskId);

      // 永久刪除任務
      await this.storage.hardDeleteTask(taskId);

      // 記錄刪除歷史
      this.recordDeleteHistory(taskId, { task, permanent: true, deletedAt: Date.now() });

      // 觸發刪除事件
      this.dispatchDeleteEvent('taskPermanentlyDeleted', {
        taskId,
        task,
        isPermanent: true
      });

    } finally {
      this.deletingTasks.delete(taskId);
    }
  }

  /**
   * 恢復任務
   */
  async restoreTask(taskId) {
    const recycleRecord = this.recycleBin.find(record => record.taskId === taskId);
    if (!recycleRecord) {
      throw new Error('回收站中找不到該任務');
    }

    try {
      // 恢復任務
      await this.storage.restoreTask(taskId);

      // 從回收站移除
      this.recycleBin = this.recycleBin.filter(record => record.taskId !== taskId);

      // 觸發恢復事件
      this.dispatchDeleteEvent('taskRestored', {
        taskId,
        task: recycleRecord.task,
        recycleRecord
      });

      this.showNotification('任務已恢復', 'success');

    } catch (error) {
      console.error('恢復任務失敗:', error);
      this.showNotification('恢復失敗，請重試', 'error');
      throw error;
    }
  }

  /**
   * 添加刪除動畫
   */
  async addDeleteAnimation(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!taskElement) return;

    // 添加動畫類
    taskElement.classList.add('task--deleting');

    // 等待動畫完成
    return new Promise(resolve => {
      setTimeout(() => {
        taskElement.classList.remove('task--deleting');
        resolve();
      }, this.config.animationDuration);
    });
  }

  /**
   * 記錄刪除歷史
   */
  recordDeleteHistory(taskId, record) {
    if (!this.deleteHistory.has(taskId)) {
      this.deleteHistory.set(taskId, []);
    }

    const history = this.deleteHistory.get(taskId);
    history.push(record);

    // 限制歷史記錄長度
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * 處理回收站點擊事件
   */
  handleRecycleBinClick(e) {
    const restoreBtn = e.target.closest('[data-action="restore"]');
    const permanentDeleteBtn = e.target.closest('[data-action="permanent-delete"]');

    if (restoreBtn) {
      const taskId = restoreBtn.dataset.taskId;
      e.preventDefault();
      this.restoreTask(taskId);
    }

    if (permanentDeleteBtn) {
      const taskId = permanentDeleteBtn.dataset.taskId;
      e.preventDefault();
      this.showDeleteConfirmation([taskId], { permanent: true });
    }
  }

  /**
   * 處理鍵盤事件
   */
  handleKeyDown(e) {
    // Delete 鍵：刪除選中的任務
    if (e.key === 'Delete' && !e.ctrlKey && !e.shiftKey) {
      const selectedTasks = this.getSelectedTasks();
      if (selectedTasks.length > 0) {
        e.preventDefault();
        this.showDeleteConfirmation(selectedTasks);
      }
    }

    // Ctrl+Delete：永久刪除選中的任務
    if (e.key === 'Delete' && e.ctrlKey && !e.shiftKey) {
      const selectedTasks = this.getSelectedTasks();
      if (selectedTasks.length > 0) {
        e.preventDefault();
        this.showDeleteConfirmation(selectedTasks, { permanent: true });
      }
    }

    // Shift+Delete：跳過確認直接刪除
    if (e.key === 'Delete' && e.shiftKey && !e.ctrlKey) {
      const selectedTasks = this.getSelectedTasks();
      if (selectedTasks.length > 0) {
        e.preventDefault();
        selectedTasks.forEach(taskId => {
          this.deleteTask(taskId, { skipConfirmation: true });
        });
      }
    }
  }

  /**
   * 獲取選中的任務
   */
  getSelectedTasks() {
    const selectedElements = document.querySelectorAll('[data-task-id].task--selected');
    return Array.from(selectedElements).map(element => element.dataset.taskId);
  }

  /**
   * 創建回收站 UI
   */
  createRecycleBinUI() {
    const recycleBin = document.createElement('div');
    recycleBin.className = 'recycle-bin';

    // 頭部
    const header = document.createElement('div');
    header.className = 'recycle-bin__header';

    const title = document.createElement('h3');
    title.textContent = '回收站';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn--secondary';
    clearBtn.setAttribute('data-action', 'clear-recycle-bin');
    clearBtn.textContent = '清空回收站';

    header.appendChild(title);
    header.appendChild(clearBtn);

    // 內容區域
    const content = document.createElement('div');
    content.className = 'recycle-bin__content';

    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'recycle-bin__empty';
    emptyMessage.textContent = '回收站是空的';

    const list = document.createElement('div');
    list.className = 'recycle-bin__list';

    content.appendChild(emptyMessage);
    content.appendChild(list);

    recycleBin.appendChild(header);
    recycleBin.appendChild(content);

    this.elements.recycleBin = recycleBin;
  }

  /**
   * 載入回收站
   */
  async loadRecycleBin() {
    try {
      const recycleData = localStorage.getItem('todolist-recycle-bin');
      if (recycleData) {
        this.recycleBin = JSON.parse(recycleData);
      }
    } catch (error) {
      console.error('載入回收站失敗:', error);
    }
  }

  /**
   * 保存回收站
   */
  async saveRecycleBin() {
    try {
      localStorage.setItem('todolist-recycle-bin', JSON.stringify(this.recycleBin));
    } catch (error) {
      console.error('保存回收站失敗:', error);
    }
  }

  /**
   * 清理過期的回收站項目
   */
  async cleanupExpiredRecycleBin() {
    const now = Date.now();
    const expiredItems = this.recycleBin.filter(record => record.expiresAt <= now);

    if (expiredItems.length > 0) {
      // 永久刪除過期項目
      for (const record of expiredItems) {
        try {
          await this.storage.hardDeleteTask(record.taskId);
        } catch (error) {
          console.error('清理過期任務失敗:', error);
        }
      }

      // 更新回收站
      this.recycleBin = this.recycleBin.filter(record => record.expiresAt > now);
      await this.saveRecycleBin();
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
   * 觸發刪除事件
   */
  dispatchDeleteEvent(eventType, data) {
    const event = new CustomEvent(`taskDelete:${eventType}`, {
      detail: data
    });
    document.dispatchEvent(event);
  }

  /**
   * 添加刪除器樣式
   */
  addDeletionStyles() {
    // TODO: 添加刪除器樣式
    console.log('添加刪除器樣式 - 待實現');
  }

  /**
   * 清理資源
   */
  destroy() {
    // 移除事件監聽器
    document.removeEventListener('keydown', this.handleKeyDown);

    // 清理狀態
    this.selectedForDeletion.clear();
    this.deletingTasks.clear();
    this.recycleBin = [];
    this.deleteHistory.clear();
  }
}