import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = req.body;
    
    if (!data.address || !data.state || !data.asking_price || !data.arv || !data.property_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const deals = await kv.get('deals') || [];
    
    const deal = {
      id: Date.now(),
      address: data.address,
      state: data.state,
      property_type: data.property_type,
      asking_price: parseInt(data.asking_price),
      arv: parseInt(data.arv),
      repairs: parseInt(data.repairs) || 0,
      seller_name: data.seller_name,
      seller_phone: data.seller_phone,
      seller_email: data.seller_email,
      analysis: data.analysis || null,
      status: 'New Lead',
      created: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      title_concierge: data.title_concierge === true ? 'unpaid' : 'none',
      title_concierge_data: data.title_concierge === true ? {
        payoff_amount: data.payoff_amount || '',
        has_liens: data.has_liens || 'No',
        lien_details: data.lien_details || '',
        closing_date: data.closing_date || '',
        has_title_company: data.has_title_company || 'No',
        title_company: data.title_company || ''
      } : null,
      photos: data.photos || []
    };
    
    deals.push(deal);
    await kv.set('deals', deals);

    // FORMSPREE EMAIL TO YOU - REPLACE WITH YOUR URL
    await fetch('https://formspree.io/f/YOUR_FORMSPREE_ID', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _subject: `NEW DEAL: ${deal.address} - Score ${deal.analysis?.score}`,
        _replyto: deal.seller_email,
        deal_id: deal.id,
        address: deal.address,
        state: deal.state,
        asking_price: '$' + deal.asking_price.toLocaleString(),
        arv: '$' + deal.arv.toLocaleString(),
        score: deal.analysis?.score || 'N/A',
        roi: deal.analysis?.roi + '%' || 'N/A',
        mao: '$' + deal.analysis?.mao?.toLocaleString() || 'N/A',
        title_concierge: deal.title_concierge,
        payoff_amount: deal.title_concierge_data?.payoff_amount || 'N/A',
        has_liens: deal.title_concierge_data?.has_liens || 'N/A',
        lien_details: deal.title_concierge_data?.lien_details || 'None',
        closing_date: deal.title_concierge_data?.closing_date || 'N/A',
        title_company: deal.title_concierge_data?.title_company || 'None',
        seller_name: deal.seller_name,
        seller_phone: deal.seller_phone,
        seller_email: deal.seller_email
      })
    });

    let stripe_url = null;
    if (data.title_concierge === true) {
      // REPLACE WITH YOUR STRIPE $500 PAYMENT LINK
      stripe_url = `https://buy.stripe.com/YOUR_STRIPE_LINK?client_reference_id=${deal.id}`;
    }

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
