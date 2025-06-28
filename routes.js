    
import { AppLayout } from './AppLayout.js';
import { Dashboard }  from './Dashboard.js';
import { Users } from './Users.js';
//import { Login }     from './components/Login.js';

 export const routes = [
  {
    path: '/',
    component: () =>  AppLayout(),
    children: [
        {
            path: '',
            component: () =>  Dashboard(),
        },
        {
            path: 'users',
            component: () =>  Users(),
        }
    ]
  }
];