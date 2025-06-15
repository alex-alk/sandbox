class Component {
  constructor(props) {
    this.props = props;
    this.el = this.render();
  }

  render() {
    return document.createElement("div");
  }

  mount(container) {
    container.appendChild(this.el);
  }
}