/**
 * 任務編輯器組件
 *
 * 負責處理任務的各種編輯操作，包括：
 * - 內聯編輯（點擊即編輯）
 * - 模態框編輯模式
 * - 自動保存機制
 * - 表單驗證
 * - 編輯歷史記錄
 * - 撤銷/重做功能
 */

export class TaskEditor {
  constructor(elements, utils, storage) {
    this.elements = elements;
    this.utils = utils;
    this.storage = storage;

    // 編輯狀態管理
    this.editingTasks = new Map(); // taskId -> editData
    this.editHistory = new Map(); // taskId -> history[]
    this.pendingChanges = new Map(); // taskId -> changes
    this.autoSaveTimers = new Map(); // taskId -> timerId

    // 編輯器配置
    this.config = {
      autoSaveDelay: 2000, // 自動保存延遲 (ms)
      maxHistoryLength: 50, // 最大歷史記錄數
      debounceDelay: 300, // 防抖延遲
      animationDuration: 200, // 動畫持續時間
      doubleClickDelay: 300 // 雙擊延遲
    };

    // 綁定事件處理器
    this.handleInlineEdit = this.handleInlineEdit.bind(this);
    this.handleModalEdit = this.handleModalEdit.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleAutoSave = this.handleAutoSave.bind(this);

    // 驗證規則
    this.validationRules = {
      title: {
        required: true,
        minLength: 1,
        maxLength: 255,
        pattern: /^[^<>]*$/,
        message: {
          required: '任務標題不能為空',
          minLength: '任務標題至少需要 1 個字符',
          maxLength: '任務標題不能超過 255 個字符',
          pattern: '任務標題不能包含 HTML 標籤'
        }
      },
      description: {
        maxLength: 2000,
        message: {
          maxLength: '任務描述不能超過 2000 個字符'
        }
      },
      dueDate: {
        validate: (value) => {
          if (!value) return true;
          const date = new Date(value);
          return !isNaN(date.getTime());
        },
        message: {
          invalid: '請輸入有效的日期'
        }
      },
      priority: {
        validate: (value) => ['low', 'medium', 'high'].includes(value),
        message: {
          invalid: '優先級必須是 low、medium 或 high'
        }
      }
    };
  }

  /**
   * 初始化編輯器
   */
  async initialize() {
    try {
      // 綁定事件監聽器
      this.bindEventListeners();

      // 初始化編輯器 UI
      this.initializeEditorUI();

      // 載入編輯歷史
      await this.loadEditHistory();

      console.log('✅ 任務編輯器初始化完成');
    } catch (error) {
      console.error('❌ 任務編輯器初始化失敗:', error);
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
        this.handleTaskClick(e);
      });

