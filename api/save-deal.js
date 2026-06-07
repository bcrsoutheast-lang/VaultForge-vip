import { kv } from '@vercel/kv';
import { put } from '@vercel/blob';

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
    
    // Core fields
    const property_type = formData.get('property_type');
    const address = formData.get('address');
    const state = formData.get('state');
    const zip = formData.get('zip');
    const ask = formData.get('ask');
    const arv = formData.get('arv');
    const repairs = formData.get('repairs');
    const payoff = formData.get('payoff');
    const motivation = formData.get('motivation');
    const seller_name = formData.get('seller_name');
    const phone = formData.get('phone');
    const email = formData.get('email');
    const analysis = JSON.parse(formData.get('analysis'));

    // Conditional fields
    const beds = formData.get('beds');
    const baths = formData.get('baths');
    const sqft = formData.get('sqft');
    const use_type = formData.get('use_type');
    const units = formData.get('units');
    const building_sqft = formData.get('building_sqft');
    const acres = formData.get('acres');
    const zoning = formData.get('zoning');
    
    // Handle photos
    const photoUrls = [];
    const photos = formData.getAll('photos');
    
    for (const photo of photos) {
      if (photo && photo.size > 0) {
        const filename = `deals/${Date.now()}-${photo.name}`;
        const blob = await put(filename, photo, { access: 'public' });
        photoUrls.push(blob.url);
      }
    }

    const id = Date.now().toString();
    const deal = {
      id,
      property_type,
      address,
      state,
      zip,
      ask: parseInt(ask),
      arv: parseInt(arv),
      repairs: parseInt(repairs),
      payoff: parseInt(payoff),
      motivation,
      seller_name,
      phone,
      email,
      beds: beds ? parseInt(beds) : null,
      baths: baths ? parseFloat(baths) : null,
      sqft: sqft ? parseInt(sqft) : null,
      use_type: use_type || null,
      units: units ? parseInt(units) : null,
      building_sqft: building_sqft ? parseInt(building_sqft) : null,
      acres: acres ? parseFloat(acres) : null,
      zoning: zoning || null,
      photos: photoUrls,
      analysis,
      status: 'pending',
      created: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

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
