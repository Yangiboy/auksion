const https = require('https');

// Telegramga xabar yuborish
function sendTelegramMessage(token, chatId, message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ 
      chat_id: chatId, 
      text: message, 
      parse_mode: 'HTML' 
    });
    
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

// Telegramga rasm yuborish (URL orqali)
function sendTelegramPhoto(token, chatId, photoUrl, caption) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ 
      chat_id: chatId, 
      photo: photoUrl,
      caption: caption,
      parse_mode: 'HTML'
    });
    
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendPhoto`,
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

// Telegramga media group (rasmlar albaumi) yuborish
function sendTelegramMediaGroup(token, chatId, photoUrls, caption) {
  return new Promise((resolve, reject) => {
    const media = photoUrls.map((url, index) => ({
      type: 'photo',
      media: url,
      caption: index === 0 ? caption : '', // Faqat birinchi rasmga caption
      parse_mode: 'HTML'
    }));

    const data = JSON.stringify({
      chat_id: chatId,
      media: media
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMediaGroup`,
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

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    
    // Environment variables'dan Telegram sozlamalarini olish
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Telegram sozlamalari to\'ldirilmagan. TELEGRAM_TOKEN va TELEGRAM_CHAT_ID environment variables ni sozlang.' 
        })
      };
    }

    // Rasmlar bilan yuborish
    if (data.photo_urls && data.photo_urls.length > 0) {
      const photoUrls = data.photo_urls;
      
      if (photoUrls.length === 1) {
        // Bitta rasm
        await sendTelegramPhoto(token, chatId, photoUrls[0], data.caption || '');
      } else {
        // Bir nechta rasmlar
        await sendTelegramMediaGroup(token, chatId, photoUrls, data.caption || '');
      }
    } else if (data.message) {
      // Faqat text bilan yuborish
      await sendTelegramMessage(token, chatId, data.message);
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'message yoki photo_urls talab qilinadi' 
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Telegram xatosi:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.error || error.message || 'Noma\'lum xato' 
      })
    };
  }
};
