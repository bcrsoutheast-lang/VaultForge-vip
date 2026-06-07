import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method!== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({ multiples: true });
    const [fields, files] = await form.parse(req);

    const getField = (f) => Array.isArray(f)? f[0] : f;
    
    const deal = {
      id: `deal_${Date.now()}`,
      address: getField(fields.address),
      state: getField(fields.state),
      zip: getField(fields.zip),
      ask: Number(getField(fields.ask)),
      arv: Number(getField(fields.arv)),
      repairs: Number(getField(fields.repairs)),
      payoff: Number(getField(fields.payoff)),
      reason: getField(fields.reason),
      created: new Date().toISOString()
    };

    // Handle photos
    const photoFiles = files.photos || [];
    const photoArray = Array.isArray(photoFiles)? photoFiles : [photoFiles];
    const photoUrls = [];

    for (const file of photoArray) {
      if (file && file.filepath) {
        const buffer = fs.readFileSync(file.filepath);
        const filename = `deals/${deal.id}/${Date.now()}_${file.originalFilename}`;
        const blob = await put(filename, buffer, {
          access: 'public',
          contentType: file.mimetype
        });
        photoUrls.push(blob.url);
      }
    }

    deal.photos = photoUrls;

    // Run VaultForge analysis
    const mao = (deal.arv * 0.70) - deal.repairs - 10000;
    const equity = deal.arv - deal.payoff - deal.ask;
    const askDiff = mao - deal.ask;
    
    let grade = 'F';
    if (askDiff >= 0 && equity > 20000) grade = 'A';
    else if (askDiff >= -10000 && equity > 10000) grade = 'B';
    else if (askDiff >= -20000 && equity > 0) grade = 'C';
    else if (equity > 0) grade = 'D';

    deal.analysis = { mao, equity, askDiff, grade };

    // Save to KV
    await kv.hset(`deal:${deal.id}`, deal);
    await kv.lpush('deals:all', deal.id);

    return res.status(200).json({ id: deal.id, success: true });
  } catch (error) {
    console.error('Save deal error:', error);
    return res.status(500).json({ error: error.message });
  }
}
