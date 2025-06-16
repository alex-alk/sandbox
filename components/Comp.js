import { updateTexts, ref, updateText } from "../main.js";


 const templ = `
<div class="product-display">
    <div v-text="a"></div>
</div>`


const templateEl = document.createElement('template');
templateEl.innerHTML = templ.trim(); // trim() avoids stray whitespace
export const template = templateEl.content


let a = ref('aaaaaaaaaa')

const data = {
    a
}

updateTexts(data, template)


// 3. Get the DOM content
//const element = tmpl.content.firstElementChild;

// 4. Append it to the DOM (e.g. to #app)
//ocument.getElementById('app').appendChild(element);

/*
const details = ['50% cotton', '30% wool', '20% polyester']
const variants = [
    { id: 2234, color: 'green' , image: '../assets/images/socks_green.jpeg', quantity: 50},
    { id: 2235, color: 'blue' , image: '../assets/images/socks_blue.jpeg', quantity: 0},
]
const image = computed(() => state.variants[state.selectedVariant].image);

const notInStock = computed(() => {
return state.variants[state.selectedVariant].quantity > 0
})

const stock = computed(() => state.variants[state.selectedVariant].quantity > 0 ? 'In Stock' : 'Out of Stock');

updateTexts(data)
*/