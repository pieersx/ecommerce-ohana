const https = require('https');
const fs = require('fs');
const path = require('path');

const PRODUCTS_DIR = path.join(__dirname, '..', 'frontend', 'public', 'products');
const PEXELS_KEY = process.env.PEXELS_API_KEY;

const productImages = [
  { file: 'taza-personalizada.jpg', search: 'personalized ceramic mug white', fallback: 'https://images.pexels.com/photos/1566308/pexels-photo-1566308.jpeg?w=600&h=600&fit=crop' },
  { file: 'taza-lima.jpg', search: 'souvenir mug lima peru', fallback: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?w=600&h=600&fit=crop' },
  { file: 'polo-bordado.jpg', search: 'embroidered polo shirt premium', fallback: 'https://images.pexels.com/photos/3671084/pexels-photo-3671084.jpeg?w=600&h=600&fit=crop' },
  { file: 'hoodie-embroidered.jpg', search: 'hoodie custom embroidered', fallback: 'https://images.pexels.com/photos/3658708/pexels-photo-3658708.jpeg?w=600&h=600&fit=crop' },
  { file: 'sticker-pack.jpg', search: 'colorful sticker pack', fallback: 'https://images.pexels.com/photos/5674086/pexels-photo-5674086.jpeg?w=600&h=600&fit=crop' },
  { file: 'box-regalo.jpg', search: 'gift box handmade craft', fallback: 'https://images.pexels.com/photos/1303098/pexels-photo-1303098.jpeg?w=600&h=600&fit=crop' },
  { file: 'tote-bag.jpg', search: 'canvas tote bag custom', fallback: 'https://images.pexels.com/photos/6046186/pexels-photo-6046186.jpeg?w=600&h=600&fit=crop' },
  { file: 'souvenir-lima.jpg', search: 'lima peru souvenir', fallback: 'https://images.pexels.com/photos/2788235/pexels-photo-2788235.jpeg?w=600&h=600&fit=crop' },
  { file: 'pack-corporativo.jpg', search: 'corporate gift box welcome kit', fallback: 'https://images.pexels.com/photos/5370706/pexels-photo-5370706.jpeg?w=600&h=600&fit=crop' },
  { file: 'tarjetas-kraft.jpg', search: 'kraft paper card handmade', fallback: 'https://images.pexels.com/photos/4992823/pexels-photo-4992823.jpeg?w=600&h=600&fit=crop' },
  { file: 'termo-acero.jpg', search: 'stainless steel thermos', fallback: 'https://images.pexels.com/photos/4397840/pexels-photo-4397840.jpeg?w=600&h=600&fit=crop' },
  { file: 'mini-box.jpg', search: 'small gift box birthday', fallback: 'https://images.pexels.com/photos/264985/pexels-photo-264985.jpeg?w=600&h=600&fit=crop' },
  { file: 'llavero-acrilico.jpg', search: 'acrylic keychain custom', fallback: 'https://images.pexels.com/photos/7286113/pexels-photo-7286113.jpeg?w=600&h=600&fit=crop' },
  { file: 'mousepad-corporativo.jpg', search: 'custom mousepad desk', fallback: 'https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg?w=600&h=600&fit=crop' },
  { file: 'cuaderno-personalizado.jpg', search: 'hardcover notebook personalized', fallback: 'https://images.pexels.com/photos/1319854/pexels-photo-1319854.jpeg?w=600&h=600&fit=crop' },
  { file: 'pack-stickers.jpg', search: 'sticker pack bubble mailer', fallback: 'https://images.pexels.com/photos/5674086/pexels-photo-5674086.jpeg?w=600&h=600&fit=crop' },
  { file: 'pack-flores.jpg', search: 'artificial flower bouquet gift', fallback: 'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?w=600&h=600&fit=crop' },
];

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const follow = (u) => {
      const mod = u.startsWith('https') ? https : require('http');
      mod.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return follow(res.headers.location);
        }
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', () => { file.close(resolve); });
      }).on('error', reject);
    };
    follow(url);
  });
}

async function searchPexels(query) {
  if (!PEXELS_KEY) return null;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`;
  return new Promise((resolve) => {
    https.get(url, { headers: { Authorization: PEXELS_KEY } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const photo = json.photos?.[0];
          resolve(photo ? `${photo.src.large}?w=600&h=600&fit=crop` : null);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function main() {
  if (!fs.existsSync(PRODUCTS_DIR)) fs.mkdirSync(PRODUCTS_DIR, { recursive: true });

  for (const item of productImages) {
    const dest = path.join(PRODUCTS_DIR, item.file);
    if (fs.existsSync(dest)) { console.log(`SKIP: ${item.file}`); continue; }

    console.log(`Downloading: ${item.file} ...`);
    let url = await searchPexels(item.search);
    if (!url) {
      console.log(`  No Pexels result, using fallback`);
      url = item.fallback;
    }

    try {
      await download(url, dest);
      console.log(`  OK: ${item.file} (${(fs.statSync(dest).size / 1024).toFixed(0)}KB)`);
    } catch (err) {
      console.error(`  FAIL: ${err.message}`);
    }
  }
  console.log('\nDone!');
}

main();
