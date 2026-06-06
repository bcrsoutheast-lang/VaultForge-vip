import { kv } from '@vercel/kv';
import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Required for formidable
  },
};

export default async function handler(req, res) {
  if (req.method!== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const form = formidable({ multiples: true, maxFileSize: 10 * 1024 * 1024 });
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });
    
    const dealId = Date.now().toString();
    
    // Upload photos to Vercel Blob
    const photoUrls = [];
    const photoFiles = Array.isArray(files.photos)? files.photos : [files.photos].filter(Boolean);
    
    for (const photo of photoFiles.slice(0, 10)) {
      if (photo && photo.size > 0) {
        const fileBuffer = fs.readFileSync(photo.filepath);
        const blob = await put(`${dealId}/${photo.originalFilename}`, fileBuffer, { 
          access: 'public',
          contentType: photo.mimetype 
        });
        photoUrls.push(blob.url);
        fs.unlinkSync(photo.filepath); // Clean temp file
      }
    }
    
    // Parse comps
    const compAddresses = Array.isArray(fields['comp_address[]'])? fields['comp_address[]'] : [fields['comp_address[]']].filter(Boolean);
    const compPrices = Array.isArray(fields['comp_price[]'])? fields['comp_price[]'] : [fields['comp_price[]']].filter(Boolean);
    const compDates = Array.isArray(fields['comp_date[]'])? fields['comp_date[]'] : [fields['comp_date[]']].filter(Boolean);
    const compSqfts = Array.isArray(fields['comp_sqft[]'])? fields['comp_sqft[]'] : [fields['comp_sqft[]']].filter(Boolean);
    
    const comps = compAddresses.map((addr, i) => ({
      address: addr || '',
      price: Number(compPrices[i]) || 0,
      sold_date: compDates[i] || '',
      sqft: Number(compSqfts[i]) || 0
    })).filter(c => c.address);
    
    const analysis = fields.analysis? JSON.parse(fields.analysis[0]) : {};
    
    // Build deal object - flattens all fields
    const deal = {
      id: dealId,
      created_at: new Date().toISOString(),
      status: "New Lead",
    ...Object.fromEntries(Object.entries(fields).map(([k,v]) => [k, Array.isArray(v)? v[0] : v])),
      analysis,
      comps: comps.length > 0? comps : analysis.comps || [],
      photos: photoUrls,
    };
    
    // Save to KV
    await kv.hset(`deal:${dealId}`, deal);
    await kv.lpush('deals:all', dealId);
    
    // Stripe checkout if Title Concierge
    if (deal.title_concierge === 'on') {
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
      return res.status(200).json({ stripe_url: session.url });
    }
    
    return res.status(200).json({ 
      success: true, 
      dealId,
      redirect: '/success?deal=' + dealId 
    });
    
  } catch (error) {
    console.error('Save-deal error:', error);
    return res.status(500).json({ error: error.message });
  }
}
