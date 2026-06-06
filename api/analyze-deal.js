export default async function handler(req, res) {
  if (req.method!== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { 
      address, 
      state, 
      asking_price, 
      arv, 
      repairs, 
      property_type,
      sqft,
      com_sqft,
      acres,
      com_acres
    } = req.body;
    
    const ask = Number(asking_price) || 0;
    const ar = Number(arv) || 0;
    const rep = Number(repairs) || 0;
    
    // VAULTFORGE MAO FORMULA: ARV * 70% - Repairs - 10k wholesale fee
    const mao = Math.round(ar * 0.70 - rep - 10000);
    
    // ROI: (ARV - ASK - Repairs) / ASK * 100
    const roi = ask > 0 ? Math.round(((ar - ask - rep) / ask) * 100) : 0;
    
    // DEAL SCORE: 100 if ASK <= MAO, lose 2pts per $1k over MAO
    let score = 100;
    if (ask > mao) {
      const overAmount = ask - mao;
      score = Math.max(0, 100 - Math.floor(overAmount / 1000) * 2);
    }
    
    // BONUS: Cap at 100, floor at 0
    score = Math.min(100, Math.max(0, score));
    
    // COMPS - TODO: Replace with BatchLeads/PropStream API
    // For now: Generate realistic comps based on ARV + street name
    const streetParts = address?.split(' ') || ['123', 'Main'];
    const streetName = streetParts[1] || 'Main';
    const streetType = streetParts[2] || 'St';
    
    const baseSqft = Number(sqft) || Number(com_sqft) || 1750;
    const pricePerSqft = ar > 0 && baseSqft > 0 ? Math.round(ar / baseSqft) : 150;
    
    const comps = [
      { 
        address: `120 ${streetName} ${streetType}`, 
        price: Math.round(ar - (ar * 0.02)), 
        sold_date: "2026-05-15", 
        sqft: baseSqft - 50 
      },
      { 
        address: `125 ${streetName} ${streetType}`, 
        price: Math.round(ar + (ar * 0.01)), 
        sold_date: "2026-04-22", 
        sqft: baseSqft + 70 
      },
      { 
        address: `118 ${streetName} ${streetType}`, 
        price: Math.round(ar - (ar * 0.05)), 
        sold_date: "2026-05-03", 
        sqft: baseSqft - 120 
      }
    ];
    
    res.status(200).json({ 
      score, 
      roi, 
      mao, 
      comps,
      price_per_sqft: pricePerSqft
    });
    
  } catch (error) {
    console.error('Analyze-deal error:', error);
    res.status(500).json({ error: 'Analysis failed. Check server logs.' });
  }
}
