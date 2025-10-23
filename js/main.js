/**
 * 主應用程式入口文件
 * 負責初始化和啟動整個應用程式
 */

import app from './modules/app.js';

/**
 * 應用程式啟動函數
 */
async function startApp() {
    try {
        console.log('🎯 Todo List 應用程式啟動中...');

        // 等待 DOM 準備完成
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        // 初始化應用程式
        await app.initialize();

        // 設定全域錯誤處理
        setupGlobalErrorHandling();

        // 設定服務工作者（如果支援）
        setupServiceWorker();

        // 設定 PWA 功能
        setupPWA();

        console.log('🎉 應用程式啟動成功！');

        // 隱藏載入指示器
        hideLoadingIndicator();

        // 顯示歡迎訊息
        showWelcomeMessage();

    } catch (error) {
        console.error('💥 應用程式啟動失敗:', error);
        showStartupError(error);
    }
}

/**
 * 設定全域錯誤處理
 */
function setupGlobalErrorHandling() {
    // 設定未捕獲的錯誤處理
    window.addEventListener('error', (event) => {
        console.error('全域錯誤:', event.error);
        // 可以在這裡添加錯誤報告邏輯
    });

    // 設定未處理的 Promise 拒絕處理
    window.addEventListener('unhandledrejection', (event) => {
        console.error('未處理的 Promise 拒絕:', event.reason);
        // 可以在這裡添加錯誤報告邏輯
    });
}

/**
 * 設定服務工作者
 */
async function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ 服務工作者註冊成功:', registration.scope);
        } catch (error) {
            console.log('ℹ️ 服務工作者註冊失敗:', error);
        }
    } else {
        console.log('ℹ️ 瀏覽器不支援服務工作者');
    }
}

/**
 * 設定 PWA 功能
 */
function setupPWA() {
    // 監聽安裝提示
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;

        // 顯示安裝按鈕或提示
        showInstallPrompt(deferredPrompt);
    });

    // 監聽安裝完成
    window.addEventListener('appinstalled', () => {
        console.log('✅ PWA 安裝成功');
        deferredPrompt = null;
        hideInstallPrompt();
    });
}

/**
 * 顯示安裝提示
 */
function showInstallPrompt(prompt) {
    // 這裡可以實現自定義的安裝提示 UI
    console.log('📱 可以安裝 PWA 應用程式');
}

/**
 * 隱藏安裝提示
 */
function hideInstallPrompt() {
    // 這裡可以實現隱藏安裝提示的邏輯
    console.log('📱 PWA 安裝提示已隱藏');
}

/**
 * 隱藏載入指示器
 */
function hideLoadingIndicator() {
    const loadingOverlay = document.querySelector('#loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.setAttribute('aria-hidden', 'true');
    }
}

/**
 * 顯示歡迎訊息
 */
function showWelcomeMessage() {
    // 檢查是否為首次訪問
    const hasVisited = localStorage.getItem('todo_app_visited');

    if (!hasVisited) {
        // 可以顯示歡迎教程或提示
        console.log('👋 歡迎首次使用 Todo List 應用程式！');
        localStorage.setItem('todo_app_visited', 'true');

        // 顯示簡單的歡迎通知
        setTimeout(() => {
            const uiManager = app.modules.ui;
            if (uiManager) {
                uiManager.showNotification('歡迎使用 Todo List！點擊輸入框開始新增您的第一個任務。', 'info', 8000);
            }
        }, 1000);
    }
}

/**
 * 顯示啟動錯誤
 */
