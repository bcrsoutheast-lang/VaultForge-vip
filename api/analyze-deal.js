export default async function handler(req, res) {
  if (req.method!== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ask, arv, repairs, payoff } = req.body;
    
    const mao = (arv * 0.70) - repairs - 10000;
    const equity = arv - payoff - ask;
    const askDiff = mao - ask;
    
    let grade = 'F';
    let message = 'No profit margin';
    
    if (askDiff >= 0 && equity > 20000) {
      grade = 'A';
      message = 'Strong deal - proceed';
    } else if (askDiff >= -10000 && equity > 10000) {
      grade = 'B';
      message = 'Good potential';
    } else if (askDiff >= -20000 && equity > 0) {
      grade = 'C';
      message = 'Negotiate down';
    } else if (equity > 0) {
      grade = 'D';
      message = 'Thin margin';
    }

    // Fake comps until you buy BatchLeads API
    const streetName = 'Bowdoin';
    const comps = [
      { address: `120 ${streetName} Ln`, price: arv - 5000, sqft: 1400, status: 'Sold' },
      { address: `125 ${streetName} Ln`, price: arv + 3000, sqft: 1450, status: 'Active' },
      { address: `118 ${streetName} Ln`, price: arv - 12000, sqft: 1350, status: 'Sold' }
    ];

    return res.status(200).json({ 
      mao: Math.round(mao), 
      equity: Math.round(equity), 
      askDiff: Math.round(askDiff), 
      grade, 
      message,
      comps 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
