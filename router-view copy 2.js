import { effect } from './main.js';
import { currentRoute, resolveMatched } from './router.js';

class RouterView extends HTMLElement {
  constructor() {
    super();
    this._routes = null;
  }

    set routes(routes) {
        this._routes = routes;
        if (this.isConnected) {
            this._setup();
        }
    }

    _findParentRouterView() {
  let parent = this.parentNode;
  while (parent) {
    if (parent instanceof RouterView && parent._routes) {
      return parent;
    }
    parent = parent.parentNode || parent.host;
  }
  return null;
}


  connectedCallback() {
  if (!this._routes) {
    const parentRouterView = this._findParentRouterView();
    if (parentRouterView) {
      this._routes = parentRouterView._routes;
    }
  }
  if (this._routes) this._setup();
}


  _setup() {
    const depth = this._computeDepth();

    effect(() => {
      this.innerHTML = '';

      const matched = resolveMatched(this._routes, currentRoute.value);
      const record = matched[depth] || matched[matched.length - 1];

      if (record && record.component) {
        const comp = record.component();
        this.appendChild(comp);
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
