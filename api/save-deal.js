import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    
    // Validate required fields
    if (!data.address || !data.state || !data.asking_price || !data.arv || !data.property_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get existing deals
    const deals = await kv.get('deals') || [];
    
    // Create deal record
    const deal = {
      id: Date.now(),
      ...data,
      status: 'New Lead',
      created: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
    
    // Save to KV
    deals.push(deal);
    await kv.set('deals', deals);

    // Handle Title Concierge Stripe link
    let stripe_url = null;
    if (data.title_concierge === 'unpaid') {
      // TODO: Replace with your real Stripe Payment Link
      // For now, using placeholder. Create a $500 payment link in Stripe dashboard
      stripe_url = `https://buy.stripe.com/test_placeholder?client_reference_id=${deal.id}`;
    }

    // TODO: Send you an email: New {score} Deal: {address} - Title: {unpaid/none}
    // TODO: Send seller confirmation email
    // We'll add Resend after this works

    return res.status(200).json({ 
      success: true, 
      message: 'Deal saved',
      deal_id: deal.id,
      stripe_url: stripe_url
    });

  } catch (error) {
    console.error('Save deal error:', error);
    return res.status(500).json({ error: 'Failed to save deal' });
  }
}
