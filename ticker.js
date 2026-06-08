// ticker.js - Update this file to change your front page banner
// No counts, no totals, just market activity

const tickerData = [
  "RECENT MARKET: 3BR/2BA Marietta, GA • Sold $425K",
  "RECENT MARKET: 3BR/2BA Woodway, TX • Sold $329K", 
  "RECENT MARKET: 4BR/2BA Robinson, TX • Sold $304K",
  "RECENT MARKET: 3BR/2BA Jacksonville, FL • Median $360K",
  "RECENT MARKET: 5BR/6.5BA Cypress, TX • Sold $1.79M"
];

// Builds the ticker string
document.addEventListener('DOMContentLoaded', function() {
  const tickerContent = document.getElementById('tickerContent');
  if (tickerContent) {
    tickerContent.innerHTML = tickerData.map(deal => `<span>${deal}</span>`).join('');
  }
});

// When your API goes live, it overwrites this with real VaultForge deals
async function updateLiveDeals() {
  try {
    const res = await fetch('/api/live-deals');
    const data = await res.json();
    if (data.deals && data.deals.length > 0) {
      document.getElementById('tickerContent').innerHTML = data.deals.map(deal => `<span>${deal}</span>`).join('');
    }
  } catch (err) {
    console.log('Using default market data');
  }
}
setInterval(updateLiveDeals, 30000);
updateLiveDeals();
