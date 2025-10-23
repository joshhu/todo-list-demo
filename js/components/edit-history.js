/**
 * 編輯歷史管理組件
 *
 * 負責管理任務的編輯歷史記錄，包括：
 * - 記錄所有編輯操作
 * - 實現撤銷/重做功能
 * - 版本比較和差異顯示
 * - 編輯時間軸視圖
 * - 歷史記錄導出
 */

export class EditHistory {
  constructor(elements, utils, storage) {
    this.elements = elements;
    this.utils = utils;
    this.storage = storage;

    // 歷史管理狀態
    this.histories = new Map(); // taskId -> history[]
    this.undoStacks = new Map(); // taskId -> undoStack[]
    this.redoStacks = new Map(); // taskId -> redoStack[]
    this.currentVersions = new Map(); // taskId -> currentVersion

    // 歷史配置
    this.config = {
      maxHistoryLength: 100,
      maxBatchSize: 20,
      autoSaveInterval: 30000, // 30秒自動保存歷史
      compressionThreshold: 50 // 壓縮閾值
    };

    // 綁定事件處理器
    this.handleEditEvent = this.handleEditEvent.bind(this);
    this.handleUndo = this.handleUndo.bind(this);
    this.handleRedo = this.handleRedo.bind(this);
    this.handleShowHistory = this.handleShowHistory.bind(this);

    // 自動保存定時器
    this.autoSaveTimer = null;
  }

