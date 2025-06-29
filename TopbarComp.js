export class TopbarComp {

    getElement() {
        const html = `
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
        const template = document.createElement('template')
        template.innerHTML = html
        const component = template.content

        return component
    }
    
}