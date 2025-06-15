

    class ImageTag extends HTMLElement {
  static get observedAttributes() {
    return ['src'];
  }

  constructor() {
    super();
    this.img = document.createElement('img');
    this.appendChild(this.img);
  }

  connectedCallback() {
    this.updateSrc();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'src') {
      this.updateSrc();
    }
  }

  updateSrc() {
    const src = this.getAttribute('src');
    if (src) {
      this.img.src = src;
    }
  }
}

customElements.define('image', ImageTag);

