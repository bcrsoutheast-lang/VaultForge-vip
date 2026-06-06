import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    const buyers = await kv.get('buyers') || [];
    return res.status(200).json(buyers);
  } catch (error) {
    console.error('Get buyers error:', error);
    return res.status(500).json({ error: 'Failed to fetch buyers' });
  }
}
