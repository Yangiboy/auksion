const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const TARGET = 'e-auksion.uz';
const FAVORITES_FILE = path.join(__dirname, 'favorites.json');
const TELEGRAM_FILE = path.join(__dirname, 'telegram.json');
const TEMP_PHOTOS_DIR = path.join(__dirname, '.temp-photos');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
};

// Favorites faylni olish
function getFavorites() {
  try {
    if (!fs.existsSync(FAVORITES_FILE)) {
      fs.writeFileSync(FAVORITES_FILE, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(FAVORITES_FILE, 'utf8'));
  } catch(e) {
    return [];
  }
}

// Favorites faylga saqlash
function saveFavorites(favorites) {
  fs.writeFileSync(FAVORITES_FILE, JSON.stringify(favorites, null, 2));
}

// Telegram sozlamalarni olish
function getTelegramSettings() {
  try {
    if (!fs.existsSync(TELEGRAM_FILE)) {
      const defaults = { token: '', chat_id: '' };
      fs.writeFileSync(TELEGRAM_FILE, JSON.stringify(defaults, null, 2));
      return defaults;
    }
    return JSON.parse(fs.readFileSync(TELEGRAM_FILE, 'utf8'));
  } catch(e) {
    return { token: '', chat_id: '' };
  }
}

// Telegram sozlamalarni saqlash
function saveTelegramSettings(settings) {
  fs.writeFileSync(TELEGRAM_FILE, JSON.stringify(settings, null, 2));
}

// Telegramga xabar yuborish
function sendTelegramMessage(token, chatId, message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' });
    
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.ok) {
            resolve({ success: true });
          } else {
            reject({ error: response.description || 'Telegram xatosi' });
          }
        } catch(e) {
          reject({ error: e.message });
        }
      });
    });

    req.on('error', (e) => reject({ error: e.message }));
    req.write(data);
    req.end();
  });
}

// Telegramga rasm yuborish (file orqali)
function sendTelegramPhoto(token, chatId, photoPath, caption) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36).substr(2);
    let body = '';
    
    // Form-data body tayyorlash
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="chat_id"\r\n\r\n';
    body += chatId + '\r\n';
    
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="caption"\r\n\r\n';
    body += (caption || '') + '\r\n';
    
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="parse_mode"\r\n\r\n';
    body += 'HTML\r\n';
    
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="photo"; filename="photo.jpg"\r\n';
    body += 'Content-Type: image/jpeg\r\n\r\n';
    
    const footer = `\r\n--${boundary}--\r\n`;
    
    // File o'qish
    fs.readFile(photoPath, (err, fileData) => {
      if (err) {
        return reject({ error: 'Rasm o\'qish xatosi: ' + err.message });
      }
      
      const fullBody = Buffer.concat([
        Buffer.from(body),
        fileData,
        Buffer.from(footer)
      ]);
      
      const options = {
        hostname: 'api.telegram.org',
        path: `/bot${token}/sendPhoto`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': fullBody.length,
        },
      };

      const req = https.request(options, (res) => {
        let respBody = '';
        res.on('data', chunk => respBody += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(respBody);
            if (response.ok) {
              resolve({ success: true });
            } else {
              reject({ error: response.description || 'Telegram xatosi' });
            }
          } catch(e) {
            reject({ error: e.message });
          }
        });
      });

      req.on('error', (e) => reject({ error: e.message }));
      req.write(fullBody);
      req.end();
    });
  });
}

