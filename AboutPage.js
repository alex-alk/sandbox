import { createComponent } from "./main.js"

export class AboutPage {

    getElement() {
        const html = /* html */`
<div>
    About page
</div>
`
        return createComponent(html)
    }
    
}