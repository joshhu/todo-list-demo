/**
 * 性能監控和優化模組
 * 提供性能測量、優化建議和監控功能
 */

/**
 * 性能監控類別
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            navigation: null,
            resources: [],
            paint: null,
            memory: null,
            vitals: {}
        };

        this.observers = {
            performance: null,
            vitals: null,
            memory: null
        };

        this.thresholds = {
            FCP: 1800,        // First Contentful Paint (ms)
            LCP: 2500,        // Largest Contentful Paint (ms)
            FID: 100,         // First Input Delay (ms)
            CLS: 0.1,         // Cumulative Layout Shift
            TTFB: 800,        // Time to First Byte (ms)
            loadTime: 3000    // 頁面載入時間 (ms)
        };

        this.init();
    }

    /**
     * 初始化性能監控
     */
    init() {
        if ('performance' in window) {
            this.collectNavigationMetrics();
            this.observePerformance();
            this.observeVitals();
            this.observeMemory();
        }
    }

    /**
     * 收集導航指標
     */
    collectNavigationMetrics() {
        if ('getEntriesByType' in performance) {
            const navigationEntries = performance.getEntriesByType('navigation');
            if (navigationEntries.length > 0) {
                this.metrics.navigation = navigationEntries[0];
            }
        }
    }

    /**
     * 觀察資源載入
     */
    observePerformance() {
        if ('PerformanceObserver' in window) {
            try {
                // 觀察資源載入
                const resourceObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        this.metrics.resources.push(entry);
                    });
                });
                resourceObserver.observe({ entryTypes: ['resource'] });
                this.observers.performance = resourceObserver;
            } catch (e) {
                console.warn('Resource performance observer not supported:', e);
            }
        }
    }

    /**
     * 觀察核心 Web 指標
     */
    observeVitals() {
        // First Contentful Paint
        this.observePaint();

        // Largest Contentful Paint
        this.observeLCP();

        // First Input Delay
        this.observeFID();

        // Cumulative Layout Shift
        this.observeCLS();
    }

    /**
     * 觀察繪製指標
     */
    observePaint() {
        if ('PerformanceObserver' in window) {
            try {
                const paintObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        if (!this.metrics.paint) {
                            this.metrics.paint = {};
                        }
                        this.metrics.paint[entry.name] = entry.startTime;
                    });
                });
                paintObserver.observe({ entryTypes: ['paint'] });
            } catch (e) {
                console.warn('Paint performance observer not supported:', e);
            }
        }
    }

    /**
     * 觀察最大內容繪製
     */
    observeLCP() {
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.metrics.vitals.LCP = Math.round(lastEntry.startTime);
                    this.checkVitalThreshold('LCP', this.metrics.vitals.LCP);
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            } catch (e) {
                console.warn('LCP observer not supported:', e);
            }
        }
    }

    /**
     * 觀察首次輸入延遲
     */
    observeFID() {
        if ('PerformanceObserver' in window) {
            try {
                const fidObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        if (entry.processingStart && entry.startTime) {
                            this.metrics.vitals.FID = Math.round(entry.processingStart - entry.startTime);
                            this.checkVitalThreshold('FID', this.metrics.vitals.FID);
                        }
                    });
                });
                fidObserver.observe({ entryTypes: ['first-input'] });
            } catch (e) {
                console.warn('FID observer not supported:', e);
            }
        }
    }

    /**
     * 觀察累計佈局偏移
     */
    observeCLS() {
        if ('PerformanceObserver' in window) {
            try {
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    });
                    this.metrics.vitals.CLS = Math.round(clsValue * 1000) / 1000;
                    this.checkVitalThreshold('CLS', this.metrics.vitals.CLS);
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });
            } catch (e) {
                console.warn('CLS observer not supported:', e);
            }
        }
    }

    /**
     * 觀察記憶體使用
     */
    observeMemory() {
        if ('memory' in performance) {
            // 定期收集記憶體資訊
            setInterval(() => {
                this.metrics.memory = {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit,
                    timestamp: Date.now()
                };
            }, 5000); // 每 5 秒收集一次
        }
    }

    /**
     * 檢查指標閾值
     */
    checkVitalThreshold(vital, value) {
        const threshold = this.thresholds[vital];
        if (threshold) {
            const status = value <= threshold ? 'good' : 'needs-improvement';
            console.log(`🔍 ${vital}: ${value}ms (${status})`);

            if (status === 'needs-improvement') {
                this.generateOptimizationSuggestion(vital, value);
            }
        }
    }

    /**
     * 生成優化建議
     */
    generateOptimizationSuggestion(vital, value) {
        const suggestions = {
            LCP: {
                issue: '最大內容繪製時間過長',
                solutions: [
                    '優化圖片載入（使用 WebP 格式、壓縮圖片）',
                    '實現懶加載機制',
                    '優化伺服器響應時間',
                    '使用 CDN 加速資源載入'
                ]
            },
            FID: {
                issue: '首次輸入延遲過長',
                solutions: [
                    '減少 JavaScript 執行時間',
                    '分割代碼，實現按需載入',
                    '優化第三方腳本載入',
                    '使用 Web Workers 處理長時間任務'
                ]
            },
            CLS: {
                issue: '累計佈局偏移過大',
                solutions: [
                    '為圖片和廣告指定尺寸',
                    '預留動態內容空間',
                    '避免插入內容到現有內容上方',
                    '使用 transform 動畫而非改變佈局屬性'
                ]
            }
        };

        const suggestion = suggestions[vital];
        if (suggestion) {
            console.warn(`⚠️ ${suggestion.issue}: ${value}`);
            console.log('💡 建議解決方案:');
            suggestion.solutions.forEach((sol, index) => {
                console.log(`   ${index + 1}. ${sol}`);
            });
        }
    }

    /**
     * 獲取性能報告
     */
    getPerformanceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            vitals: this.metrics.vitals,
            navigation: this.getNavigationMetrics(),
            resources: this.getResourceMetrics(),
            memory: this.metrics.memory,
            score: this.calculatePerformanceScore(),
            recommendations: this.getRecommendations()
        };

        return report;
    }

    /**
     * 獲取導航指標
     */
    getNavigationMetrics() {
        if (!this.metrics.navigation) return null;

        const nav = this.metrics.navigation;
        return {
            dns: nav.domainLookupEnd - nav.domainLookupStart,
            tcp: nav.connectEnd - nav.connectStart,
            ssl: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
            ttfb: nav.responseStart - nav.requestStart,
            download: nav.responseEnd - nav.responseStart,
            domParse: nav.domContentLoadedEventStart - nav.responseEnd,
            domReady: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
            loadComplete: nav.loadEventEnd - nav.loadEventStart,
            totalTime: nav.loadEventEnd - nav.navigationStart
        };
    }

    /**
     * 獲取資源指標
     */
    getResourceMetrics() {
        const resources = this.metrics.resources;
        const byType = {};

        resources.forEach(resource => {
            const type = resource.initiatorType || 'other';
            if (!byType[type]) {
                byType[type] = {
                    count: 0,
                    totalSize: 0,
                    totalTime: 0
                };
            }

            byType[type].count++;
            if (resource.transferSize) {
                byType[type].totalSize += resource.transferSize;
            }
            byType[type].totalTime += resource.duration;
        });

        return byType;
    }

    /**
     * 計算性能分數
     */
    calculatePerformanceScore() {
        const vitals = this.metrics.vitals;
        let score = 100;
        let penalties = 0;

        // LCP 權重: 25%
        if (vitals.LCP) {
            if (vitals.LCP > this.thresholds.LCP * 2) {
                penalties += 25;
            } else if (vitals.LCP > this.thresholds.LCP) {
                penalties += 15;
            }
        }

        // FID 權重: 30%
        if (vitals.FID) {
            if (vitals.FID > this.thresholds.FID * 3) {
                penalties += 30;
            } else if (vitals.FID > this.thresholds.FID) {
                penalties += 15;
            }
        }

        // CLS 權重: 25%
        if (vitals.CLS) {
            if (vitals.CLS > this.thresholds.CLS * 2) {
                penalties += 25;
            } else if (vitals.CLS > this.thresholds.CLS) {
                penalties += 10;
            }
        }

        // TTFB 權重: 20%
        const ttfb = this.getNavigationMetrics()?.ttfb;
        if (ttfb) {
            if (ttfb > this.thresholds.TTFB * 2) {
                penalties += 20;
            } else if (ttfb > this.thresholds.TTFB) {
                penalties += 10;
            }
        }

        return Math.max(0, score - penalties);
    }

    /**
     * 獲取優化建議
     */
    getRecommendations() {
        const recommendations = [];
        const vitals = this.metrics.vitals;
        const navigation = this.getNavigationMetrics();

        // LCP 建議
        if (vitals.LCP && vitals.LCP > this.thresholds.LCP) {
            recommendations.push({
                metric: 'LCP',
                priority: 'high',
                title: '優化最大內容繪製時間',
                description: `當前 LCP 為 ${vitals.LCP}ms，建議優化到 ${this.thresholds.LCP}ms 以下`,
                actions: [
                    '使用現代圖片格式（WebP、AVIF）',
                    '實現圖片懶加載',
                    '優化伺服器響應時間',
                    '減少阻礙渲染的資源'
                ]
            });
        }

        // FID 建議
        if (vitals.FID && vitals.FID > this.thresholds.FID) {
            recommendations.push({
                metric: 'FID',
                priority: 'high',
                title: '減少首次輸入延遲',
                description: `當前 FID 為 ${vitals.FID}ms，建議優化到 ${this.thresholds.FID}ms 以下`,
                actions: [
                    '分割 JavaScript 代碼',
                    '延遲載入非關鍵腳本',
                    '使用 Web Workers 處理複雜計算',
                    '減少主執行緒工作'
                ]
            });
        }

        // CLS 建議
        if (vitals.CLS && vitals.CLS > this.thresholds.CLS) {
            recommendations.push({
                metric: 'CLS',
                priority: 'medium',
                title: '減少佈局偏移',
                description: `當前 CLS 為 ${vitals.CLS}，建議優化到 ${this.thresholds.CLS} 以下`,
                actions: [
                    '為圖片和影片設定尺寸',
                    '避免在現有內容上方插入內容',
                    '使用 CSS transform 動畫',
                    '確保字體載入不造成佈局變化'
                ]
            });
        }

        // TTFB 建議
        if (navigation && navigation.ttfb > this.thresholds.TTFB) {
            recommendations.push({
                metric: 'TTFB',
                priority: 'high',
                title: '優化伺服器響應時間',
                description: `當前 TTFB 為 ${navigation.ttfb}ms，建議優化到 ${this.thresholds.TTFB}ms 以下`,
                actions: [
                    '使用 CDN 加速靜態資源',
                    '啟用 Gzip 壓縮',
                    '優化資料庫查詢',
                    '使用快取機制'
                ]
            });
        }

        return recommendations;
    }

    /**
     * 開始性能測試
     */
    startPerformanceTest() {
        console.log('🚀 開始性能監控...');
        this.startTestTime = performance.now();
    }

    /**
     * 結束性能測試並顯示報告
     */
    endPerformanceTest() {
        if (!this.startTestTime) return;

        const testDuration = performance.now() - this.startTestTime;
        const report = this.getPerformanceReport();

        console.log('📊 性能測試報告:');
        console.log(`測試持續時間: ${Math.round(testDuration)}ms`);
        console.log(`性能分數: ${report.score}/100`);

        if (report.vitals) {
            console.log('核心 Web 指標:');
            Object.entries(report.vitals).forEach(([key, value]) => {
                const threshold = this.thresholds[key];
                const status = threshold ? (value <= threshold ? '✅' : '⚠️') : 'ℹ️';
                console.log(`  ${key}: ${value}${key === 'CLS' ? '' : 'ms'} ${status}`);
            });
        }

        if (report.recommendations.length > 0) {
            console.log('\n💡 優化建議:');
            report.recommendations.forEach((rec, index) => {
                console.log(`\n${index + 1}. ${rec.title} (${rec.priority})`);
                console.log(`   ${rec.description}`);
                rec.actions.forEach(action => {
                    console.log(`   • ${action}`);
                });
            });
        }

        return report;
    }

    /**
     * 清理監控器
     */
    cleanup() {
        Object.values(this.observers).forEach(observer => {
            if (observer && observer.disconnect) {
                observer.disconnect();
            }
        });
    }
}

