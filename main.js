const bindings = {};

export function init(component) {
    const all = component.querySelectorAll('[v-text], [v-bind\\:src], [v-if]');

    for (const el of all) {
        const directives = [
            { attr: 'v-text', key: el.getAttribute('v-text') },
            { attr: 'v-bind:src', key: el.getAttribute('v-bind:src') },
            { attr: 'v-if', key: el.getAttribute('v-if') }
        ];

        for (const { attr, key } of directives) {
            if (!key) {
                continue
            }

            // init
            if (!bindings[key]) {
                bindings[key] = {}
            }
            if (!bindings[key][attr]) {
                bindings[key][attr] = []
            }

            // add binding
            bindings[key][attr].push(el);
        }
    }

  console.log('bindings:', bindings);
}

export const state = new Proxy({},
    {
        set(target, variableName, value) {
            target[variableName] = value;

            // Update all bound elements
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

            if (bindings[variableName]['v-for']) {
                for (const el of bindings[variableName]['v-for']) {
                    // ia elementul
                    // daca nu are elid
                    // genereaza
                    // daca parintele are elemente cu elid, compara cu array
                    // syncronizeaza

                }
            }

      return true;
    }
  }
);

export function ref(variableName, value) {
  state[variableName] = value;
  return state[variableName];
}

// const array = ['a', 'b']

// state.text = text
// state.array = array

// setInterval(function () {
//     state.text++

//     console.log(state.text, text)
// }, 1000);

// foreach el
// if attr
// process each
//



// function div(text) {
//   const el = document.createElement('div');
//   el.textContent = text;
//   el.a = function(child) {
//     this.appendChild(child);
//     return this; // return parent for chaining
//   };
//   return el;
// }

// function ul(texts) {
//   const el = document.createElement('ul');

//   for (const text of texts) {
//     el.append(li(text))
//   }

//   el.a = function(child) {
//     this.appendChild(child);
//     return this; // return parent for chaining
//   };
//   return el;
// }

// function li(text) {
//   const el = document.createElement('li');
//   el.textContent = text;
//   el.a = function(child) {
//     this.appendChild(child);
//     return this; // return parent for chaining
//   };
//   return el;
// }

// function updateUl(ulElement, texts) {
//   ulElement.innerHTML = ''; // clear current children
//   for (const text of texts) {
//     ulElement.appendChild(li(text));
//   }
// }

// setInterval(function () {
//     texts.pop()
//     updateUl(ule, texts);
//     console.log(texts)
// }, 1000);


//export default component;


