/**
 * 任務倉儲類別
 * 提供完整的任務 CRUD 操作和業務邏輯處理
 */

import { Task } from '../models/Task.js';
import { TaskValidator } from '../models/TaskValidator.js';
import { EventEmitter } from '../core/EventEmitter.js';
import { APP_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES, EVENT_TYPES } from '../config/settings.js';
import { storageUtils, dateUtils, stringUtils } from '../utils/utils.js';

/**
 * 任務倉儲類別
 */
export class TodoRepository {
    /**
     * 建構函數
     */
    constructor() {
        this.storageKey = `${APP_CONFIG.storage.prefix}todos`;
        this.versionKey = `${APP_CONFIG.storage.prefix}version`;
        this.eventEmitter = new EventEmitter();
        this._cache = new Map();
        this._cacheExpiry = new Map();
        this._cacheTimeout = APP_CONFIG.performance.cache.ttl || 3600000; // 1小時
        this._isInitialized = false;

        // 設定事件發布器除錯模式
        this.eventEmitter.setDebugMode(APP_CONFIG.development.debug || false);

        // 綁定方法上下文
        this._emit = this._emit.bind(this);
    }

    /**
     * 初始化倉儲
     */
    async initialize() {
        if (this._isInitialized) {
            return;
        }

        try {
            // 檢查版本並執行遷移
            await this._checkAndMigrate();

            // 初始化預設資料（如果需要）
            if (!await this._hasData()) {
                await this._loadDefaultData();
            }

            this._isInitialized = true;
            this._emit(EVENT_TYPES.REPOSITORY_READY);

            console.log('TodoRepository 初始化完成');
        } catch (error) {
            console.error('TodoRepository 初始化失敗:', error);
            this._emit(EVENT_TYPES.REPOSITORY_ERROR, { error });
            throw error;
        }
    }

    /**
     * 創建新任務
     * @param {Object} taskData - 任務資料
     * @returns {Promise<Task>} 創建的任務
     */
    async create(taskData) {
        this._ensureInitialized();

        try {
            // 驗證輸入資料
            const validation = TaskValidator.validate(taskData, false);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // 創建任務實例
            const task = new Task(validation.cleanedData);

            // 檢查業務規則
            await this._validateBusinessRules(task, 'create');

            // 取得現有任務
            const existingTasks = await this._loadTasks();
            existingTasks.push(task.toJSON());

            // 儲存到本地儲存
            await this._saveTasks(existingTasks);

            // 清理快取
            this._clearCache();

            // 發布事件
            this._emit(EVENT_TYPES.TODO_ADDED, task);

            console.log(`成功創建任務: ${task.id}`);
            return task;

        } catch (error) {
            console.error('創建任務失敗:', error);
            this._emit(EVENT_TYPES.REPOSITORY_ERROR, { operation: 'create', error });
            throw error;
        }
    }

    /**
     * 根據 ID 取得任務
     * @param {string} id - 任務 ID
     * @returns {Promise<Task|null>} 任務實例或 null
     */
    async getById(id) {
        this._ensureInitialized();

        if (!TaskValidator.isValidId(id)) {
            return null;
        }

        // 檢查快取
        const cached = this._getCached(id);
        if (cached) {
            return cached;
        }

        try {
            const tasks = await this._loadTasks();
            const taskData = tasks.find(t => t.id === id);

            if (!taskData) {
                return null;
            }

            const task = Task.fromJSON(taskData);
            this._setCache(id, task);
            return task;

        } catch (error) {
            console.error(`取得任務 ${id} 失敗:`, error);
            return null;
        }
    }

    /**
     * 取得所有任務
     * @param {Object} filters - 篩選條件
     * @returns {Promise<Task[]>} 任務陣列
     */
    async getAll(filters = {}) {
        this._ensureInitialized();

        try {
            let tasks = await this._loadTasks();
            let taskInstances = tasks.map(taskData => Task.fromJSON(taskData));

            // 應用篩選條件
            if (Object.keys(filters).length > 0) {
                taskInstances = taskInstances.filter(task => task.matchesFilters(filters));
            }

            // 排序
            if (filters.sortBy) {
                taskInstances.sort((a, b) => a.compare(b, filters.sortBy));
                if (filters.sortOrder === 'desc') {
                    taskInstances.reverse();
                }
            }

            // 分頁
            if (filters.page !== undefined && filters.pageSize !== undefined) {
                const startIndex = filters.page * filters.pageSize;
                const endIndex = startIndex + filters.pageSize;
                taskInstances = taskInstances.slice(startIndex, endIndex);
            }

            // 更新快取
            taskInstances.forEach(task => this._setCache(task.id, task));

            return taskInstances;

        } catch (error) {
            console.error('取得任務列表失敗:', error);
            return [];
        }
    }

