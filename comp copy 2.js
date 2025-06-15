export default function Comp() {
    return `
<div class="nav-bar"></div>
<div class="cart" text-cart></div>
<div class="product-display">
    <div class="product-container">
    <div class="product-image">    
        <img src-image>
    </div>
    <div class="product-info">
        <h1 text-product></h1>
        <p text-stock></p>
        <ul>
        <li class="a" li-details></li>
        </ul>
        <div class="a" div-variants mouseover-updateImage></div>
        
        <button class="button" click-addToCart>Add to cart</button>
    </div>
    </div>
</div>`
}

const product = 'product'
    updateText({product})

    const image = './assets/images/socks_green.jpeg'
    updateSrc({image})

    const stock = 'In Stock'
    updateText({stock})

    let cart = 0
    updateText({cart})

    const details = ['50% cotton', '30% wool', '20% polyester']
    createEls('li', {details});

    const variants = [
      { id: 2234, color: 'green' , image: './assets/images/socks_green.jpeg'},
      { id: 2235, color: 'blue' , image: './assets/images/socks_blue.jpeg'},
    ]
    createEls('div', {variants}, 'color')

    const addToCart = function () {
      cart++;
      updateText({cart})
    }

    const updateImage = function(e) {
      const id = e.target.getAttribute('elid')
      const obj = variants.find(v => v.id == id);
      console.log(obj)
      updateSrc({image: obj.image})
    }

    addEvent('click', {addToCart})
    addEvent('mouseover', {updateImage})










    function addEvent(type, obj) {
      const parameterName = Object.keys(obj)[0];
      const li = document.querySelectorAll(`[${type}-${parameterName}]`);
      for (const el of li) {
        el.addEventListener(type, obj[parameterName]);
      }
    }

    function addMouseOver(obj) {
      const parameterName = Object.keys(obj)[0];
      const li = document.querySelector(`[mouseover-${parameterName}]`);
      li.addEventListener('click', obj[parameterName]);
    }


    function createEls(type, obj, key) {
      const parameterName = Object.keys(obj)[0];  // "product"
      const detailsArray = obj[parameterName];            // "product"
      
      const li = document.querySelector(`[${type}-${parameterName}]`);

      // Get parent element (likely <ul> or <ol>)
      const parent = li.parentElement;

      const attrs = [...li.attributes];

      // Remove the original <li>
      parent.removeChild(li);

      // Create and append new <li> elements for each detail
      detailsArray.forEach(detail => {
        const newLi = document.createElement(type);

        // Copy all attributes to the new <li>
        attrs.forEach(attr => {
          newLi.setAttribute(attr.name, attr.value);
        });

        if (key) {
          newLi.textContent = detail[key];
        } else {
          newLi.textContent = detail
        }
        if (detail['id']) {
          newLi.setAttribute('elid', detail['id'])
        }
        parent.appendChild(newLi);
      });
    }

    function createLis(obj) {
      const parameterName = Object.keys(obj)[0];  // "product"
      const detailsArray = obj[parameterName];            // "product"
      
      const li = document.querySelector(`[lis-${parameterName}]`);

      // Get parent element (likely <ul> or <ol>)
      const parent = li.parentElement;

      const attrs = [...li.attributes];

      // Remove the original <li>
      parent.removeChild(li);

      // Create and append new <li> elements for each detail
      detailsArray.forEach(detail => {
        const newLi = document.createElement('li');

        // Copy all attributes to the new <li>
        attrs.forEach(attr => {
          newLi.setAttribute(attr.name, attr.value);
        });

        newLi.textContent = detail;
        parent.appendChild(newLi);
      });
    }

    function updateText(obj) {
      const parameterName = Object.keys(obj)[0];  // "product"
      const text = obj[parameterName];            // "product"
      
      const el = document.querySelector(`[text-${parameterName}]`);
      if (el) {
        el.textContent = text;
      }
    }

    function updateSrc(obj) {
      const parameterName = Object.keys(obj)[0];  // "product"
      const text = obj[parameterName];            // "product"
      
      const el = document.querySelector(`[src-${parameterName}]`);
      if (el) {
        el.src = text;
      }
    }