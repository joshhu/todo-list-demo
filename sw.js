/**
 * Service Worker - Todo List 應用程式
 * 實現離線功能和資源快取
 */

const CACHE_NAME = 'todo-app-v1';
const STATIC_CACHE = 'todo-static-v1';
const DYNAMIC_CACHE = 'todo-dynamic-v1';

// 需要快取的靜態資源
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/variables.css',
    '/css/main.css',
    '/css/components.css',
    '/js/modules/app.js',
    '/js/modules/utils.js',
    '/js/modules/ui.js',
    '/js/modules/performance.js',
    '/js/main.js',
    '/assets/icons/favicon.ico',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png'
];

// 需要快取的 API 路徑
const API_CACHE_PATTERNS = [
    /^\/api\/tasks/,
    /^\/api\/categories/,
    /^\/api\/tags/
];

/**
 * Service Worker 安裝事件
 */
self.addEventListener('install', event => {
    console.log('🔧 Service Worker 安裝中...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('快取靜態資源...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ 靜態資源快取完成');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ 靜態資源快取失敗:', error);
            })
    );
});

/**
 * Service Worker 啟動事件
 */
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker 啟動中...');

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // 刪除舊版本的快取
                        if (cacheName !== STATIC_CACHE &&
                            cacheName !== DYNAMIC_CACHE &&
                            cacheName !== CACHE_NAME) {
                            console.log('刪除舊快取:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ 快取清理完成');
                return self.clients.claim();
            })
            .catch(error => {
                console.error('❌ 快取清理失敗:', error);
            })
    );
});

/**
 * 網路請求攔截
 */
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // 跳過 Chrome 擴展請求
    if (url.protocol === 'chrome-extension:') {
        return;
    }

    // 處理不同的請求類型
    if (request.destination === 'document') {
        // HTML 文檔 - 優先使用網路，失敗時使用快取
        event.respondWith(networkFirstStrategy(request));
    } else if (STATIC_ASSETS.some(asset => request.url.includes(asset))) {
        // 靜態資源 - 優先使用快取
        event.respondWith(cacheFirstStrategy(request));
    } else if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
        // API 請求 - 網路優先，短時間快取
        event.respondWith(networkFirstStrategy(request, 5 * 60 * 1000)); // 5 分鐘快取
    } else if (request.destination === 'image') {
        // 圖片資源 - 快取優先
        event.respondFrom(cacheFirstStrategy(request));
    } else {
        // 其他請求 - 網路優先
        event.respondWith(networkFirstStrategy(request));
    }
});

/**
 * 快取優先策略
 */
async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // 後台更新快取
            updateCacheInBackground(request);
            return cachedResponse;
        }

        // 快取中沒有，從網路獲取
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('快取優先策略失敗:', error);
        return new Response('離線模式無法載入資源', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

/**
 * 網路優先策略
 */
async function networkFirstStrategy(request, maxAge = 24 * 60 * 60 * 1000) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);

            // 添加時間戳到回應標頭
            const responseToCache = networkResponse.clone();
            const headers = new Headers(responseToCache.headers);
            headers.set('sw-cached-at', Date.now().toString());

            const modifiedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            });

            cache.put(request, modifiedResponse);
        }

        return networkResponse;
    } catch (error) {
        console.log('網路請求失敗，嘗試快取:', request.url);

        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // 檢查快取是否過期
            const cachedAt = cachedResponse.headers.get('sw-cached-at');
            if (cachedAt && (Date.now() - parseInt(cachedAt)) > maxAge) {
                console.log('快取已過期，但仍作為備用返回');
            }
            return cachedResponse;
        }

        // 如果是 HTML 請求，返回離線頁面
        if (request.destination === 'document') {
            return caches.match('/index.html') || new Response('離線模式', {
                status: 503,
                statusText: 'Service Unavailable'
            });
        }

        throw error;
    }
}

/**
 * 後台更新快取
 */
async function updateCacheInBackground(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse);
        }
    } catch (error) {
        // 靜默失敗，不影響主體功能
        console.log('後台快取更新失敗:', request.url);
    }
}

/**
 * 訊息處理
 */
self.addEventListener('message', event => {
    const { type, payload } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'GET_CACHE_SIZE':
            getCacheSize().then(size => {
                event.ports[0].postMessage({ type: 'CACHE_SIZE', payload: size });
            });
            break;

        case 'CLEAR_CACHE':
            clearCache().then(() => {
                event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
            });
            break;

        case 'FORCE_REFRESH':
            forceRefresh(payload).then(() => {
                event.ports[0].postMessage({ type: 'REFRESH_COMPLETE' });
            });
            break;

        default:
            console.log('未知的訊息類型:', type);
    }
});

/**
 * 獲取快取大小
 */
async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const responseClone = response.clone();
                const blob = await responseClone.blob();
                totalSize += blob.size;
            }
        }
    }

    return totalSize;
}

/**
 * 清理快取
 */
async function clearCache() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('所有快取已清理');
}

/**
 * 強制刷新特定資源
 */
async function forceRefresh(urls) {
    const cache = await caches.open(DYNAMIC_CACHE);

    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                await cache.put(url, response);
            }
        } catch (error) {
            console.error('刷新資源失敗:', url, error);
        }
    }
}

/**
 * 推送通知處理
 */
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : '您有新的待辦事項提醒',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: '查看詳情',
                icon: '/assets/icons/checkmark.png'
            },
            {
                action: 'close',
                title: '關閉',
                icon: '/assets/icons/xmark.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Todo List 提醒', options)
    );
});

/**
 * 通知點擊處理
 */
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        // 打開應用程式
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

/**
 * 同步事件處理（背景同步）
 */
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

/**
 * 執行背景同步
 */
async function doBackgroundSync() {
    try {
        // 從 IndexedDB 獲取離線時的資料變更
        const offlineChanges = await getOfflineChanges();

        // 同步到伺服器
        for (const change of offlineChanges) {
            try {
                await syncChangeToServer(change);
                await removeOfflineChange(change.id);
            } catch (error) {
                console.error('同步變更失敗:', change, error);
            }
        }

        console.log('背景同步完成');
    } catch (error) {
        console.error('背景同步失敗:', error);
    }
}

/**
 * 獲取離線變更（模擬）
 */
async function getOfflineChanges() {
    // 這裡應該從 IndexedDB 獲取離線時的資料變更
    // 目前返回空陣列作為示例
    return [];
}

/**
 * 同步變更到伺服器（模擬）
 */
async function syncChangeToServer(change) {
    // 這裡應該將變更同步到伺服器
    console.log('同步變更到伺服器:', change);
}

/**
 * 移除離線變更（模擬）
 */
async function removeOfflineChange(changeId) {
    // 這裡應該從 IndexedDB 移除已同步的變更
    console.log('移除離線變更:', changeId);
}

console.log('🔧 Service Worker 載入完成');