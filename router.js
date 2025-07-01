export default class Router {

    constructor(routes, basePath = '') {
        this.routes = routes;
        this.basePath = basePath
        this.rootElem = document.querySelector('#app');
        this.currentLayoutPath = null;
        this.routerViewParent = null;
        // listen to history changes
        window.addEventListener('popstate', () => this.route());
    }

    // Remove base path prefix from full path to get route key
    _stripBase(path) { // path = basepath + real path
        
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

    pathToRegex(path) {
        const regex = path
            .replace(/:[^\s/]+/g, '([^/]+)')  // match dynamic segments
            .replace(/\//g, '\\/');
        return new RegExp('^' + regex + '$');
    }

    findRoute(path, routes) {
        for (const matchedRoute of routes) {
            const regex = this.pathToRegex(matchedRoute.path);
            if (regex.test(path)) {
                if (matchedRoute.children) {
                    for (const matchedChildRoute of matchedRoute.children) {
                        const childRegex = this.pathToRegex(matchedChildRoute.path);
                        if (childRegex.test(path)) {
                            return { matchedRoute, matchedChildRoute };
                        }
                    }
                } else {
                    return { matchedRoute, matchedChildRoute: null };
                }
            }

            if (matchedRoute.children) {
                for (const matchedChildRoute of matchedRoute.children) {
                    const childRegex = this.pathToRegex(matchedChildRoute.path);
                    if (childRegex.test(path)) {
                        return { matchedRoute, matchedChildRoute };
                    }
                }
            }
        }

        return { matchedRoute: null, matchedChildRoute: null };
    }

    findComponentByPath(path, routes) {
        const match = this.findRoute(path, routes);
        if (match.matchedRoute) {
            return match.matchedRoute
        }

        // fallback to 404
        const notFound = this.findRoute('/404', routes);
        return notFound ? notFound.matchedRoute.component : null;
    }

    // Match current URL to route and render component
    route() {
        const routePath = this._stripBase(location.pathname);
        const match = this.findRoute(routePath, this.routes);

        let RouteComponent = null;

        if (match.matchedRoute) {
            RouteComponent = match.matchedRoute.component;
        } else {
            const notFound = this.findRoute('/404', this.routes);
            RouteComponent = notFound ? notFound.matchedRoute.component : null;
        }

        if (!RouteComponent) {
            console.error(`No route matched for path: ${routePath}`);
            return;
        }

        const layoutPath = match.matchedRoute.path;

        if (this.currentLayoutPath !== layoutPath) {
            // 👇 re-render whole layout if layout has changed
            this.rootElem.innerHTML = '';
            const layoutEl = new RouteComponent().getElement();

            if (match.matchedChildRoute) {
                const Child = match.matchedChildRoute.component;
                const childEl = new Child().getElement();
                const parentRouterView = layoutEl.querySelector('router-view');
                this.routerViewParent = parentRouterView.parentElement
                if (parentRouterView) {
                    parentRouterView.replaceWith(childEl);
                }
            }

            this.rootElem.appendChild(layoutEl);
            this.currentLayoutPath = layoutPath; // ✅ update current layout
        } else {
            // ✅ re-use layout, just swap child content
            //const parentRouterView = this.rootElem.querySelector('router-view');
            if (!this.routerViewParent) {
                console.warn('<router-view> not found in existing layout');
                return;
            }

            if (match.matchedChildRoute) {
                const Child = match.matchedChildRoute.component;
                const childEl = new Child().getElement();
                //parentRouterView.replaceWith(childEl);
                this.routerViewParent.innerHTML = ''
                this.routerViewParent.append(childEl)
            } else {
                parentRouterView.replaceWith(document.createTextNode(''));
            }
        }
    }


    // Start the router: initial route render, listen to clicks
    start() {
        this.route();

        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            let to = link.getAttribute('href');
            if (!to) return;
            if (!to.startsWith('/')) return; // only handle absolute paths
            
            to = this.basePath + to

            // Only handle links inside the base path
            if (this.basePath === '' || to.startsWith(this.basePath + '/') || to === this.basePath) {
                e.preventDefault();
                //const realPath = this.stripBase(to);
                this.navigate(to);
            }
        });
    }
}