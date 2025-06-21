// reactive() converts the object deeply: nested objects are also wrapped with reactive() when accessed. 
// It is also called by ref() internally when the ref value is an object.
// Unlike a ref which wraps the inner value in a special object, reactive() makes an object itself reactive
// it only works for object types

export function reactive(obj) {
  return new Proxy(obj, {
    get(target, key) {
      track(target, key)
      return target[key]
    },
    set(target, key, value) {
      target[key] = value
      trigger(target, key)
    }
  })
}

// function dep(target, key) {

//     const track = () => {
//         if (activeEffect) {
//             const effects = getSubscribersForProperty(target, key)
//                 //effects.add(activeEffect)
//         }

//         return link
//     }

//     return {
//         track
//     }
// }

export function ref(initialValue) {
    //const dep = dep()

    const refObject = {
        _value: initialValue,
        get value() {
            track(this, 'value')
            //track(refObject, 'value')
            //console.log('getting ', this._value)
            return this._value
        },
        set value(newValue) {
            this._value = newValue
            //console.log('setting ', newValue)
            trigger(refObject, 'value')
        },
        //subscribe(fn) {
           //subscribers.add(fn)
        //}
        //,_subscribers: subscribers
    }
  return refObject
}

let activeEffect = null

export function effect(fn) {
  const wrappedEffect = () => {
    activeEffect = wrappedEffect;
    fn();
    activeEffect = null;
  };
  wrappedEffect(); // run once to register
}

function track(target, key) {
    if (activeEffect) {
        const effects = getSubscribersForProperty(target, key)
        effects.add(activeEffect)
    } else {
        return
    }
}

// Effect subscriptions are stored in a global WeakMap<target, Map<key, Set<effect>>> data structure. 
// If no subscribing effects Set was found for a property (tracked for the first time), 
// it will be created. 

const targetMap = new WeakMap();

function getSubscribersForProperty(target, key) {
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  let deps = depsMap.get(key);
  if (!deps) {
    deps = new Set();
    depsMap.set(key, deps);
  }

  return deps;
}

function trigger(target, key) {

    const effects = getSubscribersForProperty(target, key)
    effects.forEach((effect) => effect())
}

export function computed(getter) {
    return {
        get value() {
            return getter()
        }
    }
}

export function ref_(initialValue) {
    let _value = initialValue;
    const subscribers = new Set();

    return {
        get value() {
            return _value;
        },
        set value(newVal) {
            if (_value !== newVal) {
                _value = newVal;
                // Notify all subscribers about the change
                subscribers.forEach(fn => fn());
            }
        },
        subscribe(fn) {
            subscribers.add(fn);
        }
    };
}


const bindings = {}
export function init(component, data) {

    const directives = ['v-text', 'v-component', 'v-bind:src', 'v-if', 'v-for', 'v-on:click']

    const selector = directives.map(directives => `[${directives.replace(':', '\\:')}]`).join(', ');

    const elements = component.querySelectorAll(selector);
    elements.forEach(el => {
        if (!bindings[component]) {
            bindings[component] = []
        }

        for (const directive of directives) {
            bindAttribute(component, el, directive)
        }
    })

    console.log('bindings: ')
    console.log(bindings)

    //updateComponent(component, data)

    effect(() => {
        console.log(data)
        updateComponent(component, data)
    })
}

function bindAttribute(component, el, directive) {
    let refName = el.getAttribute(directive);

    if (refName) {

        const constituentsRaw = refName.split(' in ')
        const constituents = constituentsRaw.map(cr => cr.trim())

        const constituentsCommaRaw = refName.split(',')
        const constituentsComma = constituentsCommaRaw.map(cr => cr.trim())
        
        if (constituentsComma.length > 1) {
            for (const refNameConst of constituentsComma) {
                if (!bindings[component][refNameConst]) {
                    bindings[component][refNameConst] = []
                }
                if (!bindings[component][refNameConst][directive]) {
                    bindings[component][refNameConst][directive] = []
                }
                bindings[component][refNameConst][directive].push(el)
            }
        } else {

            if (constituents.length > 1) {
                refName = constituents[1]
            }

            if (!bindings[component][refName]) {
                bindings[component][refName] = []
            }
            if (!bindings[component][refName][directive]) {
                bindings[component][refName][directive] = []
            }
            bindings[component][refName][directive].push(el)
        }
    }
}

function updateComponent(component, data) {
  for (const variableName in data) {
    const foundBinds = bindings[component][variableName];
    if (!foundBinds) continue;

    const currentValue = 'value' in data[variableName]
      ? data[variableName].value
      : data[variableName];

    for (const foundDirective in foundBinds) {
      const els = foundBinds[foundDirective];

      for (const el of els) {
        // Initialize previous value store
        el._prevValues ??= {};
        const prevValue = el._prevValues[foundDirective];

        // Only update if value changed
        if (prevValue !== currentValue) {
          el._prevValues[foundDirective] = currentValue;
          updateElement(el, foundDirective, currentValue);
        }
      }
    }
  }
}


function updateComponent_(component, data) {
    for (const variableName in data) {

        const foundBinds = bindings[component][variableName];

        for (const foundDirective in foundBinds) {

            const els = foundBinds[foundDirective]

            for (const el of els) {
                if ('value' in data[variableName]) {
                    updateElement(el, foundDirective, data[variableName].value)
                } else {
                    updateElement(el, foundDirective, data[variableName])
                }
            }
        }
        
    }
}
function updateElement(el, directive, value) {

    if (directive === 'v-bind:src') {
        el.src = value
    }
    if (directive === 'v-if') {
        el.style.display = value ? '' : 'none'
        const next = el.nextElementSibling
        if (next?.hasAttribute('v-else')) {
            next.style.display = value ? 'none' : ''
        }
    }
    if (directive === 'v-for') {
        // keep the original element in memory
        // find interpolation in element

        const attribute = el.getAttribute('v-for');
        const constituentsRaw = attribute.split(' in ')
        const constituents = constituentsRaw.map(cr => cr.trim())
        const variableName = constituents[0];

        for (const arrayEl in value) {

            const newElement = el.cloneNode()
            
            const context = {}
            context[variableName] = value[arrayEl]
   

            if (!el.dataset.template) {
                el.dataset.template = el.textContent; // Save original with {{ }}
            }
        
            const replacedText = interpolate(el.dataset.template, context)

            newElement.textContent = replacedText

            el.insertAdjacentElement('afterend', newElement)
        }
    }

    if (directive === 'v-text') {
        
        const variableNames = el.getAttribute(directive)

        const constituentsCommaRaw = variableNames.split(',')
        const constituentsComma = constituentsCommaRaw.map(cr => cr.trim())

        const context = {}
        for (const variableName of constituentsComma) {
            context[variableName] = value
        }

        if (!el.dataset.template) {
            el.dataset.template = el.textContent; // Save original with {{ }}
        }
        
        const replacedText = interpolate(el.dataset.template, context)
        el.textContent = replacedText
    }

    if(directive === 'v-on:click') {
        el.addEventListener('click', value)
    }
}

function getPropByPath(obj, path) {
  return path.split('.').reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : undefined;
  }, obj);
}

function interpolate(str, context) {
  return str.replace(/{{\s*([\w.]+)\s*}}/g, (match, path) => {
    const value = getPropByPath(context, path);
    return value !== undefined ? value : match;
  });
}

