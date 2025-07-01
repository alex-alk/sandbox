import { Sidebar } from './Sidebar.js'
import { TopbarComp } from './TopbarComp.js'

export class AppLayout {

    getElement() {
        const html =  /*html*/`
<div class="layout-wrapper layout-static">
    <top-bar></top-bar>
    <side-bar></side-bar>
    <div class="layout-main-container">
        <div class="layout-main">
            <router-view></router-view>
        </div>
    </div>
</div>
`
        const template = document.createElement('template')
        template.innerHTML = html
        const component = template.content

        const $topbar = component.querySelector('top-bar')
        $topbar.replaceWith((new TopbarComp).getElement())

        const $sidebar = component.querySelector('side-bar')
        $sidebar.replaceWith((new Sidebar).getElement())

        return component
    }
    
}