import { defineEmits, getState, computed, ref, updateText, updateTexts, updateBinds, createEls, addEvent, updateIf } from "../main.js";
    import ReviewForm from './ReviewForm.js'
    import ReviewList from './ReviewList.js'

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
                <li class="a" v-for="details"></li>
            </ul>
            
            <div 
                v-for="(variant, index) in variants" 
                :key="variant.id"
                @mouseover="updateVariant(index)"
                class="color-circle"
                :style="{ backgroundColor: variant.color }"
            >

            <button
                class="button" 
                :class="{ disabledButton: !inStock }"
                :disabled="!inStock"
                v-on:click="addToCart"
            >Add to cart</button>
        </div>
    </div>
    <div v-if="reviews.length > 0" v-component="reviewList"></div>
    <div v-component="reviewForm" v-on:review-submitted="addReview"></div>
</div>`

const templateEl = document.createElement('template');
templateEl.innerHTML = templ.trim(); // trim() avoids stray whitespace
const productDisplay = templateEl.content

const reviews = ref([

])

updateIf({reviews}, productDisplay)


const templates = productDisplay.querySelectorAll('[v-component=reviewForm]');
for (const template of templates) {
    template.append(ReviewForm());
}
const templatesf = productDisplay.querySelectorAll('[v-component=reviewList]');
for (const template of templatesf) {
    template.append(ReviewList(reviews));
    
}

const addReview = (review) => {
    console.log('addReview is called')
    reviews.value.push(review)
    console.log(review)
}


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

        console.log(variants, id, value, el)
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

const inStock = computed(() => {
  return state.variants[state.selectedVariant].quantity > 0
})

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
  addReview
}

  data.notInStock = notInStock;
  data.stock = stock
  data.inStock = inStock
  data.image = image


    
//updateBinds({image}, productDisplay)
updateBinds(data, productDisplay)
// updateBinds('disabled', data, productDisplay)


createEls({details}, productDisplay);
createEls({variants}, productDisplay)
//updateStyleFromArray({variants}, 'color', productDisplay)
addEvent('click', methods, productDisplay)
addEvent('mouseover', methods, productDisplay)
addEvent('review-submitted', methods, productDisplay)

return productDisplay;

}