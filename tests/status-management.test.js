/**
 * 任務狀態管理功能測試
 */

// 導入要測試的模組（在瀏覽器環境中運行）
import { Storage } from '../js/modules/storage.js';
import { StatusManager } from '../js/components/status-manager.js';
import { ProgressTracker } from '../js/components/progress-tracker.js';

// 測試工具函數
function createMockSettings() {
  return {
    get: (key, defaultValue) => defaultValue,
    set: (key, value) => {},
    onChange: (key, callback) => () => {}
  };
}

function createMockUtils() {
  return {
    debounce: (fn, delay) => fn,
    formatDistance: (value) => value.toString()
  };
}

function createMockElements() {
  return {
    taskList: document.createElement('ul'),
    bulkActions: document.createElement('div'),
    totalTasksCount: document.createElement('span'),
    completedTasksCount: document.createElement('span'),
    loadingOverlay: document.createElement('div')
  };
}

// 測試套件
class StatusManagementTests {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('🧪 開始執行任務狀態管理測試...\n');

    for (const { name, testFn } of this.tests) {
      try {
        await testFn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.error(`❌ ${name}`);
        console.error(`   錯誤: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 測試結果: ${this.passed} 通過, ${this.failed} 失敗`);
    return this.failed === 0;
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || '斷言失敗');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `預期 ${expected}，實際 ${actual}`);
    }
  }
}

// 創建測試實例
const tests = new StatusManagementTests();

// Storage 模組測試
tests.test('Storage: 應該能正確創建任務', async () => {
  const settings = createMockSettings();
  const storage = new Storage(settings);
  await storage.initialize();

  const taskData = {
    title: '測試任務',
    description: '這是一個測試任務',
    priority: 'high'
  };

  const task = await storage.addTask(taskData);

  tests.assert(task, '任務應該被創建');
  tests.assertEqual(task.title, '測試任務', '任務標題應該正確');
  tests.assertEqual(task.status, 'pending', '預設狀態應該是 pending');
  tests.assert(task.id, '任務應該有 ID');
  tests.assert(task.createdAt, '任務應該有創建時間');
});

tests.test('Storage: 應該能切換任務狀態', async () => {
  const settings = createMockSettings();
  const storage = new Storage(settings);
  await storage.initialize();

  const task = await storage.addTask({ title: '測試任務' });
  const updatedTask = await storage.toggleTaskStatus(task.id);

  tests.assert(updatedTask, '任務應該被更新');
  tests.assertEqual(updatedTask.status, 'completed', '狀態應該變為 completed');
  tests.assert(updatedTask.completedAt, '應該有完成時間');
});

tests.test('Storage: 應該能批量更新狀態', async () => {
  const settings = createMockSettings();
  const storage = new Storage(settings);
  await storage.initialize();

  const task1 = await storage.addTask({ title: '任務1' });
  const task2 = await storage.addTask({ title: '任務2' });

  const results = await storage.batchUpdateTaskStatus([task1.id, task2.id], 'completed');

  tests.assertEqual(results.success, 2, '應該成功更新2個任務');
  tests.assertEqual(results.failed, 0, '不應該有失敗的任務');

  const updatedTask1 = storage.getTask(task1.id);
  const updatedTask2 = storage.getTask(task2.id);

  tests.assertEqual(updatedTask1.status, 'completed', '任務1應該完成');
  tests.assertEqual(updatedTask2.status, 'completed', '任務2應該完成');
});

tests.test('Storage: 應該記錄狀態變更歷史', async () => {
  const settings = createMockSettings();
  const storage = new Storage(settings);
  await storage.initialize();

  const task = await storage.addTask({ title: '測試任務' });
  await storage.toggleTaskStatus(task.id);

  const history = storage.getStatusHistory(task.id);

  tests.assert(history.length > 0, '應該有狀態變更歷史');
  tests.assertEqual(history[0].taskId, task.id, '歷史記錄應該包含正確的任務ID');
  tests.assertEqual(history[0].fromStatus, 'pending', '應該記錄原始狀態');
  tests.assertEqual(history[0].toStatus, 'completed', '應該記錄新狀態');
});

tests.test('Storage: 應該提供正確的統計資訊', async () => {
  const settings = createMockSettings();
  const storage = new Storage(settings);
  await storage.initialize();

  await storage.addTask({ title: '任務1' });
  await storage.addTask({ title: '任務2' });
  const task3 = await storage.addTask({ title: '任務3' });
  await storage.toggleTaskStatus(task3.id);

  const stats = storage.getTaskStats();

  tests.assertEqual(stats.total, 3, '總任務數應該是3');
  tests.assertEqual(stats.completed, 1, '完成任務數應該是1');
  tests.assertEqual(stats.pending, 2, '待辦任務數應該是2');
  tests.assertEqual(stats.completedPercentage, 33, '完成率應該是33%');
});

