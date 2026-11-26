import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const stores = {
  "imoveis": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80",
  "eletronicos": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&q=80",
  "automoveis": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80",
  "agricultura": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&q=80",
  "materiais-de-construcao": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80",
  "moda-vestuario": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80",
  "alimentacao-bebidas": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80",
  "saude-beleza": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80",
  "casa-decoracao": "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80",
  "diversos": "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&q=80"
};

const services = {
  "construcao": "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=80",
  "eletricidade": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=80",
  "hidraulica": "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&q=80",
  "carpintaria-serralharia": "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=600&q=80",
  "transporte-logistica": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&q=80",
  "hotelaria-restauracao": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
  "tecnologia-informatica": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
  "beleza-estetica": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80",
  "limpeza-jardinagem": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80",
  "diversos": "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80"
};

const fallback = "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&q=80";

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Falha ao descarregar ${url}: Status ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => reject(err));
    });
  });
}

async function run() {
  const baseDir = path.join(process.cwd(), 'public', 'images', 'defaults');

  console.log('A descarregar imagens de lojas...');
  for (const [key, url] of Object.entries(stores)) {
    await downloadImage(url, path.join(baseDir, 'stores', `${key}.jpg`));
    console.log(`[Store] Baixada: ${key}.jpg`);
  }

  console.log('A descarregar imagens de serviços...');
  for (const [key, url] of Object.entries(services)) {
    await downloadImage(url, path.join(baseDir, 'services', `${key}.jpg`));
    console.log(`[Service] Baixada: ${key}.jpg`);
  }

  console.log('A descarregar imagem de fallback...');
  await downloadImage(fallback, path.join(baseDir, 'fallback.jpg'));
  console.log('[Fallback] Baixada: fallback.jpg');

  console.log('Processo concluído com sucesso!');
}

run().catch(console.error);