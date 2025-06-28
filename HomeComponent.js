
import { ref, init } from './main.js';
import { ProductDisplay } from './components/ProductDisplay.js';
import './router-link.js';

export function HomeComponent() {

const html = `
<div class="nav-bar"></div>
<nav>
      <router-link to="/">Home</router-link>
      <router-link to="/about">About</router-link>
    </nav>
<div class="cart" v-text="cart">Cart({{ cart.length }})</div>
<template v-component="productDisplay" @add-to-cart="updateCart"></template>
`

const cart = ref([])
const premium = ref(true)

const productDisplay =  ProductDisplay(premium)

const updateCart = (id) => {
  console.log('Update Cart')
  cart.value.push(id)
}

const template = document.createElement('template')
template.innerHTML = html
const component = template.content

init(component, { cart, premium, productDisplay, updateCart }, 'home')

return component
}