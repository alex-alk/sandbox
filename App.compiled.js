import { ref } from './mini-vue.js'
const socksGreenImage = './assets/images/socks_green.jpeg';


const product = ref('Socks')
const image = ref(socksGreenImage)
const inStock = true

const details = ref(['50% cotton', '30% wool', '20% polyester'])

const variants = ref([
{ id: 2234, color: 'green' },
{ id: 2235, color: 'blue' },
])

const cart = ref(0)


export function createApp(target) {
  const el0 = document.createElement('div');
  el0.className = 'nav-bar';
  el0.setAttribute('class', "nav-bar");
  target.appendChild(el0);
  const el1 = document.createElement('div');
  el1.className = 'cart';
  el1.setAttribute('class', "cart");
  target.appendChild(el1);
  const el2 = document.createTextNode('');
  el1.appendChild(el2);
  function upd3() { el2.textContent = `"Cart("${cart.value}")"`; }
  if (cart.subscribe) cart.subscribe(upd3);
  upd3();
  const el3 = document.createElement('div');
  el3.className = 'product-display';
  el3.setAttribute('class', "product-display");
  target.appendChild(el3);
  const el4 = document.createElement('div');
  el4.className = 'product-container';
  el4.setAttribute('class', "product-container");
  el3.appendChild(el4);
  const el5 = document.createElement('div');
  el5.className = 'product-image';
  el5.setAttribute('class', "product-image");
  el4.appendChild(el5);
  const el6 = document.createElement('img');
  el6.src = typeof image === 'object' ? image.value : image;
  if (image.subscribe) image.subscribe(v => el6.src = v);
  el5.appendChild(el6);
  const el7 = document.createElement('div');
  el7.className = 'product-info';
  el7.setAttribute('class', "product-info");
  el4.appendChild(el7);
  const el8 = document.createElement('h1');
  el7.appendChild(el8);
  const el9 = document.createTextNode('');
  el8.appendChild(el9);
  function upd10() { el9.textContent = `${product.value}`; }
  if (product.subscribe) product.subscribe(upd10);
  upd10();
if (inStock) {
  const el10 = document.createElement('p');
  el7.appendChild(el10);
  const el11 = document.createTextNode('');
  el10.appendChild(el11);
  function upd12() { el11.textContent = `"In Stock"`; }
  upd12();
}
else {
  const el12 = document.createElement('p');
  el7.appendChild(el12);
  const el13 = document.createTextNode('');
  el12.appendChild(el13);
  function upd14() { el13.textContent = `"Out of Stock"`; }
  upd14();
}
  const el14 = document.createElement('ul');
  el7.appendChild(el14);
for (const detail of details.value) {
  const el15 = document.createElement('li');
  el14.appendChild(el15);
  const el16 = document.createTextNode('');
  el15.appendChild(el16);
  function upd17() { el16.textContent = `${detail}`; }
  upd17();
}
for (const variant of variants.value) {
  const el17 = document.createElement('div');
  el17.setAttribute(':key', "variant.id");
  el7.appendChild(el17);
  const el18 = document.createTextNode('');
  el17.appendChild(el18);
  function upd19() { el18.textContent = `"\r\n          "${variant.color.value}"\r\n        "`; }
  if (variant.color.subscribe) variant.color.subscribe(upd19);
  upd19();
}
  const el19 = document.createElement('button');
  el19.className = 'button';
  el19.setAttribute('class', "button");
  el7.appendChild(el19);
  const el20 = document.createTextNode('');
  el19.appendChild(el20);
  function upd21() { el20.textContent = `"Add to Cart"`; }
  upd21();
  return {};
}