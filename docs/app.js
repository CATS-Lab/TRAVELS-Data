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
