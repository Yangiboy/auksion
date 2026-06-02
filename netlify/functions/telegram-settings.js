const { promises: fs } = require('fs');
const path = require('path');

// In production, store these in environment variables or a database
let telegramSettings = { token: '', chat_id: '' };

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
      // Return current telegram settings
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(telegramSettings)
      };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      telegramSettings = {
        token: data.token || '',
        chat_id: data.chat_id || ''
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
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
