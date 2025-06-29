import { TopbarComp } from './TopbarComp.js'

export class Dashboard {

    getElement() {
        const html =  `
<div class="layout-wrapper layout-static">
    <top-bar></top-bar>
</div>
`
        const template = document.createElement('template')
        template.innerHTML = html
        const component = template.content

        const $topbar = component.querySelector('top-bar')
        $topbar.replaceWith((new TopbarComp).getElement())

        return component
    }
    
}