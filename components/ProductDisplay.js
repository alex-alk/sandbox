
import {ref, init} from '../main.js'

export default function ProductDisplay(text = {}) {
    const html = `
    <div class="product-display">
    <div class="product-container">
      <div class="product-image">    
        <img v-bind:src="image">
      </div>
      <div class="product-info">
        <h1 v-text="title"></h1>
        <p v-if="inStock">In Stock</p>
        <p v-else>Out of Stock</p>
        <p>Shipping: {{ shipping }}</p>
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
  </div>`

const socksGreenImage = './assets/images/socks_green.jpeg';
const socksBlueImage = './assets/images/socks_blue.jpeg';

const variants = ref('variants', [
  { id: 2234, color: 'green', image: socksGreenImage , quantity: 50},
  { id: 2235, color: 'blue', image: socksBlueImage , quantity: 0},
])

const selectedVariant = ref(0)

const image = ref(() => variants.value[selectedVariant.value].image)

const title = ref('Socks')

const state = { image, title };








const template = document.createElement('template')
template.innerHTML = html
const component = template.content.firstElementChild
init(component, state)
return component;

    







}
