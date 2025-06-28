import { effect } from './main.js';
import { currentRoute, resolveMatched } from './router.js';

class RouterView extends HTMLElement {
  constructor() {
    super();
    this._routes = null;
  }

  set routes(routes) {
  console.log('Setting routes on router-view');
  this._routes = routes;
  this._setup();
}

  connectedCallback() {
  // Always call _setup; _setup will safely do nothing if routes aren't ready yet
  this._setup();
}

_setup() {
    if (!this._routes) return;

    const depth = this._computeDepth();

    effect(() => {
        this.innerHTML = '';

        const matched = resolveMatched(this._routes, currentRoute.value);
        const record = matched[depth] || matched[matched.length - 1];

        console.log('RouterView DEPTH', depth);
        console.log('Route:', currentRoute.value);
        console.log('Matched:', matched.map(r => r.path));
        console.log('Chosen route at depth', depth, ':', record?.path);

        if (record && record.component) {
            const comp = record.component();
            this.appendChild(comp);

            // Safely assign nested router-views their .routes
            requestAnimationFrame(() => {
                const nested = comp.querySelectorAll('router-view');
                nested.forEach(el => {
                    customElements.whenDefined('router-view').then(() => {
                        console.log('Setting routes on nested router-view');
                        el.routes = this._routes;
                    });
                });
            });
        }
    });
}





  _computeDepth() {
    let depth = 0;
    let parent = this.parentNode;

    while (parent) {
      if (parent.tagName === 'ROUTER-VIEW') {
        depth++;
      }
      parent = parent.parentNode || parent.host;
    }

    return depth;
  }
}

customElements.define('router-view', RouterView);
