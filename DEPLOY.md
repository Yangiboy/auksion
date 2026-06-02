# E-Auksion App - Netlify Deploy

## Struktura

```
eauksion-app/
├── index.html              # Frontend aplikatsiya
├── server.js               # Lokal development server
├── telegram.json           # Telegram sozlamalari (lokal)
└── favorites.json          # Favorit lotlar
netlify/
├── functions/
│   ├── fetch-lots.js       # Lotlar ro'yhatini olish
│   ├── fetch-lot-info.js   # Bitta lot haqida ma'lumot
│   ├── favorites.js        # Favorit lotlar
│   ├── telegram-settings.js # Telegram sozlamalari
│   └── send-telegram.js    # Telegram orqali post yuborish
└── netlify.toml            # Netlify konfiguratsiya
```

## O'rnatish

```bash
# 1. Git init (agar yo'q bo'lsa)
git init
git add .
git commit -m "E-Auksion Netlify Deploy"

# 2. Netlify CLI o'rnatish
npm install -g netlify-cli

# 3. Deploy qilish
netlify deploy --prod
```

## Telegram Settings o'rnatish

### Netlify UI orqali:
1. Netlify Dashboard ga kirish
2. Site Settings → Build & deploy → Environment o'limiga o'tish
3. Environment variables qo'shish:
   - `TELEGRAM_TOKEN` - Bot token (BotFather'dan olish)
   - `TELEGRAM_CHAT_ID` - Chat ID (rasm yoki @username)

### CLI orqali:
```bash
netlify env:set TELEGRAM_TOKEN "your-bot-token-here"
netlify env:set TELEGRAM_CHAT_ID "your-chat-id-here"
```

### Lokal development uchun (.env fayli):
```
TELEGRAM_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

## API Endpoints

### Telegram Settings
- `GET /.netlify/functions/telegram-settings` - Sozlamalarni tekshirish
- `POST /.netlify/functions/telegram-settings` - Sozlamalarni tasdiqlash

### Telegram Post
- `POST /.netlify/functions/send-telegram` - Xabar yoki rasm yuborish

**Request body misol:**
```json
{
  "message": "Bu test xabaridir",
  "photo_urls": ["https://example.com/photo1.jpg"],
  "caption": "Rasmga sarlavha"
}
```

## Nimalar o'zgartirildi?

✅ **send-telegram.js** - Telegram'ga post yuborish (yangi)
✅ **telegram-settings.js** - Environment variables bilan ishlash
✅ **fetch-lots.js** - CORS muammosini hal qiladi
✅ **netlify.toml** - Netlify konfiguratsiyasi
✅ **index.html** - API URL larini o'zgartirildi

## Test qilish

```bash
# Lokal test
netlify dev

# Keyin http://localhost:8888 ga o'ting
```

## Production Deploy

```bash
# Barcha o'zgarishlarni push qilish
git add .
git commit -m "Telegram integration"
git push origin main

# Netlify avtomatik deploy qiladi
```

