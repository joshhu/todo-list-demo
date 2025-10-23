/**
 * 編輯表單組件
 *
 * 負責處理任務的模態框編輯功能，包括：
 * - 動態表單生成
 * - 表單驗證和錯誤處理
 * - 自動完成建議
 * - 標籤管理
 * - 日期時間選擇器
 */

export class EditForm {
  constructor(elements, utils, storage) {
    this.elements = elements;
    this.utils = utils;
    this.storage = storage;

    // 表單狀態管理
    this.currentTask = null;
    this.isDirty = false;
    this.isSubmitting = false;
    this.validationErrors = new Map();
    this.autoSaveTimer = null;

    // 表單配置
    this.config = {
      autoSaveDelay: 5000,
      debounceDelay: 300,
      maxTags: 10,
      maxTagLength: 20,
      animationDuration: 200
    };

    // 標籤建議
    this.tagSuggestions = new Set();

    // 綁定事件處理器
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleTagInput = this.handleTagInput.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleAutoSave = this.handleAutoSave.bind(this);
  }

  /**
   * 初始化編輯表單
   */
  async initialize() {
    try {
      // 綁定事件監聽器
      this.bindEventListeners();

      // 創建模態框
      this.createEditModal();

      // 載入標籤建議
      await this.loadTagSuggestions();

      console.log('✅ 編輯表單初始化完成');
    } catch (error) {
      console.error('❌ 編輯表單初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 綁定事件監聽器
   */
  bindEventListeners() {
    // 全局鍵盤事件
    document.addEventListener('keydown', this.handleKeyDown);

    // 表單事件將在模態框創建後動態綁定
  }

  /**
   * 創建編輯模態框
   */
  createEditModal() {
    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'edit-modal-title');

    // 模態框內容
    const content = document.createElement('div');
    content.className = 'edit-modal__content';

    // 頭部
    const header = document.createElement('div');
    header.className = 'edit-modal__header';

    const title = document.createElement('h2');
    title.id = 'edit-modal-title';
    title.className = 'edit-modal__title';
    title.textContent = '編輯任務';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'edit-modal__close';
    closeBtn.setAttribute('aria-label', '關閉');
    closeBtn.textContent = '×';

    header.appendChild(title);
    header.appendChild(closeBtn);

    // 主體 - 表單
    const body = document.createElement('div');
    body.className = 'edit-modal__body';

    const form = this.createEditForm();
    body.appendChild(form);

    // 底部
    const footer = document.createElement('div');
    footer.className = 'edit-modal__footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn--secondary edit-modal__cancel';
    cancelBtn.textContent = '取消';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'btn btn--primary edit-modal__save';
    saveBtn.textContent = '保存';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn--danger edit-modal__delete';
    deleteBtn.textContent = '刪除';
    deleteBtn.setAttribute('data-action', 'delete');

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    footer.appendChild(deleteBtn);

    // 組裝模態框
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);

    // 背景遮罩
    const backdrop = document.createElement('div');
    backdrop.className = 'edit-modal__backdrop';

    modal.appendChild(content);
    modal.appendChild(backdrop);

    // 添加到 DOM
    document.body.appendChild(modal);
    this.elements.editModal = modal;

    // 綁定事件
    this.bindModalEvents();
  }

  /**
   * 創建編輯表單
   */
  createEditForm() {
    const form = document.createElement('form');
    form.className = 'edit-form';
    form.noValidate = true;

    // 標題字段
    const titleGroup = this.createFormField({
      id: 'task-title',
      label: '任務標題',
      type: 'text',
      required: true,
      maxLength: 255,
      placeholder: '輸入任務標題...',
      validation: {
        required: '任務標題不能為空',
        maxLength: '任務標題不能超過 255 個字符',
        pattern: {
          value: /^[^<>]*$/,
          message: '任務標題不能包含 HTML 標籤'
        }
      }
    });

    // 描述字段
    const descriptionGroup = this.createFormField({
      id: 'task-description',
      label: '任務描述',
      type: 'textarea',
      rows: 4,
      maxLength: 2000,
      placeholder: '輸入任務詳細描述...',
      validation: {
        maxLength: '任務描述不能超過 2000 個字符'
      }
    });

    // 優先級字段
    const priorityGroup = this.createFormField({
      id: 'task-priority',
      label: '優先級',
      type: 'select',
      options: [
        { value: 'low', label: '低' },
        { value: 'medium', label: '中' },
        { value: 'high', label: '高' }
      ],
      validation: {
        required: '請選擇優先級'
      }
    });

    // 截止日期字段
    const dueDateGroup = this.createFormField({
      id: 'task-due-date',
      label: '截止日期',
      type: 'datetime-local',
      validation: {
        date: '請輸入有效的日期'
      }
    });

    // 標籤字段
    const tagsGroup = this.createTagsField();

    // 組裝表單
    form.appendChild(titleGroup);
    form.appendChild(descriptionGroup);
    form.appendChild(priorityGroup);
    form.appendChild(dueDateGroup);
    form.appendChild(tagsGroup);

    return form;
  }

  /**
   * 創建表單字段
   */
  createFormField(config) {
    const group = document.createElement('div');
    group.className = 'form-group';

    // 標籤
    const label = document.createElement('label');
    label.htmlFor = config.id;
    label.className = 'form-label';
    label.textContent = config.label;

    if (config.required) {
      const required = document.createElement('span');
      required.className = 'form-required';
      required.textContent = ' *';
      label.appendChild(required);
    }

    // 輸入元素
    let input;
    if (config.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = config.rows || 3;
    } else if (config.type === 'select') {
      input = document.createElement('select');

      // 添加預設選項
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = '請選擇...';
      input.appendChild(defaultOption);

      // 添加選項
      if (config.options) {
        config.options.forEach(option => {
          const optionElement = document.createElement('option');
          optionElement.value = option.value;
          optionElement.textContent = option.label;
          input.appendChild(optionElement);
        });
      }
    } else {
      input = document.createElement('input');
      input.type = config.type;
    }

    // 設置通用屬性
    input.id = config.id;
    input.name = config.id.replace('task-', '');
    input.className = `form-input form-input--${config.type}`;
    input.placeholder = config.placeholder || '';

    if (config.required) {
      input.required = true;
    }

    if (config.maxLength) {
      input.maxLength = config.maxLength;
    }

    // 錯誤訊息容器
    const error = document.createElement('div');
    error.className = 'form-error';
    error.setAttribute('role', 'alert');

    // 字符計數器（如果有最大長度限制）
    let counter = null;
    if (config.maxLength) {
      counter = document.createElement('div');
      counter.className = 'form-counter';
      counter.textContent = `0 / ${config.maxLength}`;
    }

    // 組裝字段組
    group.appendChild(label);
    group.appendChild(input);
    group.appendChild(error);

    if (counter) {
      group.appendChild(counter);
    }

    // 保存配置引用
    group.fieldConfig = config;
    group.inputElement = input;
    group.errorElement = error;
    group.counterElement = counter;

    return group;
  }

  /**
   * 創建標籤字段
   */
  createTagsField() {
    const group = document.createElement('div');
    group.className = 'form-group';

    // 標籤
    const label = document.createElement('label');
    label.htmlFor = 'task-tags';
    label.className = 'form-label';
    label.textContent = '標籤';

    // 標籤輸入容器
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'tags-input-container';

    // 已選標籤容器
    const selectedTags = document.createElement('div');
    selectedTags.className = 'selected-tags';

    // 輸入框
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'task-tags';
    input.className = 'form-input tags-input';
    input.placeholder = '輸入標籤後按 Enter 添加...';

    // 建議下拉框
    const suggestions = document.createElement('div');
    suggestions.className = 'tag-suggestions';

    // 錯誤訊息
    const error = document.createElement('div');
    error.className = 'form-error';
    error.setAttribute('role', 'alert');

    // 說明文字
    const help = document.createElement('div');
    help.className = 'form-help';
    help.textContent = '按 Enter 添加標籤，最多 10 個，每個不超過 20 個字符';

    // 組裝
    tagsContainer.appendChild(selectedTags);
    tagsContainer.appendChild(input);
    tagsContainer.appendChild(suggestions);

    group.appendChild(label);
    group.appendChild(tagsContainer);
    group.appendChild(error);
    group.appendChild(help);

    // 保存引用
    group.inputElement = input;
    group.selectedTagsElement = selectedTags;
    group.suggestionsElement = suggestions;
    group.errorElement = error;

    return group;
  }

  /**
   * 綁定模態框事件
   */
  bindModalEvents() {
    const modal = this.elements.editModal;
    const form = modal.querySelector('.edit-form');
    const closeBtn = modal.querySelector('.edit-modal__close');
    const cancelBtn = modal.querySelector('.edit-modal__cancel');
    const saveBtn = modal.querySelector('.edit-modal__save');
    const deleteBtn = modal.querySelector('.edit-modal__delete');
    const backdrop = modal.querySelector('.edit-modal__backdrop');

    // 表單提交
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // 輸入變化事件
    form.addEventListener('input', this.handleInputChange);
    form.addEventListener('change', this.handleInputChange);

    // 標籤輸入事件
    const tagsInput = form.querySelector('#task-tags');
    tagsInput.addEventListener('input', this.handleTagInput);
    tagsInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addTagFromInput();
      }
    });

    // 按鈕事件
    closeBtn.addEventListener('click', this.handleCancel);
    cancelBtn.addEventListener('click', this.handleCancel);
    saveBtn.addEventListener('click', this.handleSubmit);
    deleteBtn.addEventListener('click', () => {
      if (this.currentTask) {
        this.dispatchFormEvent('deleteTask', { taskId: this.currentTask.id });
      }
    });

    // 背景點擊關閉
    backdrop.addEventListener('click', this.handleCancel);

    // ESC 鍵關閉
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleCancel();
      }
    });
  }

  /**
   * 打開編輯表單
   */
  open(taskId = null) {
    const modal = this.elements.editModal;
    const form = modal.querySelector('.edit-form');

    // 載入任務數據
    if (taskId) {
      this.currentTask = this.storage.tasks.find(t => t.id === taskId);
      if (!this.currentTask) {
        throw new Error('任務不存在');
      }
      this.populateForm(this.currentTask);
      modal.querySelector('.edit-modal__title').textContent = '編輯任務';
      modal.querySelector('.edit-modal__delete').style.display = 'block';
    } else {
      this.currentTask = null;
      this.resetForm();
      modal.querySelector('.edit-modal__title').textContent = '新增任務';
      modal.querySelector('.edit-modal__delete').style.display = 'none';
    }

    // 重置狀態
    this.isDirty = false;
    this.isSubmitting = false;
    this.clearValidationErrors();

    // 顯示模態框
    modal.classList.add('edit-modal--visible');

    // 聚焦到第一個輸入框
    const firstInput = form.querySelector('.form-input');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }

    // 開始自動保存
    this.startAutoSave();

    // 觸發打開事件
    this.dispatchFormEvent('formOpen', { taskId, isNew: !taskId });
  }

  /**
   * 關閉編輯表單
   */
  close() {
    const modal = this.elements.editModal;

    // 檢查是否有未保存的更改
    if (this.isDirty) {
      if (!confirm('您有未保存的更改，確定要關閉嗎？')) {
        return;
      }
    }

    // 停止自動保存
    this.stopAutoSave();

    // 添加關閉動畫
    modal.classList.remove('edit-modal--visible');

    // 延遲隱藏
    setTimeout(() => {
      modal.style.display = 'none';
    }, this.config.animationDuration);

    // 觸發關閉事件
    this.dispatchFormEvent('formClose', { taskId: this.currentTask?.id });
  }

  /**
   * 填充表單數據
   */
  populateForm(task) {
    const form = this.elements.editModal.querySelector('.edit-form');

    // 填充基本字段
    const titleInput = form.querySelector('#task-title');
    const descriptionInput = form.querySelector('#task-description');
    const priorityInput = form.querySelector('#task-priority');
    const dueDateInput = form.querySelector('#task-due-date');

    if (titleInput) titleInput.value = task.title || '';
    if (descriptionInput) descriptionInput.value = task.description || '';
    if (priorityInput) priorityInput.value = task.priority || '';
    if (dueDateInput && task.dueDate) {
      dueDateInput.value = new Date(task.dueDate).toISOString().slice(0, 16);
    }

    // 填充標籤
    if (task.tags && Array.isArray(task.tags)) {
      this.setSelectedTags(task.tags);
    }

    // 更新字符計數器
    this.updateCounters();
  }

  /**
   * 重置表單
   */
  resetForm() {
    const form = this.elements.editModal.querySelector('.edit-form');
    form.reset();

    // 清除標籤
    this.setSelectedTags([]);

    // 更新字符計數器
    this.updateCounters();
  }

  /**
   * 處理表單提交
   */
  async handleSubmit() {
    if (this.isSubmitting) return;

    const form = this.elements.editModal.querySelector('.edit-form');

    // 驗證表單
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;

    // 禁用提交按鈕
    const saveBtn = form.querySelector('.edit-modal__save');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
      // 收集表單數據
      const formData = this.collectFormData();

      // 保存任務
      if (this.currentTask) {
        // 更新現有任務
        await this.storage.updateTask(this.currentTask.id, formData);
        this.dispatchFormEvent('taskUpdated', {
          taskId: this.currentTask.id,
          changes: formData
        });
      } else {
        // 創建新任務
        const newTask = await this.storage.createTask(formData);
        this.dispatchFormEvent('taskCreated', {
          task: newTask
        });
      }

      // 關閉表單
      this.close();

    } catch (error) {
      console.error('保存任務失敗:', error);
      this.showNotification('保存失敗，請重試', 'error');
    } finally {
      this.isSubmitting = false;
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  }

  /**
   * 處理取消
   */
  handleCancel() {
    this.close();
  }

  /**
   * 處理輸入變化
   */
  handleInputChange(e) {
    this.isDirty = true;

    // 實時驗證
    if (e.target.classList.contains('form-input')) {
      this.validateField(e.target);
    }

    // 更新字符計數器
    if (e.target.maxLength) {
      this.updateCounter(e.target);
    }

    // 重啟自動保存
    this.restartAutoSave();
  }

  /**
   * 處理標籤輸入
   */
  handleTagInput(e) {
    const value = e.target.value.trim();
    const suggestionsElement = e.target.parentElement.querySelector('.tag-suggestions');

    if (value.length > 0) {
      // 顯示建議
      this.showTagSuggestions(value, suggestionsElement);
    } else {
      // 隱藏建議
      suggestionsElement.style.display = 'none';
    }
  }

  /**
   * 驗證表單
   */
  validateForm() {
    const form = this.elements.editModal.querySelector('.edit-form');
    const fields = form.querySelectorAll('.form-input');
    let isValid = true;

    this.clearValidationErrors();

    fields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    // 驗證標籤
    const tags = this.getSelectedTags();
    if (tags.length > this.config.maxTags) {
      this.showTagError(`最多只能添加 ${this.config.maxTags} 個標籤`);
      isValid = false;
    }

    return isValid;
  }

  /**
   * 驗證字段
   */
  validateField(field) {
    const formGroup = field.closest('.form-group');
    const config = formGroup.fieldConfig;
    const errorElement = formGroup.errorElement;

    if (!config || !config.validation) {
      return true;
    }

    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';

    // 必填驗證
    if (config.required && !value) {
      isValid = false;
      errorMessage = config.validation.required;
    }

    // 最大長度驗證
    if (isValid && config.maxLength && value.length > config.maxLength) {
      isValid = false;
      errorMessage = config.validation.maxLength;
    }

    // 正則表達式驗證
    if (isValid && config.validation.pattern && !config.validation.pattern.value.test(value)) {
      isValid = false;
      errorMessage = config.validation.pattern.message;
    }

    // 日期驗證
    if (isValid && field.type === 'datetime-local' && value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        isValid = false;
        errorMessage = config.validation.date;
      }
    }

    // 顯示或隱藏錯誤
    if (isValid) {
      field.classList.remove('form-input--error');
      errorElement.textContent = '';
      this.validationErrors.delete(field.id);
    } else {
      field.classList.add('form-input--error');
      errorElement.textContent = errorMessage;
      this.validationErrors.set(field.id, errorMessage);
    }

    return isValid;
  }

  /**
   * 清除驗證錯誤
   */
  clearValidationErrors() {
    this.validationErrors.clear();

    const form = this.elements.editModal.querySelector('.edit-form');
    const fields = form.querySelectorAll('.form-input');
    const errors = form.querySelectorAll('.form-error');

    fields.forEach(field => {
      field.classList.remove('form-input--error');
    });

    errors.forEach(error => {
      error.textContent = '';
    });
  }

  /**
   * 收集表單數據
   */
  collectFormData() {
    const form = this.elements.editModal.querySelector('.edit-form');
    const data = {};

    // 基本字段
    data.title = form.querySelector('#task-title').value.trim();
    data.description = form.querySelector('#task-description').value.trim();
    data.priority = form.querySelector('#task-priority').value;

    // 日期字段
    const dueDateInput = form.querySelector('#task-due-date');
    if (dueDateInput.value) {
      data.dueDate = new Date(dueDateInput.value).toISOString();
    }

    // 標籤
    data.tags = this.getSelectedTags();

    return data;
  }

  /**
   * 標籤相關方法
   */
  addTag(tagText) {
    const trimmed = tagText.trim();

    // 驗證標籤
    if (!trimmed) return false;
    if (trimmed.length > this.config.maxTagLength) {
      this.showTagError(`標籤長度不能超過 ${this.config.maxTagLength} 個字符`);
      return false;
    }

    const currentTags = this.getSelectedTags();
    if (currentTags.includes(trimmed)) {
      this.showTagError('該標籤已存在');
      return false;
    }

    if (currentTags.length >= this.config.maxTags) {
      this.showTagError(`最多只能添加 ${this.config.maxTags} 個標籤`);
      return false;
    }

    // 添加標籤
    this.addSelectedTag(trimmed);

    // 添加到建議列表
    this.tagSuggestions.add(trimmed);
    this.saveTagSuggestions();

    // 清空輸入框
    const input = this.elements.editModal.querySelector('#task-tags');
    input.value = '';
    input.focus();

    this.isDirty = true;
    return true;
  }

  addTagFromInput() {
    const input = this.elements.editModal.querySelector('#task-tags');
    const value = input.value.trim();

    if (value) {
      this.addTag(value);
    }

    // 隱藏建議
    const suggestions = input.parentElement.querySelector('.tag-suggestions');
    suggestions.style.display = 'none';
  }

  addSelectedTag(tagText) {
    const selectedTagsElement = this.elements.editModal.querySelector('.selected-tags');

    const tag = document.createElement('span');
    tag.className = 'selected-tag';
    tag.textContent = tagText;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'selected-tag__remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      this.removeSelectedTag(tag);
    });

    tag.appendChild(removeBtn);
    selectedTagsElement.appendChild(tag);
  }

  removeSelectedTag(tagElement) {
    tagElement.remove();
    this.isDirty = true;
  }

  getSelectedTags() {
    const tags = [];
    const tagElements = this.elements.editModal.querySelectorAll('.selected-tag');

    tagElements.forEach(element => {
      tags.push(element.textContent.replace('×', '').trim());
    });

    return tags;
  }

  setSelectedTags(tags) {
    const selectedTagsElement = this.elements.editModal.querySelector('.selected-tags');
    selectedTagsElement.innerHTML = '';

    tags.forEach(tag => {
      this.addSelectedTag(tag);
    });
  }

  showTagSuggestions(value, suggestionsElement) {
    const suggestions = Array.from(this.tagSuggestions)
      .filter(tag => tag.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 5);

    if (suggestions.length === 0) {
      suggestionsElement.style.display = 'none';
      return;
    }

    // 清除現有建議
    while (suggestionsElement.firstChild) {
      suggestionsElement.removeChild(suggestionsElement.firstChild);
    }

    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'tag-suggestion';
      item.textContent = suggestion;

      item.addEventListener('click', () => {
        this.addTag(suggestion);
        suggestionsElement.style.display = 'none';
      });

      suggestionsElement.appendChild(item);
    });

    suggestionsElement.style.display = 'block';
  }

  showTagError(message) {
    const tagsGroup = this.elements.editModal.querySelector('.tags-input-container').closest('.form-group');
    const errorElement = tagsGroup.errorElement;

    errorElement.textContent = message;
    tagsGroup.classList.add('form-group--error');

    setTimeout(() => {
      tagsGroup.classList.remove('form-group--error');
    }, 3000);
  }

  /**
   * 自動保存相關方法
   */
  startAutoSave() {
    this.stopAutoSave();
    this.autoSaveTimer = setTimeout(this.handleAutoSave, this.config.autoSaveDelay);
  }

  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  restartAutoSave() {
    this.stopAutoSave();
    this.startAutoSave();
  }

  async handleAutoSave() {
    if (!this.isDirty || !this.currentTask || this.isSubmitting) return;

    try {
      const formData = this.collectFormData();
      await this.storage.updateTask(this.currentTask.id, formData);

      this.isDirty = false;
      this.showNotification('自動保存成功', 'success');

      this.dispatchFormEvent('autoSave', {
        taskId: this.currentTask.id,
        changes: formData
      });
    } catch (error) {
      console.error('自動保存失敗:', error);
    }
  }

  /**
   * 字符計數器
   */
  updateCounter(input) {
    const formGroup = input.closest('.form-group');
    const counter = formGroup.counterElement;

    if (counter) {
      const current = input.value.length;
      const max = input.maxLength;
      counter.textContent = `${current} / ${max}`;

      if (current > max * 0.9) {
        counter.classList.add('form-counter--warning');
      } else {
        counter.classList.remove('form-counter--warning');
      }
    }
  }

  updateCounters() {
    const form = this.elements.editModal.querySelector('.edit-form');
    const inputs = form.querySelectorAll('.form-input[maxLength]');

    inputs.forEach(input => {
      this.updateCounter(input);
    });
  }

  /**
   * 處理鍵盤事件
   */
  handleKeyDown(e) {
    // Ctrl+S: 保存
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      if (this.elements.editModal.classList.contains('edit-modal--visible')) {
        this.handleSubmit();
      }
    }

    // Ctrl+Enter: 保存並關閉
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (this.elements.editModal.classList.contains('edit-modal--visible')) {
        this.handleSubmit();
      }
    }
  }

  /**
   * 載入標籤建議
   */
  async loadTagSuggestions() {
    try {
      const data = localStorage.getItem('todolist-tag-suggestions');
      if (data) {
        const suggestions = JSON.parse(data);
        this.tagSuggestions = new Set(suggestions);
      }
    } catch (error) {
      console.error('載入標籤建議失敗:', error);
    }
  }

  /**
   * 保存標籤建議
   */
  saveTagSuggestions() {
    try {
      const suggestions = Array.from(this.tagSuggestions);
      localStorage.setItem('todolist-tag-suggestions', JSON.stringify(suggestions));
    } catch (error) {
      console.error('保存標籤建議失敗:', error);
    }
  }

  /**
   * 顯示通知
   */
  showNotification(message, type = 'info') {
    // TODO: 實現通知系統
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * 觸發表單事件
   */
  dispatchFormEvent(eventType, data) {
    const event = new CustomEvent(`editForm:${eventType}`, {
      detail: data
    });
    document.dispatchEvent(event);
  }

  /**
   * 清理資源
   */
  destroy() {
    // 停止自動保存
    this.stopAutoSave();

    // 移除事件監聽器
    document.removeEventListener('keydown', this.handleKeyDown);

    // 清理狀態
    this.currentTask = null;
    this.validationErrors.clear();
    this.tagSuggestions.clear();
  }
}