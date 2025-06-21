
import {ref, init, computed} from '../main.js'

export default function ProductDisplay(text = {}) {

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
        <ul>
          <li v-for="detail in details">{{ detail }}</li>
        </ul>
        <div 
          v-for="(variant, index) in variants" 
          v-on:mouseover="updateVariant(index)"
          class="color-circle"
          v-bind:style="{ backgroundColor: variant.color }"
        ></div>
        <button
          class="button" 
            v-bind:class="buttonClass"
          v-on:click="addToCart"
          v-bind:disabled="inStockComputed"
        >
          Add to cart
        </button>
      </div>
    </div>
  </div>`

const socksGreenImage = './assets/images/socks_green.jpeg';
const socksBlueImage = './assets/images/socks_blue.jpeg';

const details = ref(['50% cotton', '30% wool', '20% polyester'])
const variants = ref([
  { id: 2234, color: 'green' , image: socksGreenImage, quantity: 50},
  { id: 2235, color: 'blue' , image: socksBlueImage, quantity: 0},
])

const addToCart = () => {
    cart.value += 1
}

const selectedVariant = ref(0)

const updateVariant = (index) => {
  selectedVariant.value = index
}
const product = ref('Socks')
const brand = ref('Vue Mastery')

const title = computed(() => {
  return brand.value + ' ' + product.value
})

const image = computed(() => {
  return variants.value[selectedVariant.value].image
})

const inStock = computed(() => {
  return variants.value[selectedVariant.value].quantity > 0
})



const buttonClass = computed(() => ({
  disabledButton: !inStock.value
}))

const inStockComputed = computed(() => !inStock.value)





const template = document.createElement('template')
template.innerHTML = html
const component = template.content

init(component, {
    updateVariant,
  title, 
  selectedVariant, 
  product, image, 
  inStock, 
  details, variants, 
  addToCart, 
  buttonClass, 
  inStockComputed})

return component;


}