      this.elements.taskList.addEventListener('dblclick', (e) => {
        this.handleTaskDoubleClick(e);
      });
    }

    // 模態框事件
    if (this.elements.editModal) {
      this.elements.editModal.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleModalSave(e);
      });

      this.elements.editModal.addEventListener('click', (e) => {
        if (e.target === this.elements.editModal) {
          this.closeModal();
        }
      });
    }
  }

  /**
   * 初始化編輯器 UI
   */
  initializeEditorUI() {
    // 創建編輯模態框
    if (!this.elements.editModal) {
      this.createEditModal();
    }

    // 創建內聯編輯模板
    this.createInlineEditTemplates();

    // 添加編輯器樣式
    this.addEditorStyles();
  }

  /**
   * 處理任務點擊事件
   */
  handleTaskClick(e) {
    const taskElement = e.target.closest('[data-task-id]');
    if (!taskElement) return;

    const taskId = taskElement.dataset.taskId;
    const field = e.target.dataset.editable;

    if (field) {
      e.preventDefault();
      this.startInlineEdit(taskId, field, e.target);
    }
  }

  /**
   * 處理任務雙擊事件
   */
  handleTaskDoubleClick(e) {
    const taskElement = e.target.closest('[data-task-id]');
    if (!taskElement) return;

    const taskId = taskElement.dataset.taskId;
    e.preventDefault();
    this.startModalEdit(taskId);
  }

  /**
   * 開始內聯編輯
   */
  startInlineEdit(taskId, field, targetElement) {
    if (this.editingTasks.has(taskId)) {
      return; // 已在編輯中
    }

    const task = this.storage.tasks.find(t => t.id === taskId);
    if (!task) return;

    // 創建編輯數據
    const editData = {
      taskId,
      field,
      originalValue: task[field],
      currentValue: task[field],
      element: targetElement,
      originalContent: targetElement.textContent,
      startTime: Date.now()
    };

    // 保存當前狀態到歷史
    this.saveToHistory(taskId, field, task[field]);

    // 創建編輯元素
    const editElement = this.createInlineEditElement(field, editData);
    targetElement.replaceWith(editElement);
    editData.element = editElement;

    // 記錄編輯狀態
    this.editingTasks.set(taskId, editData);

    // 聚焦編輯元素
    this.focusEditElement(editElement, field);

    // 綁定事件
    this.bindInlineEditEvents(editElement, editData);

    // 觸發編輯開始事件
    this.dispatchEditEvent('editStart', { taskId, field, mode: 'inline' });
  }

  /**
   * 創建內聯編輯元素
   */
  createInlineEditElement(field, editData) {
    const value = editData.currentValue || '';

    switch (field) {
      case 'title':
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.className = 'task-edit-input task-edit-input--title';
        input.placeholder = '輸入任務標題...';
        input.maxLength = this.validationRules.title.maxLength;
        return input;

      case 'description':
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.className = 'task-edit-input task-edit-input--description';
        textarea.placeholder = '輸入任務描述...';
        textarea.maxLength = this.validationRules.description.maxLength;
        textarea.rows = 3;
        return textarea;

      case 'priority':
        const select = document.createElement('select');
        select.className = 'task-edit-input task-edit-input--priority';

        const priorities = [
          { value: 'low', label: '低' },
          { value: 'medium', label: '中' },
          { value: 'high', label: '高' }
        ];

        priorities.forEach(priority => {
          const option = document.createElement('option');
          option.value = priority.value;
          option.textContent = priority.label;
          option.selected = priority.value === value;
          select.appendChild(option);
        });

        return select;

      case 'dueDate':
        const dateInput = document.createElement('input');
        dateInput.type = 'datetime-local';
        dateInput.value = value ? new Date(value).toISOString().slice(0, 16) : '';
        dateInput.className = 'task-edit-input task-edit-input--date';
        return dateInput;

      default:
        const defaultInput = document.createElement('input');
        defaultInput.type = 'text';
        defaultInput.value = value;
        defaultInput.className = 'task-edit-input';
        return defaultInput;
    }
  }

  /**
   * 聚焦編輯元素
   */
  focusEditElement(element, field) {
    setTimeout(() => {
      element.focus();

      // 根據字段類型設置光標位置
      if (field === 'title' || field === 'description') {
        const length = element.value.length;
        element.setSelectionRange(length, length);
      }
    }, 0);
  }

  /**
   * 綁定內聯編輯事件
   */
  bindInlineEditEvents(element, editData) {
    // 保存事件
    const saveEvents = ['blur', 'keydown'];
    saveEvents.forEach(eventType => {
      element.addEventListener(eventType, (e) => {
        if (eventType === 'keydown') {
          if (e.key === 'Enter' && !e.shiftKey && editData.field !== 'description') {
            e.preventDefault();
            this.saveInlineEdit(editData);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            this.cancelInlineEdit(editData);
          }
        } else if (eventType === 'blur') {
          // 延遲保存以避免與其他點擊衝突
          setTimeout(() => {
            if (this.editingTasks.has(editData.taskId)) {
              this.saveInlineEdit(editData);
            }
          }, 150);
        }
      });
    });

    // 自動保存事件
    element.addEventListener('input', (e) => {
      editData.currentValue = e.target.value;
      this.startAutoSave(editData);
    });
  }

  /**
   * 開始自動保存
   */
  startAutoSave(editData) {
    // 清除之前的定時器
    if (this.autoSaveTimers.has(editData.taskId)) {
      clearTimeout(this.autoSaveTimers.get(editData.taskId));
    }

    // 設置新的自動保存定時器
    const timerId = setTimeout(() => {
      this.saveInlineEdit(editData, true); // true 表示自動保存
    }, this.config.autoSaveDelay);

    this.autoSaveTimers.set(editData.taskId, timerId);
  }

  /**
   * 保存內聯編輯
   */
  async saveInlineEdit(editData, isAutoSave = false) {
    const { taskId, field, currentValue, originalValue, element } = editData;

    // 驗證輸入
    const validation = this.validateField(field, currentValue);
    if (!validation.valid) {
      this.showValidationError(element, validation.message);
      return;
    }

    // 如果值沒有改變，直接取消編輯
    if (currentValue === originalValue) {
      this.cancelInlineEdit(editData);
      return;
    }

    try {
      // 顯示保存狀態
      this.showSaveStatus(element, 'saving');

      // 準備更新數據
      const updates = { [field]: currentValue };

      // 保存到儲存
      await this.storage.updateTask(taskId, updates);

      // 清除自動保存定時器
      if (this.autoSaveTimers.has(taskId)) {
        clearTimeout(this.autoSaveTimers.get(taskId));
        this.autoSaveTimers.delete(taskId);
      }

      // 顯示保存成功
      this.showSaveStatus(element, 'saved');

      // 更新顯示內容
      this.updateDisplayContent(editData);

      // 保存到歷史
      this.saveToHistory(taskId, field, currentValue, originalValue);

      // 清理編輯狀態
      this.editingTasks.delete(taskId);

      // 觸發事件
      this.dispatchEditEvent('editSave', {
        taskId,
        field,
        oldValue: originalValue,
        newValue: currentValue,
        isAutoSave
      });

      // 延遲隱藏保存狀態
      setTimeout(() => {
        this.hideSaveStatus(element);
      }, 1000);

    } catch (error) {
      console.error('保存編輯失敗:', error);
      this.showSaveStatus(element, 'error');
      this.dispatchEditEvent('editError', { taskId, field, error });
    }
  }

  /**
   * 取消內聯編輯
   */
  cancelInlineEdit(editData) {
    const { taskId, field, originalValue, element, originalContent } = editData;

    // 清除自動保存定時器
    if (this.autoSaveTimers.has(taskId)) {
      clearTimeout(this.autoSaveTimers.get(taskId));
      this.autoSaveTimers.delete(taskId);
    }

    // 恢復原始內容
    const displayElement = this.createDisplayElement(field, originalValue, originalContent);
    element.replaceWith(displayElement);

    // 清理編輯狀態
    this.editingTasks.delete(taskId);

    // 觸發事件
    this.dispatchEditEvent('editCancel', { taskId, field });
  }

  /**
   * 驗證字段
   */
  validateField(field, value) {
    const rule = this.validationRules[field];
    if (!rule) return { valid: true };

    // 檢查必填
    if (rule.required && (!value || value.trim() === '')) {
      return { valid: false, message: rule.message.required };
    }

    // 檢查最小長度
    if (rule.minLength && value.length < rule.minLength) {
      return { valid: false, message: rule.message.minLength };
    }

    // 檢查最大長度
    if (rule.maxLength && value.length > rule.maxLength) {
      return { valid: false, message: rule.message.maxLength };
    }

    // 檢查正則表達式
    if (rule.pattern && !rule.pattern.test(value)) {
      return { valid: false, message: rule.message.pattern };
    }

    // 自定義驗證
    if (rule.validate && !rule.validate(value)) {
      return { valid: false, message: rule.message.invalid || '輸入無效' };
    }

    return { valid: true };
  }

  /**
   * 顯示驗證錯誤
   */
  showValidationError(element, message) {
    // 添加錯誤樣式
    element.classList.add('task-edit-input--error');

    // 創建錯誤提示
    const errorTooltip = document.createElement('div');
    errorTooltip.className = 'task-edit-error';
    errorTooltip.textContent = message;

    // 定位錯誤提示
    const rect = element.getBoundingClientRect();
    errorTooltip.style.position = 'fixed';
    errorTooltip.style.top = `${rect.bottom + 5}px`;
    errorTooltip.style.left = `${rect.left}px`;
    errorTooltip.style.zIndex = '1000';

    document.body.appendChild(errorTooltip);

    // 自動移除錯誤提示
    setTimeout(() => {
      if (errorTooltip.parentNode) {
        errorTooltip.parentNode.removeChild(errorTooltip);
      }
      element.classList.remove('task-edit-input--error');
    }, 3000);

    // 聚焦到錯誤元素
    element.focus();
  }

  /**
   * 顯示保存狀態
   */
  showSaveStatus(element, status) {
    // 移除之前的狀態
    element.classList.remove('task-edit-input--saving', 'task-edit-input--saved', 'task-edit-input--error');

    // 添加新狀態
    element.classList.add(`task-edit-input--${status}`);

    // 如果是保存中狀態，添加指示器
    if (status === 'saving') {
      const indicator = document.createElement('span');
      indicator.className = 'task-edit-indicator';
      indicator.textContent = '...';
      element.appendChild(indicator);
    }
  }

  /**
   * 隱藏保存狀態
   */
  hideSaveStatus(element) {
    element.classList.remove('task-edit-input--saving', 'task-edit-input--saved', 'task-edit-input--error');

    // 移除保存指示器
    const indicator = element.querySelector('.task-edit-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * 創建顯示元素
   */
  createDisplayElement(field, value, originalContent) {
    const element = document.createElement('span');
    element.setAttribute('data-editable', field);

    // 更新內容和樣式
    if (field === 'title') {
      element.textContent = value || '未命名任務';
      element.className = 'task-title';
    } else if (field === 'description') {
      element.textContent = value || '';
      element.className = 'task-description';
    } else if (field === 'priority') {
      element.textContent = this.getPriorityLabel(value);
      element.className = `task-priority task-priority--${value}`;
    } else if (field === 'dueDate') {
      element.textContent = value ? this.formatDate(value) : '';
      element.className = 'task-due-date';
    }

    return element;
  }

  /**
   * 更新顯示內容
   */
  updateDisplayContent(editData) {
    const { field, currentValue, element } = editData;
    const displayElement = this.createDisplayElement(field, currentValue);

    element.replaceWith(displayElement);
  }

  /**
   * 保存到歷史
   */
  saveToHistory(taskId, field, newValue, oldValue = null) {
    if (!this.editHistory.has(taskId)) {
      this.editHistory.set(taskId, []);
    }

    const history = this.editHistory.get(taskId);
    const entry = {
      field,
      oldValue,
      newValue,
      timestamp: Date.now(),
      type: oldValue === null ? 'create' : 'update'
    };

    history.push(entry);

    // 限制歷史記錄長度
    if (history.length > this.config.maxHistoryLength) {
      history.shift();
    }
  }

  /**
   * 獲取優先級標籤
   */
  getPriorityLabel(priority) {
    const labels = {
      low: '低',
      medium: '中',
      high: '高'
    };
    return labels[priority] || priority;
  }

  /**
   * 格式化日期
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * 處理鍵盤事件
   */
  handleKeyDown(e) {
    // Ctrl+Z: 撤銷
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    }

    // Ctrl+Y: 重做
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      this.redo();
    }

    // Ctrl+S: 保存當前編輯
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      this.saveCurrentEdit();
    }

    // Escape: 取消當前編輯
    if (e.key === 'Escape') {
      e.preventDefault();
      this.cancelCurrentEdit();
    }
  }

  /**
   * 撤銷操作
   */
  undo() {
    // TODO: 實現撤銷功能
    console.log('撤銷操作 - 待實現');
  }

  /**
   * 重做操作
   */
  redo() {
    // TODO: 實現重做功能
    console.log('重做操作 - 待實現');
  }

  /**
   * 保存當前編輯
   */
  saveCurrentEdit() {
    for (const [taskId, editData] of this.editingTasks) {
      this.saveInlineEdit(editData);
    }
  }

  /**
   * 取消當前編輯
   */
  cancelCurrentEdit() {
    for (const [taskId, editData] of this.editingTasks) {
      this.cancelInlineEdit(editData);
    }
  }

  /**
   * 觸發編輯事件
   */
  dispatchEditEvent(eventType, data) {
    const event = new CustomEvent(`taskEdit:${eventType}`, {
      detail: data
    });
    document.dispatchEvent(event);
  }

  /**
   * 創建編輯模態框
   */
  createEditModal() {
    // TODO: 實現模態框編輯功能
    console.log('創建編輯模態框 - 待實現');
  }

  /**
   * 創建內聯編輯模板
   */
  createInlineEditTemplates() {
    // TODO: 創建編輯模板
    console.log('創建內聯編輯模板 - 待實現');
  }

  /**
   * 添加編輯器樣式
   */
  addEditorStyles() {
    // TODO: 添加編輯器樣式
    console.log('添加編輯器樣式 - 待實現');
  }

  /**
   * 載入編輯歷史
   */
  async loadEditHistory() {
    try {
      const historyData = localStorage.getItem('todolist-edit-history');
      if (historyData) {
        const parsed = JSON.parse(historyData);
        this.editHistory = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error('載入編輯歷史失敗:', error);
    }
  }

  /**
   * 獲取編輯歷史
   */
  getEditHistory(taskId) {
    return this.editHistory.get(taskId) || [];
  }

  /**
   * 清理資源
   */
  destroy() {
    // 清理定時器
    for (const timerId of this.autoSaveTimers.values()) {
      clearTimeout(timerId);
    }
    this.autoSaveTimers.clear();

    // 移除事件監聽器
    document.removeEventListener('keydown', this.handleKeyDown);

    // 清理編輯狀態
    this.editingTasks.clear();
    this.editHistory.clear();
    this.pendingChanges.clear();
  }
}