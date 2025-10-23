/**
 * 工具函數模組
 * 提供通用的工具函數和輔助方法
 */

import { APP_CONFIG, VALIDATION_RULES } from '../config/settings.js';

/**
 * 日期時間相關工具函數
 */
export const dateUtils = {
    /**
     * 格式化日期
     * @param {Date|string|number} date - 日期
     * @param {string} format - 格式 ('full', 'short', 'time', 'relative')
     * @param {string} locale - 語言代碼
     * @returns {string} 格式化後的日期字串
     */
    format(date, format = 'short', locale = 'zh-TW') {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return '無效日期';
        }

        const options = {
            full: {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                weekday: 'long',
            },
            short: {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            },
            time: {
                hour: '2-digit',
                minute: '2-digit',
            },
            relative: {},
        };

        if (format === 'relative') {
            return this.getRelativeTime(dateObj, locale);
        }

        return dateObj.toLocaleDateString(locale, options[format] || options.short);
    },

    /**
     * 取得相對時間
     * @param {Date} date - 日期
     * @param {string} locale - 語言代碼
     * @returns {string} 相對時間字串
     */
    getRelativeTime(date, locale = 'zh-TW') {
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

        if (diffSecs < 60) {
            return rtf.format(-diffSecs, 'second');
        } else if (diffMins < 60) {
            return rtf.format(-diffMins, 'minute');
        } else if (diffHours < 24) {
            return rtf.format(-diffHours, 'hour');
        } else if (diffDays < 7) {
            return rtf.format(-diffDays, 'day');
        } else {
            return this.format(date, 'short', locale);
        }
    },

    /**
     * 檢查日期是否為今天
     * @param {Date} date - 日期
     * @returns {boolean} 是否為今天
     */
    isToday(date) {
        const today = new Date();
        const checkDate = new Date(date);
        return (
            checkDate.getDate() === today.getDate() &&
            checkDate.getMonth() === today.getMonth() &&
            checkDate.getFullYear() === today.getFullYear()
        );
    },

    /**
     * 檢查日期是否為昨天
     * @param {Date} date - 日期
     * @returns {boolean} 是否為昨天
     */
    isYesterday(date) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const checkDate = new Date(date);
        return (
            checkDate.getDate() === yesterday.getDate() &&
            checkDate.getMonth() === yesterday.getMonth() &&
            checkDate.getFullYear() === yesterday.getFullYear()
        );
    },
};

/**
 * 字串相關工具函數
 */
