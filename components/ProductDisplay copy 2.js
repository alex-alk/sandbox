
import {ref, init} from '../main.js'

export default function ProductDisplay(text = {}) {
    const html = `
    <div class="product-info">
        <h1 v-text="product"></h1>
        <h1 v-text="product"></h1>
        <h1 v-text="product1"></h1>
    </div>`


    const product1 = ref('Socks1')

    if (text.value) {
        const product = ref(text.value)
        
        const state = { product, product1 };
        
        const template = document.createElement('template')
        template.innerHTML = html
        const component = template.content.firstElementChild
        
        init(component, state)
          return component;
    } else {
        const product = ref('Socks')
        
        const state = { product, product1 };
        
        const template = document.createElement('template')
        template.innerHTML = html
        const component = template.content.firstElementChild
        
        init(component, state)
          return component;
    }
    







}
