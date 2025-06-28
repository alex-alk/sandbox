
import { ref, init } from './main.js';
import { ProductDisplay } from './components/ProductDisplay.js';
import './router-link.js';

export function Users() {

const html = `
Users
`


const template = document.createElement('template')
template.innerHTML = html
const component = template.content

init(component, {  }, 'users')

return component
}