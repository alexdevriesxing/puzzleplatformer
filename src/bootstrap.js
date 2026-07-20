import './game.js';
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('Offline mode unavailable:', error)));
}
