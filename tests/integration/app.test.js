/**
 * 應用程式整合測試
 */

describe('App Integration', () => {
  let app;
  let mockStorage;
  let mockUI;
  let mockSettings;
  let mockUtils;

  beforeEach(() => {
    // 模擬依賴
    mockStorage = {
      getTasks: jest.fn(),
      addTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      searchTasks: jest.fn(),
      getTaskStats: jest.fn(),
      on: jest.fn()
    };

    mockUI = {
      setFilterCounts: jest.fn(),
      renderTasks: jest.fn(),
      showNotification: jest.fn(),
      currentFilter: 'all',
      currentSort: 'created-desc',
      searchQuery: '',
      selectedTasks: new Set(),
      clearSelection: jest.fn(),
      updateBulkActionsUI: jest.fn(),
      setActiveFilter: jest.fn(),
      on: jest.fn()
    };

    mockSettings = {
      get: jest.fn(),
      onChange: jest.fn()
    };

    mockUtils = {
      validateTaskTitle: jest.fn(),
      truncateString: jest.fn()
    };

    // 設定預設返回值
    mockStorage.getTasks.mockResolvedValue([]);
    mockStorage.getTaskStats.mockReturnValue({
      total: 0,
      completed: 0,
      pending: 0
    });
    mockSettings.get.mockReturnValue('medium');

    // 創建應用程式實例
    const { App } = require('../../js/modules/app.js');
    app = new App(mockSettings, mockStorage, mockUI, mockUtils);
  });

  describe('應用程式初始化', () => {
    test('應該成功初始化', async () => {
      await app.initialize();
      expect(app.isInitialized).toBe(true);
    });

    test('應該載入初始資料', async () => {
      const mockTasks = [
        { id: '1', title: 'Test Task 1', status: 'pending' },
        { id: '2', title: 'Test Task 2', status: 'completed' }
      ];
      mockStorage.getTasks.mockResolvedValue(mockTasks);

      await app.initialize();

      expect(mockStorage.getTasks).toHaveBeenCalled();
      expect(app.currentTasks).toEqual(mockTasks);
    });
  });

  describe('任務管理', () => {
    beforeEach(async () => {
      await app.initialize();
    });

    test('應該能添加任務', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        priority: 'high'
      };

      const newTask = {
        id: 'task-1',
        ...taskData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockStorage.addTask.mockResolvedValue(newTask);
      mockStorage.searchTasks.mockReturnValue([newTask]);

      await app.handleAddTask(taskData);

      expect(mockStorage.addTask).toHaveBeenCalledWith(taskData);
      expect(mockUI.renderTasks).toHaveBeenCalled();
      expect(mockUI.showNotification).toHaveBeenCalledWith('任務添加成功', 'success');
    });

    test('應該能更新任務', async () => {
      const taskId = 'task-1';
      const updates = { title: 'Updated Task' };

      const updatedTask = {
        id: taskId,
        title: 'Updated Task',
        status: 'pending'
      };

      mockStorage.updateTask.mockResolvedValue(updatedTask);
      mockStorage.searchTasks.mockReturnValue([updatedTask]);

      // 設定初始任務
      app.currentTasks = [{ id: taskId, title: 'Original Task', status: 'pending' }];

      await app.handleUpdateTask(taskId, updates);

      expect(mockStorage.updateTask).toHaveBeenCalledWith(taskId, updates);
      expect(mockUI.renderTasks).toHaveBeenCalled();
    });

    test('應該能刪除任務', async () => {
      const taskId = 'task-1';

      mockStorage.deleteTask.mockResolvedValue(true);
      mockStorage.searchTasks.mockReturnValue([]);

      // 設定初始任務
      app.currentTasks = [{ id: taskId, title: 'Test Task', status: 'pending' }];

      await app.handleDeleteTask(taskId);

      expect(mockStorage.deleteTask).toHaveBeenCalledWith(taskId);
      expect(mockUI.renderTasks).toHaveBeenCalled();
      expect(app.currentTasks).toHaveLength(0);
    });

    test('應該能切換任務狀態', async () => {
      const taskId = 'task-1';

      const updatedTask = {
        id: taskId,
        title: 'Test Task',
        status: 'completed'
      };

      mockStorage.toggleTaskStatus.mockResolvedValue(updatedTask);
      mockStorage.searchTasks.mockReturnValue([updatedTask]);

      // 設定初始任務
      app.currentTasks = [{ id: taskId, title: 'Test Task', status: 'pending' }];

      await app.handleToggleTask(taskId);

      expect(mockStorage.toggleTaskStatus).toHaveBeenCalledWith(taskId);
      expect(mockUI.renderTasks).toHaveBeenCalled();
    });
  });

  describe('搜尋和篩選', () => {
    beforeEach(async () => {
      await app.initialize();
    });

    test('應該能搜尋任務', () => {
      const searchOptions = {
        query: 'test',
        filter: 'all',
        sort: 'created-desc'
      };

      const searchResults = [
        { id: '1', title: 'Test Task', status: 'pending' }
      ];

      mockStorage.searchTasks.mockReturnValue(searchResults);

      app.handleSearch(searchOptions);

      expect(mockStorage.searchTasks).toHaveBeenCalledWith(searchOptions);
      expect(mockUI.renderTasks).toHaveBeenCalledWith(searchResults);
    });

    test('應該能篩選任務', () => {
      const filterOptions = {
        filter: 'completed',
        query: '',
        sort: 'created-desc'
      };

      const filteredTasks = [
        { id: '1', title: 'Completed Task', status: 'completed' }
      ];

      mockStorage.searchTasks.mockReturnValue(filteredTasks);

      app.handleFilter(filterOptions);

      expect(mockStorage.searchTasks).toHaveBeenCalledWith({
        query: '',
        status: 'completed',
        sortBy: 'created-desc'
      });
      expect(mockUI.renderTasks).toHaveBeenCalledWith(filteredTasks);
    });

    test('應該能排序任務', () => {
      const sortOption = 'priority-desc';
      const sortedTasks = [
        { id: '1', title: 'High Priority', priority: 'high' },
        { id: '2', title: 'Low Priority', priority: 'low' }
      ];

      mockStorage.searchTasks.mockReturnValue(sortedTasks);

      app.handleSort(sortOption);

      expect(mockStorage.searchTasks).toHaveBeenCalledWith({
        query: '',
        status: null,
        sortBy: sortOption
      });
      expect(mockUI.renderTasks).toHaveBeenCalledWith(sortedTasks);
    });
  });

  describe('批量操作', () => {
    beforeEach(async () => {
      await app.initialize();
    });

    test('應該能批量刪除任務', async () => {
      const taskIds = ['task-1', 'task-2'];

      mockStorage.deleteTasks.mockResolvedValue(2);
      mockStorage.searchTasks.mockReturnValue([]);

      // 設定初始任務
      app.currentTasks = [
        { id: 'task-1', title: 'Task 1', status: 'pending' },
        { id: 'task-2', title: 'Task 2', status: 'pending' }
      ];

      await app.handleDeleteTasks(taskIds);

      expect(mockStorage.deleteTasks).toHaveBeenCalledWith(taskIds);
      expect(mockUI.renderTasks).toHaveBeenCalled();
      expect(app.currentTasks).toHaveLength(0);
    });

    test('應該能批量更新任務狀態', async () => {
      const taskIds = ['task-1', 'task-2'];
      const status = 'completed';

      mockStorage.updateTask
        .mockResolvedValueOnce({ id: 'task-1', status: 'completed' })
        .mockResolvedValueOnce({ id: 'task-2', status: 'completed' });
      mockStorage.searchTasks.mockReturnValue([]);

      // 設定初始任務
      app.currentTasks = [
        { id: 'task-1', title: 'Task 1', status: 'pending' },
        { id: 'task-2', title: 'Task 2', status: 'pending' }
      ];

      await app.handleUpdateTasksStatus(taskIds, status);

      expect(mockStorage.updateTask).toHaveBeenCalledTimes(2);
      expect(mockUI.renderTasks).toHaveBeenCalled();
    });
  });

  describe('統計和更新', () => {
    beforeEach(async () => {
      await app.initialize();
    });

    test('應該正確更新篩選計數', () => {
      app.currentTasks = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'completed' },
        { id: '3', status: 'completed' }
      ];

      app.updateFilterCounts();

      expect(mockUI.setFilterCounts).toHaveBeenCalledWith({
        all: 3,
        active: 1,
        completed: 2
      });
    });

    test('應該正確渲染任務列表', () => {
      const tasks = [
        { id: '1', title: 'Task 1', status: 'pending' }
      ];

      mockStorage.searchTasks.mockReturnValue(tasks);

      app.renderTasks();

      expect(mockStorage.searchTasks).toHaveBeenCalledWith({
        query: '',
        status: null,
        sortBy: 'created-desc'
      });
      expect(mockUI.renderTasks).toHaveBeenCalledWith(tasks);
    });
  });

  describe('錯誤處理', () => {
    beforeEach(async () => {
      await app.initialize();
    });

    test('應該處理添加任務失敗', async () => {
      const taskData = { title: 'New Task' };
      const error = new Error('Storage error');

      mockStorage.addTask.mockRejectedValue(error);

      await app.handleAddTask(taskData);

      expect(mockUI.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('添加任務失敗'),
        'error'
      );
    });

    test('應該處理刪除任務失敗', async () => {
      const taskId = 'task-1';
      const error = new Error('Storage error');

      mockStorage.deleteTask.mockRejectedValue(error);

      await app.handleDeleteTask(taskId);

      expect(mockUI.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('刪除任務失敗'),
        'error'
      );
    });
  });

  describe('應用程式狀態', () => {
    beforeEach(async () => {
      await app.initialize();
    });

    test('應該正確返回應用程式狀態', () => {
      const state = app.getAppState();

      expect(state).toHaveProperty('isInitialized', true);
      expect(state).toHaveProperty('isOnline');
      expect(state).toHaveProperty('currentTasksCount');
      expect(state).toHaveProperty('currentFilter');
      expect(state).toHaveProperty('currentSort');
      expect(state).toHaveProperty('searchQuery');
      expect(state).toHaveProperty('selectedTasksCount');
    });

    test('應該能重新載入資料', async () => {
      const mockTasks = [{ id: '1', title: 'Reloaded Task' }];
      mockStorage.getTasks.mockResolvedValue(mockTasks);

      await app.reload();

      expect(mockStorage.getTasks).toHaveBeenCalled();
      expect(app.currentTasks).toEqual(mockTasks);
    });
  });
});