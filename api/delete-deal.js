import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { id } = req.body;
    await kv.del(`deals:${id}`);
    await kv.lrem('deal_list', 0, id);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete deal' });
  }
}
