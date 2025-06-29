import BaseComponent from './BaseComponent.js'

export default class NotFoundPage extends BaseComponent {
  render() {
    this.innerHTML = `
      <h1>404 - Not Found</h1>
      <a href="${router._addBase('/')}">Go to Home</a>
    `;
  }
}
customElements.define('notfound-page', NotFoundPage);