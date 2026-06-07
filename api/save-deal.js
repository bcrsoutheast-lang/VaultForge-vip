import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const formData = await req.formData();
    
    const getField = (name) => {
      const val = formData.get(name);
      return typeof val === 'string' ? val : '';
    };
    
    const deal = {
      id: `deal_${Date.now()}`,
      address: getField('address'),
      state: getField('state'),
      zip: getField('zip'),
      ask: Number(getField('ask')),
      arv: Number(getField('arv')),
      repairs: Number(getField('repairs')),
      payoff: Number(getField('payoff')),
      reason: getField('reason'),
      created: new Date().toISOString()
    };

    const photoFiles = formData.getAll('photos').filter(f => f && typeof f === 'object' && 'arrayBuffer' in f);
    const photoUrls = [];

    for (const file of photoFiles) {
      if (file.size > 0) {
        const filename = `deals/${deal.id}/${Date.now()}_${file.name}`;
        const blob = await put(filename, file, {
          access: 'public',
          contentType: file.type
        });
        photoUrls.push(blob.url);
      }
    }

    deal.photos = photoUrls;

    const mao = (deal.arv * 0.70) - deal.repairs - 10000;
    const equity = deal.arv - deal.payoff - deal.ask;
    const askDiff = mao - deal.ask;
    
    let grade = 'F';
    if (askDiff >= 0 && equity > 20000) grade = 'A';
    else if (askDiff >= -10000 && equity > 10000) grade = 'B';
    else if (askDiff >= -20000 && equity > 0) grade = 'C';
    else if (equity > 0) grade = 'D';

    deal.analysis = { mao, equity, askDiff, grade };

    await kv.hset(`deal:${deal.id}`, deal);
    await kv.lpush('deals:all', deal.id);

    return res.status(200).json({ id: deal.id, success: true });
  } catch (error) {
    console.error('Save deal error:', error);
    return res.status(500).json({ error: error.message || 'Upload failed' });
  }
}
