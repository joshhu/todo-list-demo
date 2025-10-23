/**
 * UI 管理模組
 * 負責使用者介面的渲染、更新和互動處理
 */

import { APP_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/settings.js';
import { dateUtils, stringUtils, domUtils, eventUtils, performanceUtils } from './utils.js';
import storageManager from './storage.js';

/**
 * UI 管理器類別
 */
class UIManager {
    constructor() {
        this.elements = {};
        this.currentFilter = 'all';
        this.editingTodoId = null;
        this.notifications = [];

        // 初始化
        this.initialize();
    }

    /**
     * 初始化 UI 管理器
     */
    initialize() {
        try {
            // 快取 DOM 元素
            this.cacheElements();

            // 繫結事件監聽器
            this.bindEvents();

            // 初始化主題
            this.initializeTheme();

            // 初始化載入狀態
            this.setLoading(false);

            console.log('UI 管理器初始化完成');
        } catch (error) {
            console.error('UI 管理器初始化失敗:', error);
            this.showNotification('應用程式初始化失敗', 'error');
        }
    }

    /**
     * 快取 DOM 元素
     */
    cacheElements() {
        this.elements = {
            // 表單相關
            app: domUtils.query('#app'),
            todoForm: domUtils.query('#todo-form'),
            todoInput: domUtils.query('#todo-input'),
            todoSubmitBtn: domUtils.query('.todo-submit-btn'),

            // 列表相關
            todoList: domUtils.query('#todo-list'),
            emptyState: domUtils.query('#empty-state'),

            // 控制相關
            filterButtons: domUtils.queryAll('.filter-btn'),
            activeCount: domUtils.query('#active-count'),
            clearCompletedBtn: domUtils.query('#clear-completed'),

            // 通知相關
            notificationContainer: domUtils.query('#notification-container'),

            // 載入相關
            loadingOverlay: domUtils.query('#loading-overlay'),
        };

        // 驗證必要元素是否存在
        const requiredElements = ['app', 'todoForm', 'todoInput', 'todoList'];
        const missing = requiredElements.filter(key => !this.elements[key]);

        if (missing.length > 0) {
            throw new Error(`缺少必要的 DOM 元素: ${missing.join(', ')}`);
        }
    }

    /**
     * 繫結事件監聽器
     */
    bindEvents() {
        // 表單提交事件
        eventUtils.on(this.elements.todoForm, 'submit', (event) => {
            event.preventDefault();
            this.handleAddTodo();
        });

        // 篩選按鈕事件
        this.elements.filterButtons.forEach(button => {
            eventUtils.on(button, 'click', () => {
                this.handleFilterChange(button.dataset.filter);
            });
        });

        // 清除已完成按鈕事件
        if (this.elements.clearCompletedBtn) {
            eventUtils.on(this.elements.clearCompletedBtn, 'click', () => {
                this.handleClearCompleted();
            });
        }

        // 待辦事項列表事件委託
        eventUtils.delegate(this.elements.todoList, '.todo-checkbox', 'click', (event) => {
            const todoId = event.target.closest('.todo-item').dataset.id;
            this.handleToggleComplete(todoId);
        });

        eventUtils.delegate(this.elements.todoList, '.todo-edit-btn', 'click', (event) => {
            const todoId = event.target.closest('.todo-item').dataset.id;
            this.handleStartEdit(todoId);
        });

        eventUtils.delegate(this.elements.todoList, '.todo-delete-btn', 'click', (event) => {
            const todoId = event.target.closest('.todo-item').dataset.id;
            this.handleDeleteTodo(todoId);
        });

        // 鍵盤事件
        eventUtils.on(document, 'keydown', (event) => {
            this.handleKeyboardShortcut(event);
        });

        // 窗口事件
        eventUtils.on(window, 'resize', performanceUtils.debounce(() => {
            this.handleResize();
        }, 250));

        // 儲存變更事件
        eventUtils.on(window, 'storage', (event) => {
            if (event.key === `${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.key}`) {
                this.render();
            }
        });
    }

    /**
     * 初始化主題
     */
    initializeTheme() {
        const theme = localStorage.getItem('todo_theme') || APP_CONFIG.ui.theme.default;
        this.setTheme(theme);
    }

    /**
     * 設定主題
     */
    setTheme(theme) {
        const body = document.body;

        // 移除所有主題類別
        body.classList.remove('theme-light', 'theme-dark');

        if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            body.classList.add('theme-dark');
        } else {
            body.classList.add('theme-light');
        }

        localStorage.setItem('todo_theme', theme);
    }

    /**
     * 設定載入狀態
     */
    setLoading(isLoading) {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.setAttribute('aria-hidden', !isLoading);
        }
    }

    /**
     * 渲染整個應用程式 UI
     */
    render() {
        try {
            this.setLoading(true);

            // 取得待辦事項資料
            const todos = this.getFilteredTodos();

            // 渲染待辦事項列表
            this.renderTodoList(todos);

            // 更新統計資訊
            this.updateStats();

            // 更新空狀態顯示
            this.updateEmptyState(todos.length);

            // 更新清除按鈕狀態
            this.updateClearButton();

        } catch (error) {
            console.error('渲染 UI 失敗:', error);
            this.showNotification('渲染介面時發生錯誤', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 取得篩選後的待辦事項
     */
    getFilteredTodos() {
        const allTodos = storageManager.getAll();

        switch (this.currentFilter) {
            case 'active':
                return allTodos.filter(todo => !todo.completed);
            case 'completed':
                return allTodos.filter(todo => todo.completed);
            default:
                return allTodos;
        }
    }

    /**
     * 渲染待辦事項列表
     */
    renderTodoList(todos) {
        if (!this.elements.todoList) return;

        // 清空列表
        this.elements.todoList.textContent = '';

        // 排序待辦事項
        const sortedTodos = this.sortTodos(todos);

        // 渲染每個待辦事項
        sortedTodos.forEach(todo => {
            const todoElement = this.createTodoElement(todo);
            this.elements.todoList.appendChild(todoElement);
        });
    }

    /**
     * 排序待辦事項
     */
    sortTodos(todos) {
        return [...todos].sort((a, b) => {
            // 未完成的排前面
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }

            // 按優先級排序
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) {
                return priorityDiff;
            }

            // 按建立時間排序（新的排前面）
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }

    /**
     * 建立待辦事項元素
     */
    createTodoElement(todo) {
        const isEditing = this.editingTodoId === todo.id;

        const element = domUtils.createElement('li', {
            className: `todo-item ${todo.completed ? 'completed' : ''} ${isEditing ? 'editing' : ''}`,
            'data-id': todo.id,
            'data-completed': todo.completed,
        });

        if (isEditing) {
            this.appendEditTodoContent(element, todo);
        } else {
            this.appendTodoContent(element, todo);
        }

        return element;
    }

    /**
     * 附加待辦事項內容
     */
    appendTodoContent(element, todo) {
        const priorityClass = `priority-${todo.priority}`;
        const priorityLabel = APP_CONFIG.features.priorities[todo.priority]?.label || todo.priority;
        const relativeTime = dateUtils.getRelativeTime(new Date(todo.createdAt));

        // 核取方塊
        const checkbox = domUtils.createElement('div', {
            className: `todo-checkbox ${todo.completed ? 'checked' : ''}`,
            role: 'button',
            tabIndex: '0',
            'aria-label': todo.completed ? '標記為未完成' : '標記為已完成',
            'aria-checked': todo.completed,
        });
        element.appendChild(checkbox);

        // 內容區域
        const content = domUtils.createElement('div', { className: 'todo-content' });

        // 文字內容
        const text = domUtils.createElement('div', { className: 'todo-text' });
        text.textContent = todo.text;
        content.appendChild(text);

        // 元資料
        const meta = domUtils.createElement('div', { className: 'todo-meta' });

        const date = domUtils.createElement('span', { className: 'todo-date' });
        date.textContent = relativeTime;
        meta.appendChild(date);

        const priority = domUtils.createElement('span', {
            className: `todo-priority ${priorityClass}`,
        });
        priority.textContent = priorityLabel;
        meta.appendChild(priority);

        content.appendChild(meta);
        element.appendChild(content);

        // 操作按鈕
        const actions = domUtils.createElement('div', { className: 'todo-actions' });

        const editBtn = domUtils.createElement('button', {
            className: 'todo-action-btn edit',
            'aria-label': '編輯待辦事項',
            title: '編輯',
        });
        editBtn.textContent = '✏️';
        actions.appendChild(editBtn);

        const deleteBtn = domUtils.createElement('button', {
            className: 'todo-action-btn delete',
            'aria-label': '刪除待辦事項',
            title: '刪除',
        });
        deleteBtn.textContent = '🗑️';
        actions.appendChild(deleteBtn);

        element.appendChild(actions);
    }

    /**
     * 附加編輯待辦事項內容
     */
    appendEditTodoContent(element, todo) {
        const editForm = domUtils.createElement('div', { className: 'todo-edit-form' });

        // 輸入框
        const input = domUtils.createElement('input', {
            type: 'text',
            className: 'todo-edit-input',
            value: todo.text,
            placeholder: '待辦事項內容...',
            'aria-label': '編輯待辦事項',
        });
        editForm.appendChild(input);

        // 優先級選擇
        const prioritySelect = domUtils.createElement('select', {
            className: 'todo-edit-priority',
            'aria-label': '選擇優先級',
        });

        const priorities = [
            { value: 'low', label: '低' },
            { value: 'medium', label: '中' },
            { value: 'high', label: '高' },
        ];

        priorities.forEach(({ value, label }) => {
            const option = domUtils.createElement('option', { value });
            option.textContent = label;
            if (todo.priority === value) {
                option.selected = true;
            }
            prioritySelect.appendChild(option);
        });

        editForm.appendChild(prioritySelect);

        // 操作按鈕
        const editActions = domUtils.createElement('div', { className: 'todo-edit-actions' });

        const saveBtn = domUtils.createElement('button', {
            className: 'todo-edit-save',
            'aria-label': '儲存編輯',
        });
        saveBtn.textContent = '儲存';
        editActions.appendChild(saveBtn);

        const cancelBtn = domUtils.createElement('button', {
            className: 'todo-edit-cancel',
            'aria-label': '取消編輯',
        });
        cancelBtn.textContent = '取消';
        editActions.appendChild(cancelBtn);

        editForm.appendChild(editActions);
        element.appendChild(editForm);
    }

    /**
     * 更新統計資訊
     */
    updateStats() {
        if (!this.elements.activeCount) return;

        const activeTodos = storageManager.getAll().filter(todo => !todo.completed);
        this.elements.activeCount.textContent = activeTodos.length;
    }

    /**
     * 更新空狀態顯示
     */
    updateEmptyState(todoCount) {
        if (!this.elements.emptyState || !this.elements.todoList) return;

        const hasTodos = todoCount > 0;
        this.elements.emptyState.style.display = hasTodos ? 'none' : 'block';
        this.elements.todoList.style.display = hasTodos ? 'block' : 'none';
    }

    /**
     * 更新清除按鈕狀態
     */
    updateClearButton() {
        if (!this.elements.clearCompletedBtn) return;

        const completedTodos = storageManager.getAll().filter(todo => todo.completed);
        const hasCompleted = completedTodos.length > 0;

        this.elements.clearCompletedBtn.disabled = !hasCompleted;
        this.elements.clearCompletedBtn.style.display = hasCompleted ? 'block' : 'none';
    }

    /**
     * 處理新增待辦事項
     */
    async handleAddTodo() {
        try {
            const input = this.elements.todoInput;
            const text = input.value.trim();

            if (!text) {
                this.showNotification(ERROR_MESSAGES.TODO_EMPTY, 'warning');
                return;
            }

            if (text.length > 200) {
                this.showNotification(ERROR_MESSAGES.TOO_LONG, 'warning');
                return;
            }

            // 建立新待辦事項
            const todoData = {
                text,
                priority: 'medium',
            };

            const newTodo = await storageManager.add(todoData);

            // 清空輸入框
            input.value = '';
            input.focus();

            // 重新渲染
            this.render();

            // 顯示成功通知
            this.showNotification(SUCCESS_MESSAGES.TODO_ADDED, 'success');

        } catch (error) {
            console.error('新增待辦事項失敗:', error);
            this.showNotification(error.message || ERROR_MESSAGES.GENERIC, 'error');
        }
    }

    /**
     * 處理篩選變更
     */
    handleFilterChange(filter) {
        this.currentFilter = filter;

        // 更新按鈕狀態
        this.elements.filterButtons.forEach(button => {
            const isActive = button.dataset.filter === filter;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive);
        });

        // 重新渲染
        this.render();
    }

    /**
     * 處理切換完成狀態
     */
    async handleToggleComplete(todoId) {
        try {
            await storageManager.toggleComplete(todoId);
            this.render();
        } catch (error) {
            console.error('切換完成狀態失敗:', error);
            this.showNotification(error.message || ERROR_MESSAGES.GENERIC, 'error');
        }
    }

    /**
     * 處理開始編輯
     */
    handleStartEdit(todoId) {
        // 如果已在編輯其他項目，先取消
        if (this.editingTodoId && this.editingTodoId !== todoId) {
            this.cancelEdit();
        }

        this.editingTodoId = todoId;
        this.render();

        // 聚焦到輸入框
        setTimeout(() => {
            const editInput = domUtils.query(`.todo-item[data-id="${todoId}"] .todo-edit-input`);
            if (editInput) {
                editInput.focus();
                editInput.select();
            }
        }, 0);

        // 繫結編輯事件
        this.bindEditEvents(todoId);
    }

    /**
     * 繫結編輯事件
     */
    bindEditEvents(todoId) {
        const todoElement = domUtils.query(`.todo-item[data-id="${todoId}"]`);
        if (!todoElement) return;

        const saveBtn = domUtils.query('.todo-edit-save', todoElement);
        const cancelBtn = domUtils.query('.todo-edit-cancel', todoElement);
        const input = domUtils.query('.todo-edit-input', todoElement);

        if (saveBtn) {
            eventUtils.on(saveBtn, 'click', () => this.saveEdit(todoId));
        }

        if (cancelBtn) {
            eventUtils.on(cancelBtn, 'click', () => this.cancelEdit());
        }

        if (input) {
            eventUtils.on(input, 'keydown', (event) => {
                if (event.key === 'Enter') {
                    this.saveEdit(todoId);
                } else if (event.key === 'Escape') {
                    this.cancelEdit();
                }
            });
        }
    }

    /**
     * 儲存編輯
     */
    async saveEdit(todoId) {
        try {
            const todoElement = domUtils.query(`.todo-item[data-id="${todoId}"]`);
            if (!todoElement) return;

            const input = domUtils.query('.todo-edit-input', todoElement);
            const prioritySelect = domUtils.query('.todo-edit-priority', todoElement);

            const text = input?.value?.trim();
            const priority = prioritySelect?.value || 'medium';

            if (!text) {
                this.showNotification(ERROR_MESSAGES.TODO_EMPTY, 'warning');
                return;
            }

            await storageManager.update(todoId, { text, priority });
            this.editingTodoId = null;
            this.render();
            this.showNotification(SUCCESS_MESSAGES.TODO_UPDATED, 'success');

        } catch (error) {
            console.error('儲存編輯失敗:', error);
            this.showNotification(error.message || ERROR_MESSAGES.GENERIC, 'error');
        }
    }

    /**
     * 取消編輯
     */
    cancelEdit() {
        this.editingTodoId = null;
        this.render();
    }

    /**
     * 處理刪除待辦事項
     */
    async handleDeleteTodo(todoId) {
        try {
            // 確認刪除
            if (!confirm('確定要刪除這個待辦事項嗎？')) {
                return;
            }

            await storageManager.delete(todoId);
            this.render();
            this.showNotification(SUCCESS_MESSAGES.TODO_DELETED, 'success');

        } catch (error) {
            console.error('刪除待辦事項失敗:', error);
            this.showNotification(error.message || ERROR_MESSAGES.GENERIC, 'error');
        }
    }

    /**
     * 處理清除已完成
     */
    async handleClearCompleted() {
        try {
            const completedCount = storageManager.getAll().filter(todo => todo.completed).length;

            if (completedCount === 0) {
                this.showNotification('沒有已完成的待辦事項', 'info');
                return;
            }

            if (!confirm(`確定要清除 ${completedCount} 個已完成的待辦事項嗎？`)) {
                return;
            }

            await storageManager.clearCompleted();
            this.render();
            this.showNotification(SUCCESS_MESSAGES.ALL_COMPLETED_CLEARED, 'success');

        } catch (error) {
            console.error('清除已完成待辦事項失敗:', error);
            this.showNotification(error.message || ERROR_MESSAGES.GENERIC, 'error');
        }
    }

    /**
     * 處理鍵盤快捷鍵
     */
    handleKeyboardShortcut(event) {
        // 如果正在輸入，不處理快捷鍵
        if (event.target.tagName === 'INPUT' && event.target.type === 'text') {
            return;
        }

        const shortcuts = APP_CONFIG.features.keyboardShortcuts.shortcuts;
        const key = this.getShortcutKey(event);

        if (shortcuts[key]) {
            event.preventDefault();
            this.executeShortcut(shortcuts[key]);
        }
    }

    /**
     * 取得快捷鍵字串
     */
    getShortcutKey(event) {
        const parts = [];
        if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');

        if (event.key.length === 1) {
            parts.push(event.key.toUpperCase());
        } else {
            parts.push(event.key);
        }

        return parts.join('+');
    }

    /**
     * 執行快捷鍵動作
     */
    executeShortcut(action) {
        switch (action) {
            case 'newTodo':
                this.elements.todoInput?.focus();
                break;
            case 'saveTodo':
                if (this.editingTodoId) {
                    this.saveEdit(this.editingTodoId);
                }
                break;
            case 'cancelEdit':
                this.cancelEdit();
                break;
            default:
                console.log('未實現的快捷鍵動作:', action);
        }
    }

    /**
     * 處理窗口大小變更
     */
    handleResize() {
        // 可以在這裡添加響應式邏輯
        console.log('窗口大小已變更');
    }

    /**
     * 顯示通知
     */
    showNotification(message, type = 'info', duration = null) {
        if (!this.elements.notificationContainer) return;

        const notification = domUtils.createElement('div', {
            className: `notification ${type}`,
            role: 'alert',
            'aria-live': 'polite',
        });

        const content = domUtils.createElement('div', { className: 'notification-content' });

        const icon = this.getNotificationIcon(type);
        content.appendChild(icon);

        const text = domUtils.createElement('div', { className: 'notification-text' });
        text.textContent = message;
        content.appendChild(text);

        // 添加關閉按鈕
        const closeBtn = domUtils.createElement('button', {
            className: 'notification-close',
            'aria-label': '關閉通知',
        });
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => this.removeNotification(notification));

        content.appendChild(closeBtn);
        notification.appendChild(content);

        // 添加到容器
        this.elements.notificationContainer.appendChild(notification);

        // 設定自動移除
        const autoDuration = duration || APP_CONFIG.ui.notifications.duration;
        setTimeout(() => {
            this.removeNotification(notification);
        }, autoDuration);

        // 限制通知數量
        this.limitNotifications();
    }

    /**
     * 取得通知圖示
     */
    getNotificationIcon(type) {
        const iconMap = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
        };

        const icon = domUtils.createElement('span', { className: 'notification-icon' });
        icon.textContent = iconMap[type] || 'ℹ️';
        return icon;
    }

    /**
     * 移除通知
     */
    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    /**
     * 限制通知數量
     */
    limitNotifications() {
        const maxCount = APP_CONFIG.ui.notifications.maxCount;
        const notifications = this.elements.notificationContainer.children;

        while (notifications.length > maxCount) {
            this.removeNotification(notifications[0]);
        }
    }

    /**
     * 清空所有通知
     */
    clearNotifications() {
        if (this.elements.notificationContainer) {
            this.elements.notificationContainer.textContent = '';
        }
    }

    /**
     * 取得當前篩選器
     */
    getCurrentFilter() {
        return this.currentFilter;
    }

    /**
     * 設定篩選器
     */
    setFilter(filter) {
        this.handleFilterChange(filter);
    }

    /**
     * 聚焦到輸入框
     */
    focusInput() {
        if (this.elements.todoInput) {
            this.elements.todoInput.focus();
        }
    }

    /**
     * 清空輸入框
     */
    clearInput() {
        if (this.elements.todoInput) {
            this.elements.todoInput.value = '';
        }
    }

    /**
     * 取得輸入框內容
     */
    getInputValue() {
        return this.elements.todoInput?.value?.trim() || '';
    }

    /**
     * 銷毀 UI 管理器
     */
    destroy() {
        this.clearNotifications();
        this.editingTodoId = null;
        console.log('UI 管理器已銷毀');
    }
}

// 建立並匯出單例實例
const uiManager = new UIManager();

export default uiManager;