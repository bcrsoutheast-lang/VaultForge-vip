const tickerData = [
  "RECENT MARKET: 3BR/2BA Marietta, GA • Sold $425K",
  "RECENT MARKET: 3BR/2BA Woodway, TX • Sold $329K", 
  "RECENT MARKET: 4BR/2BA Robinson, TX • Sold $304K",
  "RECENT MARKET: 3BR/2BA Jacksonville, FL • Median $360K",
  "RECENT MARKET: 5BR/6.5BA Cypress, TX • Sold $1.79M",
  "RECENT MARKET: 3BR/2BA Marietta, GA • Sold $425K",
  "RECENT MARKET: 3BR/2BA Woodway, TX • Sold $329K", 
  "RECENT MARKET: 4BR/2BA Robinson, TX • Sold $304K",
  "RECENT MARKET: 3BR/2BA Jacksonville, FL • Median $360K",
  "RECENT MARKET: 5BR/6.5BA Cypress, TX • Sold $1.79M"
];

document.addEventListener('DOMContentLoaded', function() {
  const tickerContent = document.getElementById('tickerContent');
  if (tickerContent) {
    tickerContent.innerHTML = tickerData.map(deal => `<span>${deal}</span>`).join('');
    tickerContent.style.animationDuration = '18s';
  }
});
