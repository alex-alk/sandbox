import BaseComponent from '../BaseComponent.js'

export default class ReviewForm extends BaseComponent {
    render() {
        this.innerHTML = `
            <form class="review-form" id="v-form">
    <h3>Leave a review</h3>
    <label for="v-name">Name:</label>
    <input id="v-name">

    <label for="v-review">Review:</label>      
    <textarea id="v-review""></textarea>

    <label for="v-rating">Rating:</label>
    <select id="v-rating"">
      <option>5</option>
      <option>4</option>
      <option>3</option>
      <option>2</option>
      <option>1</option>
    </select>

    <input class="button" type="submit" value="Submit" id="v-btn">
  </form>`
        
        const $form = this.querySelector('#v-form')
        const $name = this.querySelector('#v-name')
        const $review = this.querySelector('#v-review')
        const $rating = this.querySelector('#v-rating')

        $form.onsubmit = (event) => {
            event.preventDefault();

            this.dispatchEvent(new CustomEvent('review-submitted', {
                bubbles: true,
                detail: { name: $name.value, review: $review.value, rating: $rating.value}
            }));
            
        };
        
    }
}
customElements.define('review-form', ReviewForm);