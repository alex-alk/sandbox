import AboutPage from './AboutPage.js'
import NotFoundPage from './NotFoundPage.js'
import Router from './Router.js'
import { Dashboard } from './Dashboard.js'
import { TopbarComp } from './TopbarComp.js'

// Define routes map
const routes = {
  '/': Dashboard,
  '/about': AboutPage,
  '/404': NotFoundPage,
};

// Change this to your app's base path, e.g. '/app' or '/' if root
const BASE_PATH = '/js/sandbox';

export function path(projectPath) {
    return BASE_PATH + projectPath
}

// Instantiate and start router
const router = new Router(routes, BASE_PATH);
window.addEventListener('DOMContentLoaded', () => {
    router.start();
});
