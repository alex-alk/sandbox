export class Model {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = [];
  }

  set(key, value) {
    this.state[key] = value;
    this.notify();
  }

  get(key) {
    return this.state[key];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }
}
