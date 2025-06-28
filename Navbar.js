import { reactive, init, computed, defineEmits } from './main.js'

export function Navbar() {
  const html= `
  <div>Navbar</div>
  `;

const template = document.createElement('template')
template.innerHTML = html
const component = template.content

init(component, {

},'navbar')

  return component;
}
