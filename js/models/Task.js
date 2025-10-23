/**
 * 任務實體類別
 * 定義任務的完整數據結構和相關方法
 */

import { stringUtils, dateUtils } from '../utils/utils.js';

/**
 * 任務類別
 * 代表一個完整的任務實體
 */
export class Task {
    /**
     * 建構函數
     * @param {Object} data - 任務資料
     */
    constructor(data = {}) {
        this.id = data.id || stringUtils.generateId();
        this.title = data.title || '';
        this.description = data.description || '';
        this.completed = Boolean(data.completed);
        this.priority = data.priority || 'medium';
        this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
        this.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        this.completedAt = data.completedAt ? new Date(data.completedAt) : null;
        this.tags = Array.isArray(data.tags) ? [...data.tags] : [];
        this.category = data.category || 'general';

        // 鎖定版本控制欄位
        this._version = data._version || 1;
        this._deleted = Boolean(data._deleted) || false;
    }

    /**
     * 取得任務的 JSON 表示
     * @returns {Object} 任務的純物件表示
     */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            completed: this.completed,
            priority: this.priority,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            dueDate: this.dueDate ? this.dueDate.toISOString() : null,
            completedAt: this.completedAt ? this.completedAt.toISOString() : null,
            tags: [...this.tags],
            category: this.category,
            _version: this._version,
            _deleted: this._deleted,
        };
    }

    /**
     * 從 JSON 物件建立任務實例
     * @param {Object} json - JSON 物件
     * @returns {Task} 任務實例
     */
    static fromJSON(json) {
        return new Task(json);
    }

    /**
     * 更新任務資料
     * @param {Object} updates - 更新資料
     * @returns {Task} 更新後的任務實例
     */
    update(updates) {
        const updatedTask = new Task({ ...this.toJSON(), ...updates });
        updatedTask.updatedAt = new Date();
        updatedTask._version += 1;

        // 如果標記為完成，設定完成時間
        if (updates.completed && !this.completed) {
            updatedTask.completedAt = new Date();
        } else if (updates.completed === false && this.completed) {
            updatedTask.completedAt = null;
        }

        return updatedTask;
    }

    /**
     * 切換完成狀態
     * @returns {Task} 更新後的任務實例
     */
    toggleComplete() {
        return this.update({
            completed: !this.completed,
            completedAt: !this.completed ? new Date() : null,
        });
    }

    /**
     * 檢查任務是否逾期
     * @returns {boolean} 是否逾期
     */
    isOverdue() {
        if (!this.dueDate || this.completed) {
            return false;
        }
        return new Date() > this.dueDate;
    }

    /**
     * 檢查任務即將到期（在指定天數內）
     * @param {number} days - 天數，預設 3 天
     * @returns {boolean} 是否即將到期
     */
    isDueSoon(days = 3) {
        if (!this.dueDate || this.completed) {
            return false;
        }
        const now = new Date();
        const dueDate = new Date(this.dueDate);
        const diffTime = dueDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= days;
    }

    /**
     * 取得任務的年齡（建立至今的天數）
     * @returns {number} 天數
     */
    getAgeInDays() {
        const now = new Date();
        const diffTime = now - this.createdAt;
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * 取得任務優先級的數值
     * @returns {number} 優先級數值（1=低, 2=中, 3=高）
     */
    getPriorityValue() {
        const priorityMap = { low: 1, medium: 2, high: 3 };
        return priorityMap[this.priority] || 2;
    }

    /**
     * 添加標籤
     * @param {string} tag - 標籤
     * @returns {Task} 更新後的任務實例
     */
    addTag(tag) {
        if (!tag || typeof tag !== 'string') {
            return this;
        }

        const normalizedTag = tag.trim().toLowerCase();
        if (!this.tags.includes(normalizedTag)) {
            return this.update({
                tags: [...this.tags, normalizedTag],
            });
        }
        return this;
    }

    /**
     * 移除標籤
     * @param {string} tag - 標籤
     * @returns {Task} 更新後的任務實例
     */
    removeTag(tag) {
        if (!tag || typeof tag !== 'string') {
            return this;
        }

        const normalizedTag = tag.trim().toLowerCase();
        const newTags = this.tags.filter(t => t !== normalizedTag);

        if (newTags.length !== this.tags.length) {
            return this.update({ tags: newTags });
        }
        return this;
    }

    /**
     * 檢查是否包含指定標籤
     * @param {string} tag - 標籤
     * @returns {boolean} 是否包含標籤
     */
    hasTag(tag) {
        if (!tag || typeof tag !== 'string') {
            return false;
        }
        return this.tags.includes(tag.trim().toLowerCase());
    }

    /**
     * 檢查任務是否符合搜尋條件
     * @param {string} searchTerm - 搜尋詞
     * @returns {boolean} 是否符合條件
     */
    matchesSearch(searchTerm) {
        if (!searchTerm || typeof searchTerm !== 'string') {
            return true;
        }

        const term = searchTerm.toLowerCase();
        return (
            this.title.toLowerCase().includes(term) ||
            this.description.toLowerCase().includes(term) ||
            this.category.toLowerCase().includes(term) ||
            this.tags.some(tag => tag.includes(term))
        );
    }

    /**
     * 檢查任務是否符合篩選條件
     * @param {Object} filters - 篩選條件
     * @returns {boolean} 是否符合條件
     */
    matchesFilters(filters = {}) {
        // 完成狀態篩選
        if (filters.completed !== undefined && this.completed !== filters.completed) {
            return false;
        }

        // 優先級篩選
        if (filters.priority && this.priority !== filters.priority) {
            return false;
        }

        // 分類篩選
        if (filters.category && this.category !== filters.category) {
            return false;
        }

        // 標籤篩選
        if (filters.tags && filters.tags.length > 0) {
            const hasAllTags = filters.tags.every(tag => this.hasTag(tag));
            if (!hasAllTags) {
                return false;
            }
        }

        // 日期範圍篩選
        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            if (this.createdAt < fromDate) {
                return false;
            }
        }

        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            if (this.createdAt > toDate) {
                return false;
            }
        }

        // 截止日期範圍篩選
        if (filters.dueDateFrom && this.dueDate) {
            const fromDate = new Date(filters.dueDateFrom);
            if (this.dueDate < fromDate) {
                return false;
            }
        }

        if (filters.dueDateTo && this.dueDate) {
            const toDate = new Date(filters.dueDateTo);
            if (this.dueDate > toDate) {
                return false;
            }
        }

        // 逾期狀態篩選
        if (filters.overdue !== undefined && this.isOverdue() !== filters.overdue) {
            return false;
        }

        return true;
    }

    /**
     * 複製任務
     * @returns {Task} 新的任務實例
     */
    clone() {
        return new Task(this.toJSON());
    }

    /**
     * 取得任務的摘要資訊
     * @returns {Object} 摘要資訊
     */
    getSummary() {
        return {
            id: this.id,
            title: this.title,
            completed: this.completed,
            priority: this.priority,
            category: this.category,
            tags: [...this.tags],
            isOverdue: this.isOverdue(),
            isDueSoon: this.isDueSoon(),
            ageInDays: this.getAgeInDays(),
        };
    }

    /**
     * 比較兩個任務
     * @param {Task} other - 另一個任務
     * @param {string} sortBy - 排序欄位
     * @returns {number} 比較結果
     */
    compare(other, sortBy = 'createdAt') {
        switch (sortBy) {
            case 'priority':
                return other.getPriorityValue() - this.getPriorityValue();
            case 'title':
                return this.title.localeCompare(other.title);
            case 'dueDate':
                if (!this.dueDate && !other.dueDate) return 0;
                if (!this.dueDate) return 1;
                if (!other.dueDate) return -1;
                return this.dueDate - other.dueDate;
            case 'updatedAt':
                return other.updatedAt - this.updatedAt;
            case 'createdAt':
            default:
                return other.createdAt - this.createdAt;
        }
    }

    /**
     * 字串化表示
     * @returns {string} 任務的字串表示
     */
    toString() {
        const status = this.completed ? '✓' : '○';
        const priority = `[${this.priority.toUpperCase()}]`;
        const title = this.title || '(無標題)';
        return `${status} ${priority} ${title}`;
    }
}

export default Task;