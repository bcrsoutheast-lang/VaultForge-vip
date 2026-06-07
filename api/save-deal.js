import { kv } from '@vercel/kv';
import { put } from '@vercel/blob';

// Removed: export const runtime = 'edge';
// Node runtime handles file uploads. Edge runtime cannot.

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const formData = await req.formData();
    
    // Get all form fields
    const address = formData.get('address');
    const state = formData.get('state');
    const zip = formData.get('zip');
    const ask = formData.get('ask');
    const arv = formData.get('arv');
    const repairs = formData.get('repairs');
    const payoff = formData.get('payoff');
    const seller_name = formData.get('seller_name');
    const phone = formData.get('phone');
    const email = formData.get('email');
    const analysis = JSON.parse(formData.get('analysis'));
    
    // Handle photo uploads to Blob
    const photoUrls = [];
    const photos = formData.getAll('photos');
    
    for (const photo of photos) {
      if (photo && photo.size > 0) {
        const filename = `deals/${Date.now()}-${photo.name}`;
        const blob = await put(filename, photo, {
          access: 'public',
        });
        photoUrls.push(blob.url);
      }
    }

    // Build deal object
    const id = Date.now().toString();
    const deal = {
      id,
      address,
      state,
      zip,
      ask: parseInt(ask),
      arv: parseInt(arv),
      repairs: parseInt(repairs),
      payoff: parseInt(payoff),
      seller_name,
      phone,
      email,
      photos: photoUrls,
      analysis,
      status: 'pending',
      created: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

    // Save to KV - using single 'deals' array to match get-deals.js
    const deals = await kv.get('deals') || [];
    deals.push(deal);
    await kv.set('deals', deals);

    return res.status(200).json({ 
      success: true, 
      message: 'Deal saved',
      deal_id: id 
    });

  } catch (error) {
    console.error('Save deal error:', error);
    return res.status(500).json({ error: 'Failed to save deal', details: error.message });
  }
}
