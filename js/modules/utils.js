/**
 * 工具函數模組
 *
 * 提供應用程式中常用的工具函數，包括：
 * - 日期時間處理
 * - 字串處理
 * - 驗證函數
 * - 事件處理輔助
 * - DOM 操作輔助
 */

export class Utils {
  constructor(settings) {
    this.settings = settings;
  }

  /**
   * ========== 日期時間處理函數 ==========
   */

  /**
   * 格式化日期
   * @param {Date|string} date - 日期對象或日期字符串
   * @param {string} format - 格式化模式，預設為 'YYYY-MM-DD'
   * @returns {string} 格式化後的日期字符串
   */
  formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return '';
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 格式化相對時間（例如：3 小時前、昨天）
   * @param {Date|string} date - 日期
   * @returns {string} 相對時間字符串
   */
  formatRelativeTime(date) {
    const now = new Date();
    const target = new Date(date);
    const diffMs = now.getTime() - target.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 7) {
      return this.formatDate(target, 'YYYY-MM-DD');
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays > 1) {
      return `${diffDays} 天前`;
    } else if (diffHours === 1) {
      return '1 小時前';
    } else if (diffHours > 1) {
      return `${diffHours} 小時前`;
    } else if (diffMinutes === 1) {
      return '1 分鐘前';
    } else if (diffMinutes > 1) {
      return `${diffMinutes} 分鐘前`;
    } else {
      return '剛剛';
    }
  }

  /**
   * 檢查日期是否已過期
   * @param {Date|string} date - 要檢查的日期
   * @returns {boolean} 是否已過期
   */
  isDateOverdue(date) {
    const target = new Date(date);
    const now = new Date();
    return target.getTime() < now.getTime();
  }

  /**
   * 獲取今天的日期字符串
   * @returns {string} 今天的日期 (YYYY-MM-DD)
   */
  getTodayString() {
    return this.formatDate(new Date(), 'YYYY-MM-DD');
  }

  /**
   * ========== 字串處理函數 ==========
   */

  /**
   * 截斷字符串並添加省略號
   * @param {string} str - 原始字符串
   * @param {number} maxLength - 最大長度
   * @param {string} suffix - 後綴，預設為 '...'
   * @returns {string} 截斷後的字符串
   */
  truncateString(str, maxLength, suffix = '...') {
    if (!str || str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * 轉換為標題格式（首字母大寫）
   * @param {string} str - 輸入字符串
   * @returns {string} 標題格式的字符串
   */
  toTitleCase(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * 清理字符串（移除多餘空格、特殊字符等）
   * @param {string} str - 輸入字符串
   * @returns {string} 清理後的字符串
   */
  cleanString(str) {
    if (!str) return '';
    return str.trim().replace(/\s+/g, ' ');
  }

  /**
   * 生成隨機 ID
   * @param {number} length - ID 長度，預設為 8
   * @returns {string} 隨機 ID
   */
  generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * ========== 驗證函數 ==========
   */

  /**
   * 驗證電子郵件格式
   * @param {string} email - 電子郵件地址
   * @returns {boolean} 是否有效
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 驗證 URL 格式
   * @param {string} url - URL 字符串
   * @returns {boolean} 是否有效
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 驗證任務標題
   * @param {string} title - 任務標題
   * @param {Object} options - 驗證選項
   * @returns {Object} 驗證結果 { isValid: boolean, message: string }
   */
  validateTaskTitle(title, options = {}) {
    const {
      minLength = 1,
      maxLength = 200,
      required = true
    } = options;

    if (required && !title) {
      return {
        isValid: false,
        message: '任務標題為必填項'
      };
    }

    if (title && title.length < minLength) {
      return {
        isValid: false,
        message: `任務標題至少需要 ${minLength} 個字符`
      };
    }

    if (title && title.length > maxLength) {
      return {
        isValid: false,
        message: `任務標題不能超過 ${maxLength} 個字符`
      };
    }

    const cleanedTitle = this.cleanString(title);
    if (title && cleanedTitle !== title) {
      return {
        isValid: false,
        message: '任務標題包含無效字符或多餘空格'
      };
    }

    return {
      isValid: true,
      message: ''
    };
  }

  /**
   * 驗證任務描述
   * @param {string} description - 任務描述
   * @param {Object} options - 驗證選項
   * @returns {Object} 驗證結果
   */
  validateTaskDescription(description, options = {}) {
    const {
      maxLength = 500,
      required = false
    } = options;

    if (required && !description) {
      return {
        isValid: false,
        message: '任務描述為必填項'
      };
    }

    if (description && description.length > maxLength) {
      return {
        isValid: false,
        message: `任務描述不能超過 ${maxLength} 個字符`
      };
    }

    return {
      isValid: true,
      message: ''
    };
  }

  /**
   * ========== 事件處理輔助函數 ==========
   */

  /**
   * 節流函數 - 限制函數執行頻率
   * @param {Function} func - 要節流的函數
   * @param {number} delay - 延遲時間（毫秒）
   * @returns {Function} 節流後的函數
   */
  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;

    return function (...args) {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  /**
   * 防抖函數 - 延遲函數執行直到停止觸發
   * @param {Function} func - 要防抖的函數
   * @param {number} delay - 延遲時間（毫秒）
   * @returns {Function} 防抖後的函數
   */
  debounce(func, delay) {
    let timeoutId;

    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * 一次性事件監聽器
   * @param {Element} element - DOM 元素
   * @param {string} event - 事件名稱
   * @param {Function} handler - 事件處理函數
   */
  once(element, event, handler) {
    const onceHandler = (e) => {
      handler(e);
      element.removeEventListener(event, onceHandler);
    };
    element.addEventListener(event, onceHandler);
  }

  /**
   * ========== DOM 操作輔助函數 ==========
   */

  /**
   * 安全地設置元素屬性
   * @param {Element} element - DOM 元素
   * @param {string} attribute - 屬性名
   * @param {string} value - 屬性值
   */
  safeSetAttribute(element, attribute, value) {
    if (element && attribute && value !== undefined) {
      element.setAttribute(attribute, value);
    }
  }

  /**
   * 安全地設置元素文本內容
   * @param {Element} element - DOM 元素
   * @param {string} text - 文本內容
   */
  safeSetTextContent(element, text) {
    if (element) {
      element.textContent = text || '';
    }
  }

  /**
   * 創建帶有類名的元素
   * @param {string} tagName - 標籤名稱
   * @param {string|Array} classNames - 類名或類名數組
   * @param {Object} attributes - 屬性對象
   * @returns {Element} 創建的元素
   */
  createElement(tagName, classNames = '', attributes = {}) {
    const element = document.createElement(tagName);

    if (classNames) {
      if (Array.isArray(classNames)) {
        element.className = classNames.join(' ');
      } else {
        element.className = classNames;
      }
    }

    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        this.safeSetAttribute(element, key, value);
      }
    });

    return element;
  }

  /**
   * 查找最近的祖先元素
   * @param {Element} element - 起始元素
   * @param {string} selector - 選擇器
   * @returns {Element|null} 匹配的祖先元素
   */
  closest(element, selector) {
    if (!element) return null;

    if (element.closest) {
      return element.closest(selector);
    }

    // 向後兼容的實現
    let parent = element.parentElement;
    while (parent) {
      if (parent.matches && parent.matches(selector)) {
        return parent;
      }
      parent = parent.parentElement;
    }

    return null;
  }

  /**
   * 檢查元素是否在視口內
   * @param {Element} element - 要檢查的元素
   * @param {number} threshold - 閾值（0-1）
   * @returns {boolean} 是否在視口內
   */
  isElementInViewport(element, threshold = 0) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    const verticalThreshold = rect.height * threshold;
    const horizontalThreshold = rect.width * threshold;

    const inViewVertically = (
      rect.top <= windowHeight - verticalThreshold &&
      rect.bottom >= verticalThreshold
    );

    const inViewHorizontally = (
      rect.left <= windowWidth - horizontalThreshold &&
      rect.right >= horizontalThreshold
    );

    return inViewVertically && inViewHorizontally;
  }

  /**
   * 平滑滾動到元素
   * @param {Element|string} target - 目標元素或選擇器
   * @param {Object} options - 滾動選項
   */
  scrollToElement(target, options = {}) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;

    if (!element) return;

    const defaultOptions = {
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    };

    const scrollOptions = { ...defaultOptions, ...options };

    if (element.scrollIntoView) {
      element.scrollIntoView(scrollOptions);
    } else {
      // 向後兼容的實現
      element.scrollIntoView ?
        element.scrollIntoView() :
        window.scrollTo(0, element.offsetTop);
    }
  }

  /**
   * ========== 資料處理函數 ==========
   */

  /**
   * 深度複製對象
   * @param {*} obj - 要複製的對象
   * @returns {*} 複製後的對象
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }

    if (typeof obj === 'object') {
      const cloned = {};
      Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone(obj[key]);
      });
      return cloned;
    }

    return obj;
  }

  /**
   * 比較兩個對象是否相等
   * @param {*} obj1 - 第一個對象
   * @param {*} obj2 - 第二個對象
   * @returns {boolean} 是否相等
   */
  deepEqual(obj1, obj2) {
    if (obj1 === obj2) return true;

    if (obj1 === null || obj2 === null) return obj1 === obj2;

    if (typeof obj1 !== typeof obj2) return false;

    if (typeof obj1 !== 'object') return obj1 === obj2;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (let key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
  }

  /**
   * 陣列去重
   * @param {Array} array - 要去重的陣列
   * @param {string|Function} key - 用於比較的鍵或函數
   * @returns {Array} 去重後的陣列
   */
  uniqueArray(array, key = null) {
    if (!Array.isArray(array)) return [];

    if (key === null) {
      return [...new Set(array)];
    }

    const seen = new Set();
    return array.filter(item => {
      const value = typeof key === 'function' ? key(item) : item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  /**
   * 陣列分組
   * @param {Array} array - 要分組的陣列
   * @param {string|Function} key - 分組依據的鍵或函數
   * @returns {Object} 分組後的對象
   */
  groupBy(array, key) {
    if (!Array.isArray(array)) return {};

    return array.reduce((groups, item) => {
      const groupKey = typeof key === 'function' ? key(item) : item[key];
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {});
  }
}