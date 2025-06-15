export class View {
  constructor(root, templateFn) {
    this.root = root;
    this.templateFn = templateFn;
  }

  render(state) {
    this.root.innerHTML = this.templateFn(state);
  }

  bindActions(controller) {
    this.root.querySelectorAll("[data-action]").forEach(el => {
      const [event, method] = el.getAttribute("data-action").split(":");
      el.addEventListener(event, e => controller[method](e));
    });
  }
}