    /**
     * 根據分類取得任務
     * @param {string} category - 分類名稱
     * @returns {Promise<Task[]>} 任務陣列
     */
    async getByCategory(category) {
        return this.getAll({ category });
    }

    /**
     * 根據優先級取得任務
     * @param {string} priority - 優先級
     * @returns {Promise<Task[]>} 任務陣列
     */
    async getByPriority(priority) {
        return this.getAll({ priority });
    }

    /**
     * 搜索任務
     * @param {string} searchTerm - 搜索詞
     * @param {Object} filters - 額外篩選條件
     * @returns {Promise<Task[]>} 搜索結果
     */
    async search(searchTerm, filters = {}) {
        if (!searchTerm || typeof searchTerm !== 'string') {
            return [];
        }

        try {
            const allTasks = await this.getAll();
            return allTasks.filter(task =>
                task.matchesSearch(searchTerm) &&
                task.matchesFilters(filters)
            );

        } catch (error) {
            console.error('搜索任務失敗:', error);
            return [];
        }
    }

    /**
     * 更新任務
     * @param {string} id - 任務 ID
     * @param {Object} updates - 更新資料
     * @returns {Promise<Task>} 更新後的任務
     */
    async update(id, updates) {
        this._ensureInitialized();

        try {
            if (!TaskValidator.isValidId(id)) {
                throw new Error(ERROR_MESSAGES.NOT_FOUND);
            }

            // 驗證更新資料
            const validation = TaskValidator.validate(updates, true);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // 取得現有任務
            const existingTask = await this.getById(id);
            if (!existingTask) {
                throw new Error(ERROR_MESSAGES.NOT_FOUND);
            }

            // 更新任務
            const updatedTask = existingTask.update(validation.cleanedData);

            // 檢查業務規則
            await this._validateBusinessRules(updatedTask, 'update', existingTask);

            // 取得所有任務並更新
            const allTasks = await this._loadTasks();
            const index = allTasks.findIndex(t => t.id === id);

            if (index === -1) {
                throw new Error(ERROR_MESSAGES.NOT_FOUND);
            }

            allTasks[index] = updatedTask.toJSON();
            await this._saveTasks(allTasks);

            // 清理快取
            this._clearCache(id);

            // 發布事件
            this._emit(EVENT_TYPES.TODO_UPDATED, updatedTask);

            console.log(`成功更新任務: ${id}`);
            return updatedTask;

        } catch (error) {
            console.error(`更新任務 ${id} 失敗:`, error);
            this._emit(EVENT_TYPES.REPOSITORY_ERROR, { operation: 'update', id, error });
            throw error;
        }
    }

    /**
     * 切換任務完成狀態
     * @param {string} id - 任務 ID
     * @returns {Promise<Task>} 更新後的任務
     */
    async toggleComplete(id) {
        const task = await this.getById(id);
        if (!task) {
            throw new Error(ERROR_MESSAGES.NOT_FOUND);
        }

        const updatedTask = await this.update(id, { completed: !task.completed });

        // 發布特定事件
        if (updatedTask.completed) {
            this._emit(EVENT_TYPES.TODO_COMPLETED, updatedTask);
        } else {
            this._emit(EVENT_TYPES.TODO_UNCOMPLETED, updatedTask);
        }

        return updatedTask;
    }

    /**
     * 刪除任務
     * @param {string} id - 任務 ID
     * @returns {Promise<boolean>} 是否成功刪除
     */
    async delete(id) {
        this._ensureInitialized();

        try {
            if (!TaskValidator.isValidId(id)) {
                return false;
            }

            const task = await this.getById(id);
            if (!task) {
                return false;
            }

            // 檢查業務規則
            await this._validateBusinessRules(task, 'delete');

            const allTasks = await this._loadTasks();
            const index = allTasks.findIndex(t => t.id === id);

            if (index === -1) {
                return false;
            }

            allTasks.splice(index, 1);
            await this._saveTasks(allTasks);

            // 清理快取
            this._clearCache(id);

            // 發布事件
            this._emit(EVENT_TYPES.TODO_DELETED, { id, task });

            console.log(`成功刪除任務: ${id}`);
            return true;

        } catch (error) {
            console.error(`刪除任務 ${id} 失敗:`, error);
            this._emit(EVENT_TYPES.REPOSITORY_ERROR, { operation: 'delete', id, error });
            throw error;
        }
    }

