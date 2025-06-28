import { ref, init, computed, defineEmits } from '../main.js'
import { ReviewForm } from './ReviewForm.js'
import { ReviewList } from './ReviewList.js'

export function ProductDisplay(premium = {}) {

const html = `
<div class="product-display">
    <div class="product-container">
      <div class="product-image">    
        <img v-bind:src="image">
      </div>
      <div class="product-info">
        <h1 v-text="title">{{ title }}</h1>
        <p v-if="inStock">In Stock</p>
        <p v-else>Out of Stock</p>
        <p v-text="shipping">Shipping: {{ shipping }}</p>
        <ul>
          <li v-for="detail in details">{{ detail }}</li>
        </ul>
        <div 
          v-for="(variant, index) in variants" 
          :key="variant.id"
          @mouseover="updateVariant(index)"
          class="color-circle"
          :style="{ backgroundColor: variant.color }"
        >
        </div>
        <button
          class="button" 
          :class="{ disabledButton: !inStock }"
          :disabled="!inStock"
          v-on:click="addToCart"
        >
          Add to cart
        </button>
      </div>
    </div>
    <template v-component="reviewList"></template>
    <template v-component="reviewForm" @review-submitted="addReview"></template>
  </div>
`

const socksGreenImage = './assets/images/socks_green.jpeg'
const socksBlueImage = './assets/images/socks_blue.jpeg'

const product = ref('Socks')
const brand = ref('Vue Mastery')

const selectedVariant = ref(0)
  
const details = ref(['50% cotton', '30% wool', '20% polyester'])

const variants = ref([
  { id: 2234, color: 'green', image: socksGreenImage, quantity: 50 },
  { id: 2235, color: 'blue', image: socksBlueImage, quantity: 0 },
])

const title = computed(() => {
  return brand.value + ' ' + product.value
})

const image = computed(() => {
    return variants.value[selectedVariant.value].image
})

const inStock = computed(() => {
  return variants.value[selectedVariant.value].quantity > 0
})

const emit = defineEmits(['add-to-cart'], 'ProductDisplay')
const addToCart = () => {
    emit('add-to-cart', variants.value[selectedVariant.value].id)
}

const updateVariant = (index) => {
    selectedVariant.value = index
}

const shipping = computed(() => {
  if (premium.value) {
    return 'Free'
  }
  else {
    return 2.99
  }
})

const reviewForm =  ReviewForm()

const reviews = ref([])

const addReview = (review) => {
    reviews.value.push(review)
}

const reviewList = ReviewList(reviews)


const template = document.createElement('template')
template.innerHTML = html
const component = template.content

init(component, {
    product, image, inStock, details, variants, 
    addToCart, brand, title, updateVariant, shipping, reviewForm, addReview, reviewList
}, 'ProductDisplay')

return component;
}