  /**
   * 初始化編輯歷史管理
   */
  async initialize() {
    try {
      // 綁定事件監聽器
      this.bindEventListeners();

      // 載入歷史記錄
      await this.loadHistories();

      // 創建歷史界面
      this.createHistoryUI();

      // 啟動自動保存
      this.startAutoSave();

      console.log('✅ 編輯歷史管理初始化完成');
    } catch (error) {
      console.error('❌ 編輯歷史管理初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 綁定事件監聽器
   */
  bindEventListeners() {
    // 監聽編輯事件
    document.addEventListener('taskEdit:editSave', this.handleEditEvent);
    document.addEventListener('taskEdit:editCancel', this.handleEditEvent);
    document.addEventListener('editForm:taskUpdated', this.handleEditEvent);

    // 全局鍵盤事件
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.handleUndo();
      }
      if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.handleRedo();
      }
    });
  }

  /**
   * 創建歷史界面
   */
  createHistoryUI() {
    // 創建歷史模態框
    const modal = document.createElement('div');
    modal.className = 'history-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'history-modal-title');

    const content = document.createElement('div');
    content.className = 'history-modal__content';

    // 頭部
    const header = document.createElement('div');
    header.className = 'history-modal__header';

    const title = document.createElement('h2');
    title.id = 'history-modal-title';
    title.className = 'history-modal__title';
    title.textContent = '編輯歷史';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'history-modal__close';
    closeBtn.setAttribute('aria-label', '關閉');
    closeBtn.textContent = '×';

    header.appendChild(title);
    header.appendChild(closeBtn);

    // 主體
    const body = document.createElement('div');
    body.className = 'history-modal__body';

    // 歷史時間軸
    const timeline = document.createElement('div');
    timeline.className = 'history-timeline';

    // 版本比較區域
    const comparison = document.createElement('div');
    comparison.className = 'history-comparison';
    comparison.style.display = 'none';

    body.appendChild(timeline);
    body.appendChild(comparison);

    // 底部
    const footer = document.createElement('div');
    footer.className = 'history-modal__footer';

    const restoreBtn = document.createElement('button');
    restoreBtn.type = 'button';
    restoreBtn.className = 'btn btn--primary history-modal__restore';
    restoreBtn.textContent = '恢復到此版本';
    restoreBtn.style.display = 'none';

    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'btn btn--secondary history-modal__export';
    exportBtn.textContent = '導出歷史';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn btn--danger history-modal__clear';
    clearBtn.textContent = '清空歷史';

    footer.appendChild(restoreBtn);
    footer.appendChild(exportBtn);
    footer.appendChild(clearBtn);

    // 背景遮罩
    const backdrop = document.createElement('div');
    backdrop.className = 'history-modal__backdrop';

    // 組裝
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);

    modal.appendChild(content);
    modal.appendChild(backdrop);

    // 添加到 DOM
    document.body.appendChild(modal);
    this.elements.historyModal = modal;

    // 綁定事件
    this.bindHistoryModalEvents();
  }

  /**
   * 綁定歷史模態框事件
   */
  bindHistoryModalEvents() {
    const modal = this.elements.historyModal;
    const closeBtn = modal.querySelector('.history-modal__close');
    const backdrop = modal.querySelector('.history-modal__backdrop');
    const restoreBtn = modal.querySelector('.history-modal__restore');
    const exportBtn = modal.querySelector('.history-modal__export');
    const clearBtn = modal.querySelector('.history-modal__clear');

    closeBtn.addEventListener('click', () => this.closeHistoryModal());
    backdrop.addEventListener('click', () => this.closeHistoryModal());
    restoreBtn.addEventListener('click', () => this.restoreToVersion());
    exportBtn.addEventListener('click', () => this.exportHistory());
    clearBtn.addEventListener('click', () => this.clearHistory());

    // ESC 鍵關閉
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeHistoryModal();
      }
    });
  }

  /**
   * 處理編輯事件
   */
  handleEditEvent(event) {
    const { detail } = event;
    const { taskId, field, oldValue, newValue, isAutoSave } = detail;

    // 如果是自動保存，跳過記錄
    if (isAutoSave) return;

    // 記錄編輯歷史
    this.recordEdit(taskId, {
      field,
      oldValue,
      newValue,
      timestamp: Date.now(),
      type: event.type,
      source: event.type.replace('taskEdit:', '').replace('editForm:', '')
    });

    // 更新撤銷/重做堆疊
    this.updateUndoRedoStacks(taskId);
  }

  /**
   * 記錄編輯
   */
  recordEdit(taskId, editData) {
    if (!this.histories.has(taskId)) {
      this.histories.set(taskId, []);
    }

    const history = this.histories.get(taskId);

    // 添加記錄
    const record = {
      id: this.generateId(),
      ...editData,
      taskId,
      version: this.getNextVersion(taskId)
    };

    history.push(record);

    // 限制歷史長度
    if (history.length > this.config.maxHistoryLength) {
      history.shift();
    }

    // 更新當前版本
    this.currentVersions.set(taskId, record.version);

    // 自動保存歷史
    this.saveHistory(taskId);
  }

  /**
   * 記錄批量編輯
   */
  recordBatchEdit(taskId, changes) {
    if (!Array.isArray(changes) || changes.length === 0) return;

    const record = {
      id: this.generateId(),
      taskId,
      changes,
      timestamp: Date.now(),
      type: 'batchEdit',
      version: this.getNextVersion(taskId)
    };

    if (!this.histories.has(taskId)) {
      this.histories.set(taskId, []);
    }

    const history = this.histories.get(taskId);
    history.push(record);

    // 限制歷史長度
    if (history.length > this.config.maxHistoryLength) {
      history.shift();
    }

    this.currentVersions.set(taskId, record.version);
    this.saveHistory(taskId);
  }

  /**
   * 更新撤銷/重做堆疊
   */
  updateUndoRedoStacks(taskId) {
    if (!this.undoStacks.has(taskId)) {
      this.undoStacks.set(taskId, []);
    }
    if (!this.redoStacks.has(taskId)) {
      this.redoStacks.set(taskId, []);
    }

    const history = this.histories.get(taskId);
    const currentVersion = this.currentVersions.get(taskId);

    // 清空重做堆疊（新操作會使重做失效）
    this.redoStacks.get(taskId).length = 0;

    // 添加到撤銷堆疊
    const undoStack = this.undoStacks.get(taskId);
    const currentRecord = history.find(record => record.version === currentVersion);
    if (currentRecord) {
      undoStack.push({
        ...currentRecord,
        undoData: this.getUndoData(currentRecord)
      });
    }

    // 限制堆疊長度
    if (undoStack.length > this.config.maxBatchSize) {
      undoStack.shift();
    }
  }

  /**
   * 獲取撤銷數據
   */
  getUndoData(record) {
    if (record.changes) {
      // 批量編輯
      return record.changes.map(change => ({
        field: change.field,
        value: change.oldValue
      }));
    } else {
      // 單個編輯
      return [{
        field: record.field,
        value: record.oldValue
      }];
    }
  }

  /**
   * 處理撤銷
   */
  async handleUndo() {
    const taskId = this.getCurrentTaskId();
    if (!taskId) return;

    const undoStack = this.undoStacks.get(taskId);
    if (!undoStack || undoStack.length === 0) return;

    const undoAction = undoStack.pop();
    const redoStack = this.redoStacks.get(taskId);

    try {
      // 準備重做數據
      const redoData = await this.prepareRedoData(taskId, undoAction);

      // 執行撤銷
      await this.executeUndo(taskId, undoAction);

      // 添加到重做堆疊
      redoStack.push(redoData);

      // 更新版本
      const newVersion = this.getNextVersion(taskId) - 1;
      this.currentVersions.set(taskId, newVersion);

      // 顯示通知
      this.showNotification('已撤銷操作', 'info');

      // 觸發撤銷事件
      this.dispatchHistoryEvent('undo', {
        taskId,
        undoAction,
        newVersion
      });

    } catch (error) {
      console.error('撤銷失敗:', error);
      this.showNotification('撤銷失敗', 'error');
      // 恢復撤銷堆疊
      undoStack.push(undoAction);
    }
  }

  /**
   * 處理重做
   */
  async handleRedo() {
    const taskId = this.getCurrentTaskId();
    if (!taskId) return;

    const redoStack = this.redoStacks.get(taskId);
    if (!redoStack || redoStack.length === 0) return;

    const redoAction = redoStack.pop();
    const undoStack = this.undoStacks.get(taskId);

    try {
      // 執行重做
      await this.executeRedo(taskId, redoAction);

      // 添加到撤銷堆疊
      undoStack.push(redoAction);

      // 更新版本
      const newVersion = this.getNextVersion(taskId);
      this.currentVersions.set(taskId, newVersion);

      // 顯示通知
      this.showNotification('已重做操作', 'info');

      // 觸發重做事件
      this.dispatchHistoryEvent('redo', {
        taskId,
        redoAction,
        newVersion
      });

    } catch (error) {
      console.error('重做失敗:', error);
      this.showNotification('重做失敗', 'error');
      // 恢復重做堆疊
      redoStack.push(redoAction);
    }
  }

  /**
   * 準備重做數據
   */
  async prepareRedoData(taskId, undoAction) {
    const task = this.storage.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('任務不存在');
    }

    const redoData = {
      ...undoAction,
      redoData: undoAction.undoData.map(undo => ({
        field: undo.field,
        value: task[undo.field]
      }))
    };

    return redoData;
  }

  /**
   * 執行撤銷
   */
  async executeUndo(taskId, undoAction) {
    const updates = {};

    undoAction.undoData.forEach(undo => {
      updates[undo.field] = undo.value;
    });

    await this.storage.updateTask(taskId, updates);
  }

  /**
   * 執行重做
   */
  async executeRedo(taskId, redoAction) {
    const updates = {};

    redoAction.redoData.forEach(redo => {
      updates[redo.field] = redo.value;
    });

    await this.storage.updateTask(taskId, updates);
  }

  /**
   * 顯示歷史模態框
   */
  showHistoryModal(taskId) {
    const modal = this.elements.historyModal;
    const task = this.storage.tasks.find(t => t.id === taskId);

    if (!task) {
      this.showNotification('任務不存在', 'error');
      return;
    }

    // 設置當前任務
    this.currentHistoryTaskId = taskId;

    // 更新標題
    modal.querySelector('.history-modal__title').textContent = `編輯歷史 - ${task.title}`;

    // 渲染歷史時間軸
    this.renderHistoryTimeline(taskId);

    // 顯示模態框
    modal.classList.add('history-modal--visible');

    // 聚焦到關閉按鈕
    const closeBtn = modal.querySelector('.history-modal__close');
    setTimeout(() => closeBtn.focus(), 100);
  }

  /**
   * 關閉歷史模態框
   */
  closeHistoryModal() {
    const modal = this.elements.historyModal;
    modal.classList.remove('history-modal--visible');
    this.currentHistoryTaskId = null;
  }

  /**
   * 渲染歷史時間軸
   */
  renderHistoryTimeline(taskId) {
    const timeline = this.elements.historyModal.querySelector('.history-timeline');
    const history = this.histories.get(taskId) || [];

    // 清空時間軸
    while (timeline.firstChild) {
      timeline.removeChild(timeline.firstChild);
    }

    if (history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = '暫無編輯歷史';
      timeline.appendChild(empty);
      return;
    }

    // 按時間倒序排列
    const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

    // 創建時間軸項目
    sortedHistory.forEach((record, index) => {
      const item = this.createHistoryItem(record, index);
      timeline.appendChild(item);
    });
  }

  /**
   * 創建歷史項目
   */
  createHistoryItem(record, index) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.dataset.version = record.version;

    // 時間戳
    const timestamp = document.createElement('div');
    timestamp.className = 'history-item__timestamp';
    timestamp.textContent = this.formatTimestamp(record.timestamp);

    // 版本號
    const version = document.createElement('div');
    version.className = 'history-item__version';
    version.textContent = `v${record.version}`;

    // 操作描述
    const description = document.createElement('div');
    description.className = 'history-item__description';
    description.textContent = this.getOperationDescription(record);

    // 比較按鈕
    const compareBtn = document.createElement('button');
    compareBtn.type = 'button';
    compareBtn.className = 'btn btn--small btn--secondary history-item__compare';
    compareBtn.textContent = '比較';
    compareBtn.addEventListener('click', () => {
      this.compareWithCurrent(record);
    });

    // 組裝
    item.appendChild(timestamp);
    item.appendChild(version);
    item.appendChild(description);
    item.appendChild(compareBtn);

    // 點擊項目顯示詳情
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('btn')) {
        this.showHistoryDetail(record);
      }
    });

    return item;
  }

  /**
   * 獲取操作描述
   */
  getOperationDescription(record) {
    if (record.changes) {
      // 批量編輯
      const fields = record.changes.map(change => this.getFieldLabel(change.field));
      return `批量修改了 ${fields.join(', ')}`;
    } else {
      // 單個編輯
      const fieldLabel = this.getFieldLabel(record.field);
      const oldValue = record.oldValue || '(空)';
      const newValue = record.newValue || '(空)';
      return `修改了 ${fieldLabel}: "${oldValue}" → "${newValue}"`;
    }
  }

  /**
   * 獲取字段標籤
   */
  getFieldLabel(field) {
    const labels = {
      title: '標題',
      description: '描述',
      priority: '優先級',
      dueDate: '截止日期',
      tags: '標籤'
    };
    return labels[field] || field;
  }

  /**
   * 顯示歷史詳情
   */
  showHistoryDetail(record) {
    const comparison = this.elements.historyModal.querySelector('.history-comparison');
    const restoreBtn = this.elements.historyModal.querySelector('.history-modal__restore');

    // 清空比較區域
    while (comparison.firstChild) {
      comparison.removeChild(comparison.firstChild);
    }

    // 創建詳情內容
    const detail = this.createHistoryDetail(record);
    comparison.appendChild(detail);

    // 顯示比較區域
    comparison.style.display = 'block';
    restoreBtn.style.display = 'block';

    // 設置恢復按鈕數據
    restoreBtn.dataset.version = record.version;
  }

  /**
   * 創建歷史詳情
   */
  createHistoryDetail(record) {
    const detail = document.createElement('div');
    detail.className = 'history-detail';

    // 標題
    const title = document.createElement('h4');
    title.className = 'history-detail__title';
    title.textContent = `版本 v${record.version} 詳情`;

    // 時間信息
    const timeInfo = document.createElement('div');
    timeInfo.className = 'history-detail__time';
    timeInfo.textContent = this.formatTimestamp(record.timestamp);

    // 變更內容
    const changes = document.createElement('div');
    changes.className = 'history-detail__changes';

    if (record.changes) {
      // 批量編輯
      const changesTitle = document.createElement('h5');
      changesTitle.textContent = '批量變更:';
      changes.appendChild(changesTitle);

      record.changes.forEach(change => {
        const changeItem = this.createChangeItem(change);
        changes.appendChild(changeItem);
      });
    } else {
      // 單個編輯
      const changeTitle = document.createElement('h5');
      changeTitle.textContent = '變更內容:';
      changes.appendChild(changeTitle);

      const change = {
        field: record.field,
        oldValue: record.oldValue,
        newValue: record.newValue
      };
      const changeItem = this.createChangeItem(change);
      changes.appendChild(changeItem);
    }

    detail.appendChild(title);
    detail.appendChild(timeInfo);
    detail.appendChild(changes);

    return detail;
  }

  /**
   * 創建變更項目
   */
  createChangeItem(change) {
    const item = document.createElement('div');
    item.className = 'history-change';

    const field = document.createElement('div');
    field.className = 'history-change__field';
    field.textContent = this.getFieldLabel(change.field);

    const values = document.createElement('div');
    values.className = 'history-change__values';

    const oldValue = document.createElement('div');
    oldValue.className = 'history-change__old';
    oldValue.textContent = change.oldValue || '(空)';

    const arrow = document.createElement('div');
    arrow.className = 'history-change__arrow';
    arrow.textContent = '→';

    const newValue = document.createElement('div');
    newValue.className = 'history-change__new';
    newValue.textContent = change.newValue || '(空)';

    values.appendChild(oldValue);
    values.appendChild(arrow);
    values.appendChild(newValue);

    item.appendChild(field);
    item.appendChild(values);

    return item;
  }

  /**
   * 比較與當前版本
   */
  compareWithCurrent(record) {
    // TODO: 實現版本比較功能
    console.log('比較版本', record);
    this.showNotification('版本比較功能開發中', 'info');
  }

  /**
   * 恢復到指定版本
   */
  async restoreToVersion() {
    const restoreBtn = this.elements.historyModal.querySelector('.history-modal__restore');
    const version = parseInt(restoreBtn.dataset.version);

    if (!version || !this.currentHistoryTaskId) return;

    try {
      // 獲取版本記錄
      const history = this.histories.get(this.currentHistoryTaskId) || [];
      const record = history.find(r => r.version === version);

      if (!record) {
        this.showNotification('版本不存在', 'error');
        return;
      }

      // 執行恢復
      await this.executeRestore(this.currentHistoryTaskId, record);

      // 關閉歷史模態框
      this.closeHistoryModal();

      this.showNotification('已恢復到指定版本', 'success');

    } catch (error) {
      console.error('恢復版本失敗:', error);
      this.showNotification('恢復失敗', 'error');
    }
  }

  /**
   * 執行恢復
   */
  async executeRestore(taskId, record) {
    const updates = {};

    if (record.changes) {
      // 批量編輯恢復
      record.changes.forEach(change => {
        updates[change.field] = change.oldValue;
      });
    } else {
      // 單個編輯恢復
      updates[record.field] = record.oldValue;
    }

    await this.storage.updateTask(taskId, updates);

    // 記錄恢復操作
    this.recordEdit(taskId, {
      field: 'restore',
      oldValue: this.currentVersions.get(taskId),
      newValue: record.version,
      type: 'restore',
      source: 'history'
    });
  }

  /**
   * 導出歷史
   */
  exportHistory() {
    if (!this.currentHistoryTaskId) return;

    const history = this.histories.get(this.currentHistoryTaskId) || [];
    const task = this.storage.tasks.find(t => t.id === this.currentHistoryTaskId);

    const exportData = {
      taskId: this.currentHistoryTaskId,
      taskTitle: task?.title || '未知任務',
      exportTime: new Date().toISOString(),
      history: history.map(record => ({
        ...record,
        timestamp: new Date(record.timestamp).toISOString()
      }))
    };

    // 創建下載連結
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `task-history-${this.currentHistoryTaskId}-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
    this.showNotification('歷史已導出', 'success');
  }

  /**
   * 清空歷史
   */
  async clearHistory() {
    if (!this.currentHistoryTaskId) return;

    if (!confirm('確定要清空此任務的所有歷史記錄嗎？此操作無法撤銷。')) {
      return;
    }

    try {
      // 清空歷史
      this.histories.delete(this.currentHistoryTaskId);
      this.undoStacks.delete(this.currentHistoryTaskId);
      this.redoStacks.delete(this.currentHistoryTaskId);
      this.currentVersions.delete(this.currentHistoryTaskId);

      // 保存更改
      await this.saveAllHistories();

      // 重新渲染
      this.renderHistoryTimeline(this.currentHistoryTaskId);

      this.showNotification('歷史已清空', 'success');

    } catch (error) {
      console.error('清空歷史失敗:', error);
      this.showNotification('清空失敗', 'error');
    }
  }

  /**
   * 格式化時間戳
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * 獲取下一個版本號
   */
  getNextVersion(taskId) {
    const current = this.currentVersions.get(taskId) || 0;
    return current + 1;
  }

  /**
   * 獲取當前任務 ID
   */
  getCurrentTaskId() {
    // TODO: 從當前上下文獲取任務 ID
    return this.currentHistoryTaskId || null;
  }

  /**
   * 生成唯一 ID
   */
  generateId() {
    return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 啟動自動保存
   */
  startAutoSave() {
    this.stopAutoSave();
    this.autoSaveTimer = setInterval(() => {
      this.saveAllHistories();
    }, this.config.autoSaveInterval);
  }

  /**
   * 停止自動保存
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * 保存歷史
   */
  async saveHistory(taskId) {
    try {
      const history = this.histories.get(taskId) || [];
      const undoStack = this.undoStacks.get(taskId) || [];
      const redoStack = this.redoStacks.get(taskId) || [];
      const currentVersion = this.currentVersions.get(taskId) || 0;

      const data = {
        history,
        undoStack,
        redoStack,
        currentVersion
      };

      localStorage.setItem(`todolist-history-${taskId}`, JSON.stringify(data));
    } catch (error) {
      console.error('保存歷史失敗:', error);
    }
  }

  /**
   * 保存所有歷史
   */
  async saveAllHistories() {
    for (const taskId of this.histories.keys()) {
      await this.saveHistory(taskId);
    }
  }

  /**
   * 載入歷史
   */
  async loadHistories() {
    try {
      // 載入所有歷史記錄
      const keys = Object.keys(localStorage).filter(key => key.startsWith('todolist-history-'));

      for (const key of keys) {
        const taskId = key.replace('todolist-history-', '');
        const data = localStorage.getItem(key);

        if (data) {
          const parsed = JSON.parse(data);
          this.histories.set(taskId, parsed.history || []);
          this.undoStacks.set(taskId, parsed.undoStack || []);
          this.redoStacks.set(taskId, parsed.redoStack || []);
          this.currentVersions.set(taskId, parsed.currentVersion || 0);
        }
      }

      console.log(`✅ 載入了 ${keys.length} 個任務的歷史記錄`);
    } catch (error) {
      console.error('載入歷史失敗:', error);
    }
  }

  /**
   * 獲取任務歷史
   */
  getTaskHistory(taskId) {
    return this.histories.get(taskId) || [];
  }

  /**
   * 檢查是否可以撤銷
   */
  canUndo(taskId) {
    const undoStack = this.undoStacks.get(taskId);
    return undoStack && undoStack.length > 0;
  }

  /**
   * 檢查是否可以重做
   */
  canRedo(taskId) {
    const redoStack = this.redoStacks.get(taskId);
    return redoStack && redoStack.length > 0;
  }

  /**
   * 顯示通知
   */
  showNotification(message, type = 'info') {
    // TODO: 實現通知系統
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * 觸發歷史事件
   */
  dispatchHistoryEvent(eventType, data) {
    const event = new CustomEvent(`editHistory:${eventType}`, {
      detail: data
    });
    document.dispatchEvent(event);
  }

  /**
   * 清理資源
   */
  destroy() {
    // 停止自動保存
    this.stopAutoSave();

    // 移除事件監聽器
    document.removeEventListener('taskEdit:editSave', this.handleEditEvent);
    document.removeEventListener('taskEdit:editCancel', this.handleEditEvent);
    document.removeEventListener('editForm:taskUpdated', this.handleEditEvent);

    // 清理狀態
    this.histories.clear();
    this.undoStacks.clear();
    this.redoStacks.clear();
    this.currentVersions.clear();
  }
}