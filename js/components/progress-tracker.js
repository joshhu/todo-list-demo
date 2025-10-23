/**
 * 任務進度追蹤組件
 *
 * 負責顯示任務進度的視覺化資訊，包括：
 * - 整體進度條
 * - 狀態統計圖表
 * - 每日/每週統計
 * - 生產力趨勢
 * - 目標設定和追蹤
 */

export class ProgressTracker {
  constructor(elements, utils, storage) {
    this.elements = elements;
    this.utils = utils;
    this.storage = storage;
    this.currentStats = null;
    this.dailyGoal = null;
    this.weeklyGoal = null;
    this.chartInstance = null;
  }

  /**
   * 初始化進度追蹤器
   */
  async initialize() {
    // 載入目標設定
    this.loadGoals();

    // 監聽統計更新事件
    this.bindEventListeners();

    // 初始化圖表
    this.initializeCharts();

    // 更新進度顯示
    await this.updateProgressDisplay();

    console.log('✅ 進度追蹤器初始化完成');
  }

  /**
   * 綁定事件監聽器
   */
  bindEventListeners() {
    // 監聽任務狀態變更
    document.addEventListener('taskStatusChanged', () => {
      this.updateProgressDisplay();
    });

    document.addEventListener('batchStatusChanged', () => {
      this.updateProgressDisplay();
    });

    document.addEventListener('statisticsUpdated', (event) => {
      this.handleStatisticsUpdate(event.detail);
    });

    // 監聽目標設定變更
    this.storage.settings.onChange('goals.daily', (goal) => {
      this.dailyGoal = goal;
      this.updateProgressDisplay();
    });

    this.storage.settings.onChange('goals.weekly', (goal) => {
      this.weeklyGoal = goal;
      this.updateProgressDisplay();
    });
  }

  /**
   * 載入目標設定
   */
  loadGoals() {
    this.dailyGoal = this.storage.settings.get('goals.daily', 5);
    this.weeklyGoal = this.storage.settings.get('goals.weekly', 25);
  }

  /**
   * 初始化圖表
   */
  initializeCharts() {
    // 初始化進度圖表容器
    this.createProgressChart();
    this.createTrendChart();
    this.createActivityHeatmap();
  }

  /**
   * 創建進度圖表
   */
  createProgressChart() {
    const container = document.getElementById('progressChart');
    if (!container) return;

    // 清空容器
    container.textContent = '';

    // 使用安全的 DOM 方法創建元素
    const chartContainer = this.createElement('div', ['progress-chart-container']);

    const title = this.createElement('h3', ['chart-title']);
    title.textContent = '任務完成進度';
    chartContainer.appendChild(title);

    // 進度條容器
    const progressBarContainer = this.createElement('div', ['progress-bar-container']);
    const progressBar = this.createElement('div', ['progress-bar'], { id: 'mainProgressBar' });
    const progressFill = this.createElement('div', ['progress-fill'], { id: 'mainProgressFill' });
    const progressText = this.createElement('span', ['progress-text'], { id: 'mainProgressText' });
    progressText.textContent = '0%';

    progressBar.appendChild(progressFill);
    progressBar.appendChild(progressText);
    progressBarContainer.appendChild(progressBar);
    chartContainer.appendChild(progressBarContainer);

    // 統計資料
    const progressStats = this.createElement('div', ['progress-stats'], { id: 'progressStats' });

    const statItems = [
      { label: '已完成', id: 'completedCount' },
      { label: '總任務', id: 'totalCount' },
      { label: '完成率', id: 'completionRate' }
    ];

    statItems.forEach(item => {
      const statItem = this.createElement('div', ['stat-item']);
      const statLabel = this.createElement('span', ['stat-label']);
      statLabel.textContent = item.label;
      const statValue = this.createElement('span', ['stat-value'], { id: item.id });
      statValue.textContent = '0';

      statItem.appendChild(statLabel);
      statItem.appendChild(statValue);
      progressStats.appendChild(statItem);
    });

    chartContainer.appendChild(progressStats);
    container.appendChild(chartContainer);
  }

  /**
   * 創建趨勢圖表
   */
  createTrendChart() {
    const container = document.getElementById('trendChart');
    if (!container) return;

    container.textContent = '';

    const trendContainer = this.createElement('div', ['trend-chart-container']);

    const title = this.createElement('h3', ['chart-title']);
    title.textContent = '7天完成趨勢';
    trendContainer.appendChild(title);

    const chart = this.createElement('div', ['trend-chart'], { id: 'trendChartCanvas' });
    trendContainer.appendChild(chart);

    container.appendChild(trendContainer);
  }

