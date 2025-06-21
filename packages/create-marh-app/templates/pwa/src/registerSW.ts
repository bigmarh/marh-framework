import { Workbox } from 'workbox-window';

export function registerSW() {
  if ('serviceWorker' in navigator) {
    const wb = new Workbox('/sw.js');

    wb.addEventListener('controlling', () => {
      window.location.reload();
    });

    wb.addEventListener('waiting', () => {
      if (confirm('New content is available! Click OK to refresh.')) {
        wb.addEventListener('controlling', () => {
          window.location.reload();
        });
        wb.messageSkipWaiting();
      }
    });

    wb.register()
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  }
}