    /**
     * 批次刪除已完成的任務
     * @returns {Promise<number>} 刪除的任務數量
     */
    async deleteCompleted() {
        this._ensureInitialized();

        try {
            const completedTasks = await this.getAll({ completed: true });

            // 檢查業務規則
            for (const task of completedTasks) {
                await this._validateBusinessRules(task, 'deleteCompleted');
            }

            const activeTasks = await this.getAll({ completed: false });
            await this._saveTasks(activeTasks.map(t => t.toJSON()));

            // 清理快取
            completedTasks.forEach(task => this._clearCache(task.id));

            // 發布事件
            this._emit(EVENT_TYPES.COMPLETED_TODOS_CLEARED, {
                deletedCount: completedTasks.length,
                tasks: completedTasks
            });

            console.log(`清除了 ${completedTasks.length} 個已完成的任務`);
            return completedTasks.length;

        } catch (error) {
            console.error('清除已完成任務失敗:', error);
            this._emit(EVENT_TYPES.REPOSITORY_ERROR, { operation: 'deleteCompleted', error });
            throw error;
        }
    }

    /**
     * 清空所有任務
     * @returns {Promise<boolean>} 是否成功
     */
    async deleteAll() {
        this._ensureInitialized();

        try {
            // 備份現有資料
            await this._backupData();

            await this._saveTasks([]);

            // 清理所有快取
            this._clearCache();

            // 發布事件
            this._emit(EVENT_TYPES.ALL_TODOS_CLEARED);

            console.log('已清空所有任務');
            return true;

        } catch (error) {
            console.error('清空所有任務失敗:', error);
            this._emit(EVENT_TYPES.REPOSITORY_ERROR, { operation: 'deleteAll', error });
            throw error;
        }
    }

    /**
     * 取得任務統計資料
     * @returns {Promise<Object>} 統計資料
     */
    async getStats() {
        this._ensureInitialized();

        try {
            const allTasks = await this._loadTasks();
            const taskInstances = allTasks.map(data => Task.fromJSON(data));

            const stats = {
                total: taskInstances.length,
                completed: taskInstances.filter(t => t.completed).length,
                active: taskInstances.filter(t => !t.completed).length,
                overdue: taskInstances.filter(t => t.isOverdue()).length,
                dueSoon: taskInstances.filter(t => t.isDueSoon()).length,
                byPriority: {
                    high: taskInstances.filter(t => t.priority === 'high').length,
                    medium: taskInstances.filter(t => t.priority === 'medium').length,
                    low: taskInstances.filter(t => t.priority === 'low').length,
                },
                byCategory: {},
                tags: new Set(),
                lastModified: await this._getLastModified(),
            };

            // 統計分類
            taskInstances.forEach(task => {
                stats.byCategory[task.category] = (stats.byCategory[task.category] || 0) + 1;
                task.tags.forEach(tag => stats.tags.add(tag));
            });

            stats.tags = Array.from(stats.tags);

            return stats;

        } catch (error) {
            console.error('取得統計資料失敗:', error);
            return {
                total: 0,
                completed: 0,
                active: 0,
                overdue: 0,
                dueSoon: 0,
                byPriority: { high: 0, medium: 0, low: 0 },
                byCategory: {},
                tags: [],
                lastModified: null,
            };
        }
    }

    /**
     * 匯出任務資料
     * @returns {Promise<Object>} 匯出的資料
     */
    async export() {
        this._ensureInitialized();

        try {
            const tasks = await this.getAll();
            const stats = await this.getStats();

            const exportData = {
                version: APP_CONFIG.version,
                exportedAt: new Date().toISOString(),
                tasks: tasks.map(task => task.toJSON()),
                stats,
                metadata: {
                    totalTasks: tasks.length,
                    exportFormat: 'todo-list-json',
                    compatibility: '1.0.0+',
                },
            };

            this._emit(EVENT_TYPES.DATA_EXPORTED, { taskCount: tasks.length });
            return exportData;

        } catch (error) {
            console.error('匯出資料失敗:', error);
            this._emit(EVENT_TYPES.REPOSITORY_ERROR, { operation: 'export', error });
            throw error;
        }
    }