// Telegramga media group (rasmlar albaumi) yuborish (file orqali)
function sendTelegramMediaGroup(token, chatId, photoPaths, caption) {
  return new Promise((resolve, reject) => {
    try {
      if (!photoPaths || photoPaths.length === 0) {
        return reject({ error: 'Rasmlar yo\'q' });
      }

      // Agar bitta rasm bo'lsa, oddiy sendPhoto ишлат
      if (photoPaths.length === 1) {
        return sendTelegramPhoto(token, chatId, photoPaths[0], caption)
          .then(resolve)
          .catch(reject);
      }

      // Barcha fayllarni o'qish
      let filesRead = 0;
      const fileBuffers = {};
      
      photoPaths.forEach((photoPath, index) => {
        fs.readFile(photoPath, (err, fileData) => {
          if (err) {
            return reject({ error: 'Rasm o\'qish xatosi: ' + err.message });
          }

          fileBuffers[index] = fileData;
          filesRead++;

          // Barcha fayllar o\'qilganda multipart form-data tayyorlash
          if (filesRead === photoPaths.length) {
            const boundary = '----FormBoundary' + Math.random().toString(36).substr(2);
            
            // Media group JSON massivini tayyorlash
            const media = photoPaths.map((photoPath, index) => ({
              type: 'photo',
              media: `attach://photo_${index}`,
              caption: index === 0 ? caption : '', // Faqat birinchi rasmga caption
              parse_mode: 'HTML'
            }));

            let body = '';

            // chat_id
            body += `--${boundary}\r\n`;
            body += 'Content-Disposition: form-data; name="chat_id"\r\n\r\n';
            body += chatId + '\r\n';

            // media (JSON)
            body += `--${boundary}\r\n`;
            body += 'Content-Disposition: form-data; name="media"\r\n';
            body += 'Content-Type: application/json\r\n\r\n';
            body += JSON.stringify(media) + '\r\n';

            // Rasmlar
            let fullBody = Buffer.from(body);
            photoPaths.forEach((photoPath, index) => {
              const filePart = `--${boundary}\r\nContent-Disposition: form-data; name="photo_${index}"; filename="photo_${index}.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`;
              fullBody = Buffer.concat([
                fullBody,
                Buffer.from(filePart),
                fileBuffers[index],
                Buffer.from('\r\n')
              ]);
            });

            // Final boundary
            fullBody = Buffer.concat([
              fullBody,
              Buffer.from(`--${boundary}--\r\n`)
            ]);

            const options = {
              hostname: 'api.telegram.org',
              path: `/bot${token}/sendMediaGroup`,
              method: 'POST',
              headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': fullBody.length,
              },
            };

            const req = https.request(options, (res) => {
              let respBody = '';
              res.on('data', chunk => respBody += chunk);
              res.on('end', () => {
                try {
                  const response = JSON.parse(respBody);
                  if (response.ok) {
                    resolve({ success: true });
                  } else {
                    reject({ error: response.description || 'Telegram xatosi' });
                  }
                } catch(e) {
                  reject({ error: e.message });
                }
              });
            });

            req.on('error', (e) => reject({ error: e.message }));
            req.write(fullBody);
            req.end();
          }
        });
      });
    } catch(e) {
      reject({ error: e.message });
    }
  });
}

// Temp folder yaratish/tozalash
function ensureTempDir() {
  if (!fs.existsSync(TEMP_PHOTOS_DIR)) {
    fs.mkdirSync(TEMP_PHOTOS_DIR, { recursive: true });
  }
}

// Temp folder'dagi eski rasmlarni tozalash
function cleanTempPhotos() {
  try {
    if (fs.existsSync(TEMP_PHOTOS_DIR)) {
      const files = fs.readdirSync(TEMP_PHOTOS_DIR);
      files.forEach(file => {
        fs.unlinkSync(path.join(TEMP_PHOTOS_DIR, file));
      });
    }
  } catch(e) {
    console.error('Temp folder tozalash xatosi:', e);
  }
}

