export class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    this.model.subscribe(state => {
      this.view.render(state);
      this.view.bindActions(this);
    });
  }
}