  /**
   * 創建活動熱力圖
   */
  createActivityHeatmap() {
    const container = document.getElementById('activityHeatmap');
    if (!container) return;

    container.textContent = '';

    const heatmapContainer = this.createElement('div', ['heatmap-container']);

    const title = this.createElement('h3', ['chart-title']);
    title.textContent = '活動熱力圖';
    heatmapContainer.appendChild(title);

    const heatmapGrid = this.createElement('div', ['heatmap-grid'], { id: 'heatmapGrid' });
    heatmapContainer.appendChild(heatmapGrid);

    // 圖例
    const legend = this.createElement('div', ['heatmap-legend']);

    const leftLabel = this.createElement('span', ['legend-item']);
    leftLabel.textContent = '少';
    legend.appendChild(leftLabel);

    const colorContainer = this.createElement('div', ['legend-colors']);
    for (let i = 0; i <= 4; i++) {
      const color = this.createElement('div', ['legend-color', `level-${i}`]);
      colorContainer.appendChild(color);
    }
    legend.appendChild(colorContainer);

    const rightLabel = this.createElement('span', ['legend-item']);
    rightLabel.textContent = '多';
    legend.appendChild(rightLabel);

    heatmapContainer.appendChild(legend);
    container.appendChild(heatmapContainer);
  }

  /**
   * 安全地創建元素
   */
  createElement(tag, classes = [], attributes = {}) {
    const element = document.createElement(tag);

    if (classes.length > 0) {
      element.classList.add(...classes);
    }

    Object.keys(attributes).forEach(key => {
      element.setAttribute(key, attributes[key]);
    });

    return element;
  }

  /**
   * 更新進度顯示
   */
  async updateProgressDisplay() {
    try {
      // 獲取最新統計資料
      const stats = this.storage.getTaskStats();
      const statusStats = this.storage.getStatusStatistics({
        startDate: this.getWeekStart(),
        endDate: new Date().toISOString()
      });

      this.currentStats = { basic: stats, status: statusStats };

      // 更新進度條
      this.updateProgressBar(stats);

      // 更新統計數字
      this.updateStatistics(stats);

      // 更新目標進度
      this.updateGoalProgress();

      // 更新圖表
      this.updateCharts();

    } catch (error) {
      console.error('更新進度顯示失敗:', error);
    }
  }

  /**
   * 更新進度條
   */
  updateProgressBar(stats) {
    const progressFill = document.getElementById('mainProgressFill');
    const progressText = document.getElementById('mainProgressText');

    if (progressFill && progressText) {
      const percentage = stats.completedPercentage;

      progressFill.style.width = `${percentage}%`;
      progressText.textContent = `${percentage}%`;

      // 根據完成率設置顏色
      if (percentage >= 80) {
        progressFill.style.backgroundColor = '#10b981'; // 綠色
      } else if (percentage >= 50) {
        progressFill.style.backgroundColor = '#3b82f6'; // 藍色
      } else if (percentage >= 30) {
        progressFill.style.backgroundColor = '#f59e0b'; // 黃色
      } else {
        progressFill.style.backgroundColor = '#ef4444'; // 紅色
      }
    }
  }

  /**
   * 更新統計數字
   */
  updateStatistics(stats) {
    const elements = {
      completedCount: document.getElementById('completedCount'),
      totalCount: document.getElementById('totalCount'),
      completionRate: document.getElementById('completionRate')
    };

    if (elements.completedCount) {
      elements.completedCount.textContent = stats.completed;
    }

    if (elements.totalCount) {
      elements.totalCount.textContent = stats.total;
    }

    if (elements.completionRate) {
      elements.completionRate.textContent = `${stats.completedPercentage}%`;
    }

    // 更新頁頭統計
    this.updateHeaderStats(stats);
  }

  /**
   * 更新頁頭統計
   */
  updateHeaderStats(stats) {
    if (this.elements.totalTasksCount) {
      this.elements.totalTasksCount.textContent = stats.total;
    }

    if (this.elements.completedTasksCount) {
      this.elements.completedTasksCount.textContent = stats.completed;
    }
  }

