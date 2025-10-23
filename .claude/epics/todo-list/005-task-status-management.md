---
type: task
id: 005
title: Task Status Management
epic: todo-list
status: pending
priority: high
assignee: ""
labels: ["frontend", "state-management", "ui"]
created_at: 2025-10-23
updated_at: 2025-10-23
estimated_hours: 6
actual_hours: 0
story_points: 3
dependencies: ["001", "002", "003", "004"]
blockers: []
related_tasks: ["006"]
---

## 任務描述

實現任務完成狀態的切換功能，包括視覺回饋和狀態持久化。這個任務專注於用戶交互體驗，讓用戶能夠直觀地標記任務為已完成或未完成，並提供即時的視覺反饋。

## 驗收標準

### 功能需求
- [ ] 用戶能夠點擊切換任務的完成狀態
- [ ] 狀態變更能即時保存到後端
- [ ] 提供清晰的視覺回饋（勾選框、動畫效果）
- [ ] 支持批量狀態操作（全選、反選）
- [ ] 狀態變更歷史記錄
- [ ] 頁面刷新後狀態保持一致

### 交互需求
- [ ] 流暢的狀態切換動畫
- [ ] 觸摸設備友好
- [ ] 鍵盤導航支持
- [ ] 拖拽重新排序功能
- [ ] 長按操作支持

### 視覺需求
- [ ] 已完成任務的視覺區分（刪除線、透明度）
- [ ] 狀態圖標清晰可辨
- [ ] 顏色對比度符合 WCAG 標準
- [ ] 響應式設計適配
- [ ] 深色模式支持

## 技術實現細節

### 後端實現

#### 狀態更新 API
```typescript
// 專門的狀態更新端點
PATCH /api/tasks/:id/status
{
  completed: boolean;
  completedAt?: Date;
}

// 批量狀態更新
PATCH /api/tasks/status
{
  taskIds: string[];
  completed: boolean;
}
```

#### 狀態變更歷史
```typescript
interface TaskStatusHistory {
  id: string;
  taskId: string;
  fromStatus: boolean;
  toStatus: boolean;
  changedAt: Date;
  userId: string;
}
```

#### 數據庫更新
```sql
-- 添加狀態變更時間戳
ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP;

-- 創建狀態歷史表
CREATE TABLE task_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id),
  from_status BOOLEAN NOT NULL,
  to_status BOOLEAN NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id UUID NOT NULL REFERENCES users(id)
);
```

### 前端實現

#### 狀態管理組件
```typescript
// 狀態切換組件
interface TaskStatusToggleProps {
  task: Task;
  onStatusChange: (taskId: string, completed: boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// 批量操作組件
interface BatchStatusActionsProps {
  selectedTasks: string[];
  onBatchStatusChange: (taskIds: string[], completed: boolean) => void;
}
```

#### 視覺設計系統
```typescript
// 狀態相關樣式
const statusStyles = {
  checkbox: {
    size: {
      small: '16px',
      medium: '20px',
      large: '24px'
    },
    colors: {
      default: '#e2e8f0',
      checked: '#3b82f6',
      hover: '#60a5fa',
      disabled: '#94a3b8'
    }
  },
  taskItem: {
    completed: {
      opacity: 0.6,
      textDecoration: 'line-through',
      color: '#64748b'
    },
    transition: 'all 0.2s ease-in-out'
  }
};
```

#### 動畫系統
```typescript
// 狀態切換動畫
const statusAnimations = {
  checkbox: {
    check: 'checkbox-check 0.2s ease-in-out',
    uncheck: 'checkbox-uncheck 0.2s ease-in-out'
  },
  taskItem: {
    complete: 'task-complete 0.3s ease-in-out',
    incomplete: 'task-incomplete 0.3s ease-in-out'
  }
};
```

### 用戶交互設計

#### 觸摸友好設計
```css
/* 觸摸目標最小尺寸 44x44px */
.task-checkbox {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 觸摸回饋效果 */
.task-checkbox:active {
  transform: scale(0.95);
  transition: transform 0.1s ease-in-out;
}
```

#### 鍵盤導航
```typescript
// 鍵盤快捷鍵支持
const keyboardShortcuts = {
  'Space': () => toggleCurrentTaskStatus(),
  'Enter': () => toggleCurrentTaskStatus(),
  'Ctrl+A': () => selectAllTasks(),
  'Ctrl+D': () => deselectAllTasks(),
  'Ctrl+Enter': () => markSelectedAsCompleted()
};
```

