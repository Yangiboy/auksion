# Telegram Netlify Integration - Frontend Updates

## Key Changes

### Old Flow (Local Server)
```
1. Frontend → /telegram-settings (GET/POST) - Read/write telegram.json
2. Frontend → /upload-photos - Download images, store locally, return local URLs
3. Frontend → /send-telegram - Send with local_urls and file paths
```

### New Flow (Netlify)
```
1. Frontend → /.netlify/functions/telegram-settings (GET/POST) - Use environment variables
2. Frontend → /.netlify/functions/send-telegram - Send with photo_urls (direct URLs)
```

## Frontend Code Updates Needed

### 1. Update API Endpoints

**Old:**
```javascript
const res = await fetch('/telegram-settings', {
  method: 'GET'
});
```

**New:**
```javascript
const res = await fetch('/.netlify/functions/telegram-settings', {
  method: 'GET'
});
```

### 2. Remove Upload Step

**Old Code (Remove this):**
```javascript
const uploadRes = await fetch('/upload-photos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ photos: photos })
});

const uploadData = await uploadRes.json();
const localUrls = uploadData.local_urls;
```

### 3. Update Send-Telegram Call

**Old:**
```javascript
const res = await fetch('/send-telegram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    local_urls: uploadData.local_urls,  // ❌ Remove this
    caption: caption
  })
});
```

**New:**
```javascript
const res = await fetch('/.netlify/functions/send-telegram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    photo_urls: photos,  // ✅ Use external URLs directly
    caption: caption
  })
});
```

### 4. Complete Updated sendToTelegram Function

```javascript
async function sendToTelegram(lotData) {
  const settings = await fetch('/.netlify/functions/telegram-settings')
    .then(r => r.json());
  
  if (!settings.token || !settings.chat_id) {
    alert('Telegram sozlamalarini avval to\'ldiring (Telegram tugmasini bosing)');
    return;
  }

  const btn = document.querySelector('.telegram-btn');
  const progressEl = document.getElementById('telegram-progress');
  const statusEl = document.getElementById('telegram-status');
  const progressBar = document.getElementById('telegram-progress-bar');
  
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="ti ti-loader-2"></i> Tayyorlanmoqda...';
  progressEl.classList.add('active');

  try {
    // Rasmlarni oling (maksimal 9 ta)
    const photos = (lotData.confiscant_images_list || [])
      .map(img => img.media_url)
      .filter(Boolean)
      .slice(0, 9);
    
    statusEl.textContent = '📋 Ma\'lumotlar tayyorlanmoqda...';
    progressBar.style.width = '15%';
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // ... [Lot ma'lumotlarini formatlash - caption qayta ishlash] ...
    
    // Telegram'ga yuborish
    statusEl.textContent = photos.length > 0 
      ? `📸 ${photos.length} ta rasm Telegramga yuborilmoqda...`
      : '✉️ Xabar yuborilmoqda...';
    progressBar.style.width = '70%';
    await new Promise(resolve => setTimeout(resolve, 300));

    const res = await fetch('/.netlify/functions/send-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        photo_urls: photos,  // ✅ Rasm URL'larini to'g'ridan to'g'ri yuborish
        caption: caption
      })
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || 'Xatolik yuz berdi');
    }

    statusEl.textContent = '✅ Yuborildi!';
    progressBar.style.width = '100%';
    
    btn.innerHTML = '<i class="ti ti-check"></i> Yuborildi!';
    btn.style.background = '#28a745';
    
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalText;
      btn.style.background = '';
      progressEl.classList.remove('active');
      progressBar.style.width = '0%';
    }, 2000);
  } catch(e) {
    statusEl.textContent = '❌ Xatolik: ' + e.message;
    progressBar.style.width = '100%';
    progressBar.style.background = '#c41e3a';
    
    btn.disabled = false;
    btn.innerHTML = originalText;
    
    setTimeout(() => {
      progressEl.classList.remove('active');
      progressBar.style.width = '0%';
      progressBar.style.background = '#185fa5';
    }, 3000);
  }
}
```

### 5. Update Settings Modal Calls

**Old:**
```javascript
const settings = await fetch('/telegram-settings').then(r => r.json());
```

**New:**
```javascript
const settings = await fetch('/.netlify/functions/telegram-settings')
  .then(r => r.json());
```

**Old:**
```javascript
const res = await fetch('/telegram-settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, chat_id: chatId })
});
```

**New:**
```javascript
const res = await fetch('/.netlify/functions/telegram-settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, chat_id: chatId })
});
```

## Summary of Changes

| Item | Old | New |
|------|-----|-----|
| Settings API | `/telegram-settings` | `/.netlify/functions/telegram-settings` |
| Send API | `/send-telegram` | `/.netlify/functions/send-telegram` |
| Upload API | `/upload-photos` | ❌ Removed |
| Photo data | `local_urls` | `photo_urls` |
| Storage | `telegram.json` | Environment variables |
| Photo handling | Download & store locally | Send URLs directly |

## Environment Variables Setup

Before testing, set environment variables on Netlify:

```bash
netlify env:set TELEGRAM_TOKEN "your-bot-token"
netlify env:set TELEGRAM_CHAT_ID "your-chat-id"
```

## Testing

1. Update index.html with new API paths
2. Run `netlify dev` to test locally
3. Check that:
   - Settings load correctly
   - Photos are sent via URLs
   - Messages appear in Telegram
