import { defineEmits, getState, computed, ref, updateText, updateTexts, updateBinds, createEls, addEvent, updateIf, watchEffect } from "../main.js";
import ReviewForm from './ReviewForm.js';
import ReviewList from './ReviewList.js';

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
          <li v-for="details"></li>
        </ul>
        <div 
          v-for="(variant, index) in variants" 
          :key="variant.id"
          @mouseover="updateVariant"
          class="color-circle"
          :style="{ backgroundColor: variant.color }"
          elid="{{index}}"
        ></div>
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
  </div>`;

  const templateEl = document.createElement('template');
  templateEl.innerHTML = templ.trim();
  const productDisplay = templateEl.content;

  // Reviews ref
  const reviews = ref([]);

  updateIf({reviews}, productDisplay);

  // Append review components
  productDisplay.querySelectorAll('[v-component=reviewForm]').forEach(el => el.append(ReviewForm()));
  productDisplay.querySelectorAll('[v-component=reviewList]').forEach(el => el.append(ReviewList(reviews)));

  const addReview = (review) => {
    reviews.value.push(review);
  };

  const details = ['50% cotton', '30% wool', '20% polyester'];
  const variants = [
    { id: 2234, color: 'green', image: './assets/images/socks_green.jpeg', quantity: 50 },
    { id: 2235, color: 'blue', image: './assets/images/socks_blue.jpeg', quantity: 0 },
  ];

  let selectedVariant = ref(0);

  const product = 'Socks';
  const band = 'Vue Mastery';

  const data = {
    product: product + ' ' + band,
    cart: ref(0),
    selectedVariant,
    variants,
    premium
  };

  // Computed properties
  const shipping = computed(() => premium ? 'Shipping: Free' : 'Shipping: 2.99');
  const image = computed(() => variants[selectedVariant.value].image);
  const inStock = computed(() => variants[selectedVariant.value].quantity > 0);
  const stock = computed(() => inStock.value ? 'In Stock' : 'Out of Stock');

  data.shipping = shipping;
  data.image = image;
  data.inStock = inStock;
  data.stock = stock;
  data.reviews = reviews;
  data.details = details;

  const state = getState(data);

  // Update variant handler — note: event target has elid attribute set to index
  function updateVariant(event) {
    const index = event.target.getAttribute('elid');
    if (index !== null) {
      selectedVariant.value = Number(index);
    }
  }

  // Emits setup
  const root = productDisplay.firstElementChild;
  const emit = defineEmits(['add-to-cart'], root);

  function addToCart() {
    if (inStock.value) {
      emit('add-to-cart', variants[selectedVariant.value].id);
    }
  }

  // Setup bindings and events with reactive updates

  // Text bindings update reactively
  updateTexts({
    product: state.product,
    stock: state.stock,
    shipping: state.shipping
  }, productDisplay);

  // Bind image src reactively
  updateBinds({ image: state.image }, productDisplay);

  // Create detail list items
  createEls({ details }, productDisplay);

  // Create variant circles
  // Because v-for here is an element, we replace manually:
  const variantContainers = productDisplay.querySelectorAll('[v-for="variants"]');
  variantContainers.forEach(container => {
    container.innerHTML = '';
    variants.forEach((variant, index) => {
      const div = document.createElement('div');
      div.className = 'color-circle';
      div.style.backgroundColor = variant.color;
      div.setAttribute('elid', index);
      div.addEventListener('mouseover', updateVariant);
      container.appendChild(div);
    });
  });

  // Update stock-related UI reactively with watchEffect
  watchEffect(() => {
    // Button enabled/disabled
    const button = productDisplay.querySelector('.button');
    if (!button) return;
    if (inStock.value) {
      button.disabled = false;
      button.classList.remove('disabledButton');
    } else {
      button.disabled = true;
      button.classList.add('disabledButton');
    }
  });

  // Add event listeners
  addEvent('click', { addToCart }, productDisplay);
  addEvent('review-submitted', { addReview }, productDisplay);

  return productDisplay;
}
