import { reactive, bindReactive,  defineEmits, getState, computed, ref, updateText, updateTexts, updateBinds, createEls, addEvent } from "../main.js";

export default function ReviewForm() {

const templ = `
  <form class="review-form" v-on:submit="onSubmit">
    <h3>Leave a review</h3>
    <label for="name">Name:</label>
    <input id="name" v-model="review.name">

    <label for="review">Review:</label>      
    <textarea id="review" v-model="review.content"></textarea>

    <label for="rating">Rating:</label>
    <select id="rating" v-model.number="review.rating">
      <option>5</option>
      <option>4</option>
      <option>3</option>
      <option>2</option>
      <option>1</option>
    </select>

    <input class="button" type="submit" value="Submit">
  </form>`

const templateEl = document.createElement('template');
templateEl.innerHTML = templ.trim(); // trim() avoids stray whitespace
const component = templateEl.content

const review = reactive({
  name: '',
  content: '',
  rating: null
})

bindReactive(review, component)

const root = component.firstElementChild;
const emit = defineEmits([
    'review-submitted'
], root)

const onSubmit = function(e) {
    e.preventDefault()

    const productReview = {
        name: review.name,
        content: review.content,
        rating: review.rating
    }
    emit('review-submitted', productReview)

    review.name = ''
    review.content = ''
    review.rating = null
}

const methods = {
    onSubmit
}

addEvent('submit', methods, component)

return component;

}