/**
 * 衝突處理機制組件
 *
 * 負責處理編輯衝突和數據合併，包括：
 * - 檢測編輯衝突
 * - 實現合併解決方案
 * - 多用戶編輯警告（未來擴展）
 * - 資料完整性保護
 * - 自動解決簡單衝突
 */

export class ConflictResolver {
  constructor(elements, utils, storage) {
    this.elements = elements;
    this.utils = utils;
    this.storage = storage;

    // 衝突管理狀態
    this.pendingConflicts = new Map(); // taskId -> conflict[]
    this.resolvingConflicts = new Set();
    this.conflictHistory = [];

    // 衝突配置
    this.config = {
      conflictDetectionInterval: 5000, // 衝突檢測間隔
      autoResolveTimeout: 30000, // 自動解決超時
      maxConflictRetries: 3, // 最大重試次數
      mergeStrategy: 'latest' // 合併策略: latest, manual, auto
    };

    // 綁定事件處理器
    this.handleEditEvent = this.handleEditEvent.bind(this);
    this.handleSyncEvent = this.handleSyncEvent.bind(this);
    this.handleConflictResolve = this.handleConflictResolve.bind(this);

    // 衝突檢測定時器
    this.detectionTimer = null;
  }

  /**
   * 初始化衝突處理機制
   */
  async initialize() {
    try {
      // 綁定事件監聽器
      this.bindEventListeners();

      // 創建衝突解決界面
      this.createConflictUI();

      // 啟動衝突檢測
      this.startConflictDetection();

      // 載入衝突歷史
      await this.loadConflictHistory();

      console.log('✅ 衝突處理機制初始化完成');
    } catch (error) {
      console.error('❌ 衝突處理機制初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 綁定事件監聽器
   */
  bindEventListeners() {
    // 監聽編輯事件
    document.addEventListener('taskEdit:editSave', this.handleEditEvent);
    document.addEventListener('editForm:taskUpdated', this.handleEditEvent);

    // 監聽同步事件（未來 WebSocket 實現）
    document.addEventListener('sync:dataChanged', this.handleSyncEvent);

    // 全局錯誤處理
    window.addEventListener('online', () => {
      this.handleNetworkReconnect();
    });

    window.addEventListener('offline', () => {
      this.handleNetworkDisconnect();
    });
  }

  /**
   * 創建衝突解決界面
   */
  createConflictUI() {
    // 創建衝突通知
    this.createConflictNotification();

    // 創建衝突解決模態框
    this.createConflictModal();
  }

  /**
   * 創建衝突通知
   */
  createConflictNotification() {
    const notification = document.createElement('div');
    notification.className = 'conflict-notification';
    notification.style.display = 'none';

    const content = document.createElement('div');
    content.className = 'conflict-notification__content';

    const icon = document.createElement('div');
    icon.className = 'conflict-notification__icon';
    icon.textContent = '⚠️';

    const message = document.createElement('div');
    message.className = 'conflict-notification__message';
    message.textContent = '檢測到編輯衝突';

    const resolveBtn = document.createElement('button');
    resolveBtn.type = 'button';
    resolveBtn.className = 'btn btn--small btn--primary conflict-notification__resolve';
    resolveBtn.textContent = '解決衝突';

    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'btn btn--small btn--secondary conflict-notification__dismiss';
    dismissBtn.textContent = '忽略';

    content.appendChild(icon);
    content.appendChild(message);
    content.appendChild(resolveBtn);
    content.appendChild(dismissBtn);

    notification.appendChild(content);

    // 綁定事件
    resolveBtn.addEventListener('click', () => {
      this.showConflictModal();
    });

    dismissBtn.addEventListener('click', () => {
      this.dismissConflictNotification();
    });

    // 添加到 DOM
    document.body.appendChild(notification);
    this.elements.conflictNotification = notification;
  }

  /**
   * 創建衝突解決模態框
   */
  createConflictModal() {
    const modal = document.createElement('div');
    modal.className = 'conflict-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'conflict-modal-title');

    const content = document.createElement('div');
    content.className = 'conflict-modal__content';

    // 頭部
    const header = document.createElement('div');
    header.className = 'conflict-modal__header';

    const title = document.createElement('h2');
    title.id = 'conflict-modal-title';
    title.className = 'conflict-modal__title';
    title.textContent = '解決編輯衝突';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'conflict-modal__close';
    closeBtn.setAttribute('aria-label', '關閉');
    closeBtn.textContent = '×';

    header.appendChild(title);
    header.appendChild(closeBtn);

    // 主體
    const body = document.createElement('div');
    body.className = 'conflict-modal__body';

    // 衝突列表
    const conflictList = document.createElement('div');
    conflictList.className = 'conflict-list';

    // 解決選項
    const resolutionOptions = document.createElement('div');
    resolutionOptions.className = 'conflict-resolution';
    resolutionOptions.style.display = 'none';

    body.appendChild(conflictList);
    body.appendChild(resolutionOptions);

    // 底部
    const footer = document.createElement('div');
    footer.className = 'conflict-modal__footer';

    const autoResolveBtn = document.createElement('button');
    autoResolveBtn.type = 'button';
    autoResolveBtn.className = 'btn btn--secondary conflict-modal__auto-resolve';
    autoResolveBtn.textContent = '自動解決';

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'btn btn--primary conflict-modal__apply';
    applyBtn.textContent = '應用解決方案';
    applyBtn.style.display = 'none';

    footer.appendChild(autoResolveBtn);
    footer.appendChild(applyBtn);

    // 背景遮罩
    const backdrop = document.createElement('div');
    backdrop.className = 'conflict-modal__backdrop';

    // 組裝
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);

    modal.appendChild(content);
    modal.appendChild(backdrop);

    // 添加到 DOM
    document.body.appendChild(modal);
    this.elements.conflictModal = modal;

    // 綁定事件
    this.bindConflictModalEvents();
  }

  /**
   * 綁定衝突模態框事件
   */
  bindConflictModalEvents() {
    const modal = this.elements.conflictModal;
    const closeBtn = modal.querySelector('.conflict-modal__close');
    const backdrop = modal.querySelector('.conflict-modal__backdrop');
    const autoResolveBtn = modal.querySelector('.conflict-modal__auto-resolve');
    const applyBtn = modal.querySelector('.conflict-modal__apply');

    closeBtn.addEventListener('click', () => this.closeConflictModal());
    backdrop.addEventListener('click', () => this.closeConflictModal());
    autoResolveBtn.addEventListener('click', () => this.autoResolveConflicts());
    applyBtn.addEventListener('click', () => this.applyConflictResolution());

    // ESC 鍵關閉
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeConflictModal();
      }
    });
  }

  /**
   * 處理編輯事件
   */
  handleEditEvent(event) {
    const { detail } = event;
    const { taskId, changes } = detail;

    // 檢查是否有待處理的衝突
    if (this.pendingConflicts.has(taskId)) {
      this.resolveConflictForTask(taskId, changes);
    }
  }

  /**
   * 處理同步事件
   */
  handleSyncEvent(event) {
    const { detail } = event;
    const { taskId, remoteChanges, timestamp } = detail;

    // 檢測衝突
    this.detectConflict(taskId, remoteChanges, timestamp);
  }

  /**
   * 檢測衝突
   */
  detectConflict(taskId, remoteChanges, remoteTimestamp) {
    const localTask = this.storage.tasks.find(t => t.id === taskId);
    if (!localTask) return;

    const localTimestamp = localTask.lastModified || 0;

    // 如果遠端數據更新時間晚於本地時間，可能存在衝突
    if (remoteTimestamp > localTimestamp) {
      const conflicts = this.analyzeConflicts(localTask, remoteChanges);

      if (conflicts.length > 0) {
        this.addConflict(taskId, conflicts);
        this.showConflictNotification();
      }
    }
  }

  /**
   * 分析衝突
   */
  analyzeConflicts(localTask, remoteChanges) {
    const conflicts = [];

    for (const change of remoteChanges) {
      const { field, newValue: remoteValue, timestamp } = change;
      const localValue = localTask[field];

      // 檢查是否有衝突
      if (this.hasConflict(field, localValue, remoteValue, localTask.lastModified, timestamp)) {
        conflicts.push({
          field,
          localValue,
          remoteValue,
          localTimestamp: localTask.lastModified,
          remoteTimestamp: timestamp,
          severity: this.determineConflictSeverity(field, localValue, remoteValue)
        });
      }
    }

    return conflicts;
  }

  /**
   * 檢查是否有衝突
   */
  hasConflict(field, localValue, remoteValue, localTimestamp, remoteTimestamp) {
    // 如果時間戳不同，且值不同，則存在衝突
    if (localTimestamp !== remoteTimestamp && localValue !== remoteValue) {
      // 某些情況下可以不視為衝突
      if (this.isIgnorableConflict(field, localValue, remoteValue)) {
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * 判斷是否可忽略的衝突
   */
  isIgnorableConflict(field, localValue, remoteValue) {
    // 標籤的順序變化可以忽略
    if (field === 'tags') {
      const localTags = Array.isArray(localValue) ? localValue.sort() : [];
      const remoteTags = Array.isArray(remoteValue) ? remoteValue.sort() : [];
      return JSON.stringify(localTags) === JSON.stringify(remoteTags);
    }

    // 空值的變化可以忽略
    if ((!localValue && !remoteValue) || (localValue === '' && remoteValue === '')) {
      return true;
    }

    return false;
  }

  /**
   * 確定衝突嚴重程度
   */
  determineConflictSeverity(field, localValue, remoteValue) {
    // 標題衝突最嚴重
    if (field === 'title') {
      return 'high';
    }

    // 描述衝突中等
    if (field === 'description') {
      return 'medium';
    }

    // 其他字段衝突較低
    return 'low';
  }

  /**
   * 添加衝突
   */
  addConflict(taskId, conflicts) {
    if (!this.pendingConflicts.has(taskId)) {
      this.pendingConflicts.set(taskId, []);
    }

    const taskConflicts = this.pendingConflicts.get(taskId);
    taskConflicts.push(...conflicts);

    // 記錄衝突歷史
    this.recordConflict(taskId, conflicts);
  }

  /**
   * 記錄衝突歷史
   */
  recordConflict(taskId, conflicts) {
    const record = {
      id: this.generateId(),
      taskId,
      conflicts,
      detectedAt: Date.now(),
      resolved: false
    };

    this.conflictHistory.push(record);

    // 限制歷史長度
    if (this.conflictHistory.length > 100) {
      this.conflictHistory.shift();
    }

    this.saveConflictHistory();
  }

  /**
   * 顯示衝突通知
   */
  showConflictNotification() {
    const notification = this.elements.conflictNotification;
    notification.style.display = 'block';

    // 自動隱藏
    setTimeout(() => {
      if (notification.style.display === 'block') {
        notification.style.display = 'none';
      }
    }, 10000);
  }

  /**
   * 忽略衝突通知
   */
  dismissConflictNotification() {
    const notification = this.elements.conflictNotification;
    notification.style.display = 'none';
  }

  /**
   * 顯示衝突解決模態框
   */
  showConflictModal() {
    const modal = this.elements.conflictModal;
    const conflictList = modal.querySelector('.conflict-list');
    const resolutionOptions = modal.querySelector('.conflict-resolution');
    const applyBtn = modal.querySelector('.conflict-modal__apply');

    // 清空列表
    while (conflictList.firstChild) {
      conflictList.removeChild(conflictList.firstChild);
    }

    // 渲染衝突列表
    this.renderConflictList(conflictList);

    // 隱藏解決選項
    resolutionOptions.style.display = 'none';
    applyBtn.style.display = 'none';

    // 顯示模態框
    modal.classList.add('conflict-modal--visible');

    // 聚焦到自動解決按鈕
    const autoResolveBtn = modal.querySelector('.conflict-modal__auto-resolve');
    setTimeout(() => autoResolveBtn.focus(), 100);
  }

  /**
   * 關閉衝突解決模態框
   */
  closeConflictModal() {
    const modal = this.elements.conflictModal;
    modal.classList.remove('conflict-modal--visible');
  }

  /**
   * 渲染衝突列表
   */
  renderConflictList(container) {
    if (this.pendingConflicts.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'conflict-empty';
      empty.textContent = '沒有待解決的衝突';
      container.appendChild(empty);
      return;
    }

    for (const [taskId, conflicts] of this.pendingConflicts) {
      const task = this.storage.tasks.find(t => t.id === taskId);
      if (!task) continue;

      const taskGroup = document.createElement('div');
      taskGroup.className = 'conflict-task-group';
      taskGroup.dataset.taskId = taskId;

      // 任務標題
      const taskTitle = document.createElement('h3');
      taskTitle.className = 'conflict-task-title';
      taskTitle.textContent = task.title || '未命名任務';

      taskGroup.appendChild(taskTitle);

      // 衝突列表
      conflicts.forEach((conflict, index) => {
        const conflictItem = this.createConflictItem(conflict, index);
        taskGroup.appendChild(conflictItem);
      });

      container.appendChild(taskGroup);
    }
  }

  /**
   * 創建衝突項目
   */
  createConflictItem(conflict, index) {
    const item = document.createElement('div');
    item.className = `conflict-item conflict-item--${conflict.severity}`;
    item.dataset.field = conflict.field;
    item.dataset.index = index;

    // 字段名稱
    const fieldLabel = document.createElement('div');
    fieldLabel.className = 'conflict-item__field';
    fieldLabel.textContent = this.getFieldLabel(conflict.field);

    // 本地值
    const localValue = document.createElement('div');
    localValue.className = 'conflict-item__local';

    const localLabel = document.createElement('div');
    localLabel.className = 'conflict-item__label';
    localLabel.textContent = '本地值:';

    const localValueContent = document.createElement('div');
    localValueContent.className = 'conflict-item__value';
    localValueContent.textContent = this.formatValue(conflict.localValue);

    const localTime = document.createElement('div');
    localTime.className = 'conflict-item__time';
    localTime.textContent = this.formatTimestamp(conflict.localTimestamp);

    localValue.appendChild(localLabel);
    localValue.appendChild(localValueContent);
    localValue.appendChild(localTime);

    // 遠端值
    const remoteValue = document.createElement('div');
    remoteValue.className = 'conflict-item__remote';

    const remoteLabel = document.createElement('div');
    remoteLabel.className = 'conflict-item__label';
    remoteLabel.textContent = '遠端值:';

    const remoteValueContent = document.createElement('div');
    remoteValueContent.className = 'conflict-item__value';
    remoteValueContent.textContent = this.formatValue(conflict.remoteValue);

    const remoteTime = document.createElement('div');
    remoteTime.className = 'conflict-item__time';
    remoteTime.textContent = this.formatTimestamp(conflict.remoteTimestamp);

    remoteValue.appendChild(remoteLabel);
    remoteValue.appendChild(remoteValueContent);
    remoteValue.appendChild(remoteTime);

    // 選擇按鈕
    const actions = document.createElement('div');
    actions.className = 'conflict-item__actions';

    const useLocalBtn = document.createElement('button');
    useLocalBtn.type = 'button';
    useLocalBtn.className = 'btn btn--small btn--secondary';
    useLocalBtn.textContent = '使用本地值';
    useLocalBtn.addEventListener('click', () => {
      this.selectConflictResolution(conflict, 'local');
    });

    const useRemoteBtn = document.createElement('button');
    useRemoteBtn.type = 'button';
    useRemoteBtn.className = 'btn btn--small btn--secondary';
    useRemoteBtn.textContent = '使用遠端值';
    useRemoteBtn.addEventListener('click', () => {
      this.selectConflictResolution(conflict, 'remote');
    });

    const mergeBtn = document.createElement('button');
    mergeBtn.type = 'button';
    mergeBtn.className = 'btn btn--small btn--primary';
    mergeBtn.textContent = '合併';
    mergeBtn.addEventListener('click', () => {
      this.selectConflictResolution(conflict, 'merge');
    });

    actions.appendChild(useLocalBtn);
    actions.appendChild(useRemoteBtn);

    // 如果可以合併，顯示合併按鈕
    if (this.canMerge(conflict.field, conflict.localValue, conflict.remoteValue)) {
      actions.appendChild(mergeBtn);
    }

    item.appendChild(fieldLabel);
    item.appendChild(localValue);
    item.appendChild(remoteValue);
    item.appendChild(actions);

    return item;
  }

  /**
   * 選擇衝突解決方案
   */
  selectConflictResolution(conflict, resolution) {
    conflict.resolution = resolution;
    conflict.resolvedAt = Date.now();

    // 更新 UI
    const item = document.querySelector(`[data-field="${conflict.field}"][data-index="${this.pendingConflicts.get(conflict.taskId).indexOf(conflict)}"]`);
    if (item) {
      item.classList.add('conflict-item--resolved');
      const actions = item.querySelector('.conflict-item__actions');

      // 清空按鈕
      while (actions.firstChild) {
        actions.removeChild(actions.firstChild);
      }

      // 添加解決狀態
      const resolutionDiv = document.createElement('div');
      resolutionDiv.className = 'conflict-item__resolution';
      resolutionDiv.textContent = `已選擇: ${this.getResolutionLabel(resolution)}`;
      actions.appendChild(resolutionDiv);
    }

    // 檢查是否所有衝突都已解決
    if (this.areAllConflictsResolved()) {
      this.showApplyButton();
    }
  }

  /**
   * 自動解決衝突
   */
  async autoResolveConflicts() {
    const resolvedCount = this.autoResolveAllConflicts();

    if (resolvedCount > 0) {
      this.showNotification(`自動解決了 ${resolvedCount} 個衝突`, 'success');
      this.showApplyButton();
    } else {
      this.showNotification('沒有可以自動解決的衝突', 'warning');
    }
  }

  /**
   * 自動解決所有衝突
   */
  autoResolveAllConflicts() {
    let resolvedCount = 0;

    for (const [taskId, conflicts] of this.pendingConflicts) {
      for (const conflict of conflicts) {
        if (!conflict.resolution) {
          const resolution = this.getAutoResolution(conflict);
          if (resolution) {
            this.selectConflictResolution(conflict, resolution);
            resolvedCount++;
          }
        }
      }
    }

    return resolvedCount;
  }

  /**
   * 獲取自動解決方案
   */
  getAutoResolution(conflict) {
    // 根據嚴重程度和字段類型決定自動解決策略
    if (conflict.severity === 'low') {
      // 低嚴重程度衝突，使用最新的值
      return conflict.remoteTimestamp > conflict.localTimestamp ? 'remote' : 'local';
    }

    if (conflict.field === 'tags') {
      // 標籤可以合併
      return 'merge';
    }

    // 其他情況不自動解決
    return null;
  }

  /**
   * 檢查是否可以合併
   */
  canMerge(field, localValue, remoteValue) {
    // 標籤可以合併
    if (field === 'tags') {
      return Array.isArray(localValue) && Array.isArray(remoteValue);
    }

    // 描述可以合併
    if (field === 'description') {
      return typeof localValue === 'string' && typeof remoteValue === 'string';
    }

    return false;
  }

  /**
   * 應用衝突解決方案
   */
  async applyConflictResolution() {
    const modal = this.elements.conflictModal;
    const applyBtn = modal.querySelector('.conflict-modal__apply');

    // 禁用按鈕
    applyBtn.disabled = true;
    const originalText = applyBtn.textContent;
    applyBtn.textContent = '應用中...';

    try {
      const resolvedTasks = [];

      for (const [taskId, conflicts] of this.pendingConflicts) {
        const resolutions = {};
        let hasResolutions = false;

        for (const conflict of conflicts) {
          if (conflict.resolution) {
            const value = this.getResolvedValue(conflict);
            if (value !== undefined) {
              resolutions[conflict.field] = value;
              hasResolutions = true;
            }
          }
        }

        if (hasResolutions) {
          await this.storage.updateTask(taskId, resolutions);
          resolvedTasks.push(taskId);

          // 標記衝突為已解決
          this.markConflictsAsResolved(taskId);
        }
      }

      // 清空待處理衝突
      this.pendingConflicts.clear();

      // 關閉模態框
      this.closeConflictModal();

      // 隱藏通知
      this.dismissConflictNotification();

      this.showNotification(`成功解決 ${resolvedTasks.length} 個任務的衝突`, 'success');

    } catch (error) {
      console.error('應用衝突解決方案失敗:', error);
      this.showNotification('應用解決方案失敗', 'error');
    } finally {
      // 恢復按鈕
      applyBtn.disabled = false;
      applyBtn.textContent = originalText;
    }
  }

  /**
   * 獲取解決後的值
   */
  getResolvedValue(conflict) {
    switch (conflict.resolution) {
      case 'local':
        return conflict.localValue;
      case 'remote':
        return conflict.remoteValue;
      case 'merge':
        return this.mergeValues(conflict.field, conflict.localValue, conflict.remoteValue);
      default:
        return undefined;
    }
  }

  /**
   * 合併值
   */
  mergeValues(field, localValue, remoteValue) {
    if (field === 'tags') {
      // 合併標籤
      const localTags = Array.isArray(localValue) ? localValue : [];
      const remoteTags = Array.isArray(remoteValue) ? remoteValue : [];
      return [...new Set([...localTags, ...remoteTags])];
    }

    if (field === 'description') {
      // 合併描述
      const localDesc = localValue || '';
      const remoteDesc = remoteValue || '';
      if (localDesc && remoteDesc) {
        return `${localDesc}\n\n[合併內容]\n${remoteDesc}`;
      }
      return localDesc || remoteDesc;
    }

    return remoteValue; // 預設使用遠端值
  }

  /**
   * 標記衝突為已解決
   */
  markConflictsAsResolved(taskId) {
    // 更新歷史記錄
    const historyRecord = this.conflictHistory.find(record =>
      record.taskId === taskId && !record.resolved
    );

    if (historyRecord) {
      historyRecord.resolved = true;
      historyRecord.resolvedAt = Date.now();
    }

    this.saveConflictHistory();
  }

  /**
   * 檢查是否所有衝突都已解決
   */
  areAllConflictsResolved() {
    for (const [taskId, conflicts] of this.pendingConflicts) {
      for (const conflict of conflicts) {
        if (!conflict.resolution) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 顯示應用按鈕
   */
  showApplyButton() {
    const modal = this.elements.conflictModal;
    const applyBtn = modal.querySelector('.conflict-modal__apply');
    applyBtn.style.display = 'block';
  }

  /**
   * 解決特定任務的衝突
   */
  async resolveConflictForTask(taskId, changes) {
    if (!this.pendingConflicts.has(taskId)) return;

    const conflicts = this.pendingConflicts.get(taskId);
    const remainingConflicts = [];

    for (const conflict of conflicts) {
      // 檢查新的更改是否解決了衝突
      if (changes[conflict.field] !== undefined) {
        // 衝突已解決
        this.markConflictsAsResolved(taskId);
      } else {
        remainingConflicts.push(conflict);
      }
    }

    if (remainingConflicts.length === 0) {
      this.pendingConflicts.delete(taskId);
    } else {
      this.pendingConflicts.set(taskId, remainingConflicts);
    }
  }

  /**
   * 啟動衝突檢測
   */
  startConflictDetection() {
    this.stopConflictDetection();
    this.detectionTimer = setInterval(() => {
      this.performConflictDetection();
    }, this.config.conflictDetectionInterval);
  }

  /**
   * 停止衝突檢測
   */
  stopConflictDetection() {
    if (this.detectionTimer) {
      clearInterval(this.detectionTimer);
      this.detectionTimer = null;
    }
  }

  /**
   * 執行衝突檢測
   */
  performConflictDetection() {
    // 檢查本地存儲和遠端數據的一致性
    // 這裡可以實現與服務器的同步檢查
    // 目前是佔位實現
  }

  /**
   * 處理網絡重連
   */
  handleNetworkReconnect() {
    // 網絡重連時重新檢測衝突
    this.performConflictDetection();
  }

  /**
   * 處理網絡斷開
   */
  handleNetworkDisconnect() {
    // 網絡斷開時停止衝突檢測
    this.stopConflictDetection();
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
   * 格式化值
   */
  formatValue(value) {
    if (value === null || value === undefined) {
      return '(空)';
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }

    return String(value);
  }

  /**
   * 格式化時間戳
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * 獲取解決方案標籤
   */
  getResolutionLabel(resolution) {
    const labels = {
      local: '本地值',
      remote: '遠端值',
      merge: '合併'
    };
    return labels[resolution] || resolution;
  }

  /**
   * 生成唯一 ID
   */
  generateId() {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 載入衝突歷史
   */
  async loadConflictHistory() {
    try {
      const data = localStorage.getItem('todolist-conflict-history');
      if (data) {
        this.conflictHistory = JSON.parse(data);
      }
    } catch (error) {
      console.error('載入衝突歷史失敗:', error);
    }
  }

  /**
   * 保存衝突歷史
   */
  saveConflictHistory() {
    try {
      localStorage.setItem('todolist-conflict-history', JSON.stringify(this.conflictHistory));
    } catch (error) {
      console.error('保存衝突歷史失敗:', error);
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
   * 處理衝突解決事件
   */
  handleConflictResolve(event) {
    // 處理自定義衝突解決邏輯
    console.log('衝突解決事件:', event);
  }

  /**
   * 清理資源
   */
  destroy() {
    // 停止衝突檢測
    this.stopConflictDetection();

    // 移除事件監聽器
    document.removeEventListener('taskEdit:editSave', this.handleEditEvent);
    document.removeEventListener('editForm:taskUpdated', this.handleEditEvent);
    document.removeEventListener('sync:dataChanged', this.handleSyncEvent);

    // 清理狀態
    this.pendingConflicts.clear();
    this.resolvingConflicts.clear();
    this.conflictHistory = [];
  }
}