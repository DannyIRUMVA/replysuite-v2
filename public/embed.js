(function () {
  'use strict';

  // ── Wappalyzer / technology-detection fingerprint ────────────────────────────
  window.ReplySuite = { version: '2.0.0', vendor: 'Replysuite', status: 'active' };

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var chatbotId = script.getAttribute('data-chatbot');
  if (!chatbotId) {
    console.warn('[ReplySuite] Missing data-chatbot attribute on embed script.');
    return;
  }

  var BASE_URL = script.src.replace('/embed.js', '');

  // ── Fetch design config then build the launcher ──────────────────────────────
  fetch(BASE_URL + '/api/public/config/' + chatbotId)
    .then(function (r) { return r.json(); })
    .then(function (config) {
      var primaryColor = config.primaryColor || '#D4AF37';
      var position = config.widgetPosition || 'bottom-right';
      var isRight = position !== 'bottom-left';

      injectStyles(primaryColor);
      buildLauncher(chatbotId, primaryColor, isRight, BASE_URL);
    })
    .catch(function () {
      // Fallback with defaults if config fetch fails
      injectStyles('#D4AF37');
      buildLauncher(chatbotId, '#D4AF37', true, BASE_URL);
    });

  // ── Inject keyframe CSS ──────────────────────────────────────────────────────
  function injectStyles(color) {
    var style = document.createElement('style');
    style.textContent = [
      '@keyframes rs-pop { 0%{transform:scale(0.5);opacity:0} 80%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }',
      '@keyframes rs-ring { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }',
      '.rs-launcher { animation: rs-pop 0.4s cubic-bezier(.175,.885,.32,1.275) both; }',
      '.rs-launcher:hover { transform: scale(1.08) !important; animation: rs-ring 1.5s ease-in-out infinite; }',
      '@media (max-width: 480px) {',
      '  .rs-container { width: calc(100% - 32px) !important; height: calc(100% - 108px) !important; right: 16px !important; bottom: 92px !important; border-radius: 20px !important; }',
      '  .rs-launcher { bottom: 16px !important; right: 16px !important; }',
      '}',
      '@media (max-width: 360px) {',
      '  .rs-container { width: 100% !important; height: 100% !important; bottom: 0 !important; right: 0 !important; border-radius: 0 !important; top: 0 !important; }',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ── Build the floating launcher button and iframe ────────────────────────────
  function buildLauncher(id, color, isRight, base) {
    var isOpen = false;

    // ── Launcher Button ──
    var btn = document.createElement('button');
    btn.className = 'rs-launcher';
    btn.setAttribute('aria-label', 'Open chat');
    btn.style.cssText = [
      'position:fixed',
      isRight ? 'right:24px' : 'left:24px',
      'bottom:24px',
      'width:56px',
      'height:56px',
      'border-radius:50%',
      'background:' + color,
      'border:none',
      'cursor:pointer',
      'z-index:2147483646',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'box-shadow:0 8px 24px ' + hexToRgba(color, 0.45) + ',0 2px 8px rgba(0,0,0,0.3)',
      'transition:transform 0.2s,box-shadow 0.2s',
      'outline:none',
    ].join(';');

    // Chat icon SVG (message bubble)
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

    // ── Notification dot ──
    var dot = document.createElement('span');
    dot.style.cssText = [
      'position:absolute',
      'top:2px',
      isRight ? 'right:2px' : 'left:2px',
      'width:12px',
      'height:12px',
      'background:#22c55e',
      'border-radius:50%',
      'border:2px solid #fff',
      'animation:rs-ring 2s ease-in-out infinite',
    ].join(';');
    btn.appendChild(dot);

    // ── Iframe Container ──
    var container = document.createElement('div');
    container.className = 'rs-container';
    container.id = 'replysuite-chat-widget-container'; // Wappalyzer HTML fingerprint
    container.style.cssText = [
      'position:fixed',
      isRight ? 'right:16px' : 'left:16px',
      'bottom:92px',
      'width:380px',
      'height:600px',
      'max-height:calc(100vh - 108px)',
      'border-radius:24px',
      'overflow:hidden',
      'box-shadow:0 24px 64px rgba(0,0,0,0.5)',
      'z-index:2147483645',
      'display:none',
      'transition:all 0.3s cubic-bezier(.175,.885,.32,1.275)',
      'border:1px solid rgba(255,255,255,0.08)',
      'opacity:0',
      'transform:translateY(20px) scale(0.95)',
    ].join(';');

    var iframe = document.createElement('iframe');
    iframe.src = base + '/widget/' + id;
    iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
    iframe.setAttribute('title', 'ReplySuite Chat');
    iframe.setAttribute('allow', 'microphone; autoplay');
    container.appendChild(iframe);

    // ── Toggle logic ──
    btn.addEventListener('click', function () {
      isOpen = !isOpen;
      if (isOpen) {
        container.style.display = 'block';
        dot.style.display = 'none'; // Hide notification dot once opened
        setTimeout(function () {
          container.style.opacity = '1';
          container.style.transform = 'translateY(0) scale(1)';
        }, 10);
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      } else {
        container.style.display = 'none';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
        btn.appendChild(dot);
      }
    });

    // Listen for minimize message from the iframe
    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'replysuite-minimize') {
        isOpen = false;
        container.style.display = 'none';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
        btn.appendChild(dot);
      }
    });

    document.body.appendChild(btn);
    document.body.appendChild(container);
  }

  // ── Utility: hex color → rgba ────────────────────────────────────────────────
  function hexToRgba(hex, alpha) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 'rgba(212,175,55,' + alpha + ')';
    return 'rgba(' + parseInt(result[1], 16) + ',' + parseInt(result[2], 16) + ',' + parseInt(result[3], 16) + ',' + alpha + ')';
  }

})();
