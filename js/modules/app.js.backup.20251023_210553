/**
 * 主應用程式模組
 *
 * 負責協調所有模組之間的交互，包括：
 * - 模組初始化和協調
 * - 事件處理和路由
 * - 應用程式狀態管理
 * - 用戶業務邏輯處理
 */

export class App {
  constructor(settings, storage, ui, utils) {
    this.settings = settings;
    this.storage = storage;
    this.ui = ui;
    this.utils = utils;
    this.isInitialized = false;
    this.currentTasks = [];
    this.isOnline = navigator.onLine;
  }

  /**
   * 初始化應用程式
   */
  async initialize() {
    try {
      // 綁定模組間的事件
      this.bindModuleEvents();

      // 綁定系統事件
      this.bindSystemEvents();

      // 載入初始資料
      await this.loadInitialData();

      // 渲染初始界面
      this.renderInitialUI();

      this.isInitialized = true;
      console.log('✅ 主應用程式初始化完成');

    } catch (error) {
      console.error('❌ 主應用程式初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 綁定模組間的事件
   */
  bindModuleEvents() {
    // UI 事件監聽
    this.ui.on('taskAddRequested', (taskData) => {
      this.handleAddTask(taskData);
    });

    this.ui.on('taskUpdateRequested', (taskId, updates) => {
      this.handleUpdateTask(taskId, updates);
    });

    this.ui.on('taskDeleteRequested', (taskId) => {
      this.handleDeleteTask(taskId);
    });

    this.ui.on('taskToggleRequested', (taskId) => {
      this.handleToggleTask(taskId);
    });

    this.ui.on('tasksDeleteRequested', (taskIds) => {
      this.handleDeleteTasks(taskIds);
    });

    this.ui.on('tasksStatusUpdateRequested', (data) => {
      this.handleUpdateTasksStatus(data.taskIds, data.status);
    });

    this.ui.on('searchChanged', (searchOptions) => {
      this.handleSearch(searchOptions);
    });

    this.ui.on('filterChanged', (filterOptions) => {
      this.handleFilter(filterOptions);
    });

    this.ui.on('sortChanged', (sortOption) => {
      this.handleSort(sortOption);
    });

    this.ui.on('requestFilterCounts', () => {
      this.updateFilterCounts();
    });

    // 儲存事件監聽
    this.storage.on('taskAdded', (task) => {
      this.handleTaskAdded(task);
    });

    this.storage.on('taskUpdated', (task, originalTask) => {
      this.handleTaskUpdated(task, originalTask);
    });

    this.storage.on('taskDeleted', (task) => {
      this.handleTaskDeleted(task);
    });

    this.storage.on('allTasksCleared', (originalTasks) => {
      this.handleAllTasksCleared(originalTasks);
    });

    this.storage.on('tasksImported', (result) => {
      this.handleTasksImported(result);
    });
  }

  /**
   * 綁定系統事件
   */
  bindSystemEvents() {
    // 監聽線上狀態變更
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnlineStatusChange(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleOnlineStatusChange(false);
    });

    // 監聽頁面可見性變更
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isInitialized) {
        this.handlePageVisible();
      }
    });

    // 監聽設定變更
    this.settings.onChange('tasks.defaultPriority', (priority) => {
      this.handleDefaultPriorityChange(priority);
    });

