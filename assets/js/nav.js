/* =========================================
   PYTHONPATH — Shared UI: Nav + AI Chat
   ========================================= */

// ── MOBILE NAV ────────────────────────────
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.querySelector('.nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar')) navLinks.classList.remove('open');
  });
}

// Mark active nav link based on current page
(function markActiveNav() {
  const path = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    if (href === path || (path === '' || path === 'index.html') && href === 'index.html') {
      a.classList.add('active');
    }
  });
})();

// ── API KEY MANAGEMENT ────────────────────
window.PP = window.PP || {};

PP.getKey = () => localStorage.getItem('pp_api_key') || '';
PP.setKey = (k) => { localStorage.setItem('pp_api_key', k); PP.updateKeyStatus(); };

PP.updateKeyStatus = function() {
  const el = document.getElementById('key-status');
  if (!el) return;
  const key = PP.getKey();
  el.textContent = key ? '⬤ key salva' : '⬤ sem key';
  el.className   = 'key-status' + (key ? ' ok' : '');
};

window.saveKey = function() {
  const inp = document.getElementById('key-input');
  if (!inp) return;
  const val = inp.value.trim();
  if (val && val !== '••••••••••••') {
    PP.setKey(val);
    inp.value = '••••••••••••';
  }
};

// Init key display
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('key-input');
  if (inp && PP.getKey()) inp.value = '••••••••••••';
  PP.updateKeyStatus();
});

// ── AI CHAT ───────────────────────────────
let _aiOpen = false;

window.toggleAI = function() {
  _aiOpen = !_aiOpen;
  const panel = document.getElementById('ai-panel');
  if (panel) {
    panel.classList.toggle('open', _aiOpen);
    if (_aiOpen) document.getElementById('ai-inp')?.focus();
  }
};

function _addMsg(cls, html) {
  const msgs = document.getElementById('ai-msgs');
  if (!msgs) return null;
  const d = document.createElement('div');
  d.className = 'ai-msg ' + cls;
  d.innerHTML = html;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
  return d;
}

function _formatAIText(text) {
  return text
    .replace(/```python\n?([\s\S]*?)```/g, '<pre style="background:var(--bg);padding:.7rem;border-radius:6px;border:1px solid var(--border);margin:.4rem 0;font-size:.72rem;overflow-x:auto">$1</pre>')
    .replace(/```([\s\S]*?)```/g,          '<pre style="background:var(--bg);padding:.7rem;border-radius:6px;border:1px solid var(--border);margin:.4rem 0;font-size:.72rem;overflow-x:auto">$1</pre>')
    .replace(/`([^`]+)`/g, '<code style="font-family:var(--font-mono);color:var(--yellow);background:var(--bg);padding:.1rem .3rem;border-radius:3px;font-size:.78rem">$1</code>')
    .replace(/\n/g, '<br>');
}

window.sendAI = async function(customPrompt) {
  const inp = document.getElementById('ai-inp');
  const msg = customPrompt || inp?.value.trim();
  if (!msg) return;

  const key = PP.getKey();
  if (!key) {
    _addMsg('bot', '⚠️ Configure sua API key na página <a href="../pages/analisar.html" style="color:var(--yellow)">Analisar PDF</a>.');
    return;
  }

  if (!customPrompt && inp) inp.value = '';
  _addMsg('user', msg);
  const typing = _addMsg('typing', '⏳ pensando...');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: 'Você é PyBot, especialista em Python integrado ao PythonPath. Responda em português brasileiro. Seja conciso e prático. Use exemplos de código quando relevante. Foque em conexões com uso real, especialmente para QA e automação de testes.',
        messages: [{ role: 'user', content: msg }]
      })
    });
    const data = await res.json();
    typing?.remove();
    if (data.content?.[0]) {
      _addMsg('bot', _formatAIText(data.content[0].text));
    } else if (data.error) {
      _addMsg('bot', `❌ ${data.error.message}`);
    }
  } catch(e) {
    typing?.remove();
    _addMsg('bot', '❌ Erro de conexão. Verifique sua API key.');
  }
};

window.getHint = async function(title, problem) {
  if (!_aiOpen) toggleAI();
  await sendAI(`Estou no desafio "${title}".\n\nProblema:\n${problem}\n\nDê uma dica sem revelar a solução — aponte a direção de raciocínio.`);
};

// Enter key for AI input
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('ai-inp');
  inp?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendAI(); });
});
