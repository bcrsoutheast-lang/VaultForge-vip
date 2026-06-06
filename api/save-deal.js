import { kv } from '@vercel/kv';
import { put } from '@vercel/blob';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method!== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  
  try {
    const formData = await req.formData();
    const dealId = Date.now().toString();
    
    // Photos
    const photoUrls = [];
    for (const photo of formData.getAll('photos').slice(0, 10)) {
      if (photo.size > 0) {
        const blob = await put(`${dealId}/${photo.name}`, photo, { access: 'public' });
        photoUrls.push(blob.url);
      }
    }
    
    // Comps from form
    const comps = formData.getAll('comp_address[]').map((addr, i) => ({
      address: addr,
      price: Number(formData.getAll('comp_price[]')[i]) || 0,
      sold_date: formData.getAll('comp_date[]')[i] || '',
      sqft: Number(formData.getAll('comp_sqft[]')[i]) || 0
    })).filter(c => c.address);
    
    const analysis = JSON.parse(formData.get('analysis') || '{}');
    
    const deal = {
      id: dealId,
      created_at: new Date().toISOString(),
      status: "New Lead",
     ...Object.fromEntries(formData), // Dumps all form fields
      analysis, // Full grade + all metrics
      comps: comps.length > 0? comps : analysis.comps || [],
      photos: photoUrls,
    };
    
    // Save
    await kv.hset(`deal:${dealId}`, deal);
    await kv.lpush('deals:all', dealId);
    
    // Title Concierge → Stripe
    if (formData.get('title_concierge') === 'on') {
      const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_URL}/success?deal=${dealId}`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL}/sellers`,
        client_reference_id: dealId,
        customer_email: formData.get('seller_email'),
      });
      return new Response(JSON.stringify({ stripe_url: session.url }), { status: 200 });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      dealId,
      redirect: '/success?deal=' + dealId 
    }), { status: 200 });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
