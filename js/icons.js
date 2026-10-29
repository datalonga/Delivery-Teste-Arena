/* =========================================================================
   icons.js — biblioteca de ícones SVG inline (sem dependências externas)
   Uso:  Icons.svg('cart')            -> markup do ícone
         <svg class="icon"><use href="#i-cart"></use></svg>
   O sprite é injetado uma única vez no documento por Icons.mount().
   ========================================================================= */
(function () {
  'use strict';

  var STROKE = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';

  var PATHS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4.1-4.1"/>',
    cart: '<path d="M2.8 4h2.1l2.3 10.6a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.6L21 7.2H6"/><circle cx="9.5" cy="19.6" r="1.5"/><circle cx="17.4" cy="19.6" r="1.5"/>',
    trash: '<path d="M4 6.8h16M9.3 6.8V4.9a1.2 1.2 0 0 1 1.2-1.2h3a1.2 1.2 0 0 1 1.2 1.2v1.9"/><path d="M6.6 6.8l.8 12.1a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.8-12.1"/><path d="M10.2 10.6v6.2M13.8 10.6v6.2"/>',
    plus: '<path d="M12 5.2v13.6M5.2 12h13.6"/>',
    minus: '<path d="M5.2 12h13.6"/>',
    close: '<path d="M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8"/>',
    'arrow-left': '<path d="M19.5 12H4.5M10.5 6l-6 6 6 6"/>',
    'arrow-right': '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
    'chevron-right': '<path d="M9.2 5.4l6.6 6.6-6.6 6.6"/>',
    'chevron-down': '<path d="M5.4 9.2l6.6 6.6 6.6-6.6"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.3 2"/>',
    scooter: '<circle cx="5.6" cy="17.4" r="2.6"/><circle cx="18.4" cy="17.4" r="2.6"/><path d="M8.2 17.4h7.4M13.9 17.4l-1.9-6.6H9.2"/><path d="M16.1 10.8h1.9l1 3.2"/><path d="M12.2 7.6V5.8h2.1"/>',
    store: '<path d="M4.2 10.4V19a1 1 0 0 0 1 1h13.6a1 1 0 0 0 1-1v-8.6"/><path d="M3 10.4l1.7-5.1a1 1 0 0 1 .95-.7h12.7a1 1 0 0 1 .95.7L21 10.4"/><path d="M3 10.4a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M10 20v-4.4h4V20"/>',
    'map-pin': '<path d="M12 21.2s6.8-5.7 6.8-11A6.8 6.8 0 0 0 5.2 10.2c0 5.3 6.8 11 6.8 11z"/><circle cx="12" cy="10" r="2.6"/>',
    check: '<path d="M4.8 12.6l4.9 4.9L19.4 7"/>',
    'check-circle': '<circle cx="12" cy="12" r="8.6"/><path d="M8.3 12.3l2.6 2.6 4.9-4.9"/>',
    alert: '<path d="M12 3.6l9 15.8H3z"/><path d="M12 9.4v4.6"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>',
    info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5"/><circle cx="12" cy="7.9" r="1" fill="currentColor" stroke="none"/>',
    star: '<path d="M12 3.4l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.6l5.9-.8z"/>',
    'star-filled': '<path d="M12 3.4l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.6l5.9-.8z" fill="currentColor" stroke="currentColor"/>',
    flame: '<path d="M12 3.2s4.9 4 4.9 8.3a4.9 4.9 0 0 1-9.8 0c0-1.6.7-2.9 1.4-3.9.3 1.1 1 1.8 1.7 2.1.6-2.2 1.8-4.5 1.8-6.5z"/>',
    card: '<rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2.6"/><path d="M2.8 10h18.4M6.4 14.8h3.2"/>',
    cash: '<rect x="2.6" y="6.2" width="18.8" height="11.6" rx="2.2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10.2v3.6M18 10.2v3.6"/>',
    pix: '<rect x="3.4" y="3.4" width="6.4" height="6.4" rx="1.6"/><rect x="14.2" y="3.4" width="6.4" height="6.4" rx="1.6"/><rect x="3.4" y="14.2" width="6.4" height="6.4" rx="1.6"/><path d="M14.2 14.2h2.9v2.9h-2.9zM20.6 14.2v2.9M14.2 20.6h2.9M20.6 20.6h-1.4"/>',
    pen: '<path d="M4.2 19.8h3.9L20 7.9a2.4 2.4 0 0 0-3.4-3.4L4.2 16.4z"/><path d="M14.6 6.6l3.4 3.4"/>',
    image: '<rect x="3" y="4.2" width="18" height="15.6" rx="2.4"/><circle cx="8.6" cy="9.4" r="1.6"/><path d="M3.6 16.6l4.4-4.2 3 2.9 4-3.9 5 5"/>',
    box: '<path d="M12 3.2l8.2 4.5v8.6L12 20.8l-8.2-4.5V7.7z"/><path d="M3.8 7.7L12 12.2l8.2-4.5M12 12.2v8.6"/>',
    tags: '<path d="M20.3 12.7l-7.6 7.6a2 2 0 0 1-2.8 0l-6.2-6.2V4.9a1.6 1.6 0 0 1 1.6-1.6h9.2l5.8 5.8a2 2 0 0 1 0 2.6z"/><circle cx="8.2" cy="8.2" r="1.4"/>',
    receipt: '<path d="M6.2 3.2h11.6a1 1 0 0 1 1 1v16.6l-2.9-1.9-2.9 1.9-2.9-1.9-2.9 1.9V4.2a1 1 0 0 1 1-1z"/><path d="M9.2 8.2h5.6M9.2 12h5.6"/>',
    dashboard: '<rect x="3.4" y="3.4" width="7.2" height="7.2" rx="1.8"/><rect x="13.4" y="3.4" width="7.2" height="4.6" rx="1.8"/><rect x="13.4" y="10.4" width="7.2" height="10.2" rx="1.8"/><rect x="3.4" y="13" width="7.2" height="7.6" rx="1.8"/>',
    settings: '<circle cx="12" cy="12" r="3.1"/><path d="M19.4 14.9a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56v.17a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03h-.17a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08a1.7 1.7 0 0 0 1.03-1.56v-.17a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03h.17a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1.03z"/>',
    logout: '<path d="M9.4 21.2H6.2a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2h3.2"/><path d="M16.2 8.2l4 3.8-4 3.8"/><path d="M20.2 12H9.2"/>',
    user: '<circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20.2a7.4 7.4 0 0 1 14.4 0"/>',
    lock: '<rect x="4.6" y="10.2" width="14.8" height="10.2" rx="2.6"/><path d="M8.2 10.2V7.4a3.8 3.8 0 0 1 7.6 0v2.8"/><circle cx="12" cy="15.2" r="1.2" fill="currentColor" stroke="none"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    refresh: '<path d="M20.2 12a8.2 8.2 0 1 1-3.3-6.6"/><path d="M20.4 4.6V11h-6.4"/>',
    download: '<path d="M12 3.4v11.2M7.4 10.2L12 14.8l4.6-4.6"/><path d="M4.2 19.8h15.6"/>',
    upload: '<path d="M12 15.2V4M7.4 8.6L12 4l4.6 4.6"/><path d="M4.2 19.8h15.6"/>',
    copy: '<rect x="8.6" y="8.6" width="11.4" height="11.4" rx="2.4"/><path d="M15.4 8.6V6.2a2 2 0 0 0-2-2H6.2a2 2 0 0 0-2 2v7.2a2 2 0 0 0 2 2h2.4"/>',
    sparkles: '<path d="M11.4 3.6l1.7 4.5 4.5 1.7-4.5 1.7-1.7 4.5-1.7-4.5L5.2 9.8l4.5-1.7z"/><path d="M18 14.8l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z"/>',
    phone: '<path d="M6.6 3.6h2.9l1.5 3.8-2 1.5a11.4 11.4 0 0 0 5.6 5.6l1.5-2 3.8 1.5v2.9a2 2 0 0 1-2.1 2C10.7 18.9 5.1 13.3 4.6 5.7a2 2 0 0 1 2-2.1z"/>',
    eye: '<path d="M2.6 12S6.1 5.6 12 5.6 21.4 12 21.4 12 17.9 18.4 12 18.4 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.9"/>',
    external: '<path d="M14 4.2h5.8V10"/><path d="M19.8 4.2l-8.4 8.4"/><path d="M18.2 14.2V19a1.6 1.6 0 0 1-1.6 1.6H5.2A1.6 1.6 0 0 1 3.6 19V6.2a1.6 1.6 0 0 1 1.6-1.6h4.6"/>',
    bag: '<path d="M5.8 7.8h12.4l1.2 12.4H4.6z"/><path d="M9 7.8V6a3 3 0 0 1 6 0v1.8"/>',
    note: '<rect x="4.2" y="3.6" width="15.6" height="16.8" rx="2.4"/><path d="M8 8.6h8M8 12.4h8M8 16.2h4.6"/>',
    whatsapp: '<path d="M12.05 2.2c-5.4 0-9.8 4.4-9.8 9.8 0 1.73.45 3.42 1.31 4.9L2.2 21.8l5.05-1.33a9.77 9.77 0 0 0 4.8 1.24c5.4 0 9.8-4.4 9.8-9.8s-4.4-9.71-9.8-9.71zm0 17.9c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3 .79.8-2.93-.2-.31a8.1 8.1 0 0 1-1.24-4.31A8.1 8.1 0 0 1 12.05 4a8.1 8.1 0 0 1 8.09 8.09 8.1 8.1 0 0 1-8.09 8.01zm4.44-6.06c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06a6.6 6.6 0 0 1-1.95-1.2 7.3 7.3 0 0 1-1.35-1.68c-.14-.24-.02-.37.1-.49.12-.12.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.47-.4-.4-.55-.41h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.11 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.05.14-1.16-.06-.1-.22-.16-.46-.28z" fill="currentColor" stroke="none"/>',
    'x-circle': '<circle cx="12" cy="12" r="8.6"/><path d="M9.4 9.4l5.2 5.2M14.6 9.4l-5.2 5.2"/>',
    filter: '<path d="M4 6.4h16M7 12h10M10 17.6h4"/>',
    minusCircle: '<circle cx="12" cy="12" r="8.6"/><path d="M8.2 12h7.6"/>'
  };

  var FILLED = { whatsapp: true, 'star-filled': true };

  function symbol(name) {
    var content = PATHS[name];
    if (!content) return '';
    var attrs = FILLED[name] ? 'fill="currentColor" stroke="none"' : STROKE;
    return '<symbol id="i-' + name + '" viewBox="0 0 24 24" ' + attrs + '>' + content + '</symbol>';
  }

  var sprite = null;

  var Icons = {
    names: Object.keys(PATHS),

    /** Injeta o sprite no documento (idempotente). */
    mount: function () {
      if (sprite || !document.body) return;
      sprite = document.createElement('div');
      sprite.setAttribute('aria-hidden', 'true');
      sprite.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" style="display:block;width:0;height:0" aria-hidden="true">';
      for (var i = 0; i < Icons.names.length; i++) svg += symbol(Icons.names[i]);
      svg += '</svg>';
      sprite.innerHTML = svg;
      document.body.insertBefore(sprite, document.body.firstChild);
    },

    /** Retorna o markup de um ícone. */
    svg: function (name, className) {
      return '<svg class="icon ' + (className || '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
    }
  };

  window.Icons = Icons;
})();
