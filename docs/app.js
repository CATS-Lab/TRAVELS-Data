const menu = document.querySelector('.menu-button');
const nav = document.querySelector('.main-nav');

if (menu && nav) {
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    });
  });
}

document.querySelectorAll('[role="tablist"]').forEach((tablist) => {
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));

  const select = (tab, focus) => {
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
    });
    if (focus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab, false));
    tab.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (step) {
        event.preventDefault();
        select(tabs[(index + step + tabs.length) % tabs.length], true);
      }
      if (event.key === 'Home') {
        event.preventDefault();
        select(tabs[0], true);
      }
      if (event.key === 'End') {
        event.preventDefault();
        select(tabs[tabs.length - 1], true);
      }
    });
  });
});

document.querySelectorAll('.table-scroll, .event-lifecycle').forEach((region) => {
  region.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      region.scrollLeft += 160;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      region.scrollLeft -= 160;
    }
  });
});

const mapSupport = document.querySelector('.map-support[data-active]');
const datasetButtons = Array.from(document.querySelectorAll('.dataset-select'));

if (mapSupport && datasetButtons.length) {
  const selectDataset = (name) => {
    mapSupport.dataset.active = name;
    datasetButtons.forEach((button) => {
      const active = button.dataset.dataset === name;
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('.dataset-comparison [data-dataset]').forEach((cell) => {
      cell.classList.toggle('is-selected', cell.dataset.dataset === name);
    });
  };

  datasetButtons.forEach((button) => {
    button.addEventListener('click', () => selectDataset(button.dataset.dataset));
  });

  selectDataset(mapSupport.dataset.active);
}

document.querySelectorAll('.tab-link[data-tab]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const tab = document.getElementById(link.dataset.tab);
    if (tab) {
      tab.click();
      tab.focus();
    }
  });
});

const assistant = document.getElementById('assistant');

