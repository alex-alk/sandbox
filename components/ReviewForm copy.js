import {
  defineEmits,
  getState,
  ref,
  watchEffect,
  addEvent
} from "../main.js";

export default function ReviewForm() {
  const templ = `
    <form class="review-form" v-on:submit="onSubmit">
      <h3>Leave a review</h3>

      <label for="name">Name:</label>
      <input id="name" name="name">

      <label for="review">Review:</label>      
      <textarea id="review" name="content"></textarea>

      <label for="rating">Rating:</label>
      <select id="rating" name="rating">
        <option value="">Select</option>
        <option>5</option>
        <option>4</option>
        <option>3</option>
        <option>2</option>
        <option>1</option>
      </select>

      <input class="button" type="submit" value="Submit">
    </form>`;

  const templateEl = document.createElement('template');
  templateEl.innerHTML = templ.trim();
  const component = templateEl.content;
  const root = component.firstElementChild;

  // Reactive state
  const review = getState({
    name: ref(''),
    content: ref(''),
    rating: ref(null)
  });

  // Emit setup
  const emit = defineEmits(['review-submitted'], root);

  // Form submit
  function onSubmit(e) {
    e.preventDefault();

    if (!review.name || !review.content || !review.rating) {
      alert('Please fill out all fields.');
      return;
    }

    const productReview = {
      name: review.name,
      content: review.content,
      rating: review.rating
    };

    emit('review-submitted', productReview);

    // Reset fields
    review.name = '';
    review.content = '';
    review.rating = null;
  }

  const methods = { onSubmit };
  addEvent('submit', methods, component);

  // Bind inputs manually (v-model behavior)
  const nameInput = component.querySelector('#name');
  const contentInput = component.querySelector('#review');
  const ratingInput = component.querySelector('#rating');

  // Input listeners to update state
  nameInput.addEventListener('input', e => {
    review.name = e.target.value;
  });

  contentInput.addEventListener('input', e => {
    review.content = e.target.value;
  });

  ratingInput.addEventListener('change', e => {
    review.rating = Number(e.target.value);
  });

  // Watch state and update DOM inputs (in case state changes programmatically)
  watchEffect(() => {
    if (nameInput.value !== review.name) nameInput.value = review.name;
    if (contentInput.value !== review.content) contentInput.value = review.content;
    if (ratingInput.value !== String(review.rating)) ratingInput.value = review.rating || '';
  });

  return component;
}
