import { init } from "../main.js";

export default function ReviewList(reviews) {

const templ = `
  <div class="review-container">
    <h3>Reviews:</h3>
    <ul>
      <li v-for="(review, index) in reviews">
        <span>{{ review.name }} gave this {{ review.rating }} stars</span>
        <br/>
        <span>"{{ review.content }}"</span>
      </li>
    </ul>
  </div>`


  
const templateEl = document.createElement('template');
templateEl.innerHTML = templ.trim(); // trim() avoids stray whitespace
const component = templateEl.content

init(component, { reviews }, 'ReviewList')

return component;

}