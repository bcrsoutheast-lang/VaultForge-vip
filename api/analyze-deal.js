export default async function handler(req, res) {
  if (req.method!== 'POST') return res.status(405).end();
  
  const { address, state, asking_price, arv, repairs, property_type } = req.body;
  const ask = parseFloat(asking_price) || 0;
  const ar = parseFloat(arv) || 0;
  const rep = parseFloat(repairs) || 0;
  
  // MAO Formula: ARV * 70% - Repairs - 10k
  const mao = Math.round(ar * 0.70 - rep - 10000);
  
  // Score: 100 if ASK <= MAO, minus 2pts per $1k over
  let score = 100;
  if (ask > mao) score = Math.max(0, 100 - Math.floor((ask - mao) / 1000) * 2);
  
  // ROI: (ARV - ASK - Repairs) / ASK * 100
  const roi = ask > 0? Math.round(((ar - ask - rep) / ask) * 100) : 0;
  
  // MOCK COMPS - Replace with BatchLeads/PropStream API
  const comps = [
    { address: "124 Main St", price: 225000, sold_date: "2026-05-01", sqft: 1750 },
    { address: "128 Main St", price: 231000, sold_date: "2026-04-18", sqft: 1820 },
    { address: "119 Main St", price: 219000, sold_date: "2026-05-10", sqft: 1680 }
  ];
  
  res.status(200).json({ score, roi, mao, comps });
}
