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
  const prompts = document.getElementById('assistant-prompts');
  const closeButton = assistant.querySelector('.assistant-close');

  // Fixed question set. Every answer is written from what this page states.
  const topics = [
    {
      question: 'What will TRAVELS collect?',
      answer: '<p>Four linked data products. <strong>Raw</strong> &mdash; camera images, LiDAR point clouds, GNSS/IMU, vehicle state, and the full ROS bag behind them. <strong>Processed</strong> &mdash; localization, trajectories, vehicle state and driving commands, aligned on the image timestamp. <strong>Infrastructure</strong> &mdash; an HD map of road geometry, markings, surface condition and signs. <strong>Event</strong> &mdash; clips cut from the first two and graded by severity.</p><p>The plan is 28 paired rural runs: 7 fixed routes &times; 2 seasons &times; 2 repetitions. Every automated run is driven again by a human over the same route as its baseline.</p>',
      jump: { label: 'Open Part 01', target: 'collection-plan', tab: 'tab-raw' }
    },
    {
      question: 'What counts as an event?',
      answer: '<p>Three rising levels. <strong>01 Degradation</strong> &mdash; performance or confidence declines while automated driving stays engaged. <strong>02 Warning</strong> &mdash; the system alerts the driver or requests a takeover, automation still engaged. <strong>03 Disengagement</strong> &mdash; automated driving ends, by system fallback or by driver intervention.</p><p>Most of a drive sits below all three. The technical appendix lists the derived variables used to grade an event, with a reference for each.</p>',
      jump: { label: 'Open the event record', target: 'collection-plan', tab: 'tab-event' }
    },
    {
      question: 'How does it compare with existing datasets?',
      answer: '<p>Part 02 sets it beside ADS for Rural America and Automated Vehicles for All.</p><p>The clearest gap is road surface: both existing programs document marked, good pavement, and we add marked degraded, unmarked degraded, and unmarked unpaved. We also record all three event levels, where ADS for Rural America documents two and Automated Vehicles for All one.</p>',
      jump: { label: 'Open the comparison', target: 'existing-data' }
    },
    {
      question: 'What platform and sensors do you use?',
      answer: '<p>Two AV stacks. <strong>DataSpeed</strong> handles drive-by-wire, CAN and vehicle-state feedback, and the interface between autonomy software and the vehicle. <strong>Autoware</strong> handles sensing, perception, localization, planning, control and diagnostics.</p><p>Three vehicle types &mdash; shuttle, SUV and sedan. The recorded sensors are cameras, LiDAR, GNSS/IMU, V2X and vehicle state; there is no radar on the platform.</p>',
      jump: { label: 'Open Part 03', target: 'data-pipeline' }
    },
    {
      question: 'When can I download the data?',
      answer: '<p>Not yet &mdash; the TRAVELS collection is still in preparation, so the comparison table lists no data link for it.</p><p>The two programs it is measured against are open today: ADS for Rural America and Automated Vehicles for All both publish data portals, linked from the first row of that table.</p>',
      jump: { label: 'Open the comparison', target: 'existing-data' }
    }
  ];

  const asked = new Set();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scrollLog = () => { log.scrollTop = log.scrollHeight; };

  const addMessage = (from, html) => {
    const node = document.createElement('div');
    node.className = 'assistant-msg from-' + from;
    node.innerHTML = html;
    log.appendChild(node);
    scrollLog();
    return node;
  };

  const goTo = (jump) => {
    if (jump.tab) {
      const tab = document.getElementById(jump.tab);
      if (tab) tab.click();
    }
    const target = document.getElementById(jump.target);
    if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const renderPrompts = () => {
    prompts.textContent = '';
    topics.forEach((topic) => {
      if (asked.has(topic.question)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = topic.question;
      button.addEventListener('click', () => ask(topic));
      prompts.appendChild(button);
    });
  };

  const ask = (topic) => {
    asked.add(topic.question);
    addMessage('user', '<p>' + topic.question + '</p>');
    renderPrompts();

    const typing = document.createElement('div');
    typing.className = 'assistant-typing';
    typing.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(typing);
    scrollLog();

    window.setTimeout(() => {
      typing.remove();
      const node = addMessage('bot', topic.answer);
      if (topic.jump) {
        const link = document.createElement('button');
        link.type = 'button';
        link.className = 'jump';
        link.textContent = topic.jump.label + ' ↓';
        link.addEventListener('click', () => goTo(topic.jump));
        node.appendChild(link);
        scrollLog();
      }
      if (asked.size === topics.length) {
        addMessage('bot', '<p>That is everything I have on hand. The page itself carries the detail behind each answer.</p>');
      }
    }, reduceMotion ? 0 : 420);
  };

  const setOpen = (open) => {
    assistant.dataset.open = String(open);
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Close the dataset assistant' : 'Ask about this dataset');
    if (open) {
      if (!log.childElementCount) {
        addMessage('bot', '<p>Ask about the TRAVELS rural AV dataset &mdash; what we are collecting, how it compares, and what records it.</p>');
      }
      window.setTimeout(() => {
        const first = prompts.querySelector('button');
        (first || closeButton).focus();
      }, 0);
    }
  };

  launcher.setAttribute('aria-label', 'Ask about this dataset');
  renderPrompts();

  launcher.addEventListener('click', () => setOpen(panel.hidden));
  closeButton.addEventListener('click', () => { setOpen(false); launcher.focus(); });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      launcher.focus();
    }
  });
}
