import BaseComponent from './BaseComponent.js'

export default class HomePage extends BaseComponent {
    render() {
        this.innerHTML = `
            <div class="nav-bar"></div>
             <a href="/js/sandbox/about">Go to About</a>
            <div class="cart" id="v-cart"></div>
            <div class="product-display">
                <div class="product-container">
                <div class="product-image">    
                    <img id="v-img">
                </div>
                <div class="product-info">
                    <h1 id="v-product"></h1>
                    <p id="v-inStock"></p>
                </div>
                </div>
                <button class="button" id="v-btn">Add to cart</button>
            </div>`
        
        const product = this.querySelector('#v-product')
        product.textContent = 'abx'

        const inStock = true
        const inStockText = this.querySelector('#v-inStock')

        if (inStock) {
            inStockText.textContent = 'In Stock'
        } else {
            inStockText.textContent = 'Out of stock'
        }

        const image = 'assets/images/socks_green.jpeg'
        const $img = this.querySelector('#v-img')
        $img.src = image

        const $btn = this.querySelector('#v-btn')
        $btn.addEventListener('click', addToCart)

        const $cart = this.querySelector('#v-cart')
        let cart = 0;
        $cart.textContent = `Cart (${cart})`

        function addToCart() {
            cart++
            $cart.textContent = `Cart (${cart})`
        }
        
    }
}
customElements.define('home-page', HomePage);