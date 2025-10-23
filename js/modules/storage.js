/**
 * 本地儲存模組
 * 負責待辦事項資料的儲存和讀取
 */

import { APP_CONFIG, DEFAULT_TODOS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/settings.js';
import { storageUtils, stringUtils, dateUtils, objectUtils } from './utils.js';

/**
 * 儲存管理器類別
 */
class StorageManager {
    constructor() {
        this.storageKey = `${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.key}`;
        this.versionKey = `${APP_CONFIG.storage.prefix}version`;
        this.lastModifiedKey = `${APP_CONFIG.storage.prefix}last_modified`;

        // 初始化儲存
        this.initialize();
    }

    /**
     * 初始化儲存系統
     */
    initialize() {
        try {
            // 檢查是否需要遷移資料
            this.checkAndMigrate();

            // 如果沒有資料，載入預設資料
            if (!this.hasData()) {
                this.loadDefaultData();
            }

            console.log('儲存系統初始化完成');
        } catch (error) {
            console.error('儲存系統初始化失敗:', error);
            this.loadDefaultData();
        }
    }

    /**
     * 檢查並遷移資料
     */
    checkAndMigrate() {
        const currentVersion = APP_CONFIG.version;
        const storedVersion = this.getVersion();

        if (storedVersion !== currentVersion) {
            console.log(`偵測到版本變更: ${storedVersion} -> ${currentVersion}`);

            // 備份現有資料
            this.backupData();

            // 執行遷移邏輯
            this.migrateData(storedVersion, currentVersion);

            // 更新版本號
            this.setVersion(currentVersion);
        }
    }

    /**
     * 取得儲存的版本號
     */
    getVersion() {
        return storageUtils.get(this.versionKey, '1.0.0');
    }

    /**
     * 設定版本號
     */
    setVersion(version) {
        storageUtils.set(this.versionKey, version);
    }

    /**
     * 備份資料
     */
    backupData() {
        const data = this.getAllRaw();
        if (data.length > 0) {
            const backupKey = `${this.storageKey}_backup_${Date.now()}`;
            storageUtils.set(backupKey, data);
            console.log(`資料已備份到: ${backupKey}`);
        }
    }

    /**
     * 遷移資料
     */
    migrateData(fromVersion, toVersion) {
        // 根據版本執行不同的遷移邏輯
        console.log(`正在遷移資料從 ${fromVersion} 到 ${toVersion}`);

        // 這裡可以加入具體的遷移邏輯
        // 例如：資料格式變更、新增欄位等

        console.log('資料遷移完成');
    }

    /**
     * 檢查是否有資料
     */
    hasData() {
        const data = storageUtils.get(this.storageKey);
        return data && Array.isArray(data) && data.length > 0;
    }

    /**
     * 載入預設資料
     */
    loadDefaultData() {
        const defaultData = DEFAULT_TODOS.map(todo => ({
            ...todo,
            id: stringUtils.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }));

        this.saveAll(defaultData);
        console.log('已載入預設資料');
    }

    /**
     * 取得所有待辦事項
     */
    getAll() {
        try {
            const data = storageUtils.get(this.storageKey, []);
            if (!Array.isArray(data)) {
                console.warn('儲存資料格式錯誤，重設為空陣列');
                return [];
            }

            // 驗證和清理資料
            return data.filter(todo => this.validateTodo(todo).isValid)
                      .map(todo => this.normalizeTodo(todo));
        } catch (error) {
            console.error('讀取待辦事項失敗:', error);
            return [];
        }
    }

    /**
     * 取得原始儲存資料
     */
    getAllRaw() {
        return storageUtils.get(this.storageKey, []);
    }

    /**
     * 根據 ID 取得待辦事項
     */
    getById(id) {
        if (!id) return null;

        try {
            const todos = this.getAll();
            return todos.find(todo => todo.id === id) || null;
        } catch (error) {
            console.error(`取得待辦事項 ${id} 失敗:`, error);
            return null;
        }
    }

    /**
     * 根據條件篩選待辦事項
     */
    filter(filters = {}) {
        try {
            let todos = this.getAll();

            // 按完成狀態篩選
            if (filters.completed !== undefined) {
                todos = todos.filter(todo => todo.completed === filters.completed);
            }

            // 按優先級篩選
            if (filters.priority) {
                todos = todos.filter(todo => todo.priority === filters.priority);
            }

            // 按日期範圍篩選
            if (filters.dateFrom) {
                const fromDate = new Date(filters.dateFrom);
                todos = todos.filter(todo => new Date(todo.createdAt) >= fromDate);
            }

            if (filters.dateTo) {
                const toDate = new Date(filters.dateTo);
                todos = todos.filter(todo => new Date(todo.createdAt) <= toDate);
            }

            // 按文字搜尋
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                todos = todos.filter(todo =>
                    todo.text.toLowerCase().includes(searchTerm)
                );
            }

            return todos;
        } catch (error) {
            console.error('篩選待辦事項失敗:', error);
            return [];
        }
    }

    /**
     * 新增待辦事項
     */
    add(todoData) {
        try {
            // 驗證資料
            const validation = this.validateTodo(todoData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // 建立新的待辦事項
            const newTodo = this.createTodo(todoData);

            // 取得現有資料並新增
            const todos = this.getAll();
            todos.push(newTodo);

            // 儲存所有資料
            if (this.saveAll(todos)) {
                this.updateLastModified();
                console.log(`成功新增待辦事項: ${newTodo.id}`);
                return newTodo;
            } else {
                throw new Error(ERROR_MESSAGES.SAVE_FAILED);
            }
        } catch (error) {
            console.error('新增待辦事項失敗:', error);
            throw error;
        }
    }

    /**
     * 更新待辦事項
     */
    update(id, updateData) {
        try {
            if (!id) {
                throw new Error(ERROR_MESSAGES.NOT_FOUND);
            }

            // 驗證更新資料
            const validation = this.validateTodo(updateData, true);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // 取得現有資料
            let todos = this.getAll();
            const index = todos.findIndex(todo => todo.id === id);

            if (index === -1) {
                throw new Error(ERROR_MESSAGES.NOT_FOUND);
            }

            // 更新資料
            const updatedTodo = {
                ...todos[index],
                ...updateData,
                id, // 確保 ID 不被覆蓋
                updatedAt: new Date().toISOString(),
            };

            todos[index] = updatedTodo;

            // 儲存所有資料
            if (this.saveAll(todos)) {
                this.updateLastModified();
                console.log(`成功更新待辦事項: ${id}`);
                return updatedTodo;
            } else {
                throw new Error(ERROR_MESSAGES.SAVE_FAILED);
            }
        } catch (error) {
            console.error(`更新待辦事項 ${id} 失敗:`, error);
            throw error;
        }
    }

    /**
     * 刪除待辦事項
     */
    delete(id) {
        try {
            if (!id) {
                throw new Error(ERROR_MESSAGES.NOT_FOUND);
            }

            // 取得現有資料
            let todos = this.getAll();
            const index = todos.findIndex(todo => todo.id === id);

            if (index === -1) {
                throw new Error(ERROR_MESSAGES.NOT_FOUND);
            }

            const deletedTodo = todos[index];
            todos.splice(index, 1);

            // 儲存所有資料
            if (this.saveAll(todos)) {
                this.updateLastModified();
                console.log(`成功刪除待辦事項: ${id}`);
                return deletedTodo;
            } else {
                throw new Error(ERROR_MESSAGES.SAVE_FAILED);
            }
        } catch (error) {
            console.error(`刪除待辦事項 ${id} 失敗:`, error);
            throw error;
        }
    }

    /**
     * 切換完成狀態
     */
    toggleComplete(id) {
        try {
            const todo = this.getById(id);
            if (!todo) {
                throw new Error(ERROR_MESSAGES.NOT_FOUND);
            }

            return this.update(id, {
                completed: !todo.completed,
                completedAt: !todo.completed ? new Date().toISOString() : null,
            });
        } catch (error) {
            console.error(`切換待辦事項 ${id} 完成狀態失敗:`, error);
            throw error;
        }
    }

    /**
     * 清除所有已完成的待辦事項
     */
    clearCompleted() {
        try {
            let todos = this.getAll();
            const completedTodos = todos.filter(todo => todo.completed);
            const activeTodos = todos.filter(todo => !todo.completed);

            if (this.saveAll(activeTodos)) {
                this.updateLastModified();
                console.log(`清除了 ${completedTodos.length} 個已完成的待辦事項`);
                return completedTodos;
            } else {
                throw new Error(ERROR_MESSAGES.SAVE_FAILED);
            }
        } catch (error) {
            console.error('清除已完成待辦事項失敗:', error);
            throw error;
        }
    }

    /**
     * 批次操作
     */
    batch(operations) {
        try {
            let todos = this.getAll();
            const results = [];

            for (const operation of operations) {
                const { type, data } = operation;

                switch (type) {
                    case 'add':
                        const newTodo = this.createTodo(data);
                        todos.push(newTodo);
                        results.push({ success: true, data: newTodo });
                        break;

                    case 'update':
                        const updateIndex = todos.findIndex(todo => todo.id === data.id);
                        if (updateIndex !== -1) {
                            todos[updateIndex] = {
                                ...todos[updateIndex],
                                ...data,
                                updatedAt: new Date().toISOString(),
                            };
                            results.push({ success: true, data: todos[updateIndex] });
                        } else {
                            results.push({ success: false, error: ERROR_MESSAGES.NOT_FOUND });
                        }
                        break;

                    case 'delete':
                        const deleteIndex = todos.findIndex(todo => todo.id === data.id);
                        if (deleteIndex !== -1) {
                            const deletedTodo = todos[deleteIndex];
                            todos.splice(deleteIndex, 1);
                            results.push({ success: true, data: deletedTodo });
                        } else {
                            results.push({ success: false, error: ERROR_MESSAGES.NOT_FOUND });
                        }
                        break;

                    default:
                        results.push({ success: false, error: '不支援的操作類型' });
                }
            }

            // 儲存所有變更
            if (this.saveAll(todos)) {
                this.updateLastModified();
                console.log(`批次操作完成: ${results.filter(r => r.success).length}/${results.length} 成功`);
                return results;
            } else {
                throw new Error(ERROR_MESSAGES.SAVE_FAILED);
            }
        } catch (error) {
            console.error('批次操作失敗:', error);
            throw error;
        }
    }

    /**
     * 儲存所有待辦事項
     */
    saveAll(todos) {
        try {
            if (!Array.isArray(todos)) {
                throw new Error('資料必須是陣列');
            }

            // 驗證所有待辦事項
            const validTodos = todos.filter(todo => this.validateTodo(todo).isValid);

            if (validTodos.length !== todos.length) {
                console.warn(`過濾了 ${todos.length - validTodos.length} 個無效的待辦事項`);
            }

            return storageUtils.set(this.storageKey, validTodos);
        } catch (error) {
            console.error('儲存待辦事項失敗:', error);
            return false;
        }
    }

    /**
     * 建立標準化的待辦事項物件
     */
    createTodo(data) {
        const now = new Date().toISOString();

        return {
            id: stringUtils.generateId(),
            text: stringUtils.normalizeWhitespace(data.text || ''),
            completed: Boolean(data.completed),
            priority: data.priority || APP_CONFIG.features.priorities.medium.value,
            createdAt: now,
            updatedAt: now,
            completedAt: data.completed ? now : null,
            // 擴展欄位
            tags: Array.isArray(data.tags) ? data.tags : [],
            dueDate: data.dueDate || null,
            description: data.description || '',
        };
    }

    /**
     * 標準化待辦事項物件
     */
    normalizeTodo(todo) {
        const normalized = { ...todo };

        // 確保必要欄位存在
        if (!normalized.id) {
            normalized.id = stringUtils.generateId();
        }

        if (typeof normalized.text !== 'string') {
            normalized.text = String(normalized.text || '');
        }

        if (typeof normalized.completed !== 'boolean') {
            normalized.completed = Boolean(normalized.completed);
        }

        if (!normalized.priority) {
            normalized.priority = APP_CONFIG.features.priorities.medium.value;
        }

        if (!normalized.createdAt) {
            normalized.createdAt = new Date().toISOString();
        }

        if (!normalized.updatedAt) {
            normalized.updatedAt = normalized.createdAt;
        }

        // 清理文字內容
        normalized.text = stringUtils.normalizeWhitespace(normalized.text);

        return normalized;
    }

    /**
     * 驗證待辦事項物件
     */
    validateTodo(todo, isUpdate = false) {
        const errors = [];

        if (!todo || typeof todo !== 'object') {
            errors.push('待辦事項必須是物件');
            return { isValid: false, errors };
        }

        // 檢查 ID
        if (!isUpdate && !todo.id) {
            errors.push('待辦事項必須有 ID');
        }

        // 檢查文字內容
        if (!isUpdate || todo.text !== undefined) {
            if (!todo.text || stringUtils.isEmpty(todo.text)) {
                errors.push(ERROR_MESSAGES.TODO_EMPTY);
            } else if (todo.text.length > 200) {
                errors.push(ERROR_MESSAGES.TOO_LONG);
            }
        }

        // 檢查優先級
        if (todo.priority && !APP_CONFIG.features.priorities[todo.priority]) {
            errors.push(ERROR_MESSAGES.INVALID_PRIORITY);
        }

        // 檢查日期格式
        const dateFields = ['createdAt', 'updatedAt', 'completedAt', 'dueDate'];
        dateFields.forEach(field => {
            if (todo[field] && isNaN(new Date(todo[field]).getTime())) {
                errors.push(`${field} 日期格式無效`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * 更新最後修改時間
     */
    updateLastModified() {
        storageUtils.set(this.lastModifiedKey, new Date().toISOString());
    }

    /**
     * 取得最後修改時間
     */
    getLastModified() {
        return storageUtils.get(this.lastModifiedKey);
    }

    /**
     * 取得統計資料
     */
    getStats() {
        try {
            const todos = this.getAll();

            return {
                total: todos.length,
                completed: todos.filter(todo => todo.completed).length,
                active: todos.filter(todo => !todo.completed).length,
                byPriority: {
                    high: todos.filter(todo => todo.priority === 'high').length,
                    medium: todos.filter(todo => todo.priority === 'medium').length,
                    low: todos.filter(todo => todo.priority === 'low').length,
                },
                lastModified: this.getLastModified(),
            };
        } catch (error) {
            console.error('取得統計資料失敗:', error);
            return {
                total: 0,
                completed: 0,
                active: 0,
                byPriority: { high: 0, medium: 0, low: 0 },
                lastModified: null,
            };
        }
    }

    /**
     * 匯出資料
     */
    export() {
        try {
            const data = {
                version: APP_CONFIG.version,
                exportedAt: new Date().toISOString(),
                todos: this.getAll(),
                stats: this.getStats(),
            };

            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `todo-list-${dateUtils.format(new Date(), 'short')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('資料匯出成功');
            return true;
        } catch (error) {
            console.error('匯出資料失敗:', error);
            return false;
        }
    }

    /**
     * 匯入資料
     */
    import(jsonData) {
        try {
            let data;

            if (typeof jsonData === 'string') {
                data = JSON.parse(jsonData);
            } else {
                data = jsonData;
            }

            if (!data.todos || !Array.isArray(data.todos)) {
                throw new Error('匯入資料格式錯誤');
            }

            // 備份現有資料
            this.backupData();

            // 驗證並清理匯入的資料
            const validTodos = data.todos
                .filter(todo => this.validateTodo(todo).isValid)
                .map(todo => this.normalizeTodo(todo));

            if (validTodos.length === 0) {
                throw new Error('沒有有效的待辦事項資料');
            }

            // 儲存匯入的資料
            if (this.saveAll(validTodos)) {
                this.updateLastModified();
                console.log(`成功匯入 ${validTodos.length} 個待辦事項`);
                return {
                    success: true,
                    imported: validTodos.length,
                    total: data.todos.length,
                };
            } else {
                throw new Error(ERROR_MESSAGES.SAVE_FAILED);
            }
        } catch (error) {
            console.error('匯入資料失敗:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * 清空所有資料
     */
    clear() {
        try {
            this.backupData();
            storageUtils.remove(this.storageKey);
            storageUtils.remove(this.lastModifiedKey);
            console.log('所有資料已清空');
            return true;
        } catch (error) {
            console.error('清空資料失敗:', error);
            return false;
        }
    }

    /**
     * 重設為預設資料
     */
    reset() {
        try {
            this.clear();
            this.loadDefaultData();
            console.log('資料已重設為預設值');
            return true;
        } catch (error) {
            console.error('重設資料失敗:', error);
            return false;
        }
    }
}

// 建立並匯出單例實例
const storageManager = new StorageManager();

export default storageManager;