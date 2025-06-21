import { reactive, init, computed, defineEmits } from '../main.js'

export default function ReviewForm() {
  const html= `
    <form class="review-form" v-on:submit="onSubmit">
    <h3>Leave a review</h3>
    <label for="name">Name:</label>
    <input id="name" v-model="review.name">

    <label for="review">Review:</label>      
    <textarea id="review" v-model="review.content"></textarea>

    <label for="rating">Rating:</label>
    <select id="rating" v-model="review.rating">
      <option value="5">5</option>
      <option value="4">4</option>
      <option value="3">3</option>
      <option value="2">2</option>
      <option value="1">1</option>
    </select>

    <input class="button" type="submit" value="Submit">
  </form>`;

const emit = defineEmits(['review-submitted'], 'ReviewForm')

const review = reactive({
  name: '',
  content: '',
  rating: null
})

const onSubmit = (e) => {
    e.preventDefault()

    console.log(review)

    if (review.name === '' || review.content === '' || review.rating === null) {
      alert('Review is incomplete. Please fill out every field.')
      return
    }

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

const template = document.createElement('template')
template.innerHTML = html
const component = template.content

init(component, {
  review,
    onSubmit
},'ReviewForm')

  return component;
}
