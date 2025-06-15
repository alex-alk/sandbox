export class Router {
  constructor(routes, rootId) {
    this.routes = routes;
    this.rootId = rootId;
    window.addEventListener("hashchange", () => this.route());
    this.route(); // initial
  }

  route() {
    const path = location.hash.slice(1) || "/";
    const appRoot = document.getElementById(this.rootId);
    appRoot.innerHTML = "";

    const ControllerClass = this.routes[path];
    if (ControllerClass) {
      new ControllerClass(appRoot);
    } else {
      appRoot.innerHTML = `<h1>404 Not Found</h1>`;
    }
  }
}
