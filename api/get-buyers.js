import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    const buyerIds = await kv.lrange('buyer_list', 0, -1);
    if (!buyerIds.length) return res.status(200).json([]);
    
    const buyers = await Promise.all(buyerIds.map(id => kv.hgetall(`buyers:${id}`)));
    const validBuyers = buyers.filter(Boolean).sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at));
    
    return res.status(200).json(validBuyers);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch buyers' });
  }
}
