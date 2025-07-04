import BaseComponent from './BaseComponent.js'
import './components/ProductDisplay.js';

export default class HomePage extends BaseComponent {
    render() {
        this.innerHTML = `
<div class="nav-bar"></div>
<a href="/js/sandbox/about">About</a>
<div class="cart" id="v-cart"></div>
<product-display add="addToCart" premium="premiumm"></product-display>`

        const $cart = this.querySelector('#v-cart')
        let cart = 0;
        $cart.textContent = `Cart (${cart})`

        function addToCart() {
            console.log('add to cart called')
            cart++
            $cart.textContent = `Cart (${cart})`
        }

        const premium = true
        
        this.addEventListener('add-to-cart', () => {
            addToCart()
        });

    }
}
customElements.define('home-page', HomePage);