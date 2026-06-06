export default async function handler(req, res) {
  if (req.method!== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const data = req.body;
    const ask = Number(data.asking_price) || 0;
    const ar = Number(data.arv) || 0;
    const rep = Number(data.repairs) || 0;
    const payoff = Number(data.payoff_amount) || 0;
    const sqft = Number(data.sqft) || Number(data.com_sqft) || 1750;
    
    // CORE MATH
    const mao = Math.round(ar * 0.70 - rep - 10000);
    const ask_vs_mao = ask - mao;
    const equity_spread = Math.round(ar - payoff - ask);
    const roi = ask > 0? Math.round(((ar - ask - rep) / ask) * 100) : 0;
    const dollar_per_sqft = sqft > 0? Math.round(ask / sqft) : 0;
    
    // COMPS - TODO: Replace with real API
    const streetParts = data.address?.split(' ') || ['123', 'Main'];
    const streetName = streetParts[1] || 'Main';
    const comps = [
      { address: `120 ${streetName} St`, price: Math.round(ar - ar*0.02), sold_date: "2026-05-15", sqft: sqft-50 },
      { address: `125 ${streetName} St`, price: Math.round(ar + ar*0.01), sold_date: "2026-04-22", sqft: sqft+70 },
      { address: `118 ${streetName} St`, price: Math.round(ar - ar*0.05), sold_date: "2026-05-03", sqft: sqft-120 }
    ];
    const comps_avg_sqft = Math.round(comps.reduce((sum, c) => sum + c.price/c.sqft, 0) / comps.length);
    const discount_vs_comps = comps_avg_sqft > 0? Math.round(((comps_avg_sqft - dollar_per_sqft) / comps_avg_sqft) * 100) : 0;
    
    // GRADE LOGIC - VAULTFORGE SYSTEM
    let grade = 'F';
    let reason = 'No profit margin';
    let risk = 'HIGH';
    
    if (ask <= mao && equity_spread >= 40000 && roi >= 30 && discount_vs_comps >= 15) {
      grade = 'A'; reason = 'Under MAO, $40k+ equity, 30%+ ROI, 15%+ under comps'; risk = 'LOW';
    } else if (ask <= mao + 10000 && equity_spread >= 20000 && roi >= 20 && discount_vs_comps >= 5) {
      grade = 'B'; reason = 'Near MAO, $20k+ equity, 20%+ ROI'; risk = 'LOW';
    } else if (ask <= mao + 25000 && equity_spread >= 10000 && roi >= 10) {
      grade = 'C'; reason = 'Negotiable - needs price drop or clean title'; risk = 'MED';
    } else if (ask <= mao + 50000 && equity_spread >= 0) {
      grade = 'D'; reason = 'Overpriced - high risk'; risk = 'HIGH';
    }
    
    res.status(200).json({ 
      grade, reason, risk,
      mao, ask_vs_mao, equity_spread, roi,
      dollar_per_sqft, comps_avg_sqft, discount_vs_comps,
      comps
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