if (assistant) {
  const launcher = document.getElementById('assistant-launcher');
  const panel = document.getElementById('assistant-panel');
  const log = document.getElementById('assistant-log');
  const form = document.getElementById('assistant-form');
  const input = document.getElementById('assistant-input');
  const sendButton = form.querySelector('button');
  const closeButton = assistant.querySelector('.assistant-close');

  const history = [];
  let endpoint = null;
  let busy = false;

  // ---- find the live service: ?assistant=<url>, data-endpoint, assistant-config.json, then this origin
  const usable = (url) => {
    try {
      const u = new URL(url, location.href);
      return u.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(u.hostname) ? u.origin : null;
    } catch (error) {
      return null;
    }
  };

  const findService = async () => {
    const override = new URLSearchParams(location.search).get('assistant');
    const candidates = [override, assistant.dataset.endpoint].map((c) => c && usable(c)).filter(Boolean);
    try {
      const response = await fetch('assistant-config.json', { cache: 'no-store' });
      if (response.ok) {
        const config = await response.json();
        const configured = config && config.endpoint && usable(config.endpoint);
        if (configured) candidates.push(configured);
      }
    } catch (error) { /* no config */ }
    const origin = usable(location.origin);
    if (origin) candidates.push(origin);   // the page is served by the assistant itself
    for (const base of [...new Set(candidates)]) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(base + '/api/health', { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timer);
        if (response.ok && (await response.json()).ok) return base;
      } catch (error) { /* try the next candidate */ }
    }
    return null;
  };

  // ---- rendering
  const scrollLog = () => {
    log.scrollTop = log.scrollHeight;
    requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });   // again once layout settles
  };

  const addMessage = (from, html) => {
    const node = document.createElement('div');
    node.className = 'assistant-msg from-' + from;
    node.innerHTML = html;
    log.appendChild(node);
    scrollLog();
    return node;
  };

  const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Model output is untrusted: escape everything, then allow only **bold**, [n] citations and "- " lists.
  const renderAnswer = (text) => {
    const inline = (line) => escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(\d{1,2})\]/g, '<sup>[$1]</sup>');
    const out = [];
    let list = null;
    let para = [];
    const closePara = () => { if (para.length) { out.push('<p>' + para.join('<br>') + '</p>'); para = []; } };
    const closeList = () => { if (list) { out.push('<ul>' + list.join('') + '</ul>'); list = null; } };
    text.split('\n').forEach((raw) => {
      const line = raw.trim();
      const bullet = line.match(/^[-*•]\s+(.*)$/);
      if (!line) { closePara(); closeList(); return; }
      if (bullet) {
        closePara();
        (list = list || []).push('<li>' + inline(bullet[1]) + '</li>');
      } else {
        closeList();
        para.push(inline(line));
      }
    });
    closePara();
    closeList();
    return out.join('');
  };

  const addSources = (node, sources) => {
    const safe = (sources || []).filter((s) => s && /^https?:\/\//.test(s.url));
    if (!safe.length) return;
    const box = document.createElement('div');
    box.className = 'assistant-sources';
    const label = document.createElement('span');
    label.textContent = 'Sources';
    box.appendChild(label);
    const list = document.createElement('ol');
    safe.slice(0, 4).forEach((s) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = s.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = s.title || s.url;
      item.appendChild(link);
      list.appendChild(item);
    });
    box.appendChild(list);
    node.appendChild(box);
  };

  // ---- asking
  const ask = async (question) => {
    busy = true;
    sendButton.disabled = true;
    addMessage('user', '<p>' + escapeHtml(question) + '</p>');
    const typing = document.createElement('div');
    typing.className = 'assistant-typing';
    typing.setAttribute('aria-label', 'The assistant is answering');
    typing.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(typing);
    scrollLog();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(endpoint + '/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history: history.slice(-4) }),
        signal: controller.signal
      });
      clearTimeout(timer);
      const data = await response.json().catch(() => ({}));
      typing.remove();
      if (!response.ok) {
        addMessage('bot', '<p>' + escapeHtml(data.error || 'Something went wrong. Please try again.') + '</p>').classList.add('is-error');
      } else {
        const node = addMessage('bot', renderAnswer(String(data.answer || '')));
        if (data.refused) node.classList.add('is-refusal');
        addSources(node, data.sources);
        scrollLog();
        if (!data.refused) {
          history.push({ role: 'user', content: question }, { role: 'assistant', content: String(data.answer || '') });
        }
      }
    } catch (error) {
      typing.remove();
      addMessage('bot', '<p>The assistant is not reachable right now. Please try again later.</p>').classList.add('is-error');
    } finally {
      busy = false;
      sendButton.disabled = false;
      input.focus();
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || busy || !endpoint) return;
    input.value = '';
    input.style.height = '';
    ask(question);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  input.addEventListener('input', () => {
    input.style.height = '';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  // ---- resizing: drag the top-left corner or the left/top edge; the panel is pinned bottom-right
  const SIZE_KEY = 'travels-assistant-size';
  const MIN_W = 300;
  const MIN_H = 360;
  const compact = window.matchMedia('(max-width: 620px)');
  const limits = () => ({ w: window.innerWidth - 48, h: window.innerHeight - 120 });

  const applySize = (w, h) => {
    const max = limits();
    panel.style.width = Math.round(Math.max(MIN_W, Math.min(w, max.w))) + 'px';
    panel.style.height = Math.round(Math.max(MIN_H, Math.min(h, max.h))) + 'px';
  };

  const saveSize = () => {
    try {
      localStorage.setItem(SIZE_KEY, JSON.stringify({ w: panel.offsetWidth, h: panel.offsetHeight }));
    } catch (error) { /* storage unavailable: size just isn't remembered */ }
  };

  const resetSize = () => {
    panel.style.width = '';
    panel.style.height = '';
    try { localStorage.removeItem(SIZE_KEY); } catch (error) { /* ignore */ }
  };

  const restoreSize = () => {
    if (compact.matches) { panel.style.width = ''; panel.style.height = ''; return; }
    try {
      const saved = JSON.parse(localStorage.getItem(SIZE_KEY) || 'null');
      if (saved && saved.w && saved.h) applySize(saved.w, saved.h);
    } catch (error) { /* ignore a bad or unreadable value */ }
  };

  assistant.querySelectorAll('.assistant-resize').forEach((handle) => {
    const edge = handle.dataset.edge;
    handle.addEventListener('pointerdown', (event) => {
      if (compact.matches || event.button !== 0) return;
      event.preventDefault();
      try { handle.setPointerCapture(event.pointerId); } catch (error) { /* window listeners still track it */ }
      const start = { x: event.clientX, y: event.clientY, w: panel.offsetWidth, h: panel.offsetHeight };
      assistant.classList.add('is-resizing');
      const move = (e) => applySize(
        edge === 'top' ? start.w : start.w + (start.x - e.clientX),
        edge === 'left' ? start.h : start.h + (start.y - e.clientY)
      );
      const stop = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
        window.removeEventListener('pointercancel', stop);
        assistant.classList.remove('is-resizing');
        saveSize();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
    });
  });

  const corner = assistant.querySelector('.assistant-resize[data-edge="corner"]');
  corner.addEventListener('dblclick', resetSize);
  corner.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 60 : 20;
    const delta = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[event.key];
    if (!delta) return;
    event.preventDefault();
    applySize(panel.offsetWidth + delta[0], panel.offsetHeight + delta[1]);
    saveSize();
  });

  window.addEventListener('resize', () => {
    if (panel.style.width) applySize(panel.offsetWidth, panel.offsetHeight);
  });

  // ---- open / close
  const setOpen = (open) => {
    assistant.dataset.open = String(open);
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Close the TRAVELS assistant' : 'Ask about TRAVELS');
    if (!open) return;
    restoreSize();
    if (!log.childElementCount) {
      addMessage('bot', '<p>Hi! Ask me anything about TRAVELS &mdash; the data we are collecting, the event levels, the collection platform, or the program&rsquo;s sites and partners.</p>');
    }
    window.setTimeout(() => input.focus(), 0);
  };

  launcher.setAttribute('aria-label', 'Ask about TRAVELS');
  launcher.addEventListener('click', () => setOpen(panel.hidden));
  closeButton.addEventListener('click', () => { setOpen(false); launcher.focus(); });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      launcher.focus();
    }
  });

  // Without a reachable service there is nothing to offer, so the launcher stays hidden.
  findService().then((base) => {
    if (!base) return;
    endpoint = base;
    assistant.hidden = false;
  });
}
