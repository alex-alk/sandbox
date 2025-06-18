const bindings = {}

export const state = new Proxy({}, {
  set(target, variableName, value) {
    target[variableName] = value;
    // this runs when state changes
    console.log('state set', variableName)

    if (Object.keys(bindings).length !== 0) {
        if (bindings[variableName]) {

            if (bindings[variableName]['v-for']) {
                for (const el of bindings[variableName]['v-for']) {
                    const elid = el.getAttribute('elid');

                    const attribute = el.getAttribute('v-for');
                    const array = attribute.split('::')
                    const size = array.length

                    if (!elid) {
                        // value will be data array
                        let i = 0
                        for (const valueText of value) {
                            const clone = el.cloneNode(true)

                            if (size === 1){
                                clone.textContent = valueText
                            }
                            if (size === 2){
                                clone.textContent = valueText[array[size - 1]]
                            }
                            clone.setAttribute('elid', i)
                            i++

                            for (const attr of clone.attributes) {
                                if (attr.name.startsWith('v-on:')) {
                                    const eventName = attr.name.split(':')[1];
                                    const handlerName = attr.value;
            
                                    if (handlerName && state[handlerName]) {
                                        clone.addEventListener(eventName, state[handlerName]);
                                    }
                                }
                            }
                            el.after(clone);
                        }
                        el.remove()
                    } else {

                    }
                    // ia elementul
                    // daca nu are elid
                    // genereaza
                    // daca parintele are elemente cu elid, compara cu array
                    // syncronizeaza

                }
            }

            if (bindings[variableName]['v-text']) {
                for (const el of bindings[variableName]['v-text']) {
                    el.textContent = value;
                }
            }

            if (bindings[variableName]['v-bind:src']) {
                for (const el of bindings[variableName]['v-bind:src']) {
                    el.src = value;
                }
            }

            if (bindings[variableName]['v-on:click']) {
                for (const el of bindings[variableName]['v-on:click']) {
                    el.onclick = value;
                }
            }

            // if (bindings[variableName]['v-on:mouseover']) {
                
            //     for (const el of bindings[variableName]['v-on:mouseover']) {
            //         console.log(el, value)
            //         el.onmouseover = value
            //     }
            // }

            if (bindings[variableName]['v-if']) {
                for (const el of bindings[variableName]['v-if']) {
                    if (!value) {
                        el.style.display = 'none';
                    } else {
                        console.log(el)
                        el.style.removeProperty('display')
                    }
                    // get the adjacent element
                    const next = el.nextElementSibling;
                    if (next.hasAttribute('v-else')) {
                        if (value) {
                            next.style.display = 'none';
                        } else {
                            next.style.removeProperty('display')
                        }
                    }
                }
            }
        }
    }

    return true;
  }
});

export function ref(variableName, value) {
    state[variableName] = value;
  return {
    get value() {
        console.log('ref get', variableName)
      return state[variableName];
    },
    set value(val) {
        console.log('ref set', variableName)
      state[variableName] = val;
    }
  };
}

export function init(component) {
    const all = component.querySelectorAll('[v-text], [v-bind\\:src], [v-if], [v-for], [v-on\\:click], [v-on\\:mouseover]');
    
    for (const el of all) {
        const directives = [
            { attr: 'v-text', key: el.getAttribute('v-text') },
            { attr: 'v-bind:src', key: el.getAttribute('v-bind:src') },
            { attr: 'v-if', key: el.getAttribute('v-if') },
            { attr: 'v-for', key: el.getAttribute('v-for') },
            { attr: 'v-on:click', key: el.getAttribute('v-on:click') },
            { attr: 'v-on:mouseover', key: el.getAttribute('v-on:mouseover') }
        ];

        // attr = v-bind:src, key = variable name, el = element that has this (can be more)
        for (const { attr, key } of directives) {
            if (!key) continue;

            const mainKey = key.split('::')[0]; // strip suffix like ::color

            if (!bindings[mainKey]) {
                bindings[mainKey] = {};
            }
            if (!bindings[mainKey][attr]) {
                bindings[mainKey][attr] = [];
            }

            bindings[mainKey][attr].push(el);

            const value = state[mainKey];

            if (attr === 'v-bind:src') {
                el.src = value;
            }

            if (attr === 'v-text') {
                el.textContent = value;
            }

            if (attr === 'v-if') {
                if (!value) {
                    el.style.display = 'none';
                } else {
                    el.style.removeProperty('display');
                }

                // Handle v-else sibling
                const next = el.nextElementSibling;
                if (next && next.hasAttribute('v-else')) {
                    if (value) {
                        next.style.display = 'none';
                    } else {
                        next.style.removeProperty('display');
                    }
                }
            }

            if (attr === 'v-on:click') {
                el.onclick = value;
            }

            if (attr === 'v-for') {
                
                const elid = el.getAttribute('elid');

                const attribute = el.getAttribute('v-for');
                const array = attribute.split('::')
                const size = array.length

                if (!elid) {
                    // value will be data array
                    let i = 0
                    for (const valueText of value) {
                        const clone = el.cloneNode(true)

                        if (size === 1){
                            clone.textContent = valueText
                        }
                        if (size === 2){
                            clone.textContent = valueText[array[size - 1]]
                        }
                        clone.setAttribute('elid', i)
                        i++

                        for (const attr of clone.attributes) {
                            if (attr.name.startsWith('v-on:')) {
                                const eventName = attr.name.split(':')[1];
                                const handlerName = attr.value;
        
                                if (handlerName && state[handlerName]) {
                                    clone.addEventListener(eventName, state[handlerName]);
                                }
                            }
                        }
                        el.after(clone);
                    }
                    el.remove()
                } else {

                }
                // ia elementul
                // daca nu are elid
                // genereaza
                // daca parintele are elemente cu elid, compara cu array
                // syncronizeaza

                
            }

        }
    }

    console.log(bindings)
}