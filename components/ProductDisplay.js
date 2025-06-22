
import { ref, init, computed, defineEmits } from '../main.js'

export default function ProductDisplay(premium = {}) {

const html = `

`

const socksGreenImage = './assets/images/socks_green.jpeg';
const socksBlueImage = './assets/images/socks_blue.jpeg';

const details = ref(['50% cotton', '30% wool', '20% polyester'])
const variants = ref([
  { id: 2234, color: 'green' , image: socksGreenImage, quantity: 50},
  { id: 2235, color: 'blue' , image: socksBlueImage, quantity: 0},
])




const template = document.createElement('template')
template.innerHTML = html
const component = template.content

init(component, {
  addReview,
    updateVariant,
    shipping,
  title, 
  selectedVariant, 
  product, image, 
  inStock, 
  details, variants, 
  addToCart, 
  buttonClass, 
  inStockComputed,
  reviewForm,
  reviewList
}, 'ProductDisplay')

return component;


}
