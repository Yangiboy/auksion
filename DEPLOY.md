# E-Auksion App - Netlify Deploy

## Struktura

```
eauksion-app_1/
├── eauksion-app/          # Frontend aplikatsiya
│   └── index.html         # Asosiy fayl
├── netlify/
│   └── functions/
│       └── fetch-lots.js  # API proxy function
└── netlify.toml           # Netlify konfiguratsiya
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

## Nimalar o'zgartirildi?

✅ **fetch-lots.js** - CORS muammosini hal qiladi
✅ **netlify.toml** - Netlify konfiguratsiyasi
✅ **index.html** - API URL `/.netlify/functions/fetch-lots` ga o'tkazildi

## API Token

Token `netlify/functions/fetch-lots.js` da xavfsiz saqlangan ✅

## Test qilish

```bash
# Lokal test
netlify dev

# Keyin http://localhost:8888 ga o'ting
```
