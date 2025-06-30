import { Sidebar } from './Sidebar.js'
import { TopbarComp } from './TopbarComp.js'

export class Dashboard {

    getElement() {
        const html =  `
<div class="layout-wrapper layout-static">
    <top-bar></top-bar>
    <side-bar></side-bar>
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