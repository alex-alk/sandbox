export default class Router {
  /**
   * @param {Object} routes - Map of route paths to component classes
   * @param {string} basePath - Base URL path, e.g. "/app"
   */
  constructor(routes, basePath = '/') {
    this.routes = routes;
    // Normalize basePath: remove trailing slash except for "/"
    this.basePath = basePath === '/' ? '' : basePath.replace(/\/$/, '');
    this.rootElem = document.querySelector('app-root');
    window.addEventListener('popstate', () => this.route());
  }

  // Remove base path prefix from full path to get route key
  _stripBase(path) {
    if (this.basePath && path.startsWith(this.basePath)) {
      const stripped = path.slice(this.basePath.length) || '/';
      return stripped.startsWith('/') ? stripped : '/' + stripped;
    }
    return path;
  }

  // Add base path prefix to a route path
  _addBase(path) {
    if (path === '/') return this.basePath || '/';
    return this.basePath + path;
  }

  // Navigate to a route programmatically
  navigate(path) {
    const fullPath = this._addBase(path);
    if (fullPath !== location.pathname) {
      history.pushState({}, '', fullPath);
      this.route();
    }
  }

  // Match current URL to route and render component
  route() {
    const fullPath = location.pathname;
    const routePath = this._stripBase(fullPath);

    const RouteComponent = this.routes[routePath] || this.routes['/404'];

    if (!RouteComponent) {
      console.error(`No route matched for path: ${routePath}`);
      return;
    }

    this.rootElem.innerHTML = '';
    const el = new RouteComponent();
    this.rootElem.appendChild(el);
  }

  // Start the router: listen to clicks, initial route render
  start() {
    document.body.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;
      if (!href.startsWith('/')) return; // only handle absolute paths

      // Only handle links inside the base path
      if (this.basePath === '' || href.startsWith(this.basePath + '/') || href === this.basePath) {
        e.preventDefault();
        const routePath = this._stripBase(href);
        this.navigate(routePath);
      }
    });

    this.route();
  }
}