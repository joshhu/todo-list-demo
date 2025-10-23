/**
 * 事件發布器類別
 * 實現觀察者模式，支援事件監聽和發布
 */

/**
 * 事件發布器類別
 */
export class EventEmitter {
    /**
     * 建構函數
     */
    constructor() {
        this._events = new Map();
        this._maxListeners = 10;
        this._debugMode = false;
    }

    /**
     * 設定最大監聽器數量
     * @param {number} max - 最大監聽器數量
     */
    setMaxListeners(max) {
        if (typeof max === 'number' && max > 0) {
            this._maxListeners = max;
        }
    }

    /**
     * 取得最大監聽器數量
     * @returns {number} 最大監聽器數量
     */
    getMaxListeners() {
        return this._maxListeners;
    }

    /**
     * 設定除錯模式
     * @param {boolean} enabled - 是否啟用除錯模式
     */
    setDebugMode(enabled) {
        this._debugMode = Boolean(enabled);
    }

    /**
     * 添加事件監聽器
     * @param {string} event - 事件名稱
     * @param {Function} listener - 監聽器函數
     * @param {Object} options - 選項
     * @returns {EventEmitter} 返回自身以支援鏈式調用
     */
    on(event, listener, options = {}) {
        if (typeof event !== 'string' || typeof listener !== 'function') {
            throw new TypeError('事件名稱必須是字串，監聽器必須是函數');
        }

        if (!this._events.has(event)) {
            this._events.set(event, []);
        }

        const listeners = this._events.get(event);

        // 檢查監聽器數量限制
        if (listeners.length >= this._maxListeners) {
            console.warn(`警告: 事件 "${event}" 的監聽器數量 (${listeners.length}) 已達到最大限制 (${this._maxListeners})`);
        }

        // 包裝監聽器
        const wrappedListener = {
            fn: listener,
            once: options.once || false,
            priority: options.priority || 0,
            context: options.context || null,
            id: this._generateListenerId(),
        };

        listeners.push(wrappedListener);

        // 根據優先級排序（高優先級在前）
        listeners.sort((a, b) => b.priority - a.priority);

        if (this._debugMode) {
            console.log(`[EventEmitter] 添加監聽器: 事件="${event}", 監聽器ID="${wrappedListener.id}"`);
        }

        return this;
    }

    /**
     * 添加一次性事件監聽器
     * @param {string} event - 事件名稱
     * @param {Function} listener - 監聽器函數
     * @param {Object} options - 選項
     * @returns {EventEmitter} 返回自身以支援鏈式調用
     */
    once(event, listener, options = {}) {
        return this.on(event, listener, { ...options, once: true });
    }

    /**
     * 移除事件監聽器
     * @param {string} event - 事件名稱
     * @param {Function} listener - 要移除的監聽器函數
     * @returns {EventEmitter} 返回自身以支援鏈式調用
     */
    off(event, listener) {
        if (!this._events.has(event)) {
            return this;
        }

        const listeners = this._events.get(event);
        const index = listeners.findIndex(item => item.fn === listener);

        if (index !== -1) {
            const removed = listeners.splice(index, 1)[0];
            if (this._debugMode) {
                console.log(`[EventEmitter] 移除監聽器: 事件="${event}", 監聽器ID="${removed.id}"`);
            }
        }

        // 如果沒有監聽器了，刪除事件
        if (listeners.length === 0) {
            this._events.delete(event);
        }

        return this;
    }

    /**
     * 移除指定事件的所有監聽器
     * @param {string} event - 事件名稱
     * @returns {EventEmitter} 返回自身以支援鏈式調用
     */
    removeAllListeners(event) {
        if (event) {
            if (this._events.has(event)) {
                const count = this._events.get(event).length;
                this._events.delete(event);
                if (this._debugMode) {
                    console.log(`[EventEmitter] 移除所有監聽器: 事件="${event}", 數量=${count}`);
                }
            }
        } else {
            const total = Array.from(this._events.values()).reduce((sum, listeners) => sum + listeners.length, 0);
            this._events.clear();
            if (this._debugMode) {
                console.log(`[EventEmitter] 移除所有監聽器: 總數=${total}`);
            }
        }

        return this;
    }

    /**
     * 發布事件
     * @param {string} event - 事件名稱
     * @param {...any} args - 傳遞給監聽器的參數
     * @returns {boolean} 是否有監聽器處理了事件
     */
    emit(event, ...args) {
        if (typeof event !== 'string') {
            throw new TypeError('事件名稱必須是字串');
        }

        if (!this._events.has(event)) {
            if (this._debugMode) {
                console.log(`[EventEmitter] 發布事件但沒有監聽器: 事件="${event}"`);
            }
            return false;
        }

        const listeners = [...this._events.get(event)]; // 複製陣列以避免在執行過程中被修改
        const results = [];

        if (this._debugMode) {
            console.log(`[EventEmitter] 發布事件: 事件="${event}", 監聽器數量=${listeners.length}`);
        }

        for (const listenerInfo of listeners) {
            try {
                // 設定執行上下文
                const context = listenerInfo.context || this;
                const result = listenerInfo.fn.apply(context, args);
                results.push(result);

                // 如果是一次性監聽器，移除它
                if (listenerInfo.once) {
                    this.off(event, listenerInfo.fn);
                }
            } catch (error) {
                console.error(`[EventEmitter] 監聽器執行錯誤 (事件="${event}"):`, error);
                // 不中斷其他監聽器的執行
            }
        }

        return listeners.length > 0;
    }

