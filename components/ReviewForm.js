import { ref, init, computed, defineEmits } from '../main.js'

export default function ReviewForm() {
  const html= `
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

const emit = defineEmits(['review-submitted'], 'ReviewForm')

const review = {
  name: '',
  content: '',
  rating: null
}

const onSubmit = (e) => {
    e.preventDefault()

    // if (review.name === '' || review.content === '' || review.rating === null) {
    //   alert('Review is incomplete. Please fill out every field.')
    //   return
    // }

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
    onSubmit
},'ReviewForm')

  return component;
}
