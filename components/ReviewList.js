import { reactive, bindReactive,  defineEmits, getState, computed, ref, updateText, updateTexts, updateBinds, createEls, addEvent } from "../main.js";

export default function ReviewList(reviews) {

const templ = `
  <div class="review-container">
    <h3>Reviews:</h3>
    <ul>
      <li li-reviewss>
        <span v-text="review.name"></span>
        <br/>
        <span>"{{ review.content }}"</span>
      </li>
    </ul>
  </div>`

const templateEl = document.createElement('template');
templateEl.innerHTML = templ.trim(); // trim() avoids stray whitespace
const component = templateEl.content

const review = reactive({
  name: 'initial',
  content: '',
  rating: null
})

updateText({review}, component)

bindReactive(review, component)

const reviewss = reviews.value

createEls('li', {reviewss}, component);

return component;

}