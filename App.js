import {createButton, createDiv, createDivWithClass, createImg, createDivWithText, createH1, createText} from './button.js'

{/* <div class="nav-bar"></div>
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
    </div> */}

  Element.prototype.cappend = function (...children) {
  this.append(...children);
  return this;
};

const html = `
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
</div>
`

const app = document.getElementById('app')

let text = createText('abc')
let cart = createText('(0)')

app
  .appendChild(createDivWithClass('nav-bar'))

app
    .appendChild(createDiv('cart', cart))

app
  .appendChild(createDivWithClass('product-display'))
  .appendChild(createDivWithClass('product-container'))
  .append(
    createDivWithClass('product-image').cappend(createImg('./assets/images/socks_green.jpeg')), 
    createDivWithClass('product-info').cappend(createH1('', text), createButton('Add to cart', () => {alert('aaa')}))
)



//   .appendChild(reateDivWithClass('product-image'))
//   .appendChild(createImg('./assets/images/socks_green.jpeg'))

// app
//   .appendChild(createDivWithClass('product-info'))
//   .appendChild(createH1('', text))

  

// let container = createDivWithClass('product-display');

// let text = createText('abc');

// container
//   .appendChild(createDivWithClass('product-contaiener'))
//   .appendChild(createDivWithClass('product-info'))
//   .appendChild(createH1('', text))
//   .appendChild(createButton('click', () => {text.textContent = 'def'}))




// app.append(container);