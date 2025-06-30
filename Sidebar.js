import { createComponent } from "./main.js"

export class Sidebar {

    getElement() {
        const html = /* html */`
<div class="layout-sidebar">
    <ul class=layout-menu>
        <li class="layout-root-menuitem">
            <div class="layout-menuitem-root-text">HOME</div>
            <ul class="layout-submenu">
                <li>
                    <a href="" class="router-link-active router-link-exact-active active-route">
                        <i class="pi pi-fw pi-home layout-menuitem-icon"></i>
                        <span class="layout-menuitem-text">Dashboard</span>
                    </a>
                </li>
            </ul>
        </li>

        <li class="layout-root-menuitem">
            <div class="layout-menuitem-root-text">Actiuni</div>
            <ul class="layout-submenu">
                <li>
                    <a href="" class="router-link-active router-link-exact-active active-route">
                        <i class="pi pi-fw pi-id-card layout-menuitem-icon"></i>
                        <span class="layout-menuitem-text">Utilizatori</span>
                    </a>
                </li>
            </ul>
        </li>
    </ul>
</div>
`
        return createComponent(html)
    }
    
}