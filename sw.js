self.addEventListener('fetch', (event) => {
  // إذا كان الطلب موحّهاً لـ Google Apps Script، اتكـه للمتصفح ليتعامل معه مباشرة
  if (event.request.url.includes('script.google.com')) {
    return; 
  }

  event.respondWith(fetch(event.request));
});