function showStartupError(error) {
    const appElement = document.querySelector('#app');
    if (!appElement) return;

    // 清空現有內容
    appElement.textContent = '';

    const errorContainer = document.createElement('div');
    errorContainer.className = 'startup-error';

    const errorContent = document.createElement('div');
    errorContent.className = 'error-content';

    const title = document.createElement('h1');
    title.textContent = '🚨 應用程式啟動失敗';
    errorContent.appendChild(title);

    const message = document.createElement('p');
    message.textContent = '很抱歉，應用程式無法正常啟動。';
    errorContent.appendChild(message);

    const details = document.createElement('details');

    const summary = document.createElement('summary');
    summary.textContent = '錯誤詳情';
    details.appendChild(summary);

    const pre = document.createElement('pre');
    pre.textContent = error.message || '未知錯誤';
    details.appendChild(pre);

    errorContent.appendChild(details);

    const actions = document.createElement('div');
    actions.className = 'error-actions';

    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = '重新載入';
    reloadBtn.addEventListener('click', () => location.reload());
    actions.appendChild(reloadBtn);

    const homeBtn = document.createElement('button');
    homeBtn.textContent = '回到首頁';
    homeBtn.addEventListener('click', () => location.href = '/');
    actions.appendChild(homeBtn);

    errorContent.appendChild(actions);
    errorContainer.appendChild(errorContent);
    appElement.appendChild(errorContainer);
}

/**
 * 檢查瀏覽器相容性
 */
function checkBrowserCompatibility() {
    const requiredFeatures = [
        'Promise',
        'fetch',
        'localStorage',
        'querySelector',
        'addEventListener',
    ];

    const missingFeatures = requiredFeatures.filter(feature => {
        switch (feature) {
            case 'Promise':
                return typeof Promise === 'undefined';
            case 'fetch':
                return typeof fetch === 'undefined';
            case 'localStorage':
                return typeof Storage === 'undefined';
            case 'querySelector':
                return !document.querySelector;
            case 'addEventListener':
                return !document.addEventListener;
            default:
                return false;
        }
    });

    if (missingFeatures.length > 0) {
        showCompatibilityError(missingFeatures);
        return false;
    }

    return true;
}

/**
 * 顯示相容性錯誤
 */
function showCompatibilityError(missingFeatures) {
    const appElement = document.querySelector('#app');
    if (!appElement) return;

    // 清空現有內容
    appElement.textContent = '';

    const errorContainer = document.createElement('div');
    errorContainer.className = 'compatibility-error';

    const errorContent = document.createElement('div');
    errorContent.className = 'error-content';

    const title = document.createElement('h1');
    title.textContent = '🔧 瀏覽器不相容';
    errorContent.appendChild(title);

    const message = document.createElement('p');
    message.textContent = '您的瀏覽器不支援以下功能：';
    errorContent.appendChild(message);

    const featureList = document.createElement('ul');
    missingFeatures.forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature;
        featureList.appendChild(li);
    });
    errorContent.appendChild(featureList);

    const suggestion = document.createElement('p');
    suggestion.textContent = '請升級到最新版本的瀏覽器以獲得最佳體驗。';
    errorContent.appendChild(suggestion);

    const browserSuggestions = document.createElement('div');
    browserSuggestions.className = 'browser-suggestions';

    const browsers = [
        { name: 'Chrome', url: 'https://www.google.com/chrome/' },
        { name: 'Firefox', url: 'https://www.mozilla.org/firefox/' },
        { name: 'Safari', url: 'https://www.apple.com/safari/' },
        { name: 'Edge', url: 'https://www.microsoft.com/edge/' },
    ];

    browsers.forEach(browser => {
        const link = document.createElement('a');
        link.href = browser.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = browser.name;
        browserSuggestions.appendChild(link);
    });

    errorContent.appendChild(browserSuggestions);
    errorContainer.appendChild(errorContent);
    appElement.appendChild(errorContainer);
}

/**
 * 設定主題
 */
function setupTheme() {
    const savedTheme = localStorage.getItem('todo_theme') || 'auto';
    const body = document.body;

    // 應用主題
    if (savedTheme === 'dark' || (savedTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        body.classList.add('theme-dark');
    } else {
        body.classList.add('theme-light');
    }

    // 監聽系統主題變更
    if (savedTheme === 'auto') {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            body.classList.toggle('theme-dark', e.matches);
            body.classList.toggle('theme-light', !e.matches);
        });
    }
}

