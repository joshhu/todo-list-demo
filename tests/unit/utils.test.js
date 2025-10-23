/**
 * 工具函數單元測試
 */

import { Utils } from '../../js/modules/utils.js';
import { Settings } from '../../js/config/settings.js';

describe('Utils', () => {
  let utils;
  let settings;

  beforeEach(() => {
    // 模擬設定
    settings = {
      get: jest.fn()
    };
    utils = new Utils(settings);
  });

  describe('日期格式化', () => {
    test('formatDate 應該正確格式化日期', () => {
      const date = new Date('2025-01-15');
      const result = utils.formatDate(date, 'YYYY-MM-DD');
      expect(result).toBe('2025-01-15');
    });

    test('formatRelativeTime 應該返回相對時間', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 60 * 60 * 1000); // 1小時前
      const result = utils.formatRelativeTime(pastDate);
      expect(result).toBe('1 小時前');
    });

    test('isDateOverdue 應該正確判斷過期日期', () => {
      const pastDate = new Date('2020-01-01');
      expect(utils.isDateOverdue(pastDate)).toBe(true);

      const futureDate = new Date('2030-01-01');
      expect(utils.isDateOverdue(futureDate)).toBe(false);
    });
  });

  describe('字串處理', () => {
    test('truncateString 應該正確截斷字串', () => {
      const longString = '這是一個很長的字串，需要被截斷';
      const result = utils.truncateString(longString, 10, '...');
      expect(result).toBe('這是一個...');
    });

    test('toTitleCase 應該正確轉換為標題格式', () => {
      expect(utils.toTitleCase('hello world')).toBe('Hello world');
      expect(utils.toTitleCase('HELLO')).toBe('Hello');
    });

    test('cleanString 應該清理字串', () => {
      const messyString = '  hello   world  ';
      expect(utils.cleanString(messyString)).toBe('hello world');
    });

    test('generateId 應該生成唯一 ID', () => {
      const id1 = utils.generateId();
      const id2 = utils.generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toHaveLength(8);
    });
  });

  describe('驗證函數', () => {
    test('validateTaskTitle 應該正確驗證任務標題', () => {
      // 有效標題
      let result = utils.validateTaskTitle('有效的任務標題');
      expect(result.isValid).toBe(true);

      // 空標題
      result = utils.validateTaskTitle('', { required: true });
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('必填項');

      // 太長的標題
      const longTitle = 'a'.repeat(201);
      result = utils.validateTaskTitle(longTitle);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('不能超過');
    });

    test('validateTaskDescription 應該正確驗證任務描述', () => {
      // 有效描述
      let result = utils.validateTaskDescription('有效的描述');
      expect(result.isValid).toBe(true);

      // 太長的描述
      const longDescription = 'a'.repeat(501);
      result = utils.validateTaskDescription(longDescription);
      expect(result.isValid).toBe(false);
    });
  });

  describe('事件處理', () => {
    test('debounce 應該延遲函數執行', (done) => {
      const mockFn = jest.fn();
      const debouncedFn = utils.debounce(mockFn, 100);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);
        done();
      }, 150);
    });

    test('throttle 應該限制函數執行頻率', (done) => {
      const mockFn = jest.fn();
      const throttledFn = utils.throttle(mockFn, 100);

      // 快速連續調用
      throttledFn();
      throttledFn();
      throttledFn();

      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);

        // 等待 throttle 週期結束
        setTimeout(() => {
          throttledFn();
          expect(mockFn).toHaveBeenCalledTimes(2);
          done();
        }, 150);
      }, 50);
    });
  });

  describe('DOM 操作', () => {
    test('createElement 應該創建帶有正確屬性的元素', () => {
      const element = utils.createElement('div', ['test-class'], {
        id: 'test-id',
        'aria-label': 'Test Element'
      });

      expect(element.tagName).toBe('DIV');
      expect(element.className).toBe('test-class');
      expect(element.id).toBe('test-id');
      expect(element.getAttribute('aria-label')).toBe('Test Element');
    });

    test('safeSetTextContent 應該安全設置文本內容', () => {
      const element = document.createElement('div');
      utils.safeSetTextContent(element, 'Test Content');
      expect(element.textContent).toBe('Test Content');
    });
  });

  describe('資料處理', () => {
    test('deepClone 應該創建深層複製', () => {
      const original = {
        name: 'test',
        nested: {
          value: 123
        }
      };

      const cloned = utils.deepClone(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.nested).not.toBe(original.nested);
    });

    test('deepEqual 應該正確比較對象', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { a: 1, b: { c: 2 } };
      const obj3 = { a: 1, b: { c: 3 } };

      expect(utils.deepEqual(obj1, obj2)).toBe(true);
      expect(utils.deepEqual(obj1, obj3)).toBe(false);
    });

    test('uniqueArray 應該去除重複項', () => {
      const array = [1, 2, 2, 3, 1, 4];
      const result = utils.uniqueArray(array);
      expect(result).toEqual([1, 2, 3, 4]);
    });

    test('groupBy 應該正確分組', () => {
      const array = [
        { type: 'fruit', name: 'apple' },
        { type: 'fruit', name: 'banana' },
        { type: 'vegetable', name: 'carrot' }
      ];

      const result = utils.groupBy(array, 'type');
      expect(result).toEqual({
        fruit: [
          { type: 'fruit', name: 'apple' },
          { type: 'fruit', name: 'banana' }
        ],
        vegetable: [
          { type: 'vegetable', name: 'carrot' }
        ]
      });
    });
  });
});