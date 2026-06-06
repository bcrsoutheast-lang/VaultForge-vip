import { kv } from '@vercel/kv';
export default async function handler(req, res) {
  try {
    const dealIds = await kv.lrange('deal_list', 0, -1);
    if (!dealIds.length) return res.status(200).json([]);
    const deals = await Promise.all(dealIds.map(id => kv.hgetall(`deals:${id}`)));
    const validDeals = deals.filter(Boolean).sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    return res.status(200).json(validDeals);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch deals' });
  }
}
