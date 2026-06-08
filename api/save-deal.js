import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dealData = req.body;
    
    const id = Date.now().toString();
    const deal = {
      id,
      ...dealData,
      ask: parseInt(dealData.ask),
      arv: parseInt(dealData.arv),
      repairs: parseInt(dealData.repairs),
      payoff: parseInt(dealData.payoff),
      beds: dealData.beds ? parseInt(dealData.beds) : null,
      baths: dealData.baths ? parseFloat(dealData.baths) : null,
      sqft: dealData.sqft ? parseInt(dealData.sqft) : null,
      units: dealData.units ? parseInt(dealData.units) : null,
      building_sqft: dealData.building_sqft ? parseInt(dealData.building_sqft) : null,
      acres: dealData.acres ? parseFloat(dealData.acres) : null,
      status: 'pending',
      created: new Date().toISOString()
    };

    // 1. Save to KV for admin/ticker
    const deals = await kv.get('deals') || [];
    deals.push(deal);
    await kv.set('deals', deals);

    // 2. Send to Formspree so you get the email
    await fetch('https://formspree.io/f/mqeoeeqe', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        _subject: `New ${deal.property_type} Deal: ${deal.address}, ${deal.state}`,
        _replyto: deal.email,
        property_type: deal.property_type,
        address: deal.address,
        state: deal.state,
        zip: deal.zip,
        asking_price: `$${deal.ask.toLocaleString()}`,
        arv: `$${deal.arv.toLocaleString()}`,
        repairs: `$${deal.repairs.toLocaleString()}`,
        mortgage_payoff: `$${deal.payoff.toLocaleString()}`,
        beds: deal.beds || 'N/A',
        baths: deal.baths || 'N/A',
        sqft: deal.sqft || 'N/A',
        use_type: deal.use_type || 'N/A',
        units: deal.units || 'N/A',
        building_sqft: deal.building_sqft || 'N/A',
        acres: deal.acres || 'N/A',
        zoning: deal.zoning || 'N/A',
        motivation: deal.motivation,
        seller_name: deal.seller_name,
        phone: deal.phone,
        email: deal.email,
        grade: deal.analysis?.grade || 'N/A',
        mao: deal.analysis?.mao ? `$${parseInt(deal.analysis.mao).toLocaleString()}` : 'N/A',
        equity_spread: deal.analysis?.equity ? `$${parseInt(deal.analysis.equity).toLocaleString()}` : 'N/A',
        deal_id: deal.id
      })
    });

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
