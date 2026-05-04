# TasteData — Deploy Guide

## Netlify'a deploy et (ücretsiz, 5 dakika)

### 1. GitHub'a yükle
Bu 3 dosyayı bir GitHub reposuna koy:
```
tastedata/
├── index.html
├── netlify.toml
└── netlify/
    └── functions/
        └── claude.js
```

### 2. Netlify'a bağla
1. https://app.netlify.com → "Add new site" → "Import an existing project"
2. GitHub reposunu seç
3. Build settings otomatik gelir (netlify.toml'dan okur)
4. "Deploy site" tıkla

### 3. API key ekle
1. Netlify dashboard → Site → "Environment variables"
2. Yeni değişken ekle:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...` (Anthropic API key'in)
3. "Save" → "Trigger deploy"

### 4. Link paylaş
Deploy tamamlandığında Netlify sana bir link verir:
`https://tastedata-xyz.netlify.app`

Bu linki herkesle paylaşabilirsin. API key backend'de gizli kalır.

---

## Alternatif: Vercel

Vercel kullanmak istersen `netlify/functions/claude.js` yerine `api/claude.js` oluştur, içerik aynı ama export formatı farklı:

```js
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(req.body)
  });
  const data = await response.json();
  res.status(response.status).json(data);
}
```

Ve `index.html` içinde `/api/claude` zaten doğru path.
