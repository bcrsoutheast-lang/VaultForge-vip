import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method!== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const buyerData = req.body;
    
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const id = Date.now().toString();
    const buyer = {
      id,
      name: buyerData.name,
      email: buyerData.email,
      phone: buyerData.phone,
      buy_box_states: buyerData.buy_box_states || [],
      buy_box_types: buyerData.buy_box_types || [],
      max_price: parseInt(buyerData.max_price) || 0,
      
      // LEGAL: BUYER CONTRACT - Veteran Pride VaultForge LLC
      buyer_contract_signed: buyerData.agreement_accepted === 'on' || buyerData.agreement_accepted === true,
      buyer_contract_version: 'VF-B-1.0',
      buyer_contract_entity: 'Veteran Pride VaultForge LLC',
      buyer_contract_type: '1% Coordination Fee',
      buyer_contract_timestamp: new Date().toISOString(),
      buyer_contract_ip: ip,
      buyer_contract_user_agent: userAgent,
      
      status: 'active',
      deals_viewed: [],
      deals_purchased: [],
      created: new Date().toISOString()
    };

    const buyers = await kv.get('buyers') || [];
    buyers.push(buyer);
    await kv.set('buyers', buyers);

    return res.status(200).json({ 
      success: true, 
      message: 'Buyer registered',
      buyer_id: id,
      contract_signed: buyer.buyer_contract_signed
    });

  } catch (error) {
    console.error('Buyer signup error:', error);
    return res.status(500).json({ error: 'Failed to register buyer', details: error.message });
  }
}
