    
    import { Dashboard }  from './Dashboard.js';
    import { Login }     from './components/Login.js';

    export const routes = {
      '/':      () => Dashboard(),
      '/login': () => Login(),
      //'*':      () => HomeComponent()  // fallback
    };