/**
 * 設定字體和顯示設定
 */
function setupDisplaySettings() {
    // 檢查用戶的字體偏好
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
        document.body.classList.add('reduced-motion');
    }

    // 檢查用戶的顏色偏好
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
    if (prefersHighContrast.matches) {
        document.body.classList.add('high-contrast');
    }
}

/**
 * 初始化應用程式設定
 */
function initializeAppSettings() {
    // 檢查是否為首次啟動
    const isFirstLaunch = !localStorage.getItem('todo_app_version');

    if (isFirstLaunch) {
        // 設定初始設定
        localStorage.setItem('todo_app_version', app.state?.version || '1.0.0');

        // 可以在這裡設定其他初始值
        console.log('🎯 首次啟動，已設定初始設定');
    } else {
        // 檢查版本升級
        const currentVersion = localStorage.getItem('todo_app_version');
        const appVersion = app.state?.version || '1.0.0';

        if (currentVersion !== appVersion) {
            console.log(`🔄 應用程式已升級: ${currentVersion} → ${appVersion}`);
            localStorage.setItem('todo_app_version', appVersion);

            // 可以在這裡執行升級邏輯
            showUpgradeNotification();
        }
    }
}

/**
 * 顯示升級通知
 */
function showUpgradeNotification() {
    setTimeout(() => {
        const uiManager = app.modules?.ui;
        if (uiManager) {
            uiManager.showNotification('應用程式已更新到最新版本！', 'success', 5000);
        }
    }, 2000);
}

/**
 * 設定鍵盤快捷鍵提示
 */
function setupKeyboardShortcuts() {
    // 監聽 Help 按鍵顯示快捷鍵說明
    document.addEventListener('keydown', (event) => {
        // Ctrl/Cmd + ?
        if ((event.ctrlKey || event.metaKey) && event.key === '?') {
            event.preventDefault();
            showKeyboardShortcuts();
        }
    });
}

/**
 * 顯示鍵盤快捷鍵說明
 */
function showKeyboardShortcuts() {
    const shortcuts = [
        { key: 'Ctrl + N', description: '新增待辦事項' },
        { key: 'Ctrl + Enter', description: '儲存編輯' },
        { key: 'Escape', description: '取消編輯' },
        { key: 'Ctrl + ?', description: '顯示快捷鍵說明' },
    ];

    const uiManager = app.modules?.ui;
    if (uiManager) {
        const message = shortcuts.map(s => `${s.key}: ${s.description}`).join('\n');
        uiManager.showNotification(message, 'info', 10000);
    }
}

// 頁面載入完成後啟動應用程式
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        // 檢查瀏覽器相容性
        if (!checkBrowserCompatibility()) {
            return;
        }

        // 設定主題和顯示
        setupTheme();
        setupDisplaySettings();

        // 初始化應用程式設定
        initializeAppSettings();

        // 設定鍵盤快捷鍵
        setupKeyboardShortcuts();

        // 啟動應用程式
        await startApp();
    });
} else {
    // DOM 已經載入完成
    (async () => {
        if (!checkBrowserCompatibility()) {
            return;
        }

        setupTheme();
        setupDisplaySettings();
        initializeAppSettings();
        setupKeyboardShortcuts();
        await startApp();
    })();
}

// 導出主要物件供全域使用
window.TodoApp = {
    app,
    start: startApp,
};

// 開發模式下的除錯工具
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    window.TodoDebug = {
        getState: () => app.getState?.() || {},
        getInfo: () => app.getInfo?.() || {},
        healthCheck: () => app.healthCheck?.() || {},
        restart: () => app.restart?.(),
        modules: app.modules || {},
    };

    console.log('🔧 開發模式已啟用，使用 TodoDebug 存取除錯工具');
}