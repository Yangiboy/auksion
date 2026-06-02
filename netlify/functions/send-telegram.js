// Telegram Bot Handler for Netlify Functions
// Supports: Text messages, single photos, media groups

// URL ning to'g'ri ekanligini tekshirish
function isValidUrl(url) {
  try {
    if (!url) return false;
    // HTTP yoki HTTPS bilan boshlashi kerak
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Fetch bilan timeout support
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Telegramga xabar yuborish
async function sendTelegramMessage(token, chatId, message) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML'
  };

  console.log('📝 Sending text message to chat:', chatId);
  
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, 15000);

  const result = await response.json();
  
  if (!result.ok) {
    const error = result.description || 'Unknown Telegram error';
    console.error('❌ Telegram sendMessage error:', error);
    throw new Error(error);
  }
  
  console.log('✅ Message sent successfully');
  return { success: true };
}

// Telegramga rasm yuborish (URL orqali)
async function sendTelegramPhoto(token, chatId, photoUrl, caption) {
  const url = `https://api.telegram.org/bot${token}/sendPhoto`;
  const payload = {
    chat_id: chatId,
    photo: photoUrl,
    caption: caption,
    parse_mode: 'HTML'
  };

  console.log('📸 Sending photo:', photoUrl);
  
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, 15000);

  const result = await response.json();
  
  if (!result.ok) {
    const error = result.description || 'Unknown Telegram error';
    console.error('❌ Telegram sendPhoto error:', error, 'URL:', photoUrl);
    throw new Error(`Failed to send photo: ${error}`);
  }
  
  console.log('✅ Photo sent successfully');
  return { success: true };
}

// Telegramga media group (rasmlar albaumi) yuborish
async function sendTelegramMediaGroup(token, chatId, photoUrls, caption) {
  const url = `https://api.telegram.org/bot${token}/sendMediaGroup`;
  
  const media = photoUrls.map((photoUrl, index) => ({
    type: 'photo',
    media: photoUrl,
    caption: index === 0 ? caption : '',
    parse_mode: 'HTML'
  }));

  const payload = {
    chat_id: chatId,
    media: media
  };

  console.log('📸 Sending media group with', photoUrls.length, 'photos');
  
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, 20000);

  const result = await response.json();
  
  if (!result.ok) {
    const error = result.description || 'Unknown Telegram error';
    console.error('❌ Telegram sendMediaGroup error:', error);
    throw new Error(error);
  }
  
  console.log('✅ Media group sent successfully');
  return { success: true };
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

    console.log('🔧 Telegram Token present:', !!token);
    console.log('🔧 Telegram Chat ID present:', !!chatId);

    if (!token || !chatId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Telegram settings not configured. Set TELEGRAM_TOKEN and TELEGRAM_CHAT_ID environment variables.',
          success: false
        })
      };
    }

    // Rasmlar bilan yuborish
    if (data.photo_urls && data.photo_urls.length > 0) {
      // Faqat to'g'ri URL larni saqlash
      const validPhotoUrls = data.photo_urls.filter(url => isValidUrl(url));
      
      console.log(`📊 Received ${data.photo_urls.length} URLs, ${validPhotoUrls.length} are valid`);
      
      if (validPhotoUrls.length === 0) {
        console.warn('⚠️ No valid photo URLs found. Sending text only.');
        console.warn('Received URLs:', data.photo_urls);
        // Faqat text bilan yuborish
        await sendTelegramMessage(token, chatId, data.caption || 'No caption provided');
      } else if (validPhotoUrls.length === 1) {
        // Bitta rasm
        await sendTelegramPhoto(token, chatId, validPhotoUrls[0], data.caption || '');
      } else {
        // Bir nechta rasmlar
        await sendTelegramMediaGroup(token, chatId, validPhotoUrls, data.caption || '');
      }
    } else if (data.message) {
      // Faqat text bilan yuborish
      await sendTelegramMessage(token, chatId, data.message);
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Either message or photo_urls must be provided',
          success: false
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    const errorMsg = error?.message || error?.toString?.() || JSON.stringify(error) || 'Unknown error';
    console.error('❌ Handler Error:', {
      message: errorMsg,
      stack: error?.stack
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: errorMsg,
        success: false
      })
    };
  }
};
