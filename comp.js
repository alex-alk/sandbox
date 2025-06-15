export default function Comp() {

    const cart = 1;

    return `
<div class="nav-bar"></div>
<div class="cart">${cart}</div>
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
        
        <button id="btn" class="button">Add to cart</button>
        
    </div>
    </div>
</div>`
}

export function bindCounterListEvents() {
    const btn = document.getElementById('btn')
    btn.addEventListener('click', () => {
      alert('aaaa')
    });

}
