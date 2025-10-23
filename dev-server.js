#!/usr/bin/env node

/**
 * 簡單的開發服務器
 * 用於本地開發和測試
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

// MIME 類型映射
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

/**
 * 獲取文件的 MIME 類型
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 獲取響應頭
 */
function getHeaders(filePath, stats) {
  const headers = {
    'Content-Type': getContentType(filePath),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // 為 HTML 文件添加緩存控制
  if (path.extname(filePath) === '.html') {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  }

  return headers;
}

/**
 * 處理請求
 */
function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // 處理根路徑
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // 安全檢查 - 防止路徑遍歷攻擊
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  // 檢查文件是否存在
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // 文件不存在
      console.log(`File not found: ${filePath}`);
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>404 - 文件未找到</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #e74c3c; }
            p { color: #666; }
            a { color: #3498db; }
          </style>
        </head>
        <body>
          <h1>404 - 文件未找到</h1>
          <p>請求的文件 <code>${pathname}</code> 不存在。</p>
          <p><a href="/">返回首頁</a></p>
        </body>
        </html>
      `);
      return;
    }

    // 獲取文件狀態
    fs.stat(filePath, (err, stats) => {
      if (err) {
        console.error('Error getting file stats:', err);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('500 - 服務器內部錯誤');
        return;
      }

      // 處理目錄請求
      if (stats.isDirectory()) {
        const indexPath = path.join(filePath, 'index.html');
        fs.access(indexPath, fs.constants.F_OK, (err) => {
          if (err) {
            // 如果沒有 index.html，列出目錄內容
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            fs.readdir(filePath, (err, files) => {
              if (err) {
                res.end('500 - 服務器內部錯誤');
                return;
              }

              const fileList = files.map(file => {
                const isDir = fs.statSync(path.join(filePath, file)).isDirectory();
                return `<li><a href="${pathname === '/' ? '' : pathname}/${file}/">${file}${isDir ? '/' : ''}</a></li>`;
              }).join('');

              res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>目錄列表 - ${pathname}</title>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1 { color: #2c3e50; }
                    ul { list-style: none; padding: 0; }
                    li { margin: 5px 0; }
                    a { text-decoration: none; color: #3498db; padding: 5px 10px; border-radius: 3px; }
                    a:hover { background: #ecf0f1; }
                    .dir { font-weight: bold; }
                  </style>
                </head>
                <body>
                  <h1>目錄: ${pathname}</h1>
                  <ul>${fileList}</ul>
                  <p><a href="${pathname}/..">返回上層目錄</a></p>
                </body>
                </html>
              `);
            });
          } else {
            // 提供 index.html
            serveFile(indexPath, res);
          }
        });
      } else {
        // 提供文件
        serveFile(filePath, res);
      }
    });
  });
}

/**
 * 提供文件服務
 */
function serveFile(filePath, res) {
  const readStream = fs.createReadStream(filePath);
  const headers = getHeaders(filePath);

  res.writeHead(200, headers);

  readStream.on('open', () => {
    readStream.pipe(res);
  });

  readStream.on('error', (err) => {
    console.error('Error reading file:', err);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('500 - 服務器內部錯誤');
  });
}

/**
 * 創建服務器
 */
const server = http.createServer(handleRequest);

/**
 * 啟動服務器
 */
server.listen(PORT, HOST, () => {
  console.log('🚀 開發服務器已啟動');
  console.log(`📡 服務地址: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`📁 服務目錄: ${__dirname}`);
  console.log('');
  console.log('可用的頁面:');
  console.log(`  • 首頁: http://localhost:${PORT}/`);
  console.log(`  • Todo List: http://localhost:${PORT}/`);
  console.log('');
  console.log('按 Ctrl+C 停止服務器');
});

/**
 * 優雅關閉
 */
process.on('SIGINT', () => {
  console.log('\n🛑 正在關閉服務器...');
  server.close(() => {
    console.log('✅ 服務器已關閉');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 收到 SIGTERM 信號，正在關閉服務器...');
  server.close(() => {
    console.log('✅ 服務器已關閉');
    process.exit(0);
  });
});

// 錯誤處理
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ 端口 ${PORT} 已被占用，請使用其他端口`);
    console.log(`💡 嘗試運行: PORT=8001 node dev-server.js`);
  } else {
    console.error('❌ 服務器錯誤:', err);
  }
  process.exit(1);
});