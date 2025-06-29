export default class Router {

    constructor(routes, basePath = '') {
        this.routes = routes;
        this.basePath = basePath
        this.rootElem = document.querySelector('#app');
        // listen to history changes
        window.addEventListener('popstate', () => this.route());
    }

    // Remove base path prefix from full path to get route key
    stripBase(path) { // path = basepath + real path
        
        if (this.basePath && path.startsWith(this.basePath)) {
            const stripped = path.slice(this.basePath.length);
            return stripped;
        }
        return path;
    }

    // Navigate to a route programmatically
    navigate(fullPath) {
        if (fullPath !== location.pathname) {
            history.pushState({}, '', fullPath);
            this.route();
        }
    }

    // Match current URL to route and render component
    route() {
        const routePath = this.stripBase(location.pathname);

        const RouteComponent = this.routes[routePath] || this.routes['/404'];

        if (!RouteComponent) {
            console.error(`No route matched for path: ${routePath}`);
            return;
        }

        this.rootElem.innerHTML = '';
        const el = (new RouteComponent).getElement();
        this.rootElem.appendChild(el);
    }

    // Start the router: initial route render, listen to clicks
    start() {
        this.route();

        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const to = link.getAttribute('href');
            if (!to) return;
            if (!to.startsWith('/')) return; // only handle absolute paths

            // Only handle links inside the base path
            if (this.basePath === '' || to.startsWith(this.basePath + '/') || to === this.basePath) {
                e.preventDefault();
                //const realPath = this.stripBase(to);
                this.navigate(to);
            }
        });
    }
}