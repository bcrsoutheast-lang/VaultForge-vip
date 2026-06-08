import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method!== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dealData = req.body;
    
    // Capture agreement + autosave metadata
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    const id = Date.now().toString();
    const deal = {
      id,
     ...dealData,
      ask: parseInt(dealData.ask),
      arv: parseInt(dealData.arv),
      repairs: parseInt(dealData.repairs),
      payoff: parseInt(dealData.payoff),
      beds: dealData.beds? parseInt(dealData.beds) : null,
      baths: dealData.baths? parseFloat(dealData.baths) : null,
      sqft: dealData.sqft? parseInt(dealData.sqft) : null,
      units: dealData.units? parseInt(dealData.units) : null,
      building_sqft: dealData.building_sqft? parseInt(dealData.building_sqft) : null,
      acres: dealData.acres? parseFloat(dealData.acres) : null,
      
      // Deal Status + Tracking
      status: 'pending',
      notes: '',
      sent_to: [],
      
      // LEGAL: Contract proof for Veteran Pride VaultForge LLC
      contract_signed: dealData.agreement_accepted || false,
      contract_version: 'VF-S-1.0',
      contract_entity: 'Veteran Pride VaultForge LLC',
      contract_timestamp: new Date().toISOString(),
      contract_ip: ip,
      contract_user_agent: userAgent,
      
      created: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

    const deals = await kv.get('deals') || [];
    deals.push(deal);
    await kv.set('deals', deals);

    return res.status(200).json({ 
      success: true, 
      message: 'Deal saved',
      deal_id: id,
      contract_signed: deal.contract_signed
    });

  } catch (error) {
    console.error('Save deal error:', error);
    return res.status(500).json({ error: 'Failed to save deal', details: error.message });
  }
}
