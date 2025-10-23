/**
 * Data Layer Test Suite
 * 測試 Issue #5: Data Layer Implementation 的所有功能
 */

import { Task } from './js/models/Task.js';
import { TaskValidator } from './js/models/TaskValidator.js';
import { EventEmitter } from './js/core/EventEmitter.js';
import todoRepository from './js/repositories/TodoRepository.js';

/**
 * 測試套件類別
 */
class DataLayerTestSuite {
    constructor() {
        this.testResults = [];
        this.currentTest = null;
    }

    /**
     * 記錄測試結果
     */
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);

        if (this.currentTest) {
            this.currentTest.logs.push({ message: logMessage, type });
        }
    }

    /**
     * 記錄測試開始
     */
    startTest(testName) {
        this.currentTest = {
            name: testName,
            startTime: Date.now(),
            logs: [],
            passed: false,
            error: null
        };
        this.log(`🧪 開始測試: ${testName}`);
    }

    /**
     * 記錄測試通過
     */
    passTest() {
        if (this.currentTest) {
            this.currentTest.passed = true;
            this.currentTest.endTime = Date.now();
            this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
            this.testResults.push(this.currentTest);
            this.log(`✅ 測試通過: ${this.currentTest.name} (${this.currentTest.duration}ms)`, 'success');
        }
    }

    /**
     * 記錄測試失敗
     */
    failTest(error) {
        if (this.currentTest) {
            this.currentTest.passed = false;
            this.currentTest.error = error.message;
            this.currentTest.endTime = Date.now();
            this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
            this.testResults.push(this.currentTest);
            this.log(`❌ 測試失敗: ${this.currentTest.name} - ${error.message}`, 'error');
        }
    }

    /**
     * 運行所有測試
     */
    async runAllTests() {
        console.log('🗂️ 開始運行數據層測試套件...\n');

        try {
            // 初始化倉儲
            await this.initializeRepository();

            // 運行各項測試
            await this.testTaskEntity();
            await this.testTaskValidator();
            await this.testEventEmitter();
            await this.testRepositoryCrud();
            await this.testDataQuery();
            await this.testEventIntegration();
            await this testDataPersistence();
            await this.testBackupAndRestore();

            // 顯示測試摘要
            this.displayTestSummary();

        } catch (error) {
            console.error('測試套件執行失敗:', error);
        }
    }

    /**
     * 初始化倉儲
     */
    async initializeRepository() {
        this.startTest('Repository Initialization');
        try {
            await todoRepository.initialize();
            this.passTest();
        } catch (error) {
            this.failTest(error);
            throw error;
        }
    }

    /**
     * 測試 Task 實體類別
     */
    async testTaskEntity() {
        this.startTest('Task Entity');
        try {
            // 測試任務創建
            const taskData = {
                title: '測試任務',
                description: '這是一個測試任務',
                priority: 'high',
                category: 'test',
                tags: ['test', 'validation'],
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            const task = new Task(taskData);

            // 驗證基本屬性
            if (!task.id || task.title !== '測試任務' || task.priority !== 'high') {
                throw new Error('Task 基本屬性設置失敗');
            }

            // 測試更新方法
            const updatedTask = task.update({ title: '更新後的標題' });
            if (updatedTask.title !== '更新後的標題' || updatedTask._version !== 2) {
                throw new Error('Task 更新方法失敗');
            }

            // 測試切換完成狀態
            const completedTask = updatedTask.toggleComplete();
            if (!completedTask.completed || !completedTask.completedAt) {
                throw new Error('Task 切換完成狀態失敗');
            }

            // 測試任務方法
            if (!completedTask.hasTag('test')) {
                throw new Error('Task hasTag 方法失敗');
            }

            const taskWithNewTag = completedTask.addTag('new-tag');
            if (!taskWithNewTag.hasTag('new-tag')) {
                throw new Error('Task addTag 方法失敗');
            }

            const taskWithoutTag = taskWithNewTag.removeTag('test');
            if (taskWithoutTag.hasTag('test')) {
                throw new Error('Task removeTag 方法失敗');
            }

            // 測試搜尋匹配
            if (!task.matchesSearch('測試')) {
                throw new Error('Task matchesSearch 方法失敗');
            }

            // 測試篩選匹配
            if (!task.matchesFilters({ priority: 'high' })) {
                throw new Error('Task matchesFilters 方法失敗');
            }

            // 測試逾期檢查
            const overdueTask = new Task({
                title: '逾期任務',
                dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            });

            if (!overdueTask.isOverdue()) {
                throw new Error('Task isOverdue 方法失敗');
            }

            // 測試任務複製
            const clonedTask = task.clone();
            if (clonedTask.id === task.id || clonedTask.title !== task.title) {
                throw new Error('Task clone 方法失敗');
            }

            // 測試 JSON 序列化
            const jsonTask = task.toJSON();
            const restoredTask = Task.fromJSON(jsonTask);
            if (restoredTask.id !== task.id || restoredTask.title !== task.title) {
                throw new Error('Task JSON 序列化失敗');
            }

            this.log('所有 Task 實體方法測試通過');
            this.passTest();

        } catch (error) {
            this.failTest(error);
        }
    }

    /**
     * 測試 TaskValidator 驗證器
     */
    async testTaskValidator() {
        this.startTest('Task Validator');
        try {
            // 測試有效數據
            const validData = {
                title: '有效任務標題',
                description: '有效的任務描述',
                priority: 'medium',
                category: 'work',
                tags: ['work', 'important'],
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            const validResult = TaskValidator.validate(validData);
            if (!validResult.isValid) {
                throw new Error('有效數據驗證失敗: ' + validResult.errors.join(', '));
            }

            this.log('有效數據驗證通過');

            // 測試無效標題
            const invalidTitleResult = TaskValidator.validate({ title: '' });
            if (invalidTitleResult.isValid || invalidTitleResult.errors.length === 0) {
                throw new Error('空標題應該驗證失敗');
            }

            // 測試標題長度限制
            const longTitleResult = TaskValidator.validate({
                title: 'a'.repeat(201) // 超過 200 字元
            });
            if (longTitleResult.isValid) {
                throw new Error('過長標題應該驗證失敗');
            }

            // 測試無效優先級
            const invalidPriorityResult = TaskValidator.validate({
                title: '有效標題',
                priority: 'invalid'
            });
            if (invalidPriorityResult.isValid) {
                throw new Error('無效優先級應該驗證失敗');
            }

            // 測試無效日期
            const invalidDateResult = TaskValidator.validate({
                title: '有效標題',
                dueDate: 'invalid-date'
            });
            if (invalidDateResult.isValid) {
                throw new Error('無效日期應該驗證失敗');
            }

            // 測試標籤驗證
            const invalidTagsResult = TaskValidator.validate({
                title: '有效標題',
                tags: ['valid tag', 'tag with spaces', '', 'tag with special chars!@#']
            });
            if (invalidTagsResult.isValid) {
                throw new Error('無效標籤應該驗證失敗');
            }

            // 測試更新操作的驗證
            const updateData = {
                description: '新的描述'
            };
            const updateResult = TaskValidator.validate(updateData, true);
            if (!updateResult.isValid) {
                throw new Error('更新操作驗證失敗');
            }

            // 測試快速驗證
            const quickResult = TaskValidator.quickValidate(validData);
            if (!quickResult.isValid) {
                throw new Error('快速驗證失敗');
            }

            this.log('所有 TaskValidator 驗證測試通過');
            this.passTest();

        } catch (error) {
            this.failTest(error);
        }
    }

    /**
     * 測試 EventEmitter 事件系統
     */
    async testEventEmitter() {
        this.startTest('EventEmitter');
        try {
            const emitter = new EventEmitter();

            // 測試基本事件監聽和發布
            let eventReceived = false;
            let eventData = null;

            emitter.on('test-event', (data) => {
                eventReceived = true;
                eventData = data;
            });

            emitter.emit('test-event', { message: 'test data' });

            if (!eventReceived || !eventData || eventData.message !== 'test data') {
                throw new Error('基本事件發布/監聽失敗');
            }

            // 測試一次性事件
            let onceEventCount = 0;
            emitter.once('once-event', () => {
                onceEventCount++;
            });

            emitter.emit('once-event');
            emitter.emit('once-event');

            if (onceEventCount !== 1) {
                throw new Error('一次性事件測試失敗');
            }

            // 測試移除監聽器
            let multipleEventCount = 0;
            const listener = () => { multipleEventCount++; };

            emitter.on('multiple-event', listener);
            emitter.emit('multiple-event');
            emitter.off('multiple-event', listener);
            emitter.emit('multiple-event');

            if (multipleEventCount !== 1) {
                throw new Error('移除監聽器測試失敗');
            }

            // 測試優先級
            let executionOrder = [];
            emitter.on('priority-event', () => { executionOrder.push('low'); }, { priority: 1 });
            emitter.on('priority-event', () => { executionOrder.push('high'); }, { priority: 10 });
            emitter.emit('priority-event');

            if (executionOrder[0] !== 'high' || executionOrder[1] !== 'low') {
                throw new Error('事件優先級測試失敗');
            }

            // 測試監聽器數量限制
            emitter.setMaxListeners(2);
            emitter.on('limit-test', () => {});
            emitter.on('limit-test', () => {});
            emitter.on('limit-test', () => {}); // 應該觸發警告

            // 測試事件名稱
            const eventNames = emitter.eventNames();
            if (!eventNames.includes('test-event')) {
                throw new Error('獲取事件名稱失敗');
            }

            // 測試統計資訊
            const stats = emitter.getStats();
            if (stats.totalEvents === 0 || stats.totalListeners === 0) {
                throw new Error('事件統計資訊失敗');
            }

            // 測試等待事件
            const waitPromise = emitter.waitFor('wait-event');
            setTimeout(() => emitter.emit('wait-event', 'wait data'), 100);
            const waitResult = await waitPromise;

            if (!waitResult || waitResult[0] !== 'wait data') {
                throw new Error('等待事件測試失敗');
            }

            // 清理
            emitter.dispose();

            this.log('所有 EventEmitter 測試通過');
            this.passTest();

        } catch (error) {
            this.failTest(error);
        }
    }

    /**
     * 測試 TodoRepository CRUD 操作
     */
    async testRepositoryCrud() {
        this.startTest('Repository CRUD Operations');
        try {
            // 測試創建任務
            const taskData = {
                title: 'CRUD 測試任務',
                description: '這是一個 CRUD 測試任務',
                priority: 'high',
                category: 'test',
                tags: ['crud', 'test']
            };

            const createdTask = await todoRepository.create(taskData);
            if (!createdTask.id || createdTask.title !== taskData.title) {
                throw new Error('創建任務失敗');
            }

            // 測試讀取任務
            const readTask = await todoRepository.getById(createdTask.id);
            if (!readTask || readTask.id !== createdTask.id) {
                throw new Error('讀取任務失敗');
            }

            // 測試更新任務
            const updatedTask = await todoRepository.update(createdTask.id, {
                title: '更新後的標題',
                description: '更新後的描述',
                priority: 'medium'
            });
            if (updatedTask.title !== '更新後的標題' || updatedTask.priority !== 'medium') {
                throw new Error('更新任務失敗');
            }

            // 測試切換完成狀態
            const completedTask = await todoRepository.toggleComplete(updatedTask.id);
            if (!completedTask.completed || !completedTask.completedAt) {
                throw new Error('切換完成狀態失敗');
            }

            // 測試再次切換（取消完成）
            const uncompletedTask = await todoRepository.toggleComplete(completedTask.id);
            if (uncompletedTask.completed || uncompletedTask.completedAt) {
                throw new Error('取消完成狀態失敗');
            }

            // 測試獲取所有任務
            const allTasks = await todoRepository.getAll();
            if (!Array.isArray(allTasks) || allTasks.length === 0) {
                throw new Error('獲取所有任務失敗');
            }

            // 檢查創建的任務是否在列表中
            const foundInAll = allTasks.some(task => task.id === updatedTask.id);
            if (!foundInAll) {
                throw new Error('創建的任務未在所有任務列表中');
            }

            // 測試刪除任務
            const deleteResult = await todoRepository.delete(updatedTask.id);
            if (!deleteResult) {
                throw new Error('刪除任務失敗');
            }

            // 驗證刪除後不存在
            const deletedTask = await todoRepository.getById(updatedTask.id);
            if (deletedTask) {
                throw new Error('刪除後任務仍然存在');
            }

            this.log('所有 CRUD 操作測試通過');
            this.passTest();

        } catch (error) {
            this.failTest(error);
        }
    }

    /**
     * 測試數據查詢和過濾
     */
    async testDataQuery() {
        this.startTest('Data Query and Filtering');
        try {
            // 創建測試數據
            const testTasks = [];

            // 高優先級任務
            const highPriorityTask = await todoRepository.create({
                title: '高優先級任務',
                priority: 'high',
                category: 'work',
                tags: ['important', 'work']
            });
            testTasks.push(highPriorityTask);

            // 低優先級任務
            const lowPriorityTask = await todoRepository.create({
                title: '低優先級任務',
                priority: 'low',
                category: 'personal',
                tags: ['personal', 'relaxed']
            });
            testTasks.push(lowPriorityTask);

            // 已完成任務
            const completedTask = await todoRepository.create({
                title: '已完成任務',
                priority: 'medium',
                category: 'work',
                tags: ['done'],
                completed: true
            });
            testTasks.push(completedTask);

            // 帶截止日期的任務
            const dueDateTask = await todoRepository.create({
                title: '帶截止日期任務',
                priority: 'medium',
                category: 'urgent',
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                tags: ['deadline']
            });
            testTasks.push(dueDateTask);

            // 測試按優先級篩選
            const highPriorityTasks = await todoRepository.getByPriority('high');
            if (highPriorityTasks.length === 0 || highPriorityTasks[0].priority !== 'high') {
                throw new Error('按優先級篩選失敗');
            }

            // 測試按分類篩選
            const workTasks = await todoRepository.getByCategory('work');
            if (workTasks.length < 2) {
                throw new Error('按分類篩選失敗');
            }

            // 測試搜索功能
            const searchResults = await todoRepository.search('高優先級');
            if (searchResults.length === 0 || !searchResults[0].title.includes('高優先級')) {
                throw new Error('搜索功能失敗');
            }

            // 測試按完成狀態篩選
            const activeTasks = await todoRepository.getAll({ completed: false });
            const completedTasks = await todoRepository.getAll({ completed: true });

            if (activeTasks.length < 3 || completedTasks.length !== 1) {
                throw new Error('按完成狀態篩選失敗');
            }

            // 測試標籤篩選
            const taggedTasks = await todoRepository.getAll({ tags: ['work'] });
            if (taggedTasks.length < 2) {
                throw new Error('標籤篩選失敗');
            }

            // 測試多條件篩選
            const filteredTasks = await todoRepository.getAll({
                priority: 'medium',
                category: 'work'
            });
            if (filteredTasks.length !== 1) {
                throw new Error('多條件篩選失敗');
            }

            // 測試排序
            const sortedByPriority = await todoRepository.getAll({
                sortBy: 'priority',
                sortOrder: 'desc'
            });
            if (sortedByPriority[0].priority !== 'high') {
                throw new Error('排序功能失敗');
            }

            // 測試統計功能
            const stats = await todoRepository.getStats();
            if (stats.total < 4 || stats.byPriority.high === 0) {
                throw new Error('統計功能失敗');
            }

            // 測試分頁
            const pagedTasks = await todoRepository.getAll({
                page: 0,
                pageSize: 2
            });
            if (pagedTasks.length !== 2) {
                throw new Error('分頁功能失敗');
            }

            // 清理測試數據
            for (const task of testTasks) {
                await todoRepository.delete(task.id);
            }

            this.log('所有數據查詢和過濾測試通過');
            this.passTest();

        } catch (error) {
            this.failTest(error);
        }
    }

    /**
     * 測試事件系統整合
     */
    async testEventIntegration() {
        this.startTest('Event System Integration');
        try {
            let eventsFired = [];
            let eventTasks = [];

            // 監聽所有相關事件
            const eventTypes = [
                'todo:added',
                'todo:updated',
                'todo:deleted',
                'todo:completed',
                'todo:uncompleted'
            ];

            eventTypes.forEach(eventType => {
                todoRepository.on(eventType, (task) => {
                    eventsFired.push(eventType);
                    eventTasks.push(task);
                });
            });

            // 創建任務觸發 added 事件
            const task = await todoRepository.create({
                title: '事件測試任務',
                description: '用來測試事件系統的任務'
            });

            // 等待事件處理
            await new Promise(resolve => setTimeout(resolve, 50));

            if (!eventsFired.includes('todo:added')) {
                throw new Error('任務添加事件未觸發');
            }

            // 更新任務觸發 updated 事件
            await todoRepository.update(task.id, { title: '更新後的標題' });
            await new Promise(resolve => setTimeout(resolve, 50));

            if (!eventsFired.includes('todo:updated')) {
                throw new Error('任務更新事件未觸發');
            }

            // 完成任務觸發 completed 事件
            await todoRepository.toggleComplete(task.id);
            await new Promise(resolve => setTimeout(resolve, 50));

            if (!eventsFired.includes('todo:completed')) {
                throw new Error('任務完成事件未觸發');
            }

            // 取消完成觸發 uncompleted 事件
            await todoRepository.toggleComplete(task.id);
            await new Promise(resolve => setTimeout(resolve, 50));

            if (!eventsFired.includes('todo:uncompleted')) {
                throw new Error('任務取消完成事件未觸發');
            }

            // 刪除任務觸發 deleted 事件
            await todoRepository.delete(task.id);
            await new Promise(resolve => setTimeout(resolve, 50));

            if (!eventsFired.includes('todo:deleted')) {
                throw new Error('任務刪除事件未觸發');
            }

            // 驗證事件數據
            const addedEventIndex = eventsFired.indexOf('todo:added');
            const addedTask = eventTasks[addedEventIndex];
            if (!addedTask || addedTask.title !== '事件測試任務') {
                throw new Error('事件數據不正確');
            }

            // 測試事件監聽器移除
            let listenerCalled = false;
            const testListener = () => { listenerCalled = true; };

            todoRepository.on('test-remove', testListener);
            todoRepository.emit('test-remove');
            todoRepository.off('test-remove', testListener);
            todoRepository.emit('test-remove');

            if (listenerCalled) {
                throw new Error('事件監聽器移除失敗');
            }

            this.log('所有事件系統整合測試通過');
            this.passTest();

        } catch (error) {
            this.failTest(error);
        }
    }

    /**
     * 測試數據持久化
     */
    async testDataPersistence() {
        this.startTest('Data Persistence');
        try {
            // 創建測試任務
            const originalTask = await todoRepository.create({
                title: '持久化測試任務',
                description: '測試數據持久化功能',
                priority: 'high',
                category: 'persistence-test'
            });

            // 重新初始化倉儲（模擬應用重啟）
            todoRepository.dispose();
            const newRepository = (await import('./js/repositories/TodoRepository.js')).default;

            // 重新初始化
            await newRepository.initialize();

            // 驗證數據是否存在
            const persistedTask = await newRepository.getById(originalTask.id);
            if (!persistedTask || persistedTask.title !== originalTask.title) {
                throw new Error('數據持久化失敗');
            }

            // 驗證所有數據是否完整
            const allTasks = await newRepository.getAll();
            const foundTask = allTasks.find(task => task.id === originalTask.id);
            if (!foundTask || foundTask.description !== originalTask.description) {
                throw new Error('持久化數據不完整');
            }

            // 清理測試數據
            await newRepository.delete(originalTask.id);

            // 恢復全局實例
            window.todoRepository = newRepository;

            this.log('數據持久化測試通過');
            this.passTest();

        } catch (error) {
            this.failTest(error);
        }
    }

    /**
     * 測試備份和恢復功能
     */
    async testBackupAndRestore() {
        this.startTest('Backup and Restore');
        try {
            // 創建測試數據
            const testTasks = [];
            for (let i = 0; i < 3; i++) {
                const task = await todoRepository.create({
                    title: `備份測試任務 ${i + 1}`,
                    description: `這是第 ${i + 1} 個備份測試任務`,
                    priority: ['low', 'medium', 'high'][i],
                    category: 'backup-test',
                    tags: [`backup`, `test${i + 1}`]
                });
                testTasks.push(task);
            }

            // 獲取當前任務數量
            const beforeExportCount = (await todoRepository.getAll()).length;

            // 測試匯出功能
            const exportData = await todoRepository.export();
            if (!exportData.tasks || !Array.isArray(exportData.tasks)) {
                throw new Error('匯出數據格式錯誤');
            }

            if (exportData.tasks.length < testTasks.length) {
                throw new Error('匯出數據不完整');
            }

            if (!exportData.version || !exportData.exportedAt) {
                throw new Error('匯出元數據缺失');
            }

            // 清除所有數據
            await todoRepository.deleteAll();
            let afterClearCount = (await todoRepository.getAll()).length;
            if (afterClearCount !== 0) {
                throw new Error('清除數據失敗');
            }

            // 測試匯入功能
            const importResult = await todoRepository.import(exportData);
            if (!importResult.success || importResult.imported === 0) {
                throw new Error('匯入功能失敗');
            }

            // 驗證匯入的數據
            const afterImportCount = (await todoRepository.getAll()).length;
            if (afterImportCount < testTasks.length) {
                throw new Error('匯入數據不完整');
            }

            // 驗證具體任務是否正確匯入
            for (const originalTask of testTasks) {
                const importedTask = await todoRepository.getById(originalTask.id);
                if (!importedTask || importedTask.title !== originalTask.title) {
                    throw new Error('匯入的任務數據不正確');
                }
            }

            // 測試替換模式匯入
            const replaceResult = await todoRepository.import(exportData, { replaceExisting: true });
            if (!replaceResult.success) {
                throw new Error('替換模式匯入失敗');
            }

            // 測試匯入無效數據
            const invalidImportResult = await todoRepository.import([{ invalid: 'data' }]);
            if (invalidImportResult.success || invalidImportResult.imported > 0) {
                throw new Error('無效數據不應該成功匯入');
            }

            // 清理測試數據
            for (const task of testTasks) {
                await todoRepository.delete(task.id);
            }

            this.log('所有備份和恢復測試通過');
            this.passTest();

        } catch (error) {
            this.failTest(error);
        }
    }

    /**
     * 顯示測試摘要
     */
    displayTestSummary() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(test => test.passed).length;
        const failedTests = totalTests - passedTests;
        const totalDuration = this.testResults.reduce((sum, test) => sum + (test.duration || 0), 0);

        console.log('\n📊 測試摘要');
        console.log('='.repeat(50));
        console.log(`總測試數: ${totalTests}`);
        console.log(`通過: ${passedTests} ✅`);
        console.log(`失敗: ${failedTests} ❌`);
        console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        console.log(`總耗時: ${totalDuration}ms`);

        console.log('\n📋 詳細結果:');
        this.testResults.forEach((test, index) => {
            const status = test.passed ? '✅' : '❌';
            const duration = test.duration ? ` (${test.duration}ms)` : '';
            console.log(`${index + 1}. ${status} ${test.name}${duration}`);
            if (!test.passed && test.error) {
                console.log(`   錯誤: ${test.error}`);
            }
        });

        if (failedTests === 0) {
            console.log('\n🎉 所有測試通過！數據層實現驗證成功！');
        } else {
            console.log(`\n⚠️ 有 ${failedTests} 個測試失敗，需要檢查實現。`);
        }

        console.log('\n' + '='.repeat(50));
    }

    /**
     * 獲取測試結果
     */
    getResults() {
        return {
            total: this.testResults.length,
            passed: this.testResults.filter(test => test.passed).length,
            failed: this.testResults.filter(test => !test.passed).length,
            duration: this.testResults.reduce((sum, test) => sum + (test.duration || 0), 0),
            results: this.testResults
        };
    }
}

// 創建測試套件實例
const testSuite = new DataLayerTestSuite();

// 導出測試套件
export default testSuite;

// 如果直接運行此檔案，執行測試
if (typeof window !== 'undefined') {
    window.testDataLayer = () => testSuite.runAllTests();
    window.getTestResults = () => testSuite.getResults();

    console.log('🗂️ 數據層測試套件已載入');
    console.log('在控制台中運行 testDataLayer() 來執行測試');
    console.log('運行 getTestResults() 來查看測試結果');
}