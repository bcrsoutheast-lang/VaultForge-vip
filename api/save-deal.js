import { kv } from '@vercel/kv';
import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method!== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Parse FormData from multipart/form-data
    const formData = await req.formData();
    const dealId = Date.now().toString();
    
    // Upload photos to Vercel Blob
    const photoUrls = [];
    const photos = formData.getAll('photos');
    
    for (const photo of photos.slice(0, 10)) {
      if (photo.size > 0) {
        const filename = `${dealId}/${photo.name}`;
        const blob = await put(filename, photo, {
          access: 'public',
        });
        photoUrls.push(blob.url);
      }
    }
    
    // Parse analysis if it exists
    const analysisRaw = formData.get('analysis');
    const analysisData = analysisRaw? JSON.parse(analysisRaw) : {};
    
    // Parse comps from form
    const compAddresses = formData.getAll('comp_address[]');
    const compPrices = formData.getAll('comp_price[]');
    const compDates = formData.getAll('comp_date[]');
    const compSqfts = formData.getAll('comp_sqft[]');
    
    const comps = compAddresses.map((addr, i) => ({
      address: addr || '',
      price: parseFloat(compPrices[i]) || 0,
      sold_date: compDates[i] || '',
      sqft: parseInt(compSqfts[i]) || 0
    })).filter(c => c.address);
    
    // Build complete deal object
    const deal = {
      id: dealId,
      created_at: new Date().toISOString(),
      status: "New Lead",
      
      // Property Type
      property_type: formData.get('property_type'),
      
      // Residential Fields
      res_subtype: formData.get('res_subtype') || null,
      bed: formData.get('bed')? parseInt(formData.get('bed')) : null,
      bath: formData.get('bath')? parseFloat(formData.get('bath')) : null,
      sqft: formData.get('sqft')? parseInt(formData.get('sqft')) : null,
      year_built: formData.get('year_built')? parseInt(formData.get('year_built')) : null,
      
      // Commercial Fields
      com_subtype: formData.get('com_subtype') || null,
      com_sqft: formData.get('com_sqft')? parseInt(formData.get('com_sqft')) : null,
      units: formData.get('units')? parseInt(formData.get('units')) : null,
      com_acres: formData.get('com_acres')? parseFloat(formData.get('com_acres')) : null,
      zoning: formData.get('zoning') || null,
      cap_rate: formData.get('cap_rate')? parseFloat(formData.get('cap_rate')) : null,
      
      // Land Fields
      land_subtype: formData.get('land_subtype') || null,
      acres: formData.get('acres')? parseFloat(formData.get('acres')) : null,
      road_frontage: formData.get('road_frontage') || null,
      frontage_feet: formData.get('frontage_feet')? parseInt(formData.get('frontage_feet')) : null,
      power: formData.get('power') || null,
      water_sewer: formData.get('water_sewer') || null,
      topography: formData.get('topography') || null,
      land_zoning: formData.get('land_zoning') || null,
      
      // Core Deal Info
      address: formData.get('address'),
      state: formData.get('state'),
      asking_price: parseFloat(formData.get('asking_price')) || 0,
      arv: parseFloat(formData.get('arv')) || 0,
      repairs: parseFloat(formData.get('repairs')) || 0,
      
      // Analysis + Comps
      analysis: {
        score: analysisData.score || 0,
        roi: analysisData.roi || 0,
        mao: analysisData.mao || 0,
        price_per_sqft: analysisData.price_per_sqft || 0
      },
      comps: comps.length > 0? comps : analysisData.comps || [],
      
      // Photos
      photos: photoUrls,
      
      // Title Concierge
      title_concierge: formData.get('title_concierge') === 'on'? 'pending' : 'none',
      payoff_amount: formData.get('payoff_amount')? parseFloat(formData.get('payoff_amount')) : null,
      liens: formData.get('liens') || null,
      lien_details: formData.get('lien_details') || null,
      closing_date: formData.get('closing_date') || null,
      has_title_co: formData.get('has_title_co') || null,
      title_co_name: formData.get('title_co_name') || null,
      
      // Seller Info
      seller_name: formData.get('seller_name'),
      seller_phone: formData.get('seller_phone'),
      seller_email: formData.get('seller_email'),
    };
    
    // Save to Vercel KV
    await kv.hset(`deal:${dealId}`, deal);
    await kv.lpush('deals:all', dealId);
    
    // Send email via Formspree - REPLACE WITH YOUR ID
    await fetch('https://formspree.io/f/YOUR_FORMSPREE_ID', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: `New VaultForge Deal: ${deal.address}`,
        message: `
New deal submitted:

Address: ${deal.address}, ${deal.state}
Asking: $${deal.asking_price.toLocaleString()}
ARV: $${deal.arv.toLocaleString()}
Repairs: $${deal.repairs.toLocaleString()}
MAO: $${deal.analysis.mao.toLocaleString()}
Score: ${deal.analysis.score}

Seller: ${deal.seller_name}
Phone: ${deal.seller_phone}
Email: ${deal.seller_email}

Title Concierge: ${deal.title_concierge}
${deal.title_concierge === 'pending'? `Payoff: $${deal.payoff_amount}` : ''}

Photos: ${deal.photos.length} uploaded

Full data: ${process.env.NEXT_PUBLIC_URL}/admin?deal=${dealId}
        `
      })
    });
    
    // Stripe checkout if Title Concierge selected - REPLACE price_ID
    if (deal.title_concierge === 'pending') {
      const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: 'price_REPLACE_WITH_YOUR_STRIPE_PRICE_ID',
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_URL}/success?deal=${dealId}`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL}/sellers`,
        client_reference_id: dealId,
        customer_email: deal.seller_email,
        metadata: {
          deal_id: dealId,
          address: deal.address
        }
      });
      return res.status(200).json({ stripe_url: session.url });
    }
    
    res.status(200).json({ success: true, dealId });
    
  } catch (error) {
    console.error('Save-deal error:', error);
    res.status(500).json({ error: 'Save failed: ' + error.message });
  }
}
