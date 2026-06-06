import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    
    // Validate required fields
    if (!data.buyer_name || !data.email || !data.phone || !data.states?.length) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get existing buyers
    const buyers = await kv.get('buyers') || [];
    
    // Create buyer record
    const buyer = {
      id: Date.now(),
      ...data,
      status: 'pending',
      created: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
    
    // Save to KV
    buyers.push(buyer);
    await kv.set('buyers', buyers);

    // TODO: Send you an email notification here
    // TODO: Send buyer a "pending review" email here
    // We'll add Resend/SendGrid after this works

    return res.status(200).json({ 
      success: true, 
      message: 'Buyer saved as pending',
      buyer_id: buyer.id 
    });

  } catch (error) {
    console.error('Save buyer error:', error);
    return res.status(500).json({ error: 'Failed to save buyer' });
  }
}
