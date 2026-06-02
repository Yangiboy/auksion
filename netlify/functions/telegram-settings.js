// Telegram sozlamalarni environment variables dan olish
function getTelegramSettings() {
  return {
    token: process.env.TELEGRAM_TOKEN || '',
    chat_id: process.env.TELEGRAM_CHAT_ID || ''
  };
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

  try {
    if (event.httpMethod === 'GET') {
      // Environment variables'dan Telegram sozlamalarini qaytarish
      const settings = getTelegramSettings();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(settings)
      };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      
      // ESLATMA: Netlify Functions'da environment variables'ni dinamik o'zgartirib bo'lmaydi.
      // Ushbu endpoint faqat sozlamalarni tekshirish uchun hisoblanadi.
      // Settings o'zgartirishni Netlify UI yoki CLI orqali qilish kerak:
      //   netlify env:set TELEGRAM_TOKEN "your-token"
      //   netlify env:set TELEGRAM_CHAT_ID "your-chat-id"
      
      // Ayni payt, faqat mavjud sozlamalarni qaytaramiz
      const settings = getTelegramSettings();
      
      if (!settings.token || !settings.chat_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Telegram sozlamalari to\'ldirilmagan. Netlify Site Settings > Build & deploy > Environment bo\'limida sozlang.',
            info: 'TELEGRAM_TOKEN va TELEGRAM_CHAT_ID environment variables ni o\'rnating'
          })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          message: 'Telegram sozlamalari topildi',
          has_token: !!settings.token,
          has_chat_id: !!settings.chat_id
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
