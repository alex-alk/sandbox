import { AboutPage } from './AboutPage.js'
import NotFoundPage from './NotFoundPage.js'
import Router from './Router.js'
import { Dashboard } from './Dashboard.js'
import { AboutPagee } from './AboutPagee.js'
import { AppLayout } from './AppLayout.js'
import { Users } from './Users.js'

// Define routes map
const routes = [
    {
        path: '/',
        component:  AppLayout,
        children: [
            {
                path : '/',
                component: Dashboard
            },
            {
                path : '/about',
                component: AboutPage
            },
            {
                path: '/users',
                component : Users
            }
        ]
    },
    {
        path: '/about',
        component : AboutPagee
    },
    {
        path: '/404',
        component: NotFoundPage,
    }
];

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
