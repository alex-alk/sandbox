import { createComponent } from "./main.js"
import { Table } from "./Table.js"

export class Users {

    getElement() {
        const html = /* html */`
<div class="card">
    <div class="font-semibold text-xl mb-4">Utilizatori</div>
    <users-table></users-table>
</div>
`
        const component = createComponent(html)

        const $table = component.querySelector('users-table')
        $table.replaceWith((new Table).getElement())
        
        return component
    }
    
}