export const stringUtils = {
    /**
     * 截斷字串
     * @param {string} str - 原始字串
     * @param {number} maxLength - 最大長度
     * @param {string} suffix - 後綴
     * @returns {string} 截斷後的字串
     */
    truncate(str, maxLength = 50, suffix = '...') {
        if (!str || str.length <= maxLength) {
            return str;
        }
        return str.substring(0, maxLength - suffix.length) + suffix;
    },

    /**
     * 首字母大寫
     * @param {string} str - 字串
     * @returns {string} 首字母大寫的字串
     */
    capitalize(str) {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    /**
     * 轉義 HTML 特殊字元
     * @param {string} str - 字串
     * @returns {string} 轉義後的字串
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * 產生隨機 ID
     * @param {number} length - ID 長度
     * @returns {string} 隨機 ID
     */
    generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * 檢查字串是否為空或只包含空白字元
     * @param {string} str - 字串
     * @returns {boolean} 是否為空
     */
    isEmpty(str) {
        return !str || str.trim().length === 0;
    },

    /**
     * 移除多餘的空白字元
     * @param {string} str - 字串
     * @returns {string} 清理後的字串
     */
    normalizeWhitespace(str) {
        return str.replace(/\s+/g, ' ').trim();
    },
};

/**
 * 陣列相關工具函數
 */
export const arrayUtils = {
    /**
     * 移除重複元素
     * @param {Array} arr - 陣列
     * @param {Function} keyFn - 鍵值函數
     * @returns {Array} 去重後的陣列
     */
    unique(arr, keyFn = (item) => item) {
        const seen = new Set();
        return arr.filter((item) => {
            const key = keyFn(item);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    },

    /**
     * 陣列分組
     * @param {Array} arr - 陣列
     * @param {Function|string} keyFn - 分組鍵值函數或屬性名
     * @returns {Object} 分組後的物件
     */
    groupBy(arr, keyFn) {
        const key = typeof keyFn === 'function' ? keyFn : (item) => item[keyFn];
        return arr.reduce((groups, item) => {
            const groupKey = key(item);
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
            return groups;
        }, {});
    },

    /**
     * 陣列排序
     * @param {Array} arr - 陣列
     * @param {Function|string} keyFn - 排序鍵值函數或屬性名
     * @param {string} order - 排序順序 ('asc' | 'desc')
     * @returns {Array} 排序後的陣列
     */
    sortBy(arr, keyFn, order = 'asc') {
        const key = typeof keyFn === 'function' ? keyFn : (item) => item[keyFn];
        const direction = order === 'desc' ? -1 : 1;
        return [...arr].sort((a, b) => {
            const aKey = key(a);
            const bKey = key(b);
            if (aKey < bKey) return -direction;
            if (aKey > bKey) return direction;
            return 0;
        });
    },
};

/**
 * 物件相關工具函數
 */
export const objectUtils = {
    /**
     * 深度合併物件
     * @param {Object} target - 目標物件
     * @param {...Object} sources - 來源物件
     * @returns {Object} 合併後的物件
     */
    deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    },

    /**
     * 深度複製物件
     * @param {any} obj - 要複製的物件
     * @returns {any} 複製後的物件
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
        return obj;
    },

    /**
     * 檢查是否為物件
     * @param {any} obj - 要檢查的值
     * @returns {boolean} 是否為物件
     */
    isObject(obj) {
        return obj && typeof obj === 'object' && !Array.isArray(obj);
    },

    /**
     * 檢查物件是否為空
     * @param {Object} obj - 物件
     * @returns {boolean} 是否為空
     */
    isEmpty(obj) {
        if (obj == null) return true;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    },
};

/**
 * 驗證相關工具函數
 */
export const validationUtils = {
    /**
     * 驗證待辦事項資料
     * @param {Object} todo - 待辦事項物件
     * @returns {Object} 驗證結果
     */
    validateTodo(todo) {
        const errors = [];
        const rules = VALIDATION_RULES.todo;

        // 驗證文字內容
        if (rules.text.required && (!todo.text || stringUtils.isEmpty(todo.text))) {
            errors.push('待辦事項內容不能為空');
        }

        if (todo.text) {
            const text = todo.text.trim();
            if (text.length < rules.text.minLength) {
                errors.push(`內容長度至少需要 ${rules.text.minLength} 個字元`);
            }
            if (text.length > rules.text.maxLength) {
                errors.push(`內容長度不能超過 ${rules.text.maxLength} 個字元`);
            }
            if (!rules.text.pattern.test(text)) {
                errors.push('內容格式無效');
            }
        }

        // 驗證優先級
        if (todo.priority && rules.priority.allowedValues && !rules.priority.allowedValues.includes(todo.priority)) {
            errors.push(`優先級必須是以下其中之一: ${rules.priority.allowedValues.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    },
};

/**
 * 效能相關工具函數
 */
export const performanceUtils = {
    /**
     * 防抖函數
     * @param {Function} func - 要防抖的函數
     * @param {number} wait - 等待時間
     * @param {boolean} immediate - 是否立即執行
     * @returns {Function} 防抖後的函數
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    },

    /**
     * 節流函數
     * @param {Function} func - 要節流的函數
     * @param {number} limit - 限制時間
     * @returns {Function} 節流後的函數
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 延遲執行函數
     * @param {number} ms - 延遲時間
     * @returns {Promise} Promise 物件
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
};

/**
 * 本地儲存工具函數
 */
export const storageUtils = {
    /**
     * 取得本地儲存資料
     * @param {string} key - 鍵值
     * @param {any} defaultValue - 預設值
     * @returns {any} 儲存的資料
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('讀取本地儲存失敗:', error);
            return defaultValue;
        }
    },

    /**
     * 設定本地儲存資料
     * @param {string} key - 鍵值
     * @param {any} value - 值
     * @returns {boolean} 是否成功
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('寫入本地儲存失敗:', error);
            return false;
        }
    },

    /**
     * 移除本地儲存資料
     * @param {string} key - 鍵值
     * @returns {boolean} 是否成功
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('移除本地儲存失敗:', error);
            return false;
        }
    },

    /**
     * 清空本地儲存
     * @param {string} prefix - 前綴
     * @returns {boolean} 是否成功
     */
    clear(prefix = '') {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('清空本地儲存失敗:', error);
            return false;
        }
    },
};

/**
 * DOM 相關工具函數
 */
export const domUtils = {
    /**
     * 建立元素
     * @param {string} tag - 標籤名稱
     * @param {Object} attributes - 屬性
     * @param {string|Node} content - 內容
     * @returns {Element} 元素
     */
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);

        // 設定屬性
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });

        // 設定內容
        if (content) {
            if (typeof content === 'string') {
                element.textContent = content;
            } else if (content instanceof Node) {
                element.appendChild(content);
            }
        }

        return element;
    },

    /**
     * 查詢元素
     * @param {string} selector - 選擇器
     * @param {Element} context - 上下文元素
     * @returns {Element|null} 元素
     */
    query(selector, context = document) {
        return context.querySelector(selector);
    },

    /**
     * 查詢所有元素
     * @param {string} selector - 選擇器
     * @param {Element} context - 上下文元素
     * @returns {NodeList} 元素列表
     */
    queryAll(selector, context = document) {
        return context.querySelectorAll(selector);
    },

    /**
     * 新增 CSS 類別
     * @param {Element} element - 元素
     * @param {...string} classes - 類別名稱
     */
    addClass(element, ...classes) {
        element.classList.add(...classes);
    },

    /**
     * 移除 CSS 類別
     * @param {Element} element - 元素
     * @param {...string} classes - 類別名稱
     */
    removeClass(element, ...classes) {
        element.classList.remove(...classes);
    },

    /**
     * 切換 CSS 類別
     * @param {Element} element - 元素
     * @param {string} className - 類別名稱
     * @returns {boolean} 是否有該類別
     */
    toggleClass(element, className) {
        return element.classList.toggle(className);
    },

    /**
     * 檢查是否有 CSS 類別
     * @param {Element} element - 元素
     * @param {string} className - 類別名稱
     * @returns {boolean} 是否有該類別
     */
    hasClass(element, className) {
        return element.classList.contains(className);
    },

    /**
     * 平滑滾動到元素
     * @param {Element|string} target - 目標元素或選擇器
     * @param {Object} options - 選項
     */
    scrollTo(target, options = {}) {
        const element = typeof target === 'string' ? this.query(target) : target;
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest',
                ...options,
            });
        }
    },

    /**
     * 等待 DOM 準備完成
     * @returns {Promise} Promise 物件
     */
    ready() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    },
};

/**
 * 事件相關工具函數
 */
export const eventUtils = {
    /**
     * 自訂事件發射器
     * @param {Element} target - 目標元素
     * @param {string} eventName - 事件名稱
     * @param {any} detail - 事件詳情
     */
    emit(target, eventName, detail = null) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            cancelable: true,
        });
        target.dispatchEvent(event);
    },

    /**
     * 監聽事件
     * @param {Element} target - 目標元素
     * @param {string} eventName - 事件名稱
     * @param {Function} handler - 事件處理函數
     * @param {Object} options - 選項
     * @returns {Function} 取消監聽函數
     */
    on(target, eventName, handler, options = {}) {
        target.addEventListener(eventName, handler, options);
        return () => target.removeEventListener(eventName, handler, options);
    },

    /**
     * 一次性事件監聽
     * @param {Element} target - 目標元素
     * @param {string} eventName - 事件名稱
     * @param {Function} handler - 事件處理函數
     * @param {Object} options - 選項
     * @returns {Function} 取消監聽函數
     */
    once(target, eventName, handler, options = {}) {
        const wrappedHandler = (event) => {
            handler(event);
            target.removeEventListener(eventName, wrappedHandler, options);
        };
        target.addEventListener(eventName, wrappedHandler, options);
        return () => target.removeEventListener(eventName, wrappedHandler, options);
    },

    /**
     * 事件委託
     * @param {Element} container - 容器元素
     * @param {string} selector - 子元素選擇器
     * @param {string} eventName - 事件名稱
     * @param {Function} handler - 事件處理函數
     * @returns {Function} 取消委託函數
     */
    delegate(container, selector, eventName, handler) {
        const delegatedHandler = (event) => {
            const target = event.target.closest(selector);
            if (target && container.contains(target)) {
                handler.call(target, event);
            }
        };

        container.addEventListener(eventName, delegatedHandler);
        return () => container.removeEventListener(eventName, delegatedHandler);
    },
};

/**
 * 匯出所有工具函數
 */
export default {
    dateUtils,
    stringUtils,
    arrayUtils,
    objectUtils,
    validationUtils,
    performanceUtils,
    storageUtils,
    domUtils,
    eventUtils,
};