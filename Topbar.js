import BaseComponent from './BaseComponent.js'
import './components/ProductDisplay.js';

export default class Topbar extends BaseComponent {
    render() {
        this.innerHTML = `
<div class="layout-topbar">
    <div class="layout-topbar-logo-container">
        <!--button class="layout-menu-button layout-topbar-action">
            <i class="pi pi-bars"></i>
        </button-->
        <a aria-current="page" 
            href="/PHP/psihometric/public/" 
            class="router-link-active router-link-exact-active layout-topbar-logo"
        >
            <img src="assets/images/logo.png">
            <span>TravelFuse</span>
        </a>
    </div>
    <div class="layout-topbar-actions"></div>
</div>
`

        

    }
}
customElements.define('top-bar', Topbar);