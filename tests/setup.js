/**
 * 測試環境設定
 */

// 設定測試環境
global.jest = {
  // Jest 配置選項
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/main.js', // 排除主入口文件
    '!tests/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};

// 模擬 DOM API
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000'
  },
  writable: true
});

// 模擬 localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
global.localStorage = localStorageMock;

// 模擬 sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
global.sessionStorage = sessionStorageMock;

// 模擬 navigator
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
    serviceWorker: {
      register: jest.fn()
    }
  },
  writable: true
});

// 模擬 matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // 過時的 API
    removeListener: jest.fn(), // 過時的 API
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// 模擬 ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// 模擬 IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// 模擬 requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// 模擬 console 方法以避免測試時的輸出干擾
const originalConsole = { ...console };
beforeEach(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

afterEach(() => {
  global.console = originalConsole;
});

// 模擬 CSS 樣式表
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
    zIndex: '0'
  })
});

// 模擬 HTMLElement 方法
HTMLElement.prototype.scrollIntoView = jest.fn();
HTMLElement.prototype.focus = jest.fn();
HTMLElement.prototype.blur = jest.fn();

// 清理函數
afterEach(() => {
  // 清理所有 mock
  jest.clearAllMocks();

  // 重置 localStorage 和 sessionStorage
  localStorageMock.clear();
  sessionStorageMock.clear();

  // 安全地清理 DOM
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
  while (document.head.firstChild) {
    document.head.removeChild(document.head.firstChild);
  }
});