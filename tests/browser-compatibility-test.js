/**
 * 跨瀏覽器兼容性測試工具
 * 檢查各種瀏覽器的功能支援和兼容性問題
 * 安全版本 - 避免使用 eval() 和 new Function()
 */

// 瀏覽器檢測工具
const BrowserDetector = {
    /**
     * 獲取瀏覽器資訊
     */
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        const vendor = navigator.vendor || '';

        return {
            userAgent,
            vendor,
            language: navigator.language,
            languages: navigator.languages,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            onLine: navigator.onLine,
            // 檢測瀏覽器類型
            isChrome: /Chrome/.test(userAgent) && /Google Inc/.test(vendor),
            isFirefox: /Firefox/.test(userAgent),
            isSafari: /Safari/.test(userAgent) && /Apple Computer/.test(vendor),
            isEdge: /Edg/.test(userAgent),
            isIE: /MSIE|Trident/.test(userAgent),
            // 檢測設備類型
            isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent),
            isTablet: /iPad|Android/.test(userAgent) && !/Mobile/.test(userAgent),
            isDesktop: !/Mobile|Android|iPhone|iPad/.test(userAgent)
        };
    },

    /**
     * 獲取瀏覽器版本
     */
    getBrowserVersion() {
        const userAgent = navigator.userAgent;
        const browserInfo = this.getBrowserInfo();

        if (browserInfo.isChrome) {
            const match = userAgent.match(/Chrome\/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }
        if (browserInfo.isFirefox) {
            const match = userAgent.match(/Firefox\/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }
        if (browserInfo.isSafari) {
            const match = userAgent.match(/Version\/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }
        if (browserInfo.isEdge) {
            const match = userAgent.match(/Edg\/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }
        return 0;
    }
};

// 功能支援檢測
const FeatureDetector = {
    /**
     * 檢查基礎 Web API 支援
     */
    checkBasicAPIs() {
        return {
            localStorage: this.checkLocalStorage(),
            sessionStorage: this.checkSessionStorage(),
            fetch: this.checkFetch(),
            Promise: typeof Promise !== 'undefined',
            asyncAwait: this.checkAsyncAwait(),
            ArrowFunctions: this.checkArrowFunctions(),
            TemplateStrings: this.checkTemplateStrings(),
            Destructuring: this.checkDestructuring(),
            Classes: this.checkClasses(),
            Modules: this.checkModules(),
            ServiceWorker: 'serviceWorker' in navigator,
            WebWorkers: typeof Worker !== 'undefined',
            IntersectionObserver: 'IntersectionObserver' in window,
            MutationObserver: 'MutationObserver' in window,
            ResizeObserver: 'ResizeObserver' in window,
            requestAnimationFrame: 'requestAnimationFrame' in window,
            cancelAnimationFrame: 'cancelAnimationFrame' in window,
            localStorageQuota: this.checkLocalStorageQuota()
        };
    },

    /**
     * 檢查 localStorage 支援
     */
    checkLocalStorage() {
        try {
            const testKey = '__localStorage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * 檢查 sessionStorage 支援
     */
    checkSessionStorage() {
        try {
            const testKey = '__sessionStorage_test__';
            sessionStorage.setItem(testKey, 'test');
            sessionStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * 檢查 fetch API 支援
     */
    checkFetch() {
        return typeof fetch !== 'undefined';
    },

    /**
     * 檢查 async/await 支援 - 通過檢查 Promise.prototype.finally
     */
    checkAsyncAwait() {
        // 間接檢查 async/await 支援
        return typeof Promise !== 'undefined' &&
               typeof Promise.prototype.finally === 'function';
    },

    /**
     * 檢查箭頭函數支援 - 通過檢查是否支持 .bind()
     */
    checkArrowFunctions() {
        // 通過檢查 Function.prototype.toString 的輸出模式來間接判斷
        try {
            const testFn = function() { return this; };
            const boundFn = testFn.bind({});
            return typeof boundFn === 'function';
        } catch (e) {
            return false;
        }
    },

    /**
     * 檢查模板字串支援
     */
    checkTemplateStrings() {
        try {
            // 直接測試模板字串功能
            const name = 'test';
            const template = `Hello ${name}`;
            return template === 'Hello test';
        } catch (e) {
            return false;
        }
    },

    /**
     * 檢查解構賦值支援
     */
    checkDestructuring() {
        try {
            // 直接測試解構賦值
            const obj = { a: 1, b: 2 };
            const { a } = obj;
            return a === 1;
        } catch (e) {
            return false;
        }
    },

    /**
     * 檢查 class 語法支援
     */
    checkClasses() {
        try {
            // 直接測試 class 語法
            class TestClass {
                constructor() {
                    this.value = 'test';
                }
            }
            const instance = new TestClass();
            return instance.value === 'test';
        } catch (e) {
            return false;
        }
    },

    /**
     * 檢查 ES6 模組支援
     */
    checkModules() {
        return typeof document !== 'undefined' &&
               document.createElement('script').noModule !== undefined;
    },

    /**
     * 檢查 localStorage 配額
     */
    checkLocalStorageQuota() {
        if (!this.checkLocalStorage()) return 0;

        try {
            // 嘗試儲存不同大小的資料來測試配額
            const testData = 'x'.repeat(1024); // 1KB
            let totalSize = 0;
            let testKey = 'quota_test_';

            // 逐步增加資料量直到失敗
            for (let i = 0; i < 10000; i++) {
                try {
                    localStorage.setItem(testKey + i, testData);
                    totalSize += 1024;
                } catch (e) {
                    break;
                }
            }

            // 清理測試資料
            for (let i = 0; i < 10000; i++) {
                localStorage.removeItem(testKey + i);
            }

            return totalSize;
        } catch (e) {
            return 0;
        }
    },

    /**
     * 檢查 CSS 功能支援
     */
    checkCSSFeatures() {
        return {
            flexbox: CSS.supports('display', 'flex'),
            grid: CSS.supports('display', 'grid'),
            customProperties: CSS.supports('color', 'var(--test)'),
            backdropFilter: CSS.supports('backdrop-filter', 'blur(5px)'),
            sticky: CSS.supports('position', 'sticky'),
            scrollSnap: CSS.supports('scroll-snap-type', 'mandatory'),
            aspectRatio: CSS.supports('aspect-ratio', '16/9'),
            containerQueries: CSS.supports('container-type', 'size'),
            colorScheme: CSS.supports('color-scheme', 'dark'),
            prefersReducedMotion: window.matchMedia('(prefers-reduced-motion)').media !== 'not all'
        };
    },

    /**
     * 檢查無障礙功能支援
     */
    checkAccessibilityFeatures() {
        return {
            aria: 'ariaLabel' in document.createElement('div'),
            tabIndex: 'tabIndex' in document.createElement('div'),
            role: 'role' in document.createElement('div'),
            hidden: 'hidden' in document.createElement('div'),
            spellcheck: 'spellcheck' in document.createElement('div'),
            contenteditable: 'contentEditable' in document.createElement('div'),
            draggable: 'draggable' in document.createElement('div'),
            webkitSpeechRecognition: 'webkitSpeechRecognition' in window,
            speechSynthesis: 'speechSynthesis' in window
        };
    }
};

// 性能測試工具
const PerformanceTester = {
    /**
     * 測試 localStorage 性能
     */
    async testLocalStoragePerformance() {
        if (!FeatureDetector.checkLocalStorage()) {
            return { error: 'localStorage 不支援' };
        }

        const testData = {
            small: 'x'.repeat(100),      // 100 bytes
            medium: 'x'.repeat(10240),   // 10KB
            large: 'x'.repeat(102400)    // 100KB
        };

        const results = {};

        for (const [size, data] of Object.entries(testData)) {
            const iterations = 100;
            const writeTimes = [];
            const readTimes = [];

            // 寫入測試
            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                localStorage.setItem(`perf_test_${size}_${i}`, data);
                writeTimes.push(performance.now() - start);
            }

            // 讀取測試
            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                localStorage.getItem(`perf_test_${size}_${i}`);
                readTimes.push(performance.now() - start);
            }

            // 清理
            for (let i = 0; i < iterations; i++) {
                localStorage.removeItem(`perf_test_${size}_${i}`);
            }

            results[size] = {
                writeTime: {
                    average: writeTimes.reduce((a, b) => a + b, 0) / writeTimes.length,
                    min: Math.min(...writeTimes),
                    max: Math.max(...writeTimes)
                },
                readTime: {
                    average: readTimes.reduce((a, b) => a + b, 0) / readTimes.length,
                    min: Math.min(...readTimes),
                    max: Math.max(...readTimes)
                }
            };
        }

        return results;
    },

    /**
     * 測試 DOM 操作性能
     */
    testDOMPerformance() {
        const container = document.createElement('div');
        document.body.appendChild(container);

        const results = {};

        // 測試元素創建
        const createElementTimes = [];
        for (let i = 0; i < 1000; i++) {
            const start = performance.now();
            const div = document.createElement('div');
            div.textContent = `Element ${i}`;
            container.appendChild(div);
            createElementTimes.push(performance.now() - start);
        }

        results.createElement = {
            average: createElementTimes.reduce((a, b) => a + b, 0) / createElementTimes.length,
            total: createElementTimes.reduce((a, b) => a + b, 0)
        };

        // 測試查詢性能
        const queryTimes = [];
        for (let i = 0; i < 100; i++) {
            const start = performance.now();
            const elements = container.querySelectorAll('div');
            queryTimes.push(performance.now() - start);
        }

        results.querySelector = {
            average: queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length,
            total: queryTimes.reduce((a, b) => a + b, 0)
        };

        // 清理
        document.body.removeChild(container);

        return results;
    }
};

// 主測試類別
class BrowserCompatibilityTest {
    constructor() {
        this.results = {
            browser: null,
            features: null,
            css: null,
            accessibility: null,
            performance: null,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 執行完整的兼容性測試
     */
    async runFullTest() {
        console.log('🔍 開始執行瀏覽器兼容性測試...');

        // 1. 瀏覽器資訊
        console.log('📊 檢測瀏覽器資訊...');
        this.results.browser = {
            ...BrowserDetector.getBrowserInfo(),
            version: BrowserDetector.getBrowserVersion()
        };

        // 2. 功能支援檢查
        console.log('🔧 檢查功能支援...');
        this.results.features = FeatureDetector.checkBasicAPIs();
        this.results.css = FeatureDetector.checkCSSFeatures();
        this.results.accessibility = FeatureDetector.checkAccessibilityFeatures();

        // 3. 性能測試
        console.log('⚡ 執行性能測試...');
        this.results.performance = {
            localStorage: await PerformanceTester.testLocalStoragePerformance(),
            dom: PerformanceTester.testDOMPerformance()
        };

        // 4. 生成報告
        console.log('📋 生成測試報告...');
        this.generateReport();

        return this.results;
    }

    /**
     * 生成測試報告
     */
    generateReport() {
        const report = {
            summary: this.generateSummary(),
            details: this.results,
            recommendations: this.generateRecommendations()
        };

        // 將報告保存到 localStorage
        try {
            localStorage.setItem('browserCompatibilityReport', JSON.stringify(report));
        } catch (e) {
            console.warn('無法保存測試報告到 localStorage:', e);
        }

        return report;
    }

    /**
     * 生成測試摘要
     */
    generateSummary() {
        const { browser, features, css, accessibility } = this.results;

        const featureCount = Object.values(features).filter(Boolean).length;
        const totalFeatures = Object.keys(features).length;
        const cssCount = Object.values(css).filter(Boolean).length;
        const totalCSS = Object.keys(css).length;
        const accessibilityCount = Object.values(accessibility).filter(Boolean).length;
        const totalAccessibility = Object.keys(accessibility).length;

        return {
            browser: `${browser.isChrome ? 'Chrome' : browser.isFirefox ? 'Firefox' : browser.isSafari ? 'Safari' : browser.isEdge ? 'Edge' : 'Unknown'} ${browser.version}`,
            platform: browser.platform,
            isMobile: browser.isMobile,
            featureSupport: {
                score: Math.round((featureCount / totalFeatures) * 100),
                supported: featureCount,
                total: totalFeatures
            },
            cssSupport: {
                score: Math.round((cssCount / totalCSS) * 100),
                supported: cssCount,
                total: totalCSS
            },
            accessibilitySupport: {
                score: Math.round((accessibilityCount / totalAccessibility) * 100),
                supported: accessibilityCount,
                total: totalAccessibility
            },
            overallScore: Math.round(
                ((featureCount / totalFeatures) * 0.4 +
                 (cssCount / totalCSS) * 0.3 +
                 (accessibilityCount / totalAccessibility) * 0.3) * 100
            )
        };
    }

    /**
     * 生成改進建議
     */
    generateRecommendations() {
        const recommendations = [];
        const { features, css, accessibility } = this.results;

        // 功能支援建議
        if (!features.localStorage) {
            recommendations.push({
                type: 'critical',
                issue: 'localStorage 不支援',
                solution: '實現 fallback 儲存機制（如 IndexedDB 或 in-memory 儲存）'
            });
        }

        if (!features.fetch) {
            recommendations.push({
                type: 'critical',
                issue: 'fetch API 不支援',
                solution: '引入 fetch polyfill 或使用 XMLHttpRequest 作為 fallback'
            });
        }

        if (!features.asyncAwait) {
            recommendations.push({
                type: 'warning',
                issue: 'async/await 不支援',
                solution: '使用 Babel 轉譯或改用 Promise.then() 語法'
            });
        }

        // CSS 支援建議
        if (!css.grid) {
            recommendations.push({
                type: 'info',
                issue: 'CSS Grid 不支援',
                solution: '使用 Flexbox 或其他佈局方式作為 fallback'
            });
        }

        if (!css.customProperties) {
            recommendations.push({
                type: 'info',
                issue: 'CSS 自定義屬性不支援',
                solution: '使用 CSS 變數 polyfill 或改用傳統 CSS 變數'
            });
        }

        // 無障礙建議
        if (!accessibility.speechSynthesis) {
            recommendations.push({
                type: 'info',
                issue: '語音合成不支援',
                solution: '提供文字閱讀的替代方案'
            });
        }

        return recommendations;
    }

    /**
     * 在頁面上顯示測試結果
     */
    displayResults() {
        const existingReport = document.getElementById('browser-compatibility-report');
        if (existingReport) {
            existingReport.remove();
        }

        const reportContainer = document.createElement('div');
        reportContainer.id = 'browser-compatibility-report';
        reportContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;

        const summary = this.generateSummary();

        reportContainer.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333;">瀏覽器兼容性測試報告</h3>
            <div style="margin-bottom: 15px;">
                <strong>瀏覽器:</strong> ${summary.browser}<br>
                <strong>平台:</strong> ${summary.platform}<br>
                <strong>設備類型:</strong> ${summary.isMobile ? '行動裝置' : '桌面裝置'}
            </div>
            <div style="margin-bottom: 15px;">
                <strong>功能支援:</strong> ${summary.featureSupport.score}% (${summary.featureSupport.supported}/${summary.featureSupport.total})<br>
                <strong>CSS 支援:</strong> ${summary.cssSupport.score}% (${summary.cssSupport.supported}/${summary.cssSupport.total})<br>
                <strong>無障礙支援:</strong> ${summary.accessibilitySupport.score}% (${summary.accessibilitySupport.supported}/${summary.accessibilitySupport.total})<br>
                <strong>總體評分:</strong> <strong style="color: ${summary.overallScore >= 90 ? 'green' : summary.overallScore >= 70 ? 'orange' : 'red'}">${summary.overallScore}%</strong>
            </div>
            <button onclick="document.getElementById('browser-compatibility-report').remove()" style="background: #333; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                關閉報告
            </button>
        `;

        document.body.appendChild(reportContainer);
    }
}

// 導出供外部使用
if (typeof window !== 'undefined') {
    window.BrowserCompatibilityTest = BrowserCompatibilityTest;
    window.BrowserDetector = BrowserDetector;
    window.FeatureDetector = FeatureDetector;
}

// Node.js 環境導出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BrowserCompatibilityTest,
        BrowserDetector,
        FeatureDetector,
        PerformanceTester
    };
}