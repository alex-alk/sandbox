import BaseComponent from '../BaseComponent.js'
import './ReviewForm.js';
import './ReviewList.js'

export default class ProductDisplay extends BaseComponent {
    static get observedAttributes() {
        return ['premium'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'premium') {
            console.log('premium changed')
        }
    }

    render() {
        this.innerHTML = `
            <div class="product-display">
    <div class="product-container">
      <div class="product-image">    
        <img id="v-img">
      </div>
      <div class="product-info">
        <h1 id="v-title"></h1>
        <p id="v-inStock"></p>
        <p id="v-shipping"></p>
        <ul id="v-details"></ul>
        <div 
            class="color-circle"
            id="v-variants"
        >
        </div>
        <button
            id="v-btn"
            class="button" 
        >
          Add to cart
        </button>
      </div>
    </div>
    <review-list></review-list>
    <review-form></review-form>
  </div>`
        
        // ------- define elements here ----------------
        const $product = this.querySelector('#v-title')
        const $img = this.querySelector('#v-img')
        const $inStockText = this.querySelector('#v-inStock')
        const $shipping = this.querySelector('#v-shipping')
        const $details = this.querySelector('#v-details')
        const $variants = this.querySelector('#v-variants')
        const $btn = this.querySelector('#v-btn')
        const $reviewList = this.querySelector('review-list');
        // --------------------------------------------------

        const product = 'Socks'
        const brand = 'Vue Mastery'
        $product.textContent = product + ' ' + brand

        const socksGreenImage = 'assets/images/socks_green.jpeg'
        const socksBlueImage = 'assets/images/socks_blue.jpeg'

        if (this.getAttribute('premium')) {
            $shipping.textContent = 'Shipping: Free'
        } else {
            $shipping.textContent = 'Shipping: 2.99'
        }

        const details = ['50% cotton', '30% wool', '20% polyester']
        for (const detail of details) {
            const li = document.createElement('li')
            li.textContent = detail
            $details.append(li)
        }

        const variants = [
            { id: 2234, color: 'green', image: socksGreenImage, quantity: 50 },
            { id: 2235, color: 'blue', image: socksBlueImage, quantity: 0 },
        ]

        for (const index in variants) {
            const clone = $variants.cloneNode(true)
            clone.style.backgroundColor = variants[index].color
            clone.addEventListener('mouseover', () => updateVariant(index))
            $variants.insertAdjacentElement('beforebegin', clone)
        }
        $variants.remove()

        function updateVariant(index) {
            $img.src = variants[index].image

            const inStock = variants[index].quantity > 0
            if (inStock) {
                $inStockText.textContent = 'In Stock'
                $btn.classList.remove('disabledButton')
                $btn.removeAttribute('disabled')
            } else {
                $inStockText.textContent = 'Out of stock'
                $btn.classList.add('disabledButton')
                $btn.setAttribute('disabled', '')
            }
            
        }
        updateVariant(0)

        $btn.addEventListener('click', addToCart)
        function addToCart() {
            this.dispatchEvent(new CustomEvent('add-to-cart', {
                bubbles: true
            }));
        }
        const reviews = []
        const addReview = (review) => {
            reviews.push(review)
            $reviewList.reviews = reviews;
        }

        this.addEventListener('review-submitted', (event) => {
            addReview(event.detail)
        });
        
    }
}
customElements.define('product-display', ProductDisplay);