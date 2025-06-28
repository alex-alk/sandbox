import { effect } from './main.js';
import { currentRoute } from './router.js';

class RouterView extends HTMLElement {
  constructor() {
    super();
    this._routes = {};
    this._base = '/js/sandbox';
  }

  // Let the app supply the route map
  set routes(map) {
    this._routes = map;
    this._setup();
  }

  _setup() {
    effect(() => {
      // Clear any previous view
      this.innerHTML = '';

      // Strip off the base prefix from the browser URL
      let path = currentRoute.value;
      if (path.startsWith(this._base)) {
        path = path.slice(this._base.length) || '/';
      }

      // Lookup and mount the right component, or fallback
      const viewFactory = this._routes[path] || this._routes['*'];
      if (viewFactory) {
        const comp = viewFactory();
        this.appendChild(comp);
      }
    });
  }
}

customElements.define('router-view', RouterView);
