import { kv } from '@vercel/kv';
import { put } from '@vercel/blob';

export const config = {
  runtime: 'edge', // Fixes req.formData() on Vercel
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  
  try {
    const formData = await req.formData();
    const dealId = Date.now().toString();
    
    // Upload photos
    const photoUrls = [];
    const photos = formData.getAll('photos');
    for (const photo of photos.slice(0, 10)) {
      if (photo.size > 0) {
        const blob = await put(`${dealId}/${photo.name}`, photo, { access: 'public' });
        photoUrls.push(blob.url);
      }
    }
    
    const analysisRaw = formData.get('analysis');
    const analysisData = analysisRaw ? JSON.parse(analysisRaw) : {};
    
    const deal = {
      id: dealId,
      created_at: new Date().toISOString(),
      status: "New Lead",
      address: formData.get('address'),
      state: formData.get('state'),
      asking_price: Number(formData.get('asking_price')) || 0,
      arv: Number(formData.get('arv')) || 0,
      repairs: Number(formData.get('repairs')) || 0,
      seller_name: formData.get('seller_name'),
      seller_phone: formData.get('seller_phone'),
      seller_email: formData.get('seller_email'),
      property_type: formData.get('property_type'),
      analysis: analysisData,
      photos: photoUrls,
      title_concierge: formData.get('title_concierge') === 'on' ? 'pending' : 'none',
      payoff_amount: Number(formData.get('payoff_amount')) || null,
    };
    
    await kv.hset(`deal:${dealId}`, deal);
    await kv.lpush('deals:all', dealId);
    
    // Title Concierge → Stripe
    if (deal.title_concierge === 'pending') {
      const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_URL}/success?deal=${dealId}`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL}/sellers`,
        client_reference_id: dealId,
        customer_email: deal.seller_email,
      });
      return new Response(JSON.stringify({ stripe_url: session.url }), { status: 200 });
    }
    
    // Normal submit → success + redirect URL
    return new Response(JSON.stringify({ 
      success: true, 
      dealId,
      redirect: '/success?deal=' + dealId 
    }), { status: 200 });
    
  } catch (error) {
    console.error('Save-deal error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
