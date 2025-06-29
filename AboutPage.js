import BaseComponent from './BaseComponent.js'

export default class AboutPage extends BaseComponent {
  render() {
    this.innerHTML = `
      <h1>About Page</h1>
      <p>This is the about page.</p>
      <a href="/js/sandbox">Go to Home</a>
    `;
  }
}
customElements.define('about-page', AboutPage);