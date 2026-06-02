# E-Auksion Telegram Netlify Integration

## Overview

This document explains how the Telegram posting functionality has been adapted for Netlify serverless deployment.

## Architecture Comparison

### Local Server (server.js)
- Persistent file system for storing settings (telegram.json)
- Temporary local storage for downloaded photos (/temp-photos/)
- File-based data persistence
- Long-running server process

### Netlify Deployment
- Environment variables for settings (TELEGRAM_TOKEN, TELEGRAM_CHAT_ID)
- Stateless functions - no persistent storage
- Direct URL passing to Telegram API
- Serverless functions triggered on demand

## Netlify Functions Created

### 1. telegram-settings.js
**Purpose:** Manage Telegram bot token and chat ID

**Endpoints:**
- `GET /.netlify/functions/telegram-settings` - Get settings from environment
- `POST /.netlify/functions/telegram-settings` - Validate settings

**Environment Variables:**
- `TELEGRAM_TOKEN` - Telegram bot token
- `TELEGRAM_CHAT_ID` - Telegram chat or channel ID

**Note:** Settings are read-only in production. Update via Netlify UI or CLI:
```bash
netlify env:set TELEGRAM_TOKEN "your-token"
netlify env:set TELEGRAM_CHAT_ID "your-chat-id"
```

### 2. send-telegram.js
**Purpose:** Send messages and photos to Telegram

**Endpoint:**
- `POST /.netlify/functions/send-telegram` - Send message or photos

**Request Body:**
```json
{
  "message": "Text only message",
  "photo_urls": ["https://example.com/photo1.jpg"],
  "caption": "Message caption"
}
```

**Supported Message Types:**
1. Text only: Include `message` field
2. Single photo: Include `photo_urls` with 1 URL and `caption`
3. Multiple photos: Include `photo_urls` with multiple URLs and `caption`

## Migration Steps

### Step 1: Set Environment Variables

On Netlify Site Settings → Build & deploy → Environment:

```
TELEGRAM_TOKEN = bot123456789:ABCDefghijklmnopqrstuvwxyz
TELEGRAM_CHAT_ID = -1001234567890
```

Or using CLI:
```bash
netlify env:set TELEGRAM_TOKEN "your-token"
netlify env:set TELEGRAM_CHAT_ID "your-chat-id"
```

### Step 2: Update index.html

Replace all API calls:

**Old Code:**
```javascript
fetch('/telegram-settings')
fetch('/send-telegram', { local_urls: [...] })
fetch('/upload-photos')
```

**New Code:**
```javascript
fetch('/.netlify/functions/telegram-settings')
fetch('/.netlify/functions/send-telegram', { photo_urls: [...] })
// No upload-photos needed
```

See `TELEGRAM_FRONTEND_UPDATES.md` for detailed code changes.

### Step 3: Test Locally

```bash
netlify dev
```

The dev environment will load variables from `.env` file if present.

### Step 4: Deploy

```bash
git add .
git commit -m "Telegram Netlify integration"
git push origin main
```

Netlify will automatically deploy.

## Photo Handling

### Key Difference

**Local Server:**
- Downloads photos from e-auksion.uz
- Stores temporarily on server
- Serves them locally (/temp-photos/)
- Sends local file paths to Telegram

**Netlify:**
- Uses photo URLs directly from e-auksion.uz
- No local storage
- Sends URLs to Telegram API
- Telegram fetches photos directly

### URL Requirements

Photo URLs must:
- Be publicly accessible
- Return valid image content
- Be served with proper CORS headers (usually not an issue with Telegram)
- Support HTTPS (recommended)

Example working URLs:
```
https://e-auksion.uz/api/lot/image/12345.jpg
https://example.com/photos/item.jpg
```

## Development vs Production

### Local Development (.env)
```
TELEGRAM_TOKEN=your-test-token
TELEGRAM_CHAT_ID=your-test-chat-id
```

### Production (Netlify Settings)
Set via UI or CLI, not committed to git.

## API Response Formats

### Success Response
```json
{
  "success": true
}
```

### Error Response
```json
{
  "error": "Error message description"
}
```

### Settings Response
```json
{
  "token": "bot123456789:...",
  "chat_id": "-1001234567890"
}
```

## Troubleshooting

### Settings not found
**Problem:** Getting "Telegram sozlamalari to'ldirilmagan"
**Solution:** 
1. Check environment variables are set
2. Run `netlify env:list` to verify
3. Restart `netlify dev` after setting env vars

### Photos not sending
**Problem:** Error when sending with photos
**Solution:**
1. Verify URLs are accessible
2. Check URLs return images (not HTML)
3. Ensure URLs start with https://
4. Try text-only message first to verify token works

### Token invalid
**Problem:** "Invalid token"
**Solution:**
1. Copy token exactly from BotFather
2. Don't add spaces or quotes
3. Verify it starts with numbers, has colon, then long alphanumeric string

## File Structure

```
netlify/
├── functions/
│   ├── telegram-settings.js      ← Settings management
│   ├── send-telegram.js          ← Telegram sender
│   ├── fetch-lots.js
│   ├── fetch-lot-info.js
│   └── favorites.js
├── netlify.toml
└── .env (local only, not in git)

eauksion-app/
├── index.html                    ← Frontend (needs updates)
├── server.js                     ← Local server only
└── telegram.json                 ← No longer used
```

## What Changed

| Component | Before | After |
|-----------|--------|-------|
| Settings Storage | telegram.json | Environment variables |
| Photo Storage | /temp-photos/ | No local storage |
| Photo Transfer | Download & store | Direct URLs |
| Upload Endpoint | /upload-photos | Removed |
| Settings API | /telegram-settings | /.netlify/functions/telegram-settings |
| Send API | /send-telegram | /.netlify/functions/send-telegram |
| Deployment | Local Node.js | Netlify Functions |

## Security Notes

✅ **Good:**
- Bot token in environment variables (not in code)
- No sensitive data exposed in frontend
- HTTPS required for Telegram API

⚠️ **Consider:**
- Limit who can access settings (use Netlify auth if needed)
- Validate incoming data
- Rate limit if many requests expected

## Performance

- Functions cold start: ~1-2 seconds first request
- Subsequent requests: <500ms
- Telegram API latency: 1-3 seconds typically
- No database latency (stateless)

## Related Files

- [DEPLOY.md](DEPLOY.md) - Deployment instructions
- [TELEGRAM_FRONTEND_UPDATES.md](TELEGRAM_FRONTEND_UPDATES.md) - Frontend code changes
- [.env.example](.env.example) - Environment variables template
