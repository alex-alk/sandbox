import { reactive, bindReactive,  defineEmits, getState, computed, ref, updateText, updateTexts, updateBinds, createEls, addEvent } from "../main.js";

export default function ReviewList(reviews) {

const templ = `
  <div class="review-container">
    <h3>Reviews:</h3>
    <ul>
      <li v-for="reviews">
      <span v-text="review.name"></span>
      <br>
      <span v-text="review.content"></span>
      </li>
    </ul>
  </div>`

const templateEl = document.createElement('template');
templateEl.innerHTML = templ.trim(); // trim() avoids stray whitespace
const component = templateEl.content



//updateText({review}, component)

//bindReactive(review, component)

createEls({reviews}, component);

return component;

}