    /**
     * 非同步發布事件
     * @param {string} event - 事件名稱
     * @param {...any} args - 傳遞給監聽器的參數
     * @returns {Promise<boolean>} 是否有監聽器處理了事件
     */
    async emitAsync(event, ...args) {
        if (typeof event !== 'string') {
            throw new TypeError('事件名稱必須是字串');
        }

        if (!this._events.has(event)) {
            if (this._debugMode) {
                console.log(`[EventEmitter] 發布異步事件但沒有監聽器: 事件="${event}"`);
            }
            return false;
        }

        const listeners = [...this._events.get(event)];
        const promises = [];

        if (this._debugMode) {
            console.log(`[EventEmitter] 發布異步事件: 事件="${event}", 監聽器數量=${listeners.length}`);
        }

        for (const listenerInfo of listeners) {
            const promise = (async () => {
                try {
                    const context = listenerInfo.context || this;
                    const result = await listenerInfo.fn.apply(context, args);

                    if (listenerInfo.once) {
                        this.off(event, listenerInfo.fn);
                    }

                    return result;
                } catch (error) {
                    console.error(`[EventEmitter] 異步監聽器執行錯誤 (事件="${event}"):`, error);
                    throw error;
                }
            })();

            promises.push(promise);
        }

        // 等待所有監聽器完成，但不拋出錯誤
        try {
            await Promise.allSettled(promises);
        } catch (error) {
            // Promise.allSettled 不會拋出錯誤，這裡只是保險
        }

        return listeners.length > 0;
    }

    /**
     * 取得指定事件的監聽器數量
     * @param {string} event - 事件名稱
     * @returns {number} 監聽器數量
     */
    listenerCount(event) {
        if (!this._events.has(event)) {
            return 0;
        }
        return this._events.get(event).length;
    }

    /**
     * 取得所有事件名稱
     * @returns {string[]} 事件名稱陣列
     */
    eventNames() {
        return Array.from(this._events.keys());
    }

    /**
     * 取得指定事件的監聽器函數陣列
     * @param {string} event - 事件名稱
     * @returns {Function[]} 監聽器函數陣列
     */
    listeners(event) {
        if (!this._events.has(event)) {
            return [];
        }
        return this._events.get(event).map(item => item.fn);
    }

    /**
     * 取得指定事件的原始監聽器資訊
     * @param {string} event - 事件名稱
     * @returns {Array} 監聽器資訊陣列
     */
    rawListeners(event) {
        if (!this._events.has(event)) {
            return [];
        }
        return [...this._events.get(event)];
    }

    /**
     * 檢查是否有指定事件的監聽器
     * @param {string} event - 事件名稱
     * @returns {boolean} 是否有監聽器
     */
    hasListeners(event) {
        return this._events.has(event) && this._events.get(event).length > 0;
    }

    /**
     * 等待指定事件發生
     * @param {string} event - 事件名稱
     * @param {number} timeout - 超時時間（毫秒），0 表示無限等待
     * @returns {Promise} Promise 物件
     */
    waitFor(event, timeout = 0) {
        return new Promise((resolve, reject) => {
            let timeoutId;

            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                this.off(event, onEvent);
            };

            const onEvent = (...args) => {
                cleanup();
                resolve(args);
            };

            this.once(event, onEvent);

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    cleanup();
                    reject(new Error(`等待事件 "${event}" 超時`));
                }, timeout);
            }
        });
    }

    /**
     * 創建事件管道
     * @param {string[]} events - 事件名稱陣列
     * @returns {EventEmitter} 新的事件發布器實例
     */
    pipe(...events) {
        const pipedEmitter = new EventEmitter();

        for (const event of events) {
            this.on(event, (...args) => {
                pipedEmitter.emit(event, ...args);
            });
        }

        return pipedEmitter;
    }

    /**
     * 生成監聽器 ID
     * @returns {string} 監聽器 ID
     */
    _generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 取得事件發布器的統計資訊
     * @returns {Object} 統計資訊
     */
    getStats() {
        const stats = {
            totalEvents: this._events.size,
            totalListeners: 0,
            events: {},
        };

        for (const [event, listeners] of this._events) {
            stats.totalListeners += listeners.length;
            stats.events[event] = {
                listenerCount: listeners.length,
                hasOnceListeners: listeners.some(l => l.once),
                maxPriority: Math.max(...listeners.map(l => l.priority)),
            };
        }

        return stats;
    }

    /**
     * 清理所有事件和監聽器
     */
    dispose() {
        this.removeAllListeners();
        this._events.clear();
        if (this._debugMode) {
            console.log('[EventEmitter] 事件發布器已清理');
        }
    }

    /**
     * 字串化表示
     * @returns {string} 字串表示
     */
    toString() {
        const stats = this.getStats();
        return `EventEmitter(events=${stats.totalEvents}, listeners=${stats.totalListeners})`;
    }
}

// 創建單例實例
export const globalEventEmitter = new EventEmitter();

export default EventEmitter;