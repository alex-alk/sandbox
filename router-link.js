import { push, currentRoute } from './router.js';

class RouterLink extends HTMLElement {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
  }
  connectedCallback() {
    this.addEventListener('click', this.onClick);
    this.style.cursor = 'pointer';
  }
  disconnectedCallback() {
    this.removeEventListener('click', this.onClick);
  }
  onClick(e) {
    e.preventDefault();
    const to = this.getAttribute('to');
    if (to != null) push(to);
  }
}

customElements.define('router-link', RouterLink);
