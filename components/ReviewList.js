import BaseComponent from '../BaseComponent.js'

export default class ReviewList extends BaseComponent {
    set reviews(value) {
        this._reviews = value;
        this.render();
    }

    get reviews() {
        return this._reviews || [];
    }

    render() {
        this.innerHTML = `
            <div class="review-container">
                <h3>Reviews:</h3>
                <ul id="v-ul"></ul>
            </div>
            `;

        updateList(this.reviews, this)

        function updateList(reviews, comp) {
            const $ul = comp.querySelector('#v-ul');
            if (!$ul) return;

            $ul.innerHTML = '';

            for (const review of reviews) {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${review.name} gave this ${review.rating} stars</span><br/>
                    <span>"${review.review}"</span>
                `;
                $ul.appendChild(li);
            }
        }
    }
}
customElements.define('review-list', ReviewList);
