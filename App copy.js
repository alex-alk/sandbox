//import { ref } from './myvue';
//import html from './App.html.js';

function App() {

    const product = 'Socks';

    const image = './assets/images/socks_green.jpeg'

    let inStock = 'Out of Stock';

    const inventory = 0;

    const details = ['50% cotton', '30% wool', '20% polyester']

    const variants = [
        { id: 2234, color: 'green' },
        { id: 2235, color: 'blue' }
    ]

    if (inventory > 10) {
        inStock = 'In Stock'
    } else if (inventory <= 10 && inventory > 0) {
        inStock = 'Almost sold out'
    }

    let cart = 0

    function addToCart() {
        console.log('abc');
        cart++;
    }

    const elements = document.querySelectorAll('[x-click]');

    console.log(elements);

    elements.forEach(el => {
        console.log('ok');
        const fnName = el.getAttribute('x-click');
        el.addEventListener('click', fnName);
    });

    //el.addEventListener('click', addToCart)

    function render() {
        const html = `
<div>{{ constant }}</div>
<div>{{ variable }}</div>
<button></button>
 `
        return html;
    }
}
export default App

