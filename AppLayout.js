import { reactive, init, computed, defineEmits } from './main.js'
import { Navbar } from './Navbar.js';
 import './router-view.js';
 
export function AppLayout() {
  const html= `
  App Layout
  <router-link to="/users">Users</router-link>
  <template v-component="navbar"></template>
  <div class="layout-main">
        <router-view></router-view>
</div>
  `;

  const navbar = Navbar()

const template = document.createElement('template')
template.innerHTML = html
const component = template.content

init(component, {
    navbar
},'AppLayout')

  return component;
}