function proxyRequest(req, res, targetPath, method, body) {
  const options = {
    hostname: TARGET,
    port: 443,
    path: targetPath,
    method: method,
    headers: {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'ru,en-US;q=0.9,en;q=0.8,uz;q=0.7',
      'authorization': req.headers['authorization'] || '',
      'content-type': req.headers['content-type'] || 'application/json',
      'origin': 'https://e-auksion.uz',
      'referer': 'https://e-auksion.uz/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  };
  if (body) options.headers['content-length'] = Buffer.byteLength(body);

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  });

  if (body) proxyReq.write(body);
  proxyReq.end();
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  // Favorites endpoints
  if (parsed.pathname === '/favorites') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    if (req.method === 'GET') {
      return res.end(JSON.stringify(getFavorites()));
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const favorites = getFavorites();
          const idx = favorites.indexOf(data.lot_id);
          if (idx > -1) {
            favorites.splice(idx, 1);
          } else {
            favorites.push(data.lot_id);
          }
          saveFavorites(favorites);
          res.end(JSON.stringify(favorites));
        } catch(e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
  }

  // Telegram rasmlarini upload qilish endpoint
  if (parsed.pathname === '/upload-photos') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          ensureTempDir();
          const data = JSON.parse(body);
          const photoUrls = data.photos || [];
          const localUrls = [];

          // Har bir rasmni download qilib local folder'ga saqlash
          let completed = 0;
          photoUrls.forEach((photoUrl, index) => {
            https.get(photoUrl, (response) => {
              const filename = `photo_${Date.now()}_${index}.jpg`;
              const filepath = path.join(TEMP_PHOTOS_DIR, filename);
              const fileStream = fs.createWriteStream(filepath);
              
              response.pipe(fileStream);
              fileStream.on('finish', () => {
                localUrls[index] = `/temp-photos/${filename}`;
                completed++;
                
                if (completed === photoUrls.length) {
                  res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                  });
                  res.end(JSON.stringify({ success: true, local_urls: localUrls }));
                }
              });
            }).on('error', (err) => {
              console.error('Rasm download xatosi:', err);
              completed++;
              if (completed === photoUrls.length) {
                res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                });
                res.end(JSON.stringify({ success: true, local_urls: localUrls }));
              }
            });
          });

          if (photoUrls.length === 0) {
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({ success: true, local_urls: [] }));
          }
        } catch(e) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
  }

  // Temp photos serve etish
  if (parsed.pathname.startsWith('/temp-photos/')) {
    const filename = parsed.pathname.replace('/temp-photos/', '');
    const filepath = path.join(TEMP_PHOTOS_DIR, filename);
    
    fs.readFile(filepath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found');
      }
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(data);
    });
    return;
  }

  // Telegram sozlamalari endpoints
  if (parsed.pathname === '/telegram-settings') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    if (req.method === 'GET') {
      return res.end(JSON.stringify(getTelegramSettings()));
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          saveTelegramSettings({ token: data.token || '', chat_id: data.chat_id || '' });
          res.end(JSON.stringify({ success: true }));
        } catch(e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
  }

  // Telegram xabar yuborish endpoint
  if (parsed.pathname === '/send-telegram') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const settings = getTelegramSettings();
          
          if (!settings.token || !settings.chat_id) {
            res.writeHead(400, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            return res.end(JSON.stringify({ error: 'Telegram sozlamalari to\'ldirilmagan' }));
          }

          // Local rasmlarni Telegram'ga yuborish
          if (data.local_urls && data.local_urls.length > 0) {
            // Local URL'larni file path'ga aylantiramiz
            const filePaths = data.local_urls.map(url => {
              const filename = url.replace('/temp-photos/', '');
              return path.join(TEMP_PHOTOS_DIR, filename);
            });
            
            // File paths bilan yuborish
            await sendTelegramMediaGroup(settings.token, settings.chat_id, filePaths, data.caption);
          } else {
            // Agar rasm bo'lmasa, text bilan yuborish
            await sendTelegramMessage(settings.token, settings.chat_id, data.message);
          }

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({ success: true }));
        } catch(e) {
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({ error: e.error || e.message }));
        }
      });
      return;
    }
  }

  // Proxy /api/* to e-auksion.uz
  if (parsed.pathname.startsWith('/api/')) {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => proxyRequest(req, res, parsed.pathname + (parsed.search || ''), 'POST', body));
    } else {
      proxyRequest(req, res, parsed.pathname + (parsed.search || ''), 'GET', null);
    }
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, parsed.pathname === '/' ? 'index.html' : parsed.pathname);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ Server ishga tushdi: http://localhost:${PORT}`);
  console.log(`   Brauzerda oching: http://localhost:${PORT}\n`);
});