/**
 * 性能優化工具類別
 */
class PerformanceOptimizer {
    constructor() {
        this.optimizations = [];
    }

    /**
     * 實現圖片懶加載
     */
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            img.classList.remove('lazy');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });

            // 觀察所有懶加載圖片
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });

            this.optimizations.push('lazy-loading');
            console.log('✅ 圖片懶加載已啟用');
        } else {
            console.warn('⚠️ 瀏覽器不支援 IntersectionObserver');
        }
    }

    /**
     * 設置程式碼分割
     */
    setupCodeSplitting() {
        // 動態載入非關鍵模組
        const loadModule = async (moduleName, element) => {
            try {
                const module = await import(`./modules/${moduleName}.js`);
                if (module.default && typeof module.default.init === 'function') {
                    module.default.init(element);
                }
            } catch (error) {
                console.error(`載入模組 ${moduleName} 失敗:`, error);
            }
        };

        // 尋找需要動態載入的元素
        document.querySelectorAll('[data-module]').forEach(element => {
            const moduleName = element.dataset.module;
            if (element.getBoundingClientRect().top < window.innerHeight + 200) {
                // 立即載入可見的模組
                loadModule(moduleName, element);
            } else {
                // 懶加載不可見的模組
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            loadModule(moduleName, entry.target);
                            observer.unobserve(entry.target);
                        }
                    });
                });
                observer.observe(element);
            }
        });

        this.optimizations.push('code-splitting');
        console.log('✅ 程式碼分割已啟用');
    }

    /**
     * 優化圖片載入
     */
    optimizeImages() {
        // 轉換為 WebP 格式（如果支援）
        if (this.supportsWebP()) {
            document.querySelectorAll('img[data-webp]').forEach(img => {
                if (img.dataset.webp) {
                    img.src = img.dataset.webp;
                    img.removeAttribute('data-webp');
                }
            });
        }

        // 添加載入錯誤處理
        document.querySelectorAll('img').forEach(img => {
            img.addEventListener('error', function() {
                if (!this.classList.contains('error')) {
                    this.classList.add('error');
                    this.src = 'assets/images/placeholder.png';
                }
            });
        });

        this.optimizations.push('image-optimization');
        console.log('✅ 圖片優化已啟用');
    }

    /**
     * 檢查 WebP 支援
     */
    supportsWebP() {
        return new Promise(resolve => {
            const webP = new Image();
            webP.onload = webP.onerror = function() {
                resolve(webP.height === 2);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }

    /**
     * 設置資源預載入
     */
    setupPreloading() {
        const criticalResources = [
            { href: 'css/main.css', as: 'style' },
            { href: 'js/main.js', as: 'script' },
            { href: 'fonts/main.woff2', as: 'font', type: 'font/woff2', crossorigin: true }
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource.href;
            link.as = resource.as;

            if (resource.type) {
                link.type = resource.type;
            }

            if (resource.crossorigin) {
                link.crossOrigin = 'anonymous';
            }

            document.head.appendChild(link);
        });

        this.optimizations.push('preloading');
        console.log('✅ 資源預載入已啟用');
    }

    /**
     * 設置快取策略
     */
    setupCaching() {
        if ('caches' in window) {
            // 註冊 Service Worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('✅ Service Worker 註冊成功:', registration);
                        this.optimizations.push('service-worker');
                    })
                    .catch(error => {
                        console.error('❌ Service Worker 註冊失敗:', error);
                    });
            }

            // 設置資源快取
            this.cacheResources();
        } else {
            console.warn('⚠️ 瀏覽器不支援 Cache API');
        }
    }

    /**
     * 快取關鍵資源
     */
    async cacheResources() {
        const resourcesToCache = [
            '/',
            '/index.html',
            '/css/main.css',
            '/js/main.js',
            '/assets/icons/favicon.ico'
        ];

        try {
            const cache = await caches.open('todo-app-v1');
            await cache.addAll(resourcesToCache);
            console.log('✅ 關鍵資源已快取');
            this.optimizations.push('resource-caching');
        } catch (error) {
            console.error('❌ 資源快取失敗:', error);
        }
    }

    /**
     * 獲取已啟用的優化
     */
    getEnabledOptimizations() {
        return this.optimizations;
    }

    /**
     * 應用所有優化
     */
    async applyAllOptimizations() {
        console.log('🚀 開始應用性能優化...');

        this.setupLazyLoading();
        this.setupCodeSplitting();
        await this.optimizeImages();
        this.setupPreloading();
        this.setupCaching();

        console.log('✅ 所有性能優化已完成');
        console.log('已啟用的優化:', this.optimizations.join(', '));

        return this.optimizations;
    }
}

// 導出模組
export { PerformanceMonitor, PerformanceOptimizer };

// 全域初始化
window.PerformanceMonitor = PerformanceMonitor;
window.PerformanceOptimizer = PerformanceOptimizer;