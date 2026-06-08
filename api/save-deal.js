import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method!== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dealData = req.body;
    
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const id = Date.now().toString();
    const deal = {
      id,
     ...dealData,
      ask: parseInt(dealData.ask) || 0,
      arv: parseInt(dealData.arv) || 0,
      repairs: parseInt(dealData.repairs) || 0,
      payoff: parseInt(dealData.payoff) || 0,
      beds: dealData.beds? parseInt(dealData.beds) : null,
      baths: dealData.baths? parseFloat(dealData.baths) : null,
      sqft: dealData.sqft? parseInt(dealData.sqft) : null,
      units: dealData.units? parseInt(dealData.units) : null,
      building_sqft: dealData.building_sqft? parseInt(dealData.building_sqft) : null,
      acres: dealData.acres? parseFloat(dealData.acres) : null,
      
      // Deal Management
      status: 'pending',
      notes: '',
      sent_to: [],
      title_company: '',
      buyer_name: '',
      buyer_email: '',
      buyer_contract_signed: false,
      
      // LEGAL: SELLER CONTRACT - Veteran Pride VaultForge LLC
      seller_contract_signed: dealData.agreement_accepted === 'on' || dealData.agreement_accepted === true,
      seller_contract_version: 'VF-S-1.0',
      seller_contract_entity: 'Veteran Pride VaultForge LLC',
      seller_contract_type: '50/50 Profit Share',
      seller_contract_timestamp: new Date().toISOString(),
      seller_contract_ip: ip,
      seller_contract_user_agent: userAgent,
      
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
      contract_signed: deal.seller_contract_signed
    });

  } catch (error) {
    console.error('Save deal error:', error);
    return res.status(500).json({ error: 'Failed to save deal', details: error.message });
  }
}