    /**
     * 匯入任務資料
     * @param {Object|Array} importData - 匯入的資料
     * @param {Object} options - 匯入選項
     * @returns {Promise<Object>} 匯入結果
     */
    async import(importData, options = {}) {
        this._ensureInitialized();

        try {
            let tasks = [];

            // 處理不同的資料格式
            if (Array.isArray(importData)) {
                // 直接是任務陣列
                tasks = importData;
            } else if (importData.tasks && Array.isArray(importData.tasks)) {
                // 標準匯出格式
                tasks = importData.tasks;
            } else {
                throw new Error('不支援的匯入資料格式');
            }

            // 驗證任務資料
            const validTasks = [];
            const invalidTasks = [];

            for (const taskData of tasks) {
                const validation = TaskValidator.validate(taskData, false);
                if (validation.isValid) {
                    // 重新生成 ID（避免衝突）
                    const cleanedData = validation.cleanedData;
                    delete cleanedData.id;
                    const task = new Task(cleanedData);
                    validTasks.push(task);
                } else {
                    invalidTasks.push({ data: taskData, errors: validation.errors });
                }
            }

            if (validTasks.length === 0) {
                throw new Error('沒有有效的任務資料可以匯入');
            }

            // 備份現有資料
            if (!options.skipBackup) {
                await this._backupData();
            }

            // 根據選項決定如何合併資料
            let finalTasks;
            if (options.replaceExisting) {
                finalTasks = validTasks;
            } else {
                const existingTasks = await this.getAll();
                finalTasks = [...existingTasks, ...validTasks];
            }

            // 儲存資料
            await this._saveTasks(finalTasks.map(t => t.toJSON()));

            // 清理快取
            this._clearCache();

            const result = {
                success: true,
                imported: validTasks.length,
                total: tasks.length,
                invalid: invalidTasks.length,
                skipped: options.skipBackup ? 0 : 1, // 備份操作
            };

            this._emit(EVENT_TYPES.DATA_IMPORTED, result);
            console.log(`成功匯入 ${validTasks.length} 個任務`);

            return result;

        } catch (error) {
            console.error('匯入資料失敗:', error);
            this._emit(EVENT_TYPES.REPOSITORY_ERROR, { operation: 'import', error });
            throw error;
        }
    }

    /**
     * 事件監聽方法
     * @param {string} event - 事件名稱
     * @param {Function} listener - 監聽器函數
     * @returns {TodoRepository} 返回自身以支援鏈式調用
     */
    on(event, listener) {
        this.eventEmitter.on(event, listener);
        return this;
    }

    /**
     * 移除事件監聽器
     * @param {string} event - 事件名稱
     * @param {Function} listener - 監聽器函數
     * @returns {TodoRepository} 返回自身以支援鏈式調用
     */
    off(event, listener) {
        this.eventEmitter.off(event, listener);
        return this;
    }

    /**
     * 一次性事件監聽
     * @param {string} event - 事件名稱
     * @param {Function} listener - 監聽器函數
     * @returns {TodoRepository} 返回自身以支援鏈式調用
     */
    once(event, listener) {
        this.eventEmitter.once(event, listener);
        return this;
    }

    // 私有方法

    /**
     * 確保倉儲已初始化
     */
    _ensureInitialized() {
        if (!this._isInitialized) {
            throw new Error('TodoRepository 尚未初始化，請先調用 initialize()');
        }
    }

    /**
     * 發布事件
     * @param {string} event - 事件名稱
     * @param {...any} args - 事件參數
     */
    _emit(event, ...args) {
        this.eventEmitter.emit(event, ...args);
    }

    /**
     * 載入任務資料
     * @returns {Promise<Array>} 任務資料陣列
     */
    async _loadTasks() {
        try {
            const data = storageUtils.get(this.storageKey, []);
            if (!Array.isArray(data)) {
                console.warn('儲存的任務資料格式錯誤，重設為空陣列');
                return [];
            }
            return data;
        } catch (error) {
            console.error('載入任務資料失敗:', error);
            return [];
        }
    }

    /**
     * 儲存任務資料
     * @param {Array} tasks - 任務資料陣列
     */
    async _saveTasks(tasks) {
        try {
            if (!Array.isArray(tasks)) {
                throw new Error('任務資料必須是陣列');
            }

            const success = storageUtils.set(this.storageKey, tasks);
            if (success) {
                storageUtils.set(`${this.storageKey}_last_modified`, new Date().toISOString());
            }
            return success;
        } catch (error) {
            console.error('儲存任務資料失敗:', error);
            throw error;
        }
    }

