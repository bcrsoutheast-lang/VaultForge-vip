import { kv } from '@vercel/kv';
import { put } from '@vercel/blob';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method!== 'POST') return res.status(405).end();
  
  const formData = await req.formData();
  const dealId = Date.now();
  
  // Upload photos to Vercel Blob
  const photoUrls = [];
  const photos = formData.getAll('photos');
  for (const photo of photos.slice(0,10)) {
    if (photo.size > 0) {
      const blob = await put(`${dealId}/${photo.name}`, photo, { access: 'public' });
      photoUrls.push(blob.url);
    }
  }
  
  // Build deal object
  const deal = {
    id: dealId,
    created_at: new Date().toISOString(),
    status: "New Lead",
    property_type: formData.get('property_type'),
    
    // Conditional fields
    bed: formData.get('bed') || null,
    bath: formData.get('bath') || null,
    sqft: formData.get('sqft') || formData.get('com_sqft') || null,
    units: formData.get('units') || null,
    acres: formData.get('acres') || formData.get('com_acres') || null,
    road_frontage: formData.get('road_frontage') || null,
    frontage_feet: formData.get('frontage_feet') || null,
    power: formData.get('power') || null,
    water_sewer: formData.get('water_sewer') || null,
    topography: formData.get('topography') || null,
    zoning: formData.get('zoning') || formData.get('land_zoning') || null,
    cap_rate: formData.get('cap_rate') || null,
    
    // Core
    address: formData.get('address'),
    state: formData.get('state'),
    asking_price: parseFloat(formData.get('asking_price')),
    arv: parseFloat(formData.get('arv')),
    repairs: parseFloat(formData.get('repairs')),
    
    // Analysis + Comps
    analysis: JSON.parse(formData.get('analysis') || '{}'),
    comps: formData.getAll('comp_address[]').map((addr, i) => ({
      address: addr,
      price: parseFloat(formData.getAll('comp_price[]')[i]) || 0,
      sold_date: formData.getAll('comp_date[]')[i] || '',
      sqft: parseInt(formData.getAll('comp_sqft[]')[i]) || 0
    })).filter(c => c.address),
    
    photos: photoUrls,
    
    // Title Concierge
    title_concierge: formData.get('title_concierge') === 'on'? 'pending' : 'none',
    payoff_amount: formData.get('payoff_amount') || null,
    liens: formData.get('liens') || null,
    lien_details: formData.get('lien_details') || null,
    closing_date: formData.get('closing_date') || null,
    has_title_co: formData.get('has_title_co') || null,
    title_co_name: formData.get('title_co_name') || null,
    
    // Seller
    seller_name: formData.get('seller_name'),
    seller_phone: formData.get('seller_phone'),
    seller_email: formData.get('seller_email'),
  };
  
  // Save to KV
  await kv.hset(`deal:${dealId}`, deal);
  await kv.lpush('deals:all', dealId);
  
  // Formspree email - replace YOUR_FORMSPREE_ID
  await fetch('https://formspree.io/f/YOUR_FORMSPREE_ID', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      subject: `New Deal: ${deal.address}`,
      message: JSON.stringify(deal, null, 2)
    })
  });
  
  // Stripe checkout if Title Concierge
  if (deal.title_concierge === 'pending') {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: 'price_TITLE_CONCIERGE_ID', quantity: 1 }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL}/success?deal=${dealId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/sellers`,
      client_reference_id: dealId.toString(),
      customer_email: deal.seller_email,
    });
    return res.status(200).json({ stripe_url: session.url });
  }
  
  res.status(200).json({ success: true, dealId });
}
