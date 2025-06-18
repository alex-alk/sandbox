export const state = new Proxy({}, {
  set(target, variableName, value) {
    target[variableName] = value;

    

    return true;
  }
});


export function ref(variableName, value) {
    state[variableName] = value;
  return {
    get value() {
      return state[variableName];
    },
    set value(val) {
      state[variableName] = val;
    }
  };
}

const bindings = {};

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

      if (bindings[variableName]) {

        // Handle v-for updates with cloning and event listeners on clones
        if (bindings[variableName]['v-for']) {
            for (const el of bindings[variableName]['v-for']) {
            const elid = el.getAttribute('elid');
            const attribute = el.getAttribute('v-for');
            const array = attribute.split('::');
            const size = array.length;

            if (!elid) {
                // Remove any previously generated clones if necessary
                // (Optional improvement: Implement cleanup here)

                for (const valueText of value) {
                const clone = el.cloneNode(true);

                // Set text content depending on v-for key
                if (size === 1) {
                    clone.textContent = valueText;
                }
                if (size === 2) {
                    clone.textContent = valueText[array[size - 1]];
                }

                // Attach event listeners for all v-on:* attributes on the clone
                for (const attr of clone.attributes) {
                    if (attr.name.startsWith('v-on:')) {
                    const eventName = attr.name.split(':')[1];
                    const handlerName = attr.value;

                        console.log(state, handlerName, state[handlerName])
                    if (handlerName && state[handlerName]) {

                        clone.addEventListener(eventName, state[handlerName]);
                    }
                    }
                }

                el.after(clone);
                }

                el.remove();
            } else {
                // TODO: handle elements with elid (if you need)
            }
            }
        }

        // Handle v-text binding
        if (bindings[variableName]['v-text']) {
            for (const el of bindings[variableName]['v-text']) {
              el.textContent = value;
            }
        }

        // Handle v-bind:src
        if (bindings[variableName]['v-bind:src']) {
            for (const el of bindings[variableName]['v-bind:src']) {
            el.src = value;
            }
        }

        // Handle v-on:click for original (non-cloned) elements
        if (bindings[variableName]['v-on:click']) {
            for (const el of bindings[variableName]['v-on:click']) {
            el.onclick = value;
            }
        }

        // Handle v-on:mouseover for original elements
        if (bindings[variableName]['v-on:mouseover']) {
            for (const el of bindings[variableName]['v-on:mouseover']) {
            el.onmouseover = value;
            }
        }

        // Handle v-if directive (show/hide)
        if (bindings[variableName]['v-if']) {
            for (const el of bindings[variableName]['v-if']) {
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
        }
        }

    }
  }

  console.log('bindings:', bindings);
}