    this.settings.onChange('tasks.autoSort', (enabled) => {
      if (enabled) {
        this.handleAutoSort();
      }
    });
  }

  /**
   * 載入初始資料
   */
  async loadInitialData() {
    try {
      this.currentTasks = await this.storage.getTasks();
      console.log(`📋 載入 ${this.currentTasks.length} 項任務`);
    } catch (error) {
      console.error('載入任務失敗:', error);
      this.currentTasks = [];
      throw error;
    }
  }

  /**
   * 渲染初始界面
   */
  renderInitialUI() {
    // 更新統計資訊
    this.updateStats();

    // 更新篩選計數
    this.updateFilterCounts();

    // 渲染任務列表
    this.renderTasks();

    // 設定預設篩選器
    this.ui.setActiveFilter('all');
  }

  /**
   * ========== 任務處理方法 ========== */

  /**
   * 處理添加任務
   * @param {Object} taskData - 任務資料
   */
  async handleAddTask(taskData) {
    try {
      const newTask = await this.storage.addTask(taskData);

      // 如果啟用了自動排序，重新排序任務
      if (this.settings.get('tasks.autoSort', true)) {
        this.currentTasks = this.storage.sortTasks(
          this.currentTasks,
          this.ui.currentSort || this.settings.get('tasks.defaultSortBy', 'created-desc')
        );
      }

      // 更新統計資訊
      this.updateStats();

      // 更新篩選計數
      this.updateFilterCounts();

      // 重新渲染任務列表（應用當前篩選和排序）
      this.renderTasks();

      console.log('✅ 任務添加成功:', newTask);

    } catch (error) {
      console.error('❌ 添加任務失敗:', error);
      this.ui.showNotification('添加任務失敗: ' + error.message, 'error');
    }
  }

  /**
   * 處理更新任務
   * @param {string} taskId - 任務 ID
   * @param {Object} updates - 更新資料
   */
  async handleUpdateTask(taskId, updates) {
    try {
      const updatedTask = await this.storage.updateTask(taskId, updates);

      if (updatedTask) {
        // 更新當前任務列表
        const taskIndex = this.currentTasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
          this.currentTasks[taskIndex] = updatedTask;
        }

        // 如果啟用了自動排序，重新排序
        if (this.settings.get('tasks.autoSort', true)) {
          this.currentTasks = this.storage.sortTasks(
            this.currentTasks,
            this.ui.currentSort || this.settings.get('tasks.defaultSortBy', 'created-desc')
          );
        }

        // 更新統計資訊
        this.updateStats();

        // 更新篩選計數
        this.updateFilterCounts();

        // 重新渲染任務列表
        this.renderTasks();

        console.log('✅ 任務更新成功:', updatedTask);
      }

    } catch (error) {
      console.error('❌ 更新任務失敗:', error);
      this.ui.showNotification('更新任務失敗: ' + error.message, 'error');
    }
  }

  /**
   * 處理刪除任務
   * @param {string} taskId - 任務 ID
   */
  async handleDeleteTask(taskId) {
    try {
      const success = await this.storage.deleteTask(taskId);

      if (success) {
        // 從當前任務列表中移除
        this.currentTasks = this.currentTasks.filter(task => task.id !== taskId);

        // 更新統計資訊
        this.updateStats();

        // 更新篩選計數
        this.updateFilterCounts();

        // 重新渲染任務列表
        this.renderTasks();

        console.log('✅ 任務刪除成功:', taskId);
      }

    } catch (error) {
      console.error('❌ 刪除任務失敗:', error);
      this.ui.showNotification('刪除任務失敗: ' + error.message, 'error');
    }
  }

  /**
   * 處理切換任務狀態
   * @param {string} taskId - 任務 ID
   */
  async handleToggleTask(taskId) {
    try {
      const updatedTask = await this.storage.toggleTaskStatus(taskId);

      if (updatedTask) {
        // 更新當前任務列表
        const taskIndex = this.currentTasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
          this.currentTasks[taskIndex] = updatedTask;
        }

        // 更新統計資訊
        this.updateStats();

        // 更新篩選計數
        this.updateFilterCounts();

        // 重新渲染任務列表
        this.renderTasks();

        console.log('✅ 任務狀態切換成功:', updatedTask);
      }

    } catch (error) {
      console.error('❌ 切換任務狀態失敗:', error);
      this.ui.showNotification('切換任務狀態失敗: ' + error.message, 'error');
    }
  }

  /**
   * 處理批量刪除任務
   * @param {Array} taskIds - 任務 ID 陣列
   */
  async handleDeleteTasks(taskIds) {
    try {
      const deletedCount = await this.storage.deleteTasks(taskIds);

      if (deletedCount > 0) {
        // 從當前任務列表中移除
        this.currentTasks = this.currentTasks.filter(task => !taskIds.includes(task.id));

        // 更新統計資訊
        this.updateStats();

        // 更新篩選計數
        this.updateFilterCounts();

        // 重新渲染任務列表
        this.renderTasks();

        this.ui.showNotification(`成功刪除 ${deletedCount} 項任務`, 'success');
        console.log(`✅ 批量刪除成功，刪除了 ${deletedCount} 項任務`);
      }

    } catch (error) {
      console.error('❌ 批量刪除任務失敗:', error);
      this.ui.showNotification('批量刪除任務失敗: ' + error.message, 'error');
    }
  }

  /**
   * 處理批量更新任務狀態
   * @param {Array} taskIds - 任務 ID 陣列
   * @param {string} status - 新狀態
   */
  async handleUpdateTasksStatus(taskIds, status) {
    try {
      let successCount = 0;

      for (const taskId of taskIds) {
        const updatedTask = await this.storage.updateTask(taskId, { status });
        if (updatedTask) {
          // 更新當前任務列表
          const taskIndex = this.currentTasks.findIndex(task => task.id === taskId);
          if (taskIndex !== -1) {
            this.currentTasks[taskIndex] = updatedTask;
          }
          successCount++;
        }
      }

      if (successCount > 0) {
        // 更新統計資訊
        this.updateStats();

        // 更新篩選計數
        this.updateFilterCounts();

        // 重新渲染任務列表
        this.renderTasks();

        const statusText = status === 'completed' ? '標記為已完成' : '標記為未完成';
        this.ui.showNotification(`成功${statusText} ${successCount} 項任務`, 'success');
        console.log(`✅ 批量更新狀態成功，更新了 ${successCount} 項任務`);
      }

    } catch (error) {
      console.error('❌ 批量更新任務狀態失敗:', error);
      this.ui.showNotification('批量更新任務狀態失敗: ' + error.message, 'error');
    }
  }

  /**
   * ========== 搜尋和篩選處理 ========== */

  /**
   * 處理搜尋
   * @param {Object} searchOptions - 搜尋選項
   */
  handleSearch(searchOptions) {
    const { query, filter, sort } = searchOptions;

    // 搜尋任務
    const searchResults = this.storage.searchTasks({
      query,
      status: filter === 'all' ? null : filter === 'active' ? 'pending' : filter,
      sortBy: sort
    });

    // 渲染搜尋結果
    this.ui.renderTasks(searchResults);
  }

  /**
   * 處理篩選
   * @param {Object} filterOptions - 篩選選項
   */
  handleFilter(filterOptions) {
    const { filter, query, sort } = filterOptions;

    // 篩選任務
    const filteredTasks = this.storage.searchTasks({
      query,
      status: filter === 'all' ? null : filter === 'active' ? 'pending' : filter,
      sortBy: sort
    });

    // 渲染篩選結果
    this.ui.renderTasks(filteredTasks);
  }

  /**
   * 處理排序
   * @param {string} sortOption - 排序選項
   */
  handleSort(sortOption) {
    // 重新搜尋和排序任務
    const sortedTasks = this.storage.searchTasks({
      query: this.ui.searchQuery,
      status: this.ui.currentFilter === 'all' ? null :
              this.ui.currentFilter === 'active' ? 'pending' :
              this.ui.currentFilter,
      sortBy: sortOption
    });

    // 渲染排序結果
    this.ui.renderTasks(sortedTasks);
  }

  /**
   * 處理自動排序
   */
  handleAutoSort() {
    const currentSort = this.ui.currentSort || this.settings.get('tasks.defaultSortBy', 'created-desc');
    this.handleSort(currentSort);
  }

  /**
   * ========== 更新和統計方法 ========== */

  /**
   * 更新統計資訊
   */
  updateStats() {
    const stats = this.storage.getTaskStats();

    // 這些資訊會在 UI.renderTasks 中更新
    // 這裡可以添加額外的統計邏輯
  }

  /**
   * 更新篩選計數
   */
  updateFilterCounts() {
    const allTasks = this.currentTasks.length;
    const completedTasks = this.currentTasks.filter(task => task.status === 'completed').length;
    const activeTasks = allTasks - completedTasks;

    this.ui.setFilterCounts({
      all: allTasks,
      active: activeTasks,
      completed: completedTasks
    });
  }

  /**
   * 渲染任務列表
   */
  renderTasks() {
    // 根據當前的篩選和排序條件渲染任務
    const tasks = this.storage.searchTasks({
      query: this.ui.searchQuery,
      status: this.ui.currentFilter === 'all' ? null :
              this.ui.currentFilter === 'active' ? 'pending' :
              this.ui.currentFilter,
      sortBy: this.ui.currentSort || this.settings.get('tasks.defaultSortBy', 'created-desc')
    });

    this.ui.renderTasks(tasks);
  }

  /**
   * ========== 事件處理方法 ========== */

  /**
   * 處理任務已添加事件
   * @param {Object} task - 新添加的任務
   */
  handleTaskAdded(task) {
    console.log('📝 任務已添加:', task.title);

    // 這裡可以添加額外的處理邏輯
    // 例如：同步到伺服器、發送通知等
  }

  /**
   * 處理任務已更新事件
   * @param {Object} task - 更新後的任務
   * @param {Object} originalTask - 原始任務
   */
  handleTaskUpdated(task, originalTask) {
    console.log('📝 任務已更新:', task.title);

    // 這裡可以添加額外的處理邏輯
    // 例如：同步到伺服器、記錄變更歷史等
  }

  /**
   * 處理任務已刪除事件
   * @param {Object} task - 已刪除的任務
   */
  handleTaskDeleted(task) {
    console.log('🗑️ 任務已刪除:', task.title);

    // 這裡可以添加額外的處理邏輯
    // 例如：同步到伺服器、記錄刪除歷史等
  }

  /**
   * 處理所有任務已清除事件
   * @param {Array} originalTasks - 原始任務列表
   */
  handleAllTasksCleared(originalTasks) {
    console.log('🗑️ 所有任務已清除');

    // 清除選取狀態
    this.ui.clearSelection();
    this.ui.updateBulkActionsUI();

    // 更新統計資訊
    this.updateStats();
    this.updateFilterCounts();

    // 重新渲染空列表
    this.ui.renderTasks([]);
  }

  /**
   * 處理任務匯入事件
   * @param {Object} result - 匯入結果
   */
  handleTasksImported(result) {
    if (result.success) {
      this.ui.showNotification(
        `成功匯入 ${result.importedCount} 項任務`,
        'success'
      );

      // 重新載入任務資料
      this.loadInitialData().then(() => {
        this.renderInitialUI();
      });
    } else {
      this.ui.showNotification(
        `匯入失敗: ${result.error}`,
        'error'
      );
    }
  }

  /**
   * 處理線上狀態變更
   * @param {boolean} isOnline - 是否在線
   */
  handleOnlineStatusChange(isOnline) {
    console.log(`🌐 線上狀態變更: ${isOnline ? '在線' : '離線'}`);

    // 這裡可以添加同步邏輯
    // 例如：在線時同步到伺服器，離線時使用本地儲存
  }

  /**
   * 處理頁面變為可見
   */
  handlePageVisible() {
    console.log('👁️ 頁面變為可見');

    // 這裡可以添加刷新邏輯
    // 例如：重新載入資料、檢查更新等
  }

  /**
   * 處理預設優先級變更
   * @param {string} priority - 新的預設優先級
   */
  handleDefaultPriorityChange(priority) {
    console.log('🎯 預設優先級已變更為:', priority);

    // 這裡可以添加相應的處理邏輯
  }

  /**
   * ========== 公共方法 ========== */

  /**
   * 獲取應用程式狀態
   * @returns {Object} 應用程式狀態
   */
  getAppState() {
    return {
      isInitialized: this.isInitialized,
      isOnline: this.isOnline,
      currentTasksCount: this.currentTasks.length,
      currentFilter: this.ui.currentFilter,
      currentSort: this.ui.currentSort,
      searchQuery: this.ui.searchQuery,
      selectedTasksCount: this.ui.selectedTasks.size
    };
  }

  /**
   * 重新載入應用程式資料
   */
  async reload() {
    try {
      await this.loadInitialData();
      this.renderInitialUI();
      console.log('🔄 應用程式資料已重新載入');
    } catch (error) {
      console.error('❌ 重新載入失敗:', error);
      this.ui.showNotification('重新載入失敗: ' + error.message, 'error');
    }
  }

  /**
   * 清理應用程式資源
   */
  destroy() {
    // 清理各個模組
    if (this.ui) {
      this.ui.destroy();
    }

    if (this.storage) {
      this.storage.destroy();
    }

    this.isInitialized = false;
    console.log('🧹 主應用程式已清理');
  }
}