#### 拖拽排序
```typescript
// 拖拽重新排序功能
interface DragDropConfig {
  onDragStart: (taskId: string) => void;
  onDragEnd: (sourceIndex: number, targetIndex: number) => void;
  onDragOver: (index: number) => void;
  dropZone: boolean;
}
```

## 實現步驟

### 第一階段：基礎狀態切換（2 小時）
1. 實現後端狀態更新 API
2. 開發前端狀態切換組件
3. 整合前後端狀態同步
4. 添加基礎視覺回饋

### 第二階段：視覺和動畫優化（2 小時）
1. 設計狀態切換動畫
2. 實現已完成任務的視覺區分
3. 優化觸摸交互體驗
4. 添加音效和觸覺回饋（可選）

### 第三階段：高級功能（2 小時）
1. 實現批量狀態操作
2. 添加狀態變更歷史
3. 開發拖拽排序功能
4. 實現鍵盤導航支持

## 依賴關係

- **任務 001**: 項目基礎架構設置
- **任務 002**: 數據庫架構設計
- **任務 003**: 前端組件架構
- **任務 004**: Task CRUD Operations - 提供基礎的任務操作功能

## 技術挑戰與解決方案

### 挑戰 1: 狀態同步一致性
**問題**: 多個客戶端同時操作同一任務時的狀態衝突
**解決方案**:
- 實施樂觀鎖定機制
- 使用 WebSocket 實時同步
- 提供衝突解決 UI

### 挑戰 2: 性能優化
**問題**: 大量任務的狀態更新性能問題
**解決方案**:
- 實施批量更新 API
- 使用防抖技術
- 實施虛擬滾動

### 挑戰 3: 觸摸體驗
**問題**: 移動設備上的觸摸體驗不佳
**解決方案**:
- 優化觸摸目標尺寸
- 添加觸覺回饋
- 實施手勢識別

## 測試策略

### 單元測試
```typescript
describe('TaskStatusToggle', () => {
  test('should toggle task status correctly');
  test('should call onStatusChange with correct parameters');
  test('should handle disabled state');
  test('should render different sizes correctly');
});
```

### 集成測試
```typescript
describe('Task Status Management Integration', () => {
  test('should sync status change with backend');
  test('should handle network errors gracefully');
  test('should update UI correctly after status change');
});
```

### E2E 測試
```typescript
describe('Task Status Management E2E', () => {
  test('should toggle task status via click');
  test('should toggle multiple tasks via batch operation');
  test('should maintain status after page refresh');
  test('should work correctly on mobile devices');
});
```

## 性能指標

### 響應時間
- 狀態切換響應時間: < 100ms
- 批量操作響應時間: < 500ms
- 動畫幀率: > 60fps

### 用戶體驗指標
- 觸摸響應時間: < 50ms
- 視覺回饋延遲: < 16ms (一幀)
- 錯誤恢復時間: < 1s

## 完成定義

任務完成時必須滿足以下條件：

1. **功能完整性**
   - 所有狀態切換功能正常工作
   - 批量操作功能可用
   - 視覺回饋準確及時

2. **用戶體驗**
   - 交互流暢自然
   - 響應式設計完善
   - 無障礙訪問支持

3. **性能標準**
   - 滿足所有性能指標
   - 動畫流暢不卡頓
   - 大量數據下性能穩定

4. **代碼品質**
   - 測試覆蓋率 > 85%
   - 代碼審查通過
   - 文檔齊全

## 驗證方法

### 自動化測試
```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:accessibility
```

### 性能測試
```bash
npm run test:performance
npm run test:lighthouse
```

### 手動測試清單
- [ ] 點擊切換單個任務狀態
- [ ] 批量選擇並切換多個任務
- [ ] 拖拽重新排序任務
- [ ] 鍵盤導航操作
- [ ] 移動設備觸摸操作
- [ ] 狀態持久化驗證

## 後續工作

此任務完成後，將為以下功能奠定基礎：
- **任務 006**: Task Editing & Deletion - 基於狀態管理實現編輯功能
- 統計和報表功能
- 任務篩選和搜索
- 協作功能

---

*創建時間: 2025-10-23*
*最後更新: 2025-10-23*