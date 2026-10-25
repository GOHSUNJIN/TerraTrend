/* TerraTrend - chatbot.js
   Earth AI assistant powered by Claude via /api/chat */
(function () {
  'use strict';

  var WELCOME_KEY = 'tt_ai_greeted';
  var WELCOME_MSG =
    "Hey! I'm Earth AI, your guide to TerraTrend's climate data. " +
    "Ask me about any of the 8 variables on the globe, what's happening in a specific region " +
    "or how the statistics work. What are you curious about?";

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

  // ---- Open / close ----
  fab.addEventListener('click', function () {
    if (!panel.hidden) { panel.hidden = true; return; }
    panel.hidden = false;
    if (window.TerraTrendUI && window.TerraTrendUI.closePanel) {
      window.TerraTrendUI.closePanel();
    }
    if (!localStorage.getItem(WELCOME_KEY)) {
      localStorage.setItem(WELCOME_KEY, '1');
      addMsg('ai', WELCOME_MSG);
    }
    inputEl.focus();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', function () { panel.hidden = true; });
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
        history.push({ role: 'assistant', content: reply });
        addMsg('ai', reply);
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

  function safe(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML.replace(/\n/g, '<br>');
  }
})();
