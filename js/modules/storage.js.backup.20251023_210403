/**
 * 儲存模組
 *
 * 負責管理應用程式的資料儲存，包括：
 * - 任務資料的 CRUD 操作
 * - 本地儲存管理
 * - 資料備份和還原
 * - 資料同步（未來功能）
 */

export class Storage {
  constructor(settings) {
    this.settings = settings;
    this.storageKey = 'todolist-tasks';
    this.tasks = [];
    this.listeners = new Map();
    this.lastModified = null;
  }

  /**
   * 初始化儲存模組
   */
  async initialize() {
    try {
      // 載入任務資料
      await this.loadTasks();

      // 監聽設定變更
      this.settings.onChange('data.autoSave', (enabled) => {
        if (enabled) {
          this.startAutoSave();
        } else {
          this.stopAutoSave();
        }
      });

      // 啟動自動儲存（如果已啟用）
      if (this.settings.get('data.autoSave', true)) {
        this.startAutoSave();
      }

      console.log('✅ 儲存模組初始化完成');
    } catch (error) {
      console.error('❌ 儲存模組初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 載入任務資料
   */
  async loadTasks() {
    try {
      const savedTasks = localStorage.getItem(this.storageKey);
      if (savedTasks) {
        const parsed = JSON.parse(savedTasks);
        this.tasks = parsed.map(task => this.validateTask(task));
        this.lastModified = localStorage.getItem(`${this.storageKey}-last-modified`);
      } else {
        this.tasks = [];
        this.lastModified = null;
      }
    } catch (error) {
      console.warn('載入任務失敗，使用空任務列表:', error);
      this.tasks = [];
      this.lastModified = null;
    }
  }

  /**
   * 儲存任務資料
   */
  async saveTasks() {
    try {
      const dataToSave = JSON.stringify(this.tasks);
      localStorage.setItem(this.storageKey, dataToSave);

      const now = new Date().toISOString();
      localStorage.setItem(`${this.storageKey}-last-modified`, now);
      this.lastModified = now;

      this.settings.set('data.lastModified', now);
    } catch (error) {
      console.error('儲存任務失敗:', error);
      throw error;
    }
  }

  /**
   * 驗證任務資料
   * @param {Object} task - 要驗證的任務
   * @returns {Object} 驗證後的任務
   */
  validateTask(task) {
    const defaultTask = {
      id: '',
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      dueDate: null,
      tags: [],
      createdAt: null,
      updatedAt: null,
      completedAt: null
    };

    // 合併預設值
    const validatedTask = { ...defaultTask, ...task };

    // 確保必要欄位存在
    if (!validatedTask.id) {
      validatedTask.id = this.generateTaskId();
    }

    if (!validatedTask.createdAt) {
      validatedTask.createdAt = new Date().toISOString();
    }

    if (!validatedTask.updatedAt) {
      validatedTask.updatedAt = validatedTask.createdAt;
    }

    // 確保標題不為空
    if (!validatedTask.title || validatedTask.title.trim() === '') {
      validatedTask.title = '未命名任務';
    }

    // 清理標題
    validatedTask.title = validatedTask.title.trim();

    // 確保標籤是陣列
    if (!Array.isArray(validatedTask.tags)) {
      validatedTask.tags = [];
    }

    // 清理標籤
    validatedTask.tags = validatedTask.tags
      .filter(tag => tag && typeof tag === 'string')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    return validatedTask;
  }

  /**
   * 生成任務 ID
   * @returns {string} 任務 ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 獲取所有任務
   * @returns {Array} 任務陣列
   */
  getTasks() {
    return [...this.tasks];
  }

  /**
   * 根據 ID 獲取任務
   * @param {string} id - 任務 ID
   * @returns {Object|null} 任務對象或 null
   */
  getTask(id) {
    return this.tasks.find(task => task.id === id) || null;
  }

  /**
   * 添加任務
   * @param {Object} taskData - 任務資料
   * @returns {Object} 新增的任務
   */
  async addTask(taskData) {
    const newTask = this.validateTask({
      ...taskData,
      id: this.generateTaskId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    this.tasks.unshift(newTask); // 添加到開頭

    try {
      await this.saveTasks();
      this.notifyListeners('taskAdded', newTask);
      return newTask;
    } catch (error) {
      // 回滾變更
      this.tasks.shift();
      throw error;
    }
  }

  /**
   * 更新任務
   * @param {string} id - 任務 ID
   * @param {Object} updates - 要更新的資料
   * @returns {Object|null} 更新後的任務或 null
   */
  async updateTask(id, updates) {
    const taskIndex = this.tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
      return null;
    }

    const originalTask = this.tasks[taskIndex];
    const updatedTask = this.validateTask({
      ...originalTask,
      ...updates,
      updatedAt: new Date().toISOString()
    });

    this.tasks[taskIndex] = updatedTask;

    try {
      await this.saveTasks();
      this.notifyListeners('taskUpdated', updatedTask, originalTask);
      return updatedTask;
    } catch (error) {
      // 回滾變更
      this.tasks[taskIndex] = originalTask;
      throw error;
    }
  }

  /**
   * 刪除任務
   * @param {string} id - 任務 ID
   * @returns {boolean} 是否成功刪除
   */
  async deleteTask(id) {
    const taskIndex = this.tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
      return false;
    }

    const deletedTask = this.tasks[taskIndex];
    this.tasks.splice(taskIndex, 1);

    try {
      await this.saveTasks();
      this.notifyListeners('taskDeleted', deletedTask);
      return true;
    } catch (error) {
      // 回滾變更
      this.tasks.splice(taskIndex, 0, deletedTask);
      throw error;
    }
  }

  /**
   * 批量刪除任務
   * @param {Array} ids - 任務 ID 陣列
   * @returns {number} 成功刪除的任務數量
   */
  async deleteTasks(ids) {
    const deletedTasks = [];
    const originalTasks = [...this.tasks];

    // 標記要刪除的任務
    this.tasks = this.tasks.filter(task => {
      if (ids.includes(task.id)) {
        deletedTasks.push(task);
        return false;
      }
      return true;
    });

    try {
      await this.saveTasks();
      deletedTasks.forEach(task => {
        this.notifyListeners('taskDeleted', task);
      });
      return deletedTasks.length;
    } catch (error) {
      // 回滾變更
      this.tasks = originalTasks;
      throw error;
    }
  }

  /**
   * 切換任務完成狀態
   * @param {string} id - 任務 ID
   * @returns {Object|null} 更新後的任務或 null
   */
  async toggleTaskStatus(id) {
    const task = this.getTask(id);
    if (!task) {
      return null;
    }

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updates = {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : null
    };

    return this.updateTask(id, updates);
  }

  /**
   * 獲取任務統計資訊
   * @returns {Object} 統計資訊
   */
  getTaskStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(task => task.status === 'completed').length;
    const pending = total - completed;

    const priorityStats = {
      high: this.tasks.filter(task => task.priority === 'high').length,
      medium: this.tasks.filter(task => task.priority === 'medium').length,
      low: this.tasks.filter(task => task.priority === 'low').length
    };

    const overdueTasks = this.tasks.filter(task => {
      return task.dueDate &&
             task.status !== 'completed' &&
             new Date(task.dueDate) < new Date();
    });

    return {
      total,
      completed,
      pending,
      completedPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      priority: priorityStats,
      overdue: overdueTasks.length,
      lastModified: this.lastModified
    };
  }

  /**
   * 搜尋任務
   * @param {Object} options - 搜尋選項
   * @returns {Array} 符合條件的任務
   */
  searchTasks(options = {}) {
    const {
      query = '',
      status = null,
      priority = null,
      tags = [],
      dueDate = null,
      sortBy = 'created-desc',
      limit = null
    } = options;

    let filteredTasks = [...this.tasks];

    // 文字搜尋
    if (query) {
      const searchQuery = query.toLowerCase();
      filteredTasks = filteredTasks.filter(task =>
        task.title.toLowerCase().includes(searchQuery) ||
        (task.description && task.description.toLowerCase().includes(searchQuery)) ||
        task.tags.some(tag => tag.toLowerCase().includes(searchQuery))
      );
    }

    // 狀態篩選
    if (status) {
      if (status === 'active') {
        filteredTasks = filteredTasks.filter(task => task.status !== 'completed');
      } else if (status === 'completed') {
        filteredTasks = filteredTasks.filter(task => task.status === 'completed');
      } else {
        filteredTasks = filteredTasks.filter(task => task.status === status);
      }
    }

    // 優先級篩選
    if (priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === priority);
    }

    // 標籤篩選
    if (tags.length > 0) {
      filteredTasks = filteredTasks.filter(task =>
        tags.some(tag => task.tags.includes(tag))
      );
    }

    // 截止日期篩選
    if (dueDate) {
      filteredTasks = filteredTasks.filter(task => {
        if (!task.dueDate) return false;
        const taskDueDate = new Date(task.dueDate).toDateString();
        const filterDate = new Date(dueDate).toDateString();
        return taskDueDate === filterDate;
      });
    }

    // 排序
    filteredTasks = this.sortTasks(filteredTasks, sortBy);

    // 限制數量
    if (limit && limit > 0) {
      filteredTasks = filteredTasks.slice(0, limit);
    }

    return filteredTasks;
  }

  /**
   * 排序任務
   * @param {Array} tasks - 要排序的任務陣列
   * @param {string} sortBy - 排序方式
   * @returns {Array} 排序後的任務陣列
   */
  sortTasks(tasks, sortBy) {
    const sorted = [...tasks];

    switch (sortBy) {
      case 'created-asc':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      case 'created-desc':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      case 'updated-desc':
        return sorted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      case 'updated-asc':
        return sorted.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

      case 'priority-desc':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return sorted.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

      case 'priority-asc':
        const priorityOrderAsc = { high: 3, medium: 2, low: 1 };
        return sorted.sort((a, b) => priorityOrderAsc[a.priority] - priorityOrderAsc[b.priority]);

      case 'due-date':
        return sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });

      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh-TW'));

      default:
        return sorted;
    }
  }

  /**
   * 獲取所有標籤
   * @returns {Array} 標籤陣列
   */
  getAllTags() {
    const tagSet = new Set();
    this.tasks.forEach(task => {
      task.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }

  /**
   * 匯出任務資料
   * @param {Array} taskIds - 要匯出的任務 ID，如果為空則匯出所有任務
   * @returns {string} JSON 格式的任務資料
   */
  exportTasks(taskIds = null) {
    const tasksToExport = taskIds
      ? this.tasks.filter(task => taskIds.includes(task.id))
      : this.tasks;

    return JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      tasks: tasksToExport,
      stats: this.getTaskStats()
    }, null, 2);
  }

  /**
   * 匯入任務資料
   * @param {string} tasksJson - JSON 格式的任務資料
   * @param {Object} options - 匯入選項
   * @returns {Object} 匯入結果
   */
  async importTasks(tasksJson, options = {}) {
    const {
      overwrite = false,
      mergeTags = true
    } = options;

    try {
      const importedData = JSON.parse(tasksJson);
      const importedTasks = importedData.tasks || [];

      let importedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const taskData of importedTasks) {
        try {
          const validatedTask = this.validateTask(taskData);

          if (overwrite) {
            // 覆蓋模式：如果任務已存在則更新，否則新增
            const existingTask = this.getTask(validatedTask.id);
            if (existingTask) {
              await this.updateTask(validatedTask.id, validatedTask);
            } else {
              await this.addTask(validatedTask);
            }
          } else {
            // 合併模式：新增所有任務（生成新 ID）
            const { id, ...taskWithoutId } = validatedTask;
            await this.addTask(taskWithoutId);
          }

          importedCount++;
        } catch (error) {
          console.error('匯入任務失敗:', error);
          errorCount++;
        }
      }

      this.notifyListeners('tasksImported', {
        importedCount,
        skippedCount,
        errorCount,
        total: importedTasks.length
      });

      return {
        success: true,
        importedCount,
        skippedCount,
        errorCount,
        total: importedTasks.length
      };

    } catch (error) {
      console.error('匯入任務資料失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 清空所有任務
   */
  async clearAllTasks() {
    const originalTasks = [...this.tasks];
    this.tasks = [];

    try {
      await this.saveTasks();
      this.notifyListeners('allTasksCleared', originalTasks);
      return true;
    } catch (error) {
      // 回滾變更
      this.tasks = originalTasks;
      throw error;
    }
  }

  /**
   * 監聽儲存事件
   * @param {string} event - 事件名稱
   * @param {Function} callback - 回調函數
   * @returns {Function} 取消監聽的函數
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(callback);

    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * 通知事件監聽器
   * @param {string} event - 事件名稱
   * @param {...*} args - 事件參數
   */
  notifyListeners(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`儲存事件監聽器執行失敗 (${event}):`, error);
        }
      });
    }
  }

  /**
   * 開始自動儲存
   */
  startAutoSave() {
    this.stopAutoSave(); // 確保沒有重複的定時器

    const interval = this.settings.get('app.autoSaveInterval', 5000);
    this.autoSaveTimer = setInterval(() => {
      this.saveTasks().catch(error => {
        console.error('自動儲存失敗:', error);
      });
    }, interval);
  }

  /**
   * 停止自動儲存
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * 清理資源
   */
  destroy() {
    this.stopAutoSave();
    this.listeners.clear();
  }
}