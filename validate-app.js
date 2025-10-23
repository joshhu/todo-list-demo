#!/usr/bin/env node3

/**
 * 應用程式驗證腳本
 * 檢查所有必要的文件和功能是否正常
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUIRED_FILES = [
    'index.html',
    'css/main.css',
    'css/variables.css',
    'css/components.css',
    'js/main.js',
    'js/config/settings.js',
    'js/modules/utils.js',
    'js/modules/storage.js',
    'js/modules/ui.js',
    'js/modules/app.js',
];

const REQUIRED_DIRECTORIES = [
    'css',
    'js',
    'js/modules',
    'js/config',
    'assets',
    'assets/icons',
    'assets/images',
    'tests',
    'tests/unit',
    'tests/integration',
];

class AppValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.successes = [];
    }

    log(message, type = 'info') {
        const prefix = {
            'error': '❌',
            'warning': '⚠️',
            'success': '✅',
            'info': 'ℹ️',
        }[type] || 'ℹ️';

        console.log(`${prefix} ${message}`);

        if (type === 'error') {
            this.errors.push(message);
        } else if (type === 'warning') {
            this.warnings.push(message);
        } else if (type === 'success') {
            this.successes.push(message);
        }
    }

    checkFiles() {
        this.log('檢查必要文件...', 'info');

        REQUIRED_FILES.forEach(file => {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                this.log(`文件存在: ${file} (${stats.size} bytes)`, 'success');
            } else {
                this.log(`文件不存在: ${file}`, 'error');
            }
        });
    }

    checkDirectories() {
        this.log('檢查必要目錄...', 'info');

        REQUIRED_DIRECTORIES.forEach(dir => {
            const dirPath = path.join(__dirname, dir);
            if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
                this.log(`目錄存在: ${dir}`, 'success');
            } else {
                this.log(`目錄不存在: ${dir}`, 'error');
            }
        });
    }

    checkHTMLStructure() {
        this.log('檢查 HTML 結構...', 'info');

        const htmlPath = path.join(__dirname, 'index.html');
        if (!fs.existsSync(htmlPath)) {
            this.log('index.html 不存在', 'error');
            return;
        }

        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        const checks = [
            { pattern: /<!DOCTYPE html>/, name: 'DOCTYPE 聲明' },
            { pattern: /<html[^>]*lang="zh-TW"/, name: 'HTML 語言屬性' },
            { pattern: /<meta charset="UTF-8">/, name: '字符編碼設定' },
            { pattern: /<meta name="viewport"/, name: '響應式設計 meta' },
            { pattern: /<title>/, name: '頁面標題' },
            { pattern: /id="app"/, name: '應用程式容器' },
            { pattern: /id="todo-form"/, name: '待辦事項表單' },
            { pattern: /id="todo-list"/, name: '待辦事項列表' },
            { pattern: /<script type="module" src="js\/main\.js">/, name: '模組化 JavaScript' },
            { pattern: /css\/main\.css/, name: '主要 CSS 文件' },
        ];

        checks.forEach(check => {
            if (check.pattern.test(htmlContent)) {
                this.log(`✓ ${check.name}`, 'success');
            } else {
                this.log(`✗ ${check.name}`, 'error');
            }
        });
    }

    checkCSSFiles() {
        this.log('檢查 CSS 文件...', 'info');

        const cssFiles = [
            'css/main.css',
            'css/variables.css',
            'css/components.css',
        ];

        cssFiles.forEach(file => {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const size = content.length;

                if (size > 0) {
                    this.log(`CSS 文件有效: ${file} (${size} 字元)`, 'success');
                } else {
                    this.log(`CSS 文件為空: ${file}`, 'warning');
                }
            }
        });
    }

    checkJSFiles() {
        this.log('檢查 JavaScript 文件...', 'info');

        const jsFiles = [
            'js/main.js',
            'js/config/settings.js',
            'js/modules/utils.js',
            'js/modules/storage.js',
            'js/modules/ui.js',
            'js/modules/app.js',
        ];

        jsFiles.forEach(file => {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const size = content.length;

                // 檢查 ES6 模組語法
                const hasImport = /import\s+.*from\s+/.test(content);
                const hasExport = /export\s+/.test(content);

                if (size > 0) {
                    this.log(`JavaScript 文件有效: ${file} (${size} 字元)`, 'success');

                    if (hasImport) {
                        this.log(`包含 import 語句: ${file}`, 'success');
                    }
                    if (hasExport) {
                        this.log(`包含 export 語句: ${file}`, 'success');
                    }
                } else {
                    this.log(`JavaScript 文件為空: ${file}`, 'error');
                }
            }
        });
    }

    checkProjectStructure() {
        this.log('檢查專案結構...', 'info');

        // 檢查根目錄文件
        const rootFiles = fs.readdirSync(__dirname);
        const hasHTML = rootFiles.includes('index.html');
        const hasCSS = fs.existsSync(path.join(__dirname, 'css'));
        const hasJS = fs.existsSync(path.join(__dirname, 'js'));

        if (hasHTML) {
            this.log('根目錄包含 index.html', 'success');
        }

        if (hasCSS && hasJS) {
            this.log('CSS 和 JavaScript 目錄結構正確', 'success');
        }

        // 檢查 .gitignore
        if (rootFiles.includes('.gitignore')) {
            this.log('存在 .gitignore 文件', 'success');
        } else {
            this.log('缺少 .gitignore 文件', 'warning');
        }
    }

    validate() {
        console.log('🔍 開始驗證 Todo List 應用程式...\n');

        this.checkProjectStructure();
        this.checkFiles();
        this.checkDirectories();
        this.checkHTMLStructure();
        this.checkCSSFiles();
        this.checkJSFiles();

        console.log('\n' + '='.repeat(50));
        console.log('📊 驗證結果總結:');
        console.log(`✅ 成功: ${this.successes.length}`);
        console.log(`⚠️  警告: ${this.warnings.length}`);
        console.log(`❌ 錯誤: ${this.errors.length}`);

        if (this.errors.length === 0) {
            console.log('\n🎉 應用程式驗證通過！所有必要文件和功能都已正確設置。');
            return true;
        } else {
            console.log('\n❌ 應用程式驗證失敗，請修復上述錯誤。');
            return false;
        }
    }
}

// 執行驗證
const validator = new AppValidator();
const isValid = validator.validate();

// 設定退出代碼
process.exit(isValid ? 0 : 1);