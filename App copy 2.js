const socksGreenImage = './assets/images/socks_green.jpeg';
const socksBlueImage = './assets/images/socks_blue.jpeg';

export default {
    data: {
        product: 'Socks',
        image: socksGreenImage,
        inStock: true,
        details: ['50% cotton', '30% wool', '20% polyester'],
        variants: [
            { id: 2234, color: 'green', image: socksGreenImage },
            { id: 2235, color: 'blue', image: socksBlueImage },
        ],
        cart: 0,
        addToCart () {
            this.cart++
            this.__patch();
        },
        updateImage(image) {
            console.log(image);
            this.image = image
        }
    },
    template: `
<template>
  <div class="nav-bar"></div>
  <div class="cart">Cart({{ cart }})</div>
  <div class="product-display">
    <div class="product-container">
      <div class="product-image">    
        <img v-bind:src="image">
      </div>
      <div class="product-info">
        <h1>{{ product }}</h1>
        <p v-if="inStock">In Stock</p>
        <p v-else>Out of Stock</p>
        <ul>
          <li v-for="detail in details">{{ detail }}</li>
        </ul>
        <div
            v-for="variant in variants"
            :key="variant.id"
            @mouseover="updateImage(variant.image)"
        >
            {{ variant.color }}
        </div>
        <button class="button" v-on:click="addToCart">Add to Cart</button>
      </div>
    </div>
  </div>
</template>`
}