  /**
   * 更新目標進度
   */
  updateGoalProgress() {
    if (!this.currentStats) return;

    const { basic, status } = this.currentStats;
    const todayCompleted = this.getTodayCompletedCount();

    // 更新每日目標
    this.updateDailyGoalProgress(todayCompleted);

    // 更新每週目標
    this.updateWeeklyGoalProgress(status.completedTasks);
  }

  /**
   * 更新每日目標進度
   */
  updateDailyGoalProgress(completed) {
    const dailyProgressContainer = document.getElementById('dailyGoalProgress');
    if (!dailyProgressContainer || !this.dailyGoal) return;

    // 清空現有內容
    dailyProgressContainer.textContent = '';

    const percentage = Math.min((completed / this.dailyGoal) * 100, 100);
    const isGoalMet = completed >= this.dailyGoal;

    const goalProgress = this.createElement('div', ['goal-progress']);

    const goalHeader = this.createElement('div', ['goal-header']);

    const goalTitle = this.createElement('span', ['goal-title']);
    goalTitle.textContent = '今日目標';

    const goalStatus = this.createElement('span', ['goal-status']);
    if (isGoalMet) {
      goalStatus.classList.add('achieved');
      goalStatus.textContent = '🎉 達成!';
    } else {
      goalStatus.textContent = `${completed}/${this.dailyGoal}`;
    }

    goalHeader.appendChild(goalTitle);
    goalHeader.appendChild(goalStatus);
    goalProgress.appendChild(goalHeader);

    const goalBar = this.createElement('div', ['goal-bar']);
    const goalFill = this.createElement('div', ['goal-fill']);
    goalFill.style.width = `${percentage}%`;
    goalBar.appendChild(goalFill);
    goalProgress.appendChild(goalBar);

    dailyProgressContainer.appendChild(goalProgress);
  }

  /**
   * 更新每週目標進度
   */
  updateWeeklyGoalProgress(completed) {
    const weeklyProgressContainer = document.getElementById('weeklyGoalProgress');
    if (!weeklyProgressContainer || !this.weeklyGoal) return;

    // 清空現有內容
    weeklyProgressContainer.textContent = '';

    const percentage = Math.min((completed / this.weeklyGoal) * 100, 100);
    const isGoalMet = completed >= this.weeklyGoal;

    const goalProgress = this.createElement('div', ['goal-progress']);

    const goalHeader = this.createElement('div', ['goal-header']);

    const goalTitle = this.createElement('span', ['goal-title']);
    goalTitle.textContent = '本週目標';

    const goalStatus = this.createElement('span', ['goal-status']);
    if (isGoalMet) {
      goalStatus.classList.add('achieved');
      goalStatus.textContent = '🎉 達成!';
    } else {
      goalStatus.textContent = `${completed}/${this.weeklyGoal}`;
    }

    goalHeader.appendChild(goalTitle);
    goalHeader.appendChild(goalStatus);
    goalProgress.appendChild(goalHeader);

    const goalBar = this.createElement('div', ['goal-bar']);
    const goalFill = this.createElement('div', ['goal-fill']);
    goalFill.style.width = `${percentage}%`;
    goalBar.appendChild(goalFill);
    goalProgress.appendChild(goalBar);

    weeklyProgressContainer.appendChild(goalProgress);
  }

  /**
   * 更新圖表
   */
  updateCharts() {
    this.updateTrendChart();
    this.updateActivityHeatmap();
  }

  /**
   * 更新趨勢圖表
   */
  updateTrendChart() {
    const canvas = document.getElementById('trendChartCanvas');
    if (!canvas) return;

    // 清空現有內容
    canvas.textContent = '';

    // 獲取過去7天的數據
    const dailyData = this.getDailyCompletionData(7);

    // 創建條形圖容器
    const barsContainer = this.createElement('div', ['trend-chart-bars']);
    const labelsContainer = this.createElement('div', ['trend-chart-labels']);

    const maxValue = Math.max(...dailyData.map(d => d.count), 1);

    dailyData.forEach((data, index) => {
      const height = (data.count / maxValue) * 100;
      const isToday = data.date === this.getTodayString();

      // 創建條形
      const bar = this.createElement('div', ['trend-bar']);
      if (isToday) bar.classList.add('today');

      bar.style.height = `${height}%`;
      bar.style.left = `${index * 14.28}%`;
      bar.title = `${data.date}: ${data.count} 項完成`;

      const barValue = this.createElement('span', ['trend-bar-value']);
      barValue.textContent = data.count;
      bar.appendChild(barValue);

      barsContainer.appendChild(bar);

      // 創建標籤
      const label = this.createElement('span', ['trend-label']);
      label.textContent = data.shortDate;
      labelsContainer.appendChild(label);
    });

    canvas.appendChild(barsContainer);
    canvas.appendChild(labelsContainer);
  }

