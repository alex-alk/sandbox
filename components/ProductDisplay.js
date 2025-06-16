import { defineEmits, getState, computed, ref, updateText, updateTexts, updateBinds, createEls, addEvent } from "../main.js";

export default function ProductDisplay(premium) {

const templ = `
<div class="product-display">
    <div class="product-container">
        <div class="product-image">    
            <img v-bind:src="image">
        </div>
        <div class="product-info">
            <h1 v-text="product"></h1>
            <p v-text="stock"></p>
            <p v-text="shipping"></p>
            <ul>
                <li class="a" li-details></li>
            </ul>
            <div style-variants="background-color" class="color-circle" div-variants v-on:mouseover="updateVariant"></div>

            <button 
            v-bind:disabled="notInStock" 
            class="button"
            v-bind:class="{disabledButton: notInStock}"
            v-on:click="addToCart">Add to cart</button>
        </div>
    </div>
</div>`

const templateEl = document.createElement('template');
templateEl.innerHTML = templ.trim(); // trim() avoids stray whitespace
const productDisplay = templateEl.content

const details = ['50% cotton', '30% wool', '20% polyester']
const variants = [
    { id: 2234, color: 'green' , image: './assets/images/socks_green.jpeg', quantity: 50},
    { id: 2235, color: 'blue' , image: './assets/images/socks_blue.jpeg', quantity: 0},
]

function updateStyleFromArray(obj, value, template) {

let component = template ?? document;

      const parameterName = Object.keys(obj)[0];  // "product"
      const text = obj[parameterName];            // "product"
      const els = component.querySelectorAll(`[style-${parameterName}]`);

      for (const el of els) {
          const id = el.getAttribute('elid')
          const variant = variants[id]
          const attr = el.getAttribute(`style-${parameterName}`);


        el.style[attr] = variant[value]
      }
      
    }

   const product = 'Socks'
   const band = 'Vue Mastery'
       let selectedVariant = 0;

const data = {
      product: product + ' ' + band,
      
      cart: ref(0),
      
      selectedVariant,
      //image,
      variants,
      premium
}

const state = getState(data)

const shipping = computed(() => state.premium ? 'Shipping: Free' : 'Shipping: 2.99' )
updateText({shipping}, productDisplay)

const image = computed(() => state.variants[state.selectedVariant].image);

const notInStock = computed(() => {
return state.variants[state.selectedVariant].quantity > 0
})

const stock = computed(() => state.variants[state.selectedVariant].quantity > 0 ? 'In Stock' : 'Out of Stock');

updateTexts(data, productDisplay)


const updateVariant = function(e) {
    const id = e.target.getAttribute('elid')
    // const obj = variants.find(v => v.id == id)
    // updateSrc({image: obj.image})
    state.selectedVariant = id;

}
const root = productDisplay.firstElementChild;
const emit = defineEmits(['add-to-cart'], root)

const addToCart = function () {
    emit('add-to-cart', state.variants[state.selectedVariant].id)
}


const methods = {
  updateVariant,
  addToCart,
}

  data.notInStock = notInStock;
  data.stock = stock


    
updateBinds('src', {image}, productDisplay)
updateBinds('class', data, productDisplay)
updateBinds('disabled', data, productDisplay)


createEls('li', {details}, productDisplay);
createEls('div', {variants}, productDisplay)
updateStyleFromArray({variants}, 'color', productDisplay)
addEvent('click', methods, productDisplay)
addEvent('mouseover', methods, productDisplay)

return productDisplay;

}