    /**
     * 檢查是否有資料
     * @returns {Promise<boolean>} 是否有資料
     */
    async _hasData() {
        const tasks = await this._loadTasks();
        return tasks.length > 0;
    }

    /**
     * 載入預設資料
     */
    async _loadDefaultData() {
        const { DEFAULT_TODOS } = await import('../config/settings.js');
        const defaultTasks = DEFAULT_TODOS.map(todoData => new Task(todoData));
        await this._saveTasks(defaultTasks.map(task => task.toJSON()));
        console.log('已載入預設任務資料');
    }

    /**
     * 檢查並執行遷移
     */
    async _checkAndMigrate() {
        const currentVersion = APP_CONFIG.version;
        const storedVersion = storageUtils.get(this.versionKey, '1.0.0');

        if (storedVersion !== currentVersion) {
            console.log(`偵測到版本變更，執行遷移: ${storedVersion} -> ${currentVersion}`);
            await this._migrateData(storedVersion, currentVersion);
            storageUtils.set(this.versionKey, currentVersion);
        }
    }

    /**
     * 遷移資料
     * @param {string} fromVersion - 來源版本
     * @param {string} toVersion - 目標版本
     */
    async _migrateData(fromVersion, toVersion) {
        // 備份現有資料
        await this._backupData();

        const tasks = await this._loadTasks();
        let migratedTasks = tasks;

        // 根據版本執行不同的遷移邏輯
        if (this._compareVersions(fromVersion, '1.0.0') < 0) {
            // 遷移到 1.0.0 的邏輯
            migratedTasks = tasks.map(taskData => {
                // 將舊格式的 text 欄位轉換為 title
                if (taskData.text && !taskData.title) {
                    taskData.title = taskData.text;
                    delete taskData.text;
                }

                // 確保所有必要欄位存在
                return Task.fromJSON(taskData).toJSON();
            });
        }

        await this._saveTasks(migratedTasks);
        console.log(`資料遷移完成: ${migratedTasks.length} 個任務`);
    }

    /**
     * 比較版本號
     * @param {string} version1 - 版本1
     * @param {string} version2 - 版本2
     * @returns {number} 比較結果
     */
    _compareVersions(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);

        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;

            if (v1Part < v2Part) return -1;
            if (v1Part > v2Part) return 1;
        }

        return 0;
    }

    /**
     * 備份資料
     */
    async _backupData() {
        const tasks = await this._loadTasks();
        if (tasks.length > 0) {
            const backupKey = `${this.storageKey}_backup_${Date.now()}`;
            storageUtils.set(backupKey, {
                version: APP_CONFIG.version,
                timestamp: new Date().toISOString(),
                tasks,
            });
            console.log(`資料已備份到: ${backupKey}`);
        }
    }

    /**
     * 取得最後修改時間
     * @returns {Promise<string|null>} 最後修改時間
     */
    async _getLastModified() {
        return storageUtils.get(`${this.storageKey}_last_modified`);
    }

    /**
     * 驗證業務規則
     * @param {Task} task - 任務
     * @param {string} operation - 操作類型
     * @param {Task} originalTask - 原始任務（更新操作時）
     */
    async _validateBusinessRules(task, operation, originalTask = null) {
        // 可以在這裡添加特定的業務規則驗證
        // 例如：不允許刪除某些特殊任務、限制同分類任務數量等

        // 目前為空，保留擴展性
    }

    /**
     * 快取相關方法
     */
    _getCached(id) {
        const cached = this._cache.get(id);
        if (cached && this._isCacheValid(id)) {
            return cached;
        }
        return null;
    }

    _setCache(id, task) {
        this._cache.set(id, task);
        this._cacheExpiry.set(id, Date.now() + this._cacheTimeout);
    }

    _clearCache(id = null) {
        if (id) {
            this._cache.delete(id);
            this._cacheExpiry.delete(id);
        } else {
            this._cache.clear();
            this._cacheExpiry.clear();
        }
    }

    _isCacheValid(id) {
        const expiry = this._cacheExpiry.get(id);
        return expiry && Date.now() < expiry;
    }

    /**
     * 清理資源
     */
    dispose() {
        this._clearCache();
        this.eventEmitter.dispose();
        this._isInitialized = false;
        console.log('TodoRepository 已清理');
    }
}

// 創建並匯出單例實例
const todoRepository = new TodoRepository();

export default todoRepository;
export { TodoRepository };