  /**
   * 更新活動熱力圖
   */
  updateActivityHeatmap() {
    const grid = document.getElementById('heatmapGrid');
    if (!grid) return;

    // 清空現有內容
    grid.textContent = '';

    // 獲取過去12週的數據
    const weeklyData = this.getWeeklyActivityData(12);

    weeklyData.forEach(week => {
      week.days.forEach(day => {
        const level = this.getActivityLevel(day.count);
        const cell = this.createElement('div', ['heatmap-cell', `level-${level}`]);

        cell.title = `${day.date}: ${day.count} 項任務`;
        cell.dataset.date = day.date;

        grid.appendChild(cell);
      });
    });
  }

  /**
   * 處理統計更新事件
   */
  handleStatisticsUpdate(detail) {
    const { basicStats, statusStats } = detail;
    this.currentStats = { basic: basicStats, status: statusStats };

    // 觸發進度更新
    this.updateProgressDisplay();
  }

  /**
   * 獲取今日完成數量
   */
  getTodayCompletedCount() {
    const today = this.getTodayString();
    const history = this.storage.getStatusHistory(null, {
      startDate: today,
      endDate: new Date().toISOString()
    });

    return history.filter(change => change.toStatus === 'completed').length;
  }

  /**
   * 獲取每日完成數據
   */
  getDailyCompletionData(days) {
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      const history = this.storage.getStatusHistory(null, {
        startDate: dateString,
        endDate: dateString + 'T23:59:59.999Z'
      });

      const completedCount = history.filter(change => change.toStatus === 'completed').length;

      data.push({
        date: dateString,
        shortDate: date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
        count: completedCount
      });
    }

    return data;
  }

  /**
   * 獲取每週活動數據
   */
  getWeeklyActivityData(weeks) {
    const data = [];
    const today = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));

      const weekData = {
        weekStart: weekStart.toISOString().split('T')[0],
        days: []
      };

      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(weekStart.getDate() + day);
        const dateString = currentDate.toISOString().split('T')[0];

        const history = this.storage.getStatusHistory(null, {
          startDate: dateString,
          endDate: dateString + 'T23:59:59.999Z'
        });

        const completedCount = history.filter(change => change.toStatus === 'completed').length;

        weekData.days.push({
          date: dateString,
          count: completedCount
        });
      }

      data.push(weekData);
    }

    return data;
  }

  /**
   * 獲取活動等級
   */
  getActivityLevel(count) {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 8) return 3;
    return 4;
  }

  /**
   * 獲取今天日期字符串
   */
  getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 獲取本週開始日期
   */
  getWeekStart() {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    return weekStart.toISOString();
  }

  /**
   * 導出統計報告
   */
  exportStatisticsReport() {
    if (!this.currentStats) {
      return null;
    }

    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        start: this.getWeekStart(),
        end: new Date().toISOString()
      },
      basicStats: this.currentStats.basic,
      statusStats: this.currentStats.status,
      goals: {
        daily: this.dailyGoal,
        weekly: this.weeklyGoal,
        dailyProgress: this.getTodayCompletedCount() / this.dailyGoal,
        weeklyProgress: this.currentStats.status.completedTasks / this.weeklyGoal
      },
      trends: {
        daily: this.getDailyCompletionData(7),
        weekly: this.getWeeklyActivityData(12)
      }
    };

    return report;
  }

  /**
   * 設置目標
   */
  setGoal(type, value) {
    if (type === 'daily') {
      this.dailyGoal = value;
      this.storage.settings.set('goals.daily', value);
    } else if (type === 'weekly') {
      this.weeklyGoal = value;
      this.storage.settings.set('goals.weekly', value);
    }

    this.updateProgressDisplay();
  }

  /**
   * 清理資源
   */
  destroy() {
    // 清理圖表實例
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    // 移除事件監聽器
    document.removeEventListener('taskStatusChanged', this.updateProgressDisplay.bind(this));
    document.removeEventListener('batchStatusChanged', this.updateProgressDisplay.bind(this));
    document.removeEventListener('statisticsUpdated', this.handleStatisticsUpdate.bind(this));
  }
}