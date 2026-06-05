import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const deal = req.body;
    const id = `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    deal.id = id;
    deal.submitted_at = new Date().toISOString();
    deal.status = 'new';
    
    // Save full deal object
    await kv.hset(`deals:${id}`, deal);
    // Add to list for admin to pull
    await kv.lpush('deal_list', id);
    
    return res.status(200).json({ success: true, id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save deal' });
  }
}
