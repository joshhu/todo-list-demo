/**
 * 任務服務層
 * 負責連接 UI 和倉儲層，提供高級的任務操作 API
 */

import { TodoRepository } from '../repositories/TodoRepository.js';
import { Task } from '../models/Task.js';
import { TaskValidator } from '../models/TaskValidator.js';
import { EVENT_TYPES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/settings.js';
import { EventEmitter } from '../core/EventEmitter.js';

/**
 * 任務服務類別
 * 提供統一的任務操作介面，處理業務邏輯和事件發布
 */
class TaskService {
    /**
     * 建構函數
     */
    constructor() {
        this.repository = new TodoRepository();
        this.eventEmitter = new EventEmitter();
        this.isInitialized = false;

        // 繫定倉儲事件
        this.bindRepositoryEvents();

        // 快取
        this.taskCache = new Map();
        this.lastFetchTime = 0;
        this.cacheTimeout = 30000; // 30 秒快取
    }

    /**
     * 初始化服務
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            await this.repository.initialize();
            this.isInitialized = true;
            this.eventEmitter.emit(EVENT_TYPES.SERVICE_READY);
            console.log('TaskService 初始化完成');
        } catch (error) {
            console.error('TaskService 初始化失敗:', error);
            this.eventEmitter.emit(EVENT_TYPES.SERVICE_ERROR, { error });
            throw error;
        }
    }

    /**
     * 繫結倉儲事件
     */
    bindRepositoryEvents() {
        this.repository.on(EVENT_TYPES.TODO_ADDED, (task) => {
            this.clearCache();
            this.eventEmitter.emit(EVENT_TYPES.TODO_ADDED, task);
        });

        this.repository.on(EVENT_TYPES.TODO_UPDATED, (task) => {
            this.clearCache(task.id);
            this.eventEmitter.emit(EVENT_TYPES.TODO_UPDATED, task);
        });

        this.repository.on(EVENT_TYPES.TODO_DELETED, (data) => {
            this.clearCache(data.id);
            this.eventEmitter.emit(EVENT_TYPES.TODO_DELETED, data);
        });

        this.repository.on(EVENT_TYPES.TODO_COMPLETED, (task) => {
            this.clearCache(task.id);
            this.eventEmitter.emit(EVENT_TYPES.TODO_COMPLETED, task);
        });

        this.repository.on(EVENT_TYPES.TODO_UNCOMPLETED, (task) => {
            this.clearCache(task.id);
            this.eventEmitter.emit(EVENT_TYPES.TODO_UNCOMPLETED, task);
        });

        this.repository.on(EVENT_TYPES.REPOSITORY_ERROR, (data) => {
            this.eventEmitter.emit(EVENT_TYPES.SERVICE_ERROR, data);
        });
    }

    /**
     * 創建任務
     * @param {Object} taskData - 任務資料
     * @returns {Promise<Task>} 創建的任務
     */
    async createTask(taskData) {
        try {
            const task = await this.repository.create(taskData);
            return task;
        } catch (error) {
            console.error('創建任務失敗:', error);
            throw new Error(`創建任務失敗: ${error.message}`);
        }
    }

    /**
     * 根據 ID 取得任務
     * @param {string} id - 任務 ID
     * @returns {Promise<Task|null>} 任務實例或 null
     */
    async getTaskById(id) {
        try {
            // 檢查快取
            const cached = this.getCached(id);
            if (cached) {
                return cached;
            }

            const task = await this.repository.getById(id);
            if (task) {
                this.setCache(id, task);
            }
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
    async getAllTasks(filters = {}) {
        try {
            // 檢查快取
            const cacheKey = this.getCacheKey(filters);
            const cached = this.getCached(cacheKey);
            if (cached && this.isCacheValid()) {
                return cached;
            }

            const tasks = await this.repository.getAll(filters);
            this.setCache(cacheKey, tasks);
            this.lastFetchTime = Date.now();
            return tasks;
        } catch (error) {
            console.error('取得任務列表失敗:', error);
            return [];
        }
    }

    /**
     * 搜索任務
     * @param {string} searchTerm - 搜索詞
     * @param {Object} filters - 額外篩選條件
     * @returns {Promise<Task[]>} 搜索結果
     */
    async searchTasks(searchTerm, filters = {}) {
        try {
            return await this.repository.search(searchTerm, filters);
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
    async updateTask(id, updates) {
        try {
            const task = await this.repository.update(id, updates);
            return task;
        } catch (error) {
            console.error(`更新任務 ${id} 失敗:`, error);
            throw new Error(`更新任務失敗: ${error.message}`);
        }
    }

    /**
     * 切換任務完成狀態
     * @param {string} id - 任務 ID
     * @returns {Promise<Task>} 更新後的任務
     */
    async toggleTaskComplete(id) {
        try {
            const task = await this.repository.toggleComplete(id);
            return task;
        } catch (error) {
            console.error(`切換任務 ${id} 完成狀態失敗:`, error);
            throw new Error(`切換完成狀態失敗: ${error.message}`);
        }
    }

    /**
     * 刪除任務
     * @param {string} id - 任務 ID
     * @returns {Promise<boolean>} 是否成功刪除
     */
    async deleteTask(id) {
        try {
            const success = await this.repository.delete(id);
            return success;
        } catch (error) {
            console.error(`刪除任務 ${id} 失敗:`, error);
            throw new Error(`刪除任務失敗: ${error.message}`);
        }
    }

    /**
     * 批次刪除已完成的任務
     * @returns {Promise<number>} 刪除的任務數量
     */
    async deleteCompletedTasks() {
        try {
            const count = await this.repository.deleteCompleted();
            return count;
        } catch (error) {
            console.error('刪除已完成任務失敗:', error);
            throw new Error(`刪除已完成任務失敗: ${error.message}`);
        }
    }

    /**
     * 清空所有任務
     * @returns {Promise<boolean>} 是否成功
     */
    async clearAllTasks() {
        try {
            const success = await this.repository.deleteAll();
            return success;
        } catch (error) {
            console.error('清空所有任務失敗:', error);
            throw new Error(`清空任務失敗: ${error.message}`);
        }
    }

    /**
     * 取得任務統計資料
     * @returns {Promise<Object>} 統計資料
     */
    async getTaskStats() {
        try {
            const stats = await this.repository.getStats();
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
     * 根據分類取得任務
     * @param {string} category - 分類名稱
     * @returns {Promise<Task[]>} 任務陣列
     */
    async getTasksByCategory(category) {
        try {
            return await this.repository.getByCategory(category);
        } catch (error) {
            console.error(`根據分類 ${category} 取得任務失敗:`, error);
            return [];
        }
    }

    /**
     * 根據優先級取得任務
     * @param {string} priority - 優先級
     * @returns {Promise<Task[]>} 任務陣列
     */
    async getTasksByPriority(priority) {
        try {
            return await this.repository.getByPriority(priority);
        } catch (error) {
            console.error(`根據優先級 ${priority} 取得任務失敗:`, error);
            return [];
        }
    }

    /**
     * 匯出任務資料
     * @returns {Promise<Object>} 匯出的資料
     */
    async exportTasks() {
        try {
            const exportData = await this.repository.export();
            return exportData;
        } catch (error) {
            console.error('匯出任務失敗:', error);
            throw new Error(`匯出任務失敗: ${error.message}`);
        }
    }

    /**
     * 匯入任務資料
     * @param {Object|Array} importData - 匯入的資料
     * @param {Object} options - 匯入選項
     * @returns {Promise<Object>} 匯入結果
     */
    async importTasks(importData, options = {}) {
        try {
            const result = await this.repository.import(importData, options);
            return result;
        } catch (error) {
            console.error('匯入任務失敗:', error);
            throw new Error(`匯入任務失敗: ${error.message}`);
        }
    }

    /**
     * 驗證任務資料
     * @param {Object} taskData - 任務資料
     * @param {boolean} isUpdate - 是否為更新操作
     * @returns {Object} 驗證結果
     */
    validateTaskData(taskData, isUpdate = false) {
        try {
            return TaskValidator.validate(taskData, isUpdate);
        } catch (error) {
            return {
                isValid: false,
                errors: [`驗證失敗: ${error.message}`],
                cleanedData: null
            };
        }
    }

    /**
     * 事件監聽方法
     * @param {string} event - 事件名稱
     * @param {Function} listener - 監聽器函數
     * @returns {TaskService} 返回自身以支援鏈式調用
     */
    on(event, listener) {
        this.eventEmitter.on(event, listener);
        return this;
    }

    /**
     * 移除事件監聽器
     * @param {string} event - 事件名稱
     * @param {Function} listener - 監聽器函數
     * @returns {TaskService} 返回自身以支援鏈式調用
     */
    off(event, listener) {
        this.eventEmitter.off(event, listener);
        return this;
    }

    /**
     * 一次性事件監聽
     * @param {string} event - 事件名稱
     * @param {Function} listener - 監聽器函數
     * @returns {TaskService} 返回自身以支援鏈式調用
     */
    once(event, listener) {
        this.eventEmitter.once(event, listener);
        return this;
    }

    // 私有方法

    /**
     * 取得快取鍵值
     * @param {Object} filters - 篩選條件
     * @returns {string} 快取鍵值
     */
    getCacheKey(filters = {}) {
        return JSON.stringify(filters);
    }

    /**
     * 取得快取資料
     * @param {string} key - 快取鍵值
     * @returns {any} 快取的資料
     */
    getCached(key) {
        return this.taskCache.get(key);
    }

    /**
     * 設定快取資料
     * @param {string} key - 快取鍵值
     * @param {any} data - 要快取的資料
     */
    setCache(key, data) {
        this.taskCache.set(key, data);
    }

    /**
     * 清理快取
     * @param {string} key - 要清理的快取鍵值，不提供則清理所有
     */
    clearCache(key = null) {
        if (key) {
            this.taskCache.delete(key);
        } else {
            this.taskCache.clear();
        }
    }

    /**
     * 檢查快取是否有效
     * @returns {boolean} 快取是否有效
     */
    isCacheValid() {
        return Date.now() - this.lastFetchTime < this.cacheTimeout;
    }

    /**
     * 清理資源
     */
    dispose() {
        this.clearCache();
        this.eventEmitter.dispose();
        if (this.repository.dispose) {
            this.repository.dispose();
        }
        this.isInitialized = false;
        console.log('TaskService 已清理');
    }
}

// 創建並匯出單例實例
const taskService = new TaskService();

export default taskService;
export { TaskService };