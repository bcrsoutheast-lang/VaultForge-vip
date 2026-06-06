import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    const deals = await kv.get('deals') || [];
    return res.status(200).json(deals);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
