/**
 * 任務驗證器類別
 * 負責驗證任務資料的完整性和有效性
 */

import { ERROR_MESSAGES } from '../config/settings.js';

/**
 * 任務驗證器類別
 */
export class TaskValidator {
    /**
     * 驗證規則定義
     */
    static get RULES() {
        return {
            id: {
                required: false, // 更新時可選
                type: 'string',
                minLength: 1,
                maxLength: 100,
                pattern: /^[a-zA-Z0-9_-]+$/,
            },
            title: {
                required: true,
                type: 'string',
                minLength: 1,
                maxLength: 200,
                trim: true,
                sanitize: true,
            },
            description: {
                required: false,
                type: 'string',
                maxLength: 2000,
                trim: true,
                sanitize: true,
            },
            completed: {
                required: false,
                type: 'boolean',
                default: false,
            },
            priority: {
                required: false,
                type: 'string',
                allowedValues: ['low', 'medium', 'high'],
                default: 'medium',
            },
            dueDate: {
                required: false,
                type: 'date',
                allowNull: true,
                minDate: new Date('1900-01-01'),
                maxDate: new Date('2100-12-31'),
            },
            tags: {
                required: false,
                type: 'array',
                maxItems: 20,
                itemType: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 50,
                    pattern: /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/,
                },
            },
            category: {
                required: false,
                type: 'string',
                minLength: 1,
                maxLength: 50,
                trim: true,
                sanitize: true,
                default: 'general',
            },
        };
    }

    /**
     * 驗證任務資料
     * @param {Object} data - 要驗證的資料
     * @param {boolean} isUpdate - 是否為更新操作
     * @returns {Object} 驗證結果
     */
    static validate(data, isUpdate = false) {
        const errors = [];
        const warnings = [];
        const cleanedData = {};

        // 檢查基本資料類型
        if (!data || typeof data !== 'object') {
            errors.push('任務資料必須是物件');
            return {
                isValid: false,
                errors,
                warnings,
                cleanedData: null,
            };
        }

        // 驗證各個欄位
        for (const [field, rules] of Object.entries(this.RULES)) {
            const result = this.validateField(data[field], field, rules, isUpdate);

            if (!result.isValid) {
                errors.push(...result.errors);
            }

            warnings.push(...result.warnings);

            if (result.value !== undefined) {
                cleanedData[field] = result.value;
            }
        }

        // 執行跨欄位驗證
        const crossFieldResult = this.validateCrossFields(cleanedData, isUpdate);
        errors.push(...crossFieldResult.errors);
        warnings.push(...crossFieldResult.warnings);

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            cleanedData,
        };
    }

    /**
     * 驗證單個欄位
     * @param {*} value - 欄位值
     * @param {string} field - 欄位名稱
     * @param {Object} rules - 驗證規則
     * @param {boolean} isUpdate - 是否為更新操作
     * @returns {Object} 驗證結果
     */
    static validateField(value, field, rules, isUpdate) {
        const errors = [];
        const warnings = [];
        let finalValue = value;

        // 檢查是否為必需欄位
        if (rules.required && !isUpdate && (value === undefined || value === null || value === '')) {
            errors.push(`${this.getFieldDisplayName(field)} 是必填欄位`);
            return { isValid: false, errors, warnings };
        }

        // 如果值為空且非必需，使用預設值
        if ((value === undefined || value === null || value === '') && !rules.required) {
            if (rules.default !== undefined) {
                finalValue = rules.default;
            } else if (rules.allowNull) {
                finalValue = null;
            }
            return { isValid: true, errors, warnings, value: finalValue };
        }

        // 如果值為空且為更新操作，跳過驗證
        if ((value === undefined || value === null) && isUpdate) {
            return { isValid: true, errors, warnings };
        }

        // 類型驗證
        const typeResult = this.validateType(finalValue, rules.type, field);
        if (!typeResult.isValid) {
            errors.push(...typeResult.errors);
            return { isValid: false, errors, warnings };
        }
        finalValue = typeResult.value;

        // 字串處理
        if (rules.type === 'string' && finalValue !== null) {
            if (rules.trim) {
                finalValue = finalValue.trim();
            }
            if (rules.sanitize) {
                finalValue = this.sanitizeString(finalValue);
            }
        }

        // 陣列處理
        if (rules.type === 'array' && finalValue !== null) {
            const arrayResult = this.validateArray(finalValue, rules, field);
            if (!arrayResult.isValid) {
                errors.push(...arrayResult.errors);
            }
            warnings.push(...arrayResult.warnings);
            finalValue = arrayResult.value;
        }

        // 長度驗證
        if (rules.minLength !== undefined && finalValue.length < rules.minLength) {
            errors.push(`${this.getFieldDisplayName(field)} 長度不能少於 ${rules.minLength} 個字元`);
        }

        if (rules.maxLength !== undefined && finalValue.length > rules.maxLength) {
            errors.push(`${this.getFieldDisplayName(field)} 長度不能超過 ${rules.maxLength} 個字元`);
        }

        // 陣列項目數量驗證
        if (rules.maxItems !== undefined && finalValue.length > rules.maxItems) {
            errors.push(`${this.getFieldDisplayName(field)} 最多只能有 ${rules.maxItems} 個項目`);
        }

        // 允許值驗證
        if (rules.allowedValues && !rules.allowedValues.includes(finalValue)) {
            errors.push(`${this.getFieldDisplayName(field)} 必須是以下值之一: ${rules.allowedValues.join(', ')}`);
        }

        // 正則表達式驗證
        if (rules.pattern && !rules.pattern.test(finalValue)) {
            errors.push(`${this.getFieldDisplayName(field)} 格式不正確`);
        }

        // 日期驗證
        if (rules.type === 'date' && finalValue !== null) {
            const dateResult = this.validateDate(finalValue, rules, field);
            if (!dateResult.isValid) {
                errors.push(...dateResult.errors);
            }
            warnings.push(...dateResult.warnings);
            finalValue = dateResult.value;
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            value: finalValue,
        };
    }

    /**
     * 驗證資料類型
     * @param {*} value - 值
     * @param {string} expectedType - 預期類型
     * @param {string} field - 欄位名稱
     * @returns {Object} 驗證結果
     */
    static validateType(value, expectedType, field) {
        const errors = [];
        let finalValue = value;

        switch (expectedType) {
            case 'string':
                if (typeof value !== 'string') {
                    finalValue = String(value);
                    if (finalValue === 'null' || finalValue === 'undefined') {
                        errors.push(`${this.getFieldDisplayName(field)} 必須是字串`);
                    }
                }
                break;

            case 'number':
                if (typeof value !== 'number') {
                    const numValue = Number(value);
                    if (isNaN(numValue)) {
                        errors.push(`${this.getFieldDisplayName(field)} 必須是數字`);
                    } else {
                        finalValue = numValue;
                    }
                }
                break;

            case 'boolean':
                if (typeof value !== 'boolean') {
                    if (value === 'true' || value === '1') {
                        finalValue = true;
                    } else if (value === 'false' || value === '0') {
                        finalValue = false;
                    } else {
                        errors.push(`${this.getFieldDisplayName(field)} 必須是布林值`);
                    }
                }
                break;

            case 'date':
                if (!(value instanceof Date)) {
                    if (typeof value === 'string' || typeof value === 'number') {
                        const dateValue = new Date(value);
                        if (isNaN(dateValue.getTime())) {
                            errors.push(`${this.getFieldDisplayName(field)} 必須是有效的日期`);
                        } else {
                            finalValue = dateValue;
                        }
                    } else {
                        errors.push(`${this.getFieldDisplayName(field)} 必須是日期物件`);
                    }
                }
                break;

            case 'array':
                if (!Array.isArray(value)) {
                    errors.push(`${this.getFieldDisplayName(field)} 必須是陣列`);
                }
                break;

            default:
                errors.push(`不支援的資料類型: ${expectedType}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            value: finalValue,
        };
    }

    /**
     * 驗證陣列
     * @param {Array} array - 陣列
     * @param {Object} rules - 驗證規則
     * @param {string} field - 欄位名稱
     * @returns {Object} 驗證結果
     */
    static validateArray(array, rules, field) {
        const errors = [];
        const warnings = [];
        const cleanedArray = [];

        if (rules.itemType) {
            for (let i = 0; i < array.length; i++) {
                const item = array[i];
                const itemResult = this.validateField(item, `${field}[${i}]`, rules.itemType, false);

                if (!itemResult.isValid) {
                    errors.push(...itemResult.errors);
                } else {
                    cleanedArray.push(itemResult.value);
                }
            }
        } else {
            cleanedArray.push(...array);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            value: cleanedArray,
        };
    }

    /**
     * 驗證日期
     * @param {Date} date - 日期
     * @param {Object} rules - 驗證規則
     * @param {string} field - 欄位名稱
     * @returns {Object} 驗證結果
     */
    static validateDate(date, rules, field) {
        const errors = [];
        const warnings = [];

        if (rules.minDate && date < rules.minDate) {
            errors.push(`${this.getFieldDisplayName(field)} 不能早於 ${rules.minDate.toLocaleDateString()}`);
        }

        if (rules.maxDate && date > rules.maxDate) {
            errors.push(`${this.getFieldDisplayName(field)} 不能晚於 ${rules.maxDate.toLocaleDateString()}`);
        }

        // 檢查是否為過去日期（針對截止日期）
        if (field === 'dueDate' && date < new Date()) {
            warnings.push('截止日期設定為過去日期');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            value: date,
        };
    }

    /**
     * 跨欄位驗證
     * @param {Object} data - 資料
     * @param {boolean} isUpdate - 是否為更新操作
     * @returns {Object} 驗證結果
     */
    static validateCrossFields(data, isUpdate) {
        const errors = [];
        const warnings = [];

        // 檢查完成狀態與完成時間的一致性
        if (data.completed && !data.completedAt) {
            data.completedAt = new Date();
        } else if (!data.completed && data.completedAt) {
            data.completedAt = null;
        }

        // 檢查標題和描述是否相同
        if (data.title && data.description && data.title === data.description) {
            warnings.push('標題和描述內容相同');
        }

        // 檢查標籤是否重複
        if (data.tags && data.tags.length > 1) {
            const uniqueTags = [...new Set(data.tags)];
            if (uniqueTags.length !== data.tags.length) {
                data.tags = uniqueTags;
                warnings.push('移除了重複的標籤');
            }
        }

        // 檢查截止日期是否合理
        if (data.dueDate && data.createdAt && data.dueDate < data.createdAt) {
            errors.push('截止日期不能早於建立日期');
        }

        return { errors, warnings };
    }

    /**
     * 清理字串
     * @param {string} str - 字串
     * @returns {string} 清理後的字串
     */
    static sanitizeString(str) {
        if (typeof str !== 'string') {
            return str;
        }

        // 移除 HTML 標籤
        return str.replace(/<[^>]*>/g, '')
                 // 移除多餘的空白字元
                 .replace(/\s+/g, ' ')
                 // 移除首尾空白
                 .trim();
    }

    /**
     * 取得欄位的顯示名稱
     * @param {string} field - 欄位名稱
     * @returns {string} 顯示名稱
     */
    static getFieldDisplayName(field) {
        const displayNames = {
            id: 'ID',
            title: '標題',
            description: '描述',
            completed: '完成狀態',
            priority: '優先級',
            dueDate: '截止日期',
            tags: '標籤',
            category: '分類',
            createdAt: '建立時間',
            updatedAt: '更新時間',
            completedAt: '完成時間',
        };

        return displayNames[field] || field;
    }

    /**
     * 快速驗證（不返回清理後的資料）
     * @param {Object} data - 要驗證的資料
     * @param {boolean} isUpdate - 是否為更新操作
     * @returns {Object} 驗證結果
     */
    static quickValidate(data, isUpdate = false) {
        const result = this.validate(data, isUpdate);
        return {
            isValid: result.isValid,
            errors: result.errors,
            warnings: result.warnings,
        };
    }

    /**
     * 驗證任務 ID 格式
     * @param {string} id - 任務 ID
     * @returns {boolean} 是否有效
     */
    static isValidId(id) {
        return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id);
    }

    /**
     * 驗證標籤格式
     * @param {string} tag - 標籤
     * @returns {boolean} 是否有效
     */
    static isValidTag(tag) {
        return typeof tag === 'string' &&
               tag.length > 0 &&
               tag.length <= 50 &&
               /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/.test(tag);
    }

    /**
     * 驗證分類格式
     * @param {string} category - 分類
     * @returns {boolean} 是否有效
     */
    static isValidCategory(category) {
        return typeof category === 'string' &&
               category.trim().length > 0 &&
               category.trim().length <= 50;
    }
}

export default TaskValidator;