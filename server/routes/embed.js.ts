export default defineEventHandler((event) => {
  const host = getRequestHost(event)
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const origin = `${protocol}://${host}`

  const scriptContent = `
(function() {
  const script = document.currentScript;
  const chatbotId = script.getAttribute('data-chatbot');
  
  if (!chatbotId) {
    console.error('ReplySuite: Missing data-chatbot attribute on script tag.');
    return;
  }

  // Create Container
  const container = document.createElement('div');
  container.id = 'replysuite-widget-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '999999';
  container.style.fontFamily = 'sans-serif';

  // Create Button
  const button = document.createElement('button');
  button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>';
  button.style.width = '60px';
  button.style.height = '60px';
  button.style.borderRadius = '30px';
  button.style.backgroundColor = '#EAB308'; // Primary Gold
  button.style.color = 'black';
  button.style.border = 'none';
  button.style.cursor = 'pointer';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.boxShadow = '0 10px 25px rgba(234, 179, 8, 0.3)';
  button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

  // Create Iframe Wrap
  const iframeWrap = document.createElement('div');
  iframeWrap.style.position = 'absolute';
  iframeWrap.style.bottom = '80px';
  iframeWrap.style.right = '0';
  iframeWrap.style.width = '400px';
  iframeWrap.style.height = '600px';
  iframeWrap.style.maxHeight = 'calc(100vh - 120px)';
  iframeWrap.style.maxWidth = 'calc(100vw - 40px)';
  iframeWrap.style.borderRadius = '24px';
  iframeWrap.style.overflow = 'hidden';
  iframeWrap.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
  iframeWrap.style.display = 'none';
  iframeWrap.style.backgroundColor = '#0a0a0a';
  iframeWrap.style.border = '1px solid rgba(255,255,255,0.1)';
  iframeWrap.style.opacity = '0';
  iframeWrap.style.transform = 'translateY(20px)';
  iframeWrap.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

  const iframe = document.createElement('iframe');
  iframe.src = '${origin}/widget/' + chatbotId;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  
  iframeWrap.appendChild(iframe);
  container.appendChild(iframeWrap);
  container.appendChild(button);
  document.body.appendChild(container);

  let isOpen = false;

  const toggle = () => {
    isOpen = !isOpen;
    if (isOpen) {
      iframeWrap.style.display = 'block';
      setTimeout(() => {
        iframeWrap.style.opacity = '1';
        iframeWrap.style.transform = 'translateY(0)';
      }, 10);
      button.style.transform = 'rotate(90deg) scale(0.9)';
      button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    } else {
      iframeWrap.style.opacity = '0';
      iframeWrap.style.transform = 'translateY(20px)';
      button.style.transform = 'rotate(0deg) scale(1)';
      button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>';
      setTimeout(() => {
        if (!isOpen) iframeWrap.style.display = 'none';
      }, 400);
    }
  };

  button.onclick = toggle;

  // Listen for internal close signals
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'replysuite-minimize') {
      if (isOpen) toggle();
    }
  });

  // Mobile responsiveness
  const style = document.createElement('style');
  style.textContent = \`
    @media (max-width: 480px) {
      #replysuite-widget-container div {
        width: calc(100vw - 40px) !important;
        height: calc(100vh - 100px) !important;
      }
    }
  \`;
  document.head.appendChild(style);
})();
  `

  setResponseHeader(event, 'Content-Type', 'application/javascript')
  return scriptContent
})
