// router.js
import { ref, effect } from './main.js';

// 1️⃣ Reactive current route
export const currentRoute = ref(window.location.pathname);

// Listen to browser navigation
window.addEventListener('popstate', () => {
  currentRoute.value = window.location.pathname;
});

export const base = "/js/sandbox";

export function push(path) {
  const full = base + path;
  history.pushState({}, "", full);
  currentRoute.value = window.location.pathname.replace(base, "") || "/";
}

// 3️⃣ <router-link> component
export function RouterLinkComponent() {
  const html = `
    <a href="#" to="" class="router-link">@slot</a>
  `;
  const template = document.createElement('template');
  template.innerHTML = html;
  const el = template.content.firstElementChild;

  function onClick(e) {
    e.preventDefault();
    const to = el.getAttribute('to');
    push(to);
  }

  // Bind click
  init(el, { onClick }, 'RouterLink');
  return el;
}

// 4️⃣ <router-view> component
export function RouterViewComponent(routes) {
  const html = `<div class="router-view"></div>`;
  const template = document.createElement('template');
  template.innerHTML = html;
  const el = template.content.firstElementChild;

  effect(() => {
    const route = window.location.pathname.replace(base, "") || "/";
    const View = routes[route] || routes["*"];
    el.innerHTML = '';
    if (View) el.appendChild(View());
  });

  return el;
}
