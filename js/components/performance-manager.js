/**
 * 性能管理組件
 *
 * 負責應用程式的性能優化，包括：
 * - 懶加載和虛擬滾動
 * - 資源載入優化
 * - 動畫性能監控
 * - 記憶體管理
 * - 快取機制
 */

export class PerformanceManager {
  constructor() {
    // 性能監控
    this.performanceMetrics = {
      renderTime: [],
      memoryUsage: [],
      networkLatency: []
    };

    // 懶加載觀察器
    this.lazyLoadObserver = null;
    this.intersectionObserver = null;

    // 虛擬滾動
    this.virtualScrollInstances = new Map();

    // 快取
    this.cache = new Map();
    this.cacheMaxSize = 100;

    // 狀態
    this.isLowEndDevice = false;
    this.isMemoryConstrained = false;
    this.networkSpeed = 'fast';

    // 綁定事件處理器
    this.handleScroll = this.throttle(this.handleScroll.bind(this), 16); // 60fps
    this.handleResize = this.debounce(this.handleResize.bind(this), 250);
    this.handleMemoryPressure = this.handleMemoryPressure.bind(this);
    this.handleNetworkChange = this.handleNetworkChange.bind(this);
  }

  /**
   * 初始化性能管理器
   */
  async initialize() {
    try {
      // 檢測設備能力
      this.detectDeviceCapabilities();

      // 初始化懶加載
      this.initializeLazyLoading();

      // 初始化虛擬滾動
      this.initializeVirtualScrolling();

      // 初始化快取機制
      this.initializeCache();

      // 設置性能監控
      this.setupPerformanceMonitoring();

      // 優化資源載入
      this.optimizeResourceLoading();

      // 設置記憶體監控
      this.setupMemoryMonitoring();

      // 設置網路監控
      this.setupNetworkMonitoring();

      console.log('✅ 性能管理器初始化完成');
    } catch (error) {
      console.error('❌ 性能管理器初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 檢測設備能力
   */
  detectDeviceCapabilities() {
    // 檢測低端設備
    const navigatorHardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = navigator.deviceMemory || 4;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    this.isLowEndDevice =
      navigatorHardwareConcurrency <= 2 ||
      deviceMemory <= 2 ||
      this.isMobileDevice();

    // 檢測網路速度
    if (connection) {
      this.networkSpeed = this.categorizeNetworkSpeed(connection.effectiveType);
    }

    // 檢測記憶體約束
    this.isMemoryConstrained = deviceMemory <= 2;

    // 添加設備類型到body
    document.body.classList.toggle('low-end-device', this.isLowEndDevice);
    document.body.classList.toggle('memory-constrained', this.isMemoryConstrained);
    document.body.classList.toggle(`network-${this.networkSpeed}`, true);

    console.log('設備能力檢測:', {
      isLowEndDevice: this.isLowEndDevice,
      isMemoryConstrained: this.isMemoryConstrained,
      networkSpeed: this.networkSpeed,
      cores: navigatorHardwareConcurrency,
      memory: deviceMemory + 'GB'
    });
  }

  /**
   * 判斷是否為移動設備
   */
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * 分類網路速度
   */
  categorizeNetworkSpeed(effectiveType) {
    const speedMap = {
      'slow-2g': 'very-slow',
      '2g': 'slow',
      '3g': 'medium',
      '4g': 'fast'
    };
    return speedMap[effectiveType] || 'fast';
  }

  /**
   * 初始化懶加載
   */
  initializeLazyLoading() {
    // 圖片懶加載
    if ('IntersectionObserver' in window) {
      this.lazyLoadObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.loadImage(entry.target);
            }
          });
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.1
        }
      );

