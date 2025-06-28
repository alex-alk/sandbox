// router.js
import { ref, effect } from './main.js';

export const base = "/js/sandbox";

// 1️⃣ Reactive current route
export const currentRoute = ref(window.location.pathname.replace(base, "") || "/");

// Listen to browser navigation
window.addEventListener('popstate', () => {
  currentRoute.value = window.location.pathname.replace(base, "") || "/";
});

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

export function resolveMatched(routes, urlPath) {
  const segments = urlPath.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  const matched = [];

  let currentRoutes = routes;

  // If segments is empty (e.g. urlPath = '/'), manually push matching child routes with path '/'
  if (segments.length === 0) {
    // Find root route
    const rootRoute = currentRoutes.find(r => r.path === '/');
    if (rootRoute) {
      matched.push(rootRoute);
      // Check children for path '/'
      const childRoute = (rootRoute.children || []).find(r => r.path === '/');
      if (childRoute) {
        matched.push(childRoute);
      }
    }
    return matched;
  }

  // For non-root paths, existing logic:
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const record = currentRoutes.find(r => r.path === segment);
    if (!record) break;
    matched.push(record);
    currentRoutes = record.children || [];
  }

  return matched;
}




export function resolveMatched_(routes, urlPath) {
  const segments = urlPath
    .replace(/^\/|\/$/g, '')   // trim leading/trailing slash
    .split('/')
    .filter(Boolean);

  const matched = [];
  let currentRoutes = routes;
  let prefix = '';

  for (let i = 0; i <= segments.length; i++) {
    const segment = segments[i] || '';
    // Try to find a matching route
    const record =
      currentRoutes.find(r => (r.path === segment) || (i === 0 && r.path === '/')) ||
      currentRoutes.find(r => r.path === '*');

    if (!record) break;
    matched.push(record);

    // Prepare for next level
    prefix += '/' + segment;
    currentRoutes = record.children || [];
  }

  return matched;
}