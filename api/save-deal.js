import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  try {
    const data = req.body;
    const deals = await kv.get('deals') || [];
    
    // Calculate deal analysis if seller form
    if (data.asking_price && data.arv) {
      const ask = parseInt(data.asking_price);
      const arv = parseInt(data.arv);
      const repairs = parseInt(data.repairs || 0);
      const mao = (arv * 0.7) - repairs;
      const profit = arv - ask - repairs - 15000; // rough fees
      const roi = ((profit / ask) * 100).toFixed(1);
      
      data.analysis = {
        mao,
        ask_vs_mao: ask - mao,
        profit_after_fees: profit,
        projected_roi: roi + '%',
        deal_score: roi > 30 ? 'A' : roi > 20 ? 'B' : 'C'
      };
    }
    
    deals.push({ ...data, id: Date.now(), created: new Date().toISOString() });
    await kv.set('deals', deals);
    
    // If buyer form, save to buyers list too
    if (data.form_type === 'buyer') {
      const buyers = await kv.get('buyers') || [];
      buyers.push({ ...data, id: Date.now() });
      await kv.set('buyers', buyers);
    }
    
    let stripe_url = null;
    if (data.title_concierge === true || data.title_concierge === 'on') {
      stripe_url = 'https://buy.stripe.com/test_REPLACE_WITH_YOUR_LINK';
    }
    
    return res.status(200).json({ success: true, stripe_url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to save' });
  }
}