      // 觀察所有圖片
      document.querySelectorAll('img[data-src]').forEach(img => {
        this.lazyLoadObserver.observe(img);
      });
    }

    // 內容懶加載
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible', 'intersecting');
            this.intersectionObserver.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
      }
    );

    // 觀察需要懶加載的內容
    document.querySelectorAll('.lazy-content, .intersection-observer').forEach(element => {
      this.intersectionObserver.observe(element);
    });
  }

  /**
   * 載入圖片
   */
  loadImage(img) {
    const src = img.getAttribute('data-src');
    if (!src) return;

    // 添加載入狀態
    img.classList.add('loading');

    // 創建新圖片對象
    const newImg = new Image();

    newImg.onload = () => {
      img.src = src;
      img.classList.remove('loading');
      img.classList.add('loaded');
      this.lazyLoadObserver.unobserve(img);
    };

    newImg.onerror = () => {
      img.classList.remove('loading');
      img.classList.add('error');
      this.lazyLoadObserver.unobserve(img);
    };

    newImg.src = src;
  }

  /**
   * 初始化虛擬滾動
   */
  initializeVirtualScrolling() {
    // 為大列表初始化虛擬滾動
    const virtualScrollContainers = document.querySelectorAll('.virtual-scroll-container');

    virtualScrollContainers.forEach(container => {
      const instance = this.createVirtualScrollInstance(container);
      this.virtualScrollInstances.set(container, instance);
    });
  }

  /**
   * 創建虛擬滾動實例
   */
  createVirtualScrollInstance(container) {
    const itemHeight = 60; // 預設項目高度
    const bufferSize = 5; // 緩衝區大小

    return {
      container,
      itemHeight,
      bufferSize,
      visibleStart: 0,
      visibleEnd: 0,
      scrollTop: 0,
      containerHeight: 0,

      init() {
        this.containerHeight = container.clientHeight;
        this.updateVisibleRange();

        container.addEventListener('scroll', () => {
          this.updateVisibleRange();
        });
      },

      updateVisibleRange() {
        const scrollTop = container.scrollTop;
        const visibleStart = Math.floor(scrollTop / itemHeight);
        const visibleEnd = Math.min(
          visibleStart + Math.ceil(containerHeight / itemHeight) + bufferSize * 2,
          this.totalItems
        );

        this.visibleStart = Math.max(0, visibleStart - bufferSize);
        this.visibleEnd = visibleEnd;

        this.renderItems();
      },

      renderItems() {
        // 這裡會實現具體的渲染邏輯
        // 根據 visibleStart 和 visibleEnd 渲染對應的項目
      },

      setItems(items) {
        this.totalItems = items.length;
        this.items = items;
        this.updateVisibleRange();
      }
    };
  }

  /**
   * 初始化快取機制
   */
  initializeCache() {
    // 設置快取清理定時器
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000); // 每5分鐘清理一次

    // 監聽記憶體壓力
    if ('memory' in performance) {
      setInterval(() => {
        this.checkMemoryUsage();
      }, 30000); // 每30秒檢查一次
    }
  }

  /**
   * 清理快取
   */
  cleanupCache() {
    if (this.cache.size > this.cacheMaxSize) {
      // 刪除最舊的一半快取項
      const entriesToDelete = Array.from(this.cache.entries())
        .slice(0, Math.floor(this.cacheMaxSize / 2));

      entriesToDelete.forEach(([key]) => {
        this.cache.delete(key);
      });

      console.log(`清理了 ${entriesToDelete.length} 個快取項`);
    }
  }

  /**
   * 檢查記憶體使用情況
   */
  checkMemoryUsage() {
    if ('memory' in performance) {
      const memoryInfo = performance.memory;
      const usedMemory = memoryInfo.usedJSHeapSize;
      const totalMemory = memoryInfo.totalJSHeapSize;
      const memoryUsageRatio = usedMemory / totalMemory;

      this.performanceMetrics.memoryUsage.push({
        timestamp: Date.now(),
        used: usedMemory,
        total: totalMemory,
        ratio: memoryUsageRatio
      });

      // 記憶體使用率超過80%時觸發記憶體壓力
      if (memoryUsageRatio > 0.8) {
        this.handleMemoryPressure();
      }

      // 保留最近100個記憶體使用記錄
      if (this.performanceMetrics.memoryUsage.length > 100) {
        this.performanceMetrics.memoryUsage.shift();
      }
    }
  }

  /**
   * 設置性能監控
   */
  setupPerformanceMonitoring() {
    // 監控長任務
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.duration > 50) { // 超過50ms的任務
            console.warn('長任務檢測:', {
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.log('長任務監控不支持');
      }
    }

    // 監控FPS
    this.monitorFPS();

    // 監控首次內容繪製
    this.monitorFCP();
  }

  /**
   * 監控FPS
   */
  monitorFPS() {
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFPS = (currentTime) => {
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;

        // FPS低於30時記錄警告
        if (fps < 30) {
          console.warn('低FPS檢測:', fps);
        }

        // 在開發模式下顯示FPS
        if (location.hostname === 'localhost') {
          this.updateFPSIndicator(fps);
        }
      }

      if (!this.stopMonitoring) {
        requestAnimationFrame(measureFPS);
      }
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * 更新FPS指示器
   */
  updateFPSIndicator(fps) {
    let indicator = document.querySelector('.fps-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'fps-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        z-index: 9999;
      `;
      document.body.appendChild(indicator);
    }

    indicator.textContent = `FPS: ${fps}`;
    indicator.style.color = fps >= 50 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171';
  }

  /**
   * 監控首次內容繪製
   */
  monitorFCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            console.log('首次內容繪製時間:', entry.startTime + 'ms');

            // FCP超過2秒時記錄警告
            if (entry.startTime > 2000) {
              console.warn('首次內容繪製時間過長:', entry.startTime + 'ms');
            }
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.log('繪製監控不支持');
      }
    }
  }

  /**
   * 優化資源載入
   */
  optimizeResourceLoading() {
    // 預載入關鍵資源
    this.preloadCriticalResources();

    // 延遲載入非關鍵資源
    this.deferNonCriticalResources();

    // 優化字體載入
    this.optimizeFontLoading();

    // 啟用資源提示
    this.enableResourceHints();
  }

  /**
   * 預載入關鍵資源
   */
  preloadCriticalResources() {
    const criticalResources = [
      { href: '/css/critical.css', as: 'style' },
      { href: '/js/main.js', as: 'script' }
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      document.head.appendChild(link);
    });
  }

  /**
   * 延遲載入非關鍵資源
   */
  deferNonCriticalResources() {
    // 延遲載入圖片
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => {
      this.lazyLoadObserver.observe(img);
    });

    // 延遲載入非關鍵CSS
    setTimeout(() => {
      const nonCriticalLink = document.createElement('link');
      nonCriticalLink.rel = 'stylesheet';
      nonCriticalLink.href = '/css/non-critical.css';
      document.head.appendChild(nonCriticalLink);
    }, 2000);
  }

  /**
   * 優化字體載入
   */
  optimizeFontLoading() {
    if ('fonts' in document) {
      const font = new FontFace('Custom Font', 'url(/fonts/custom.woff2)', {
        display: 'swap'
      });

      font.load().then(() => {
        document.fonts.add(font);
        document.body.classList.add('font-loaded');
      });
    }
  }

  /**
   * 啟用資源提示
   */
  enableResourceHints() {
    // DNS預解析
    const dnsPrefetch = ['https://api.example.com'];
    dnsPrefetch.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });

    // 預連接
    const preconnect = ['https://cdn.example.com'];
    preconnect.forEach(origin => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      document.head.appendChild(link);
    });
  }

  /**
   * 設置記憶體監控
   */
  setupMemoryMonitoring() {
    // 監聽記憶體壓力事件
    if ('memory' in performance) {
      setInterval(() => {
        this.checkMemoryUsage();
      }, 30000);
    }
  }

  /**
   * 處理記憶體壓力
   */
  handleMemoryPressure() {
    console.warn('檢測到記憶體壓力，執行優化...');

    // 清理快取
    this.cleanupCache();

    // 移除非必要的動畫
    document.body.classList.add('memory-pressure');

    // 暫停某些功能
    this.pauseNonCriticalFeatures();

    // 觸發垃圾回收（如果支持）
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * 暫停非關鍵功能
   */
  pauseNonCriticalFeatures() {
    // 暫停動畫
    const animatedElements = document.querySelectorAll('.animated-element');
    animatedElements.forEach(el => {
      el.style.animationPlayState = 'paused';
    });

    // 減少定時器頻率
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  /**
   * 設置網路監控
   */
  setupNetworkMonitoring() {
    // 監聽網路狀態變化
    window.addEventListener('online', this.handleNetworkChange);
    window.addEventListener('offline', this.handleNetworkChange);

    // 監聽網路質量變化
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', this.handleNetworkChange);
    }

    // 初始網路狀態檢查
    this.updateNetworkStatus();
  }

  /**
   * 處理網路變化
   */
  handleNetworkChange() {
    this.updateNetworkStatus();
    this.adjustPerformanceForNetwork();
  }

  /**
   * 更新網路狀態
   */
  updateNetworkStatus() {
    const isOnline = navigator.onLine;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    // 更新網路狀態指示器
    let indicator = document.querySelector('.network-status');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'network-status';
      document.body.appendChild(indicator);
    }

    if (!isOnline) {
      indicator.className = 'network-status offline';
      indicator.textContent = '離線';
    } else if (connection) {
      const speed = this.categorizeNetworkSpeed(connection.effectiveType);
      indicator.className = `network-status ${speed}`;
      indicator.textContent = connection.effectiveType.toUpperCase();
    } else {
      indicator.className = 'network-status online';
      indicator.textContent = '在線';
    }
  }

  /**
   * 根據網路狀態調整性能
   */
  adjustPerformanceForNetwork() {
    const isOnline = navigator.onLine;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (!isOnline || (connection && connection.effectiveType === 'slow-2g')) {
      // 在離線或慢速網路下
      this.enableOfflineMode();
    } else {
      // 在良好網路下
      this.enableOnlineMode();
    }
  }

  /**
   * 啟用離線模式
   */
  enableOfflineMode() {
    // 禁用自動載入
    this.disableAutoLoading();

    // 減少背景同步
    this.reduceBackgroundSync();

    // 使用離線快取
    this.useOfflineCache();
  }

  /**
   * 啟用在線模式
   */
  enableOnlineMode() {
    // 啟用自動載入
    this.enableAutoLoading();

    // 恢復背景同步
    this.restoreBackgroundSync();
  }

  /**
   * 禁用自動載入
   */
  disableAutoLoading() {
    // 實現自動載入禁用邏輯
  }

  /**
   * 減少背景同步
   */
  reduceBackgroundSync() {
    // 實現背景同步減少邏輯
  }

  /**
   * 使用離線快取
   */
  useOfflineCache() {
    // 實現離線快取邏輯
  }

  /**
   * 處理滾動事件
   */
  handleScroll() {
    // 滾動性能優化
    this.updateVisibleElements();
    this.checkForLazyLoading();
  }

  /**
   * 處理視窗大小變化
   */
  handleResize() {
    // 重新計算虛擬滾動
    this.virtualScrollInstances.forEach(instance => {
      instance.containerHeight = instance.container.clientHeight;
      instance.updateVisibleRange();
    });

    // 重新檢查懶加載元素
    this.checkForLazyLoading();
  }

  /**
   * 更新可見元素
   */
  updateVisibleElements() {
    // 更新虛擬滾動的可見項目
    this.virtualScrollInstances.forEach(instance => {
      instance.updateVisibleRange();
    });
  }

  /**
   * 檢查懶加載
   */
  checkForLazyLoading() {
    // 手動檢查需要懶加載的元素
    const lazyElements = document.querySelectorAll('.lazy-content:not(.visible)');
    lazyElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

      if (isVisible) {
        element.classList.add('visible', 'intersecting');
        if (this.intersectionObserver) {
          this.intersectionObserver.unobserve(element);
        }
      }
    });
  }

  /**
   * 節流函數
   */
  throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * 防抖函數
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * 獲取性能指標
   */
  getPerformanceMetrics() {
    return {
      renderTime: this.performanceMetrics.renderTime,
      memoryUsage: this.performanceMetrics.memoryUsage,
      networkLatency: this.performanceMetrics.networkLatency,
      deviceInfo: {
        isLowEndDevice: this.isLowEndDevice,
        isMemoryConstrained: this.isMemoryConstrained,
        networkSpeed: this.networkSpeed
      }
    };
  }

  /**
   * 清理資源
   */
  destroy() {
    // 停止監控
    this.stopMonitoring = true;

    // 清理觀察器
    if (this.lazyLoadObserver) {
      this.lazyLoadObserver.disconnect();
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    // 清理虛擬滾動實例
    this.virtualScrollInstances.forEach(instance => {
      // 清理實例
    });
    this.virtualScrollInstances.clear();

    // 清理快取
    this.cache.clear();

    // 移除事件監聽器
    window.removeEventListener('online', this.handleNetworkChange);
    window.removeEventListener('offline', this.handleNetworkChange);

    if (navigator.connection) {
      navigator.connection.removeEventListener('change', this.handleNetworkChange);
    }

    // 移除性能指示器
    const indicators = document.querySelectorAll('.fps-indicator, .network-status');
    indicators.forEach(indicator => indicator.remove());
  }
}