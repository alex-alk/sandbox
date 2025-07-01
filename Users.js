import { createComponent } from "./main.js"

export class Users {

    getElement() {
        const html = /* html */`
<div class="card">
    <div class="font-semibold text-xl mb-4">Utilizatori</div>
    <div class="p-datatable p-component p-datatable-hoverable p-datatable-gridlines"></div>
</div>
`
        return createComponent(html)
    }
    
}