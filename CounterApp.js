import { Model } from "./model.js";
import { View } from "./view.js";
import { Controller } from "./controller.js";

export class CounterApp extends Controller {
  constructor(root) {
    const model = new Model({ count: 0 });
    const view = new View(root, (state) => `
      <h1>Counter Page</h1>
      <h2>Count: ${state.count}</h2>
      <button data-action="click:increment">+</button>
      <button data-action="click:decrement">-</button>
      <p><a href="#/about">Go to About</a></p>
    `);
    super(model, view);
    this.model.notify();
  }

  increment() {
    this.model.set("count", this.model.get("count") + 1);
  }

  decrement() {
    this.model.set("count", this.model.get("count") - 1);
  }
}
