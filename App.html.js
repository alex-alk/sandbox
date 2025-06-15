import {product } from "./App.js";

const image = './assets/images/socks_green.jpeg'

const html = 
`<div class="nav-bar"></div>
    <div class="product-display">
    <div class="product-container">
        <div class="product-image">    
            <img src="${ image }">
        </div>
        <div class="product-info">
            <h1>${ product }</h1>
        </div>
    </div>
</div>
`

export default html