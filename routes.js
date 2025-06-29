import HomePage from './HomePage.js'
import AboutPage from './AboutPage.js'
import NotFoundPage from './NotFoundPage.js'
import Router from './Router.js'

// Define routes map
const routes = {
  '/': HomePage,
  '/about': AboutPage,
  '/404': NotFoundPage,
};

// Change this to your app's base path, e.g. '/app' or '/' if root
const BASE_PATH = '/js/sandbox';

// Instantiate and start router
const router = new Router(routes, BASE_PATH);

window.addEventListener('DOMContentLoaded', () => {
  router.start();
});