// StatusManager 組件測試
tests.test('StatusManager: 應該能正確初始化', async () => {
  const elements = createMockElements();
  const utils = createMockUtils();
  const settings = createMockSettings();
  const storage = new Storage(settings);
  await storage.initialize();

  const statusManager = new StatusManager(elements, utils, storage);
  await statusManager.initialize();

  tests.assert(statusManager.elements, 'StatusManager 應該有 elements 屬性');
  tests.assert(statusManager.storage, 'StatusManager 應該有 storage 屬性');
});

tests.test('StatusManager: 應該能處理狀態切換', async () => {
  const elements = createMockElements();
  const utils = createMockUtils();
  const settings = createMockSettings();
  const storage = new Storage(settings);
  await storage.initialize();

  const task = await storage.addTask({ title: '測試任務' });

  // 創建模擬的 taskItem 元素
  const taskItem = document.createElement('li');
  taskItem.className = 'task-item';
  taskItem.dataset.taskId = task.id;
  elements.taskList.appendChild(taskItem);

  const statusManager = new StatusManager(elements, utils, storage);
  await statusManager.initialize();

  // 模擬點擊事件
  const event = {
    target: { closest: () => taskItem },
    preventDefault: () => {}
  };

  await statusManager.handleStatusToggle(task.id, event);

  const updatedTask = storage.getTask(task.id);
  tests.assertEqual(updatedTask.status, 'completed', '任務狀態應該被更新');
});

// ProgressTracker 組件測試
tests.test('ProgressTracker: 應該能正確初始化', async () => {
  const elements = createMockElements();
  const utils = createMockUtils();
  const settings = createMockSettings();
  const storage = new Storage(settings);
  await storage.initialize();

  const progressTracker = new ProgressTracker(elements, utils, storage);
  await progressTracker.initialize();

  tests.assert(progressTracker.elements, 'ProgressTracker 應該有 elements 屬性');
  tests.assert(progressTracker.storage, 'ProgressTracker 應該有 storage 屬性');
});

tests.test('ProgressTracker: 應該能導出統計報告', async () => {
  const elements = createMockElements();
  const utils = createMockUtils();
  const settings = createMockSettings();
  const storage = new Storage(settings);
  await storage.initialize();

  await storage.addTask({ title: '任務1' });
  const task2 = await storage.addTask({ title: '任務2' });
  await storage.toggleTaskStatus(task2.id);

  const progressTracker = new ProgressTracker(elements, utils, storage);
  await progressTracker.initialize();

  const report = progressTracker.exportStatisticsReport();

  tests.assert(report, '應該有統計報告');
  tests.assert(report.generatedAt, '報告應該有生成時間');
  tests.assert(report.basicStats, '報告應該有基本統計');
  tests.assertEqual(report.basicStats.total, 2, '總任務數應該是2');
  tests.assertEqual(report.basicStats.completed, 1, '完成任務數應該是1');
});

// 性能測試
tests.test('性能: 批量狀態更新應該高效', async () => {
  const settings = createMockSettings();
  const storage = new Storage(settings);
  await storage.initialize();

  // 創建100個任務
  const taskIds = [];
  for (let i = 0; i < 100; i++) {
    const task = await storage.addTask({ title: `任務${i}` });
    taskIds.push(task.id);
  }

  const startTime = performance.now();

  const results = await storage.batchUpdateTaskStatus(taskIds, 'completed');

  const endTime = performance.now();
  const duration = endTime - startTime;

  tests.assertEqual(results.success, 100, '應該成功更新100個任務');
  tests.assert(duration < 1000, `批量更新應該在1秒內完成，實際耗時: ${duration.toFixed(2)}ms`);
});

// 錯誤處理測試
tests.test('錯誤處理: 應該能處理無效的任務ID', async () => {
  const settings = createMockSettings();
  const storage = new Storage(settings);
  await storage.initialize();

  const result = await storage.toggleTaskStatus('invalid-id');

  tests.assert(!result, '無效ID應該返回null');
});

tests.test('錯誤處理: 批量更新應該能處理部分失敗', async () => {
  const settings = createMockSettings();
  const storage = new Storage(settings);
  await storage.initialize();

  const task = await storage.addTask({ title: '有效任務' });
  const invalidId = 'invalid-id';

  const results = await storage.batchUpdateTaskStatus([task.id, invalidId], 'completed');

  tests.assertEqual(results.success, 1, '應該成功更新1個任務');
  tests.assertEqual(results.failed, 1, '應該有1個失敗的任務');
  tests.assert(results.errors.length > 0, '應該有錯誤訊息');
});

// 導出測試運行器
export { StatusManagementTests, tests };

// 如果在瀏覽器中直接運行此文件
if (typeof window !== 'undefined') {
  window.runStatusManagementTests = () => {
    return tests.run();
  };

  console.log('💡 使用 window.runStatusManagementTests() 來運行測試');
}