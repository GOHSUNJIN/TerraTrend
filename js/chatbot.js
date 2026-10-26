/* TerraTrend - chatbot.js
   Terra assistant powered by Claude via /api/chat */
(function () {
  'use strict';

  var WELCOME_MSG =
    "Hey! I'm Terra, your guide to TerraTrend's climate data. " +
    "Ask me about any of the 8 variables on the globe, what's happening in a specific region " +
    "or how the statistics work. What are you curious about?";

  var SUGGESTIONS = [
    'What is happening to sea levels?',
    'Which region is most at risk?',
    'How are trends calculated?',
    'Tell me about Greenland ice loss'
  ];

  var fab      = document.getElementById('chatbot-fab');
  var panel    = document.getElementById('chatbot-panel');
  var closeBtn = document.getElementById('chatbot-close');
  var thread   = document.getElementById('chatbot-messages');
  var inputEl  = document.getElementById('chatbot-input');
  var sendBtn  = document.getElementById('chatbot-send');
  var statusEl = document.querySelector('.chatbot-status');

  if (!fab || !panel || !thread || !inputEl || !sendBtn) return;

  // Activate the chatbot
  inputEl.disabled = false;
  sendBtn.disabled = false;
  if (statusEl) statusEl.textContent = 'ONLINE';
  thread.innerHTML = '';

  // Conversation history (sent to /api/chat each request)
  var history = [];
  var busy    = false;
  var greeted = false;

  function closeChat() {
    panel.classList.add('closing');
    setTimeout(function () {
      panel.hidden = true;
      panel.classList.remove('closing');
    }, 210);
  }

  // ---- Open / close ----
  fab.addEventListener('click', function () {
    if (!panel.hidden) { closeChat(); return; }
    panel.hidden = false;
    if (window.TerraTrendUI && window.TerraTrendUI.closePanel) {
      window.TerraTrendUI.closePanel();
    }
    if (!greeted) {
      greeted = true;
      addMsg('ai', WELCOME_MSG);
      addSuggestions();
    }
    inputEl.focus();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeChat);
  }

  // ---- Send ----
  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  function send() {
    var text = inputEl.value.trim();
    if (!text || busy) return;
    inputEl.value = '';

    addMsg('user', text);
    history.push({ role: 'user', content: text });

    busy = true;
    inputEl.disabled = true;
    sendBtn.disabled = true;

    var thinkEl = addThinking();

    var ctx = (window.TerraTrendUI && window.TerraTrendUI.lastViewedSpot) || null;

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-20), activeContext: ctx })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        thinkEl.remove();
        if (data.error) {
          var errText = data.error === 'API not configured'
            ? "I'm not fully set up yet. The admin needs to add the API key in Vercel. Check back soon!"
            : "I ran into a snag. Please try again in a moment.";
          addMsg('ai', errText);
          return;
        }
        var reply = (data.content && data.content[0] && data.content[0].text)
          || "I didn't get a response. Please try again.";
        var parsed = extractPanelRefs(reply);
        history.push({ role: 'assistant', content: parsed.clean });
        addMsg('ai', parsed.clean);
        addPanelLinks(parsed.refs);
      })
      .catch(function () {
        thinkEl.remove();
        addMsg('ai', "I'm having trouble connecting right now. Please try again in a moment.");
      })
      .then(function () {
        // always runs (acts like finally)
        busy = false;
        inputEl.disabled = false;
        sendBtn.disabled = false;
        inputEl.focus();
      });
  }

  // ---- DOM helpers ----
  function addMsg(role, text) {
    var row    = document.createElement('div');
    row.className = 'chat-msg chat-msg-' + (role === 'user' ? 'user' : 'ai');
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML = safe(text);
    row.appendChild(bubble);
    thread.appendChild(row);
    thread.scrollTop = thread.scrollHeight;
    return row;
  }

  function addThinking() {
    var row = document.createElement('div');
    row.className = 'chat-msg chat-msg-ai';
    row.innerHTML =
      '<div class="chat-bubble chat-thinking">' +
      '<span class="thinking-dots">' +
      '<span></span><span></span><span></span>' +
      '</span></div>';
    thread.appendChild(row);
    thread.scrollTop = thread.scrollHeight;
    return row;
  }

  function addSuggestions() {
    var wrap = document.createElement('div');
    wrap.className = 'chat-suggestions';
    SUGGESTIONS.forEach(function (q) {
      var btn = document.createElement('button');
      btn.className = 'chat-suggestion-btn';
      btn.textContent = q;
      btn.addEventListener('click', function () {
        wrap.remove();
        inputEl.value = q;
        send();
      });
      wrap.appendChild(btn);
    });
    thread.appendChild(wrap);
    thread.scrollTop = thread.scrollHeight;
  }

  function extractPanelRefs(text) {
    var refs = [], seen = {};
    var clean = text.replace(/\[\[open:([a-z0-9-]+)\]\]/g, function (_, id) {
      if (!seen[id]) { seen[id] = true; refs.push(id); }
      return '';
    });
    return { clean: clean.trim(), refs: refs };
  }

  function addPanelLinks(ids) {
    if (!ids.length) return;
    var panels = ids.map(function (id) {
      var p = (typeof HOTSPOTS     !== 'undefined' && HOTSPOTS.find(function (s) { return s.id === id; }))
           || (typeof REGION_ZONES !== 'undefined' && REGION_ZONES.find(function (r) { return r.id === id; }));
      return p ? { id: id, panel: p } : null;
    }).filter(Boolean);
    if (!panels.length) return;

    var row = document.createElement('div');
    row.className = 'chat-panel-links';
    panels.forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'chat-panel-link-btn';
      btn.textContent = item.panel.icon + ' ' + item.panel.name;
      btn.addEventListener('click', function () {
        var idx = typeof HOTSPOTS !== 'undefined' ? HOTSPOTS.indexOf(item.panel) : -1;
        if (idx >= 0 && window.TerraTrendGlobe) {
          window.TerraTrendGlobe.selectHotspot(idx, true);
        } else if (window.TerraTrendUI && item.panel.bounds) {
          var b = item.panel.bounds;
          var lat = (b[0] + b[1]) / 2, lon = (b[2] + b[3]) / 2;
          var coords = Math.abs(lat).toFixed(1) + '°' + (lat >= 0 ? 'N' : 'S') +
                       ', ' + Math.abs(lon).toFixed(1) + '°' + (lon >= 0 ? 'E' : 'W');
          window.TerraTrendUI.openPanel(item.panel, coords);
        }
      });
      row.appendChild(btn);
    });
    thread.appendChild(row);
    thread.scrollTop = thread.scrollHeight;
  }

  function safe(str) {
    // Strip any markdown the model sneaks in before HTML-escaping
    var plain = str
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1');
    var d = document.createElement('div');
    d.textContent = plain;
    return d.innerHTML.replace(/\n/g, '<br>');
  }
})();
