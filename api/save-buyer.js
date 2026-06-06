import { kv } from '@vercel/kv';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const buyer = req.body;
    const id = `buyer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    buyer.id = id;
    buyer.joined_at = new Date().toISOString();
    await kv.hset(`buyers:${id}`, buyer);
    await kv.lpush('buyer_list', id);
    return res.status(200).json({ success: true, id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save buyer' });
  }
}
