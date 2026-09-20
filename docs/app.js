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

document.querySelectorAll('.table-scroll, .event-lifecycle, .hero-path').forEach((region) => {
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
