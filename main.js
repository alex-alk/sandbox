// reactive() converts the object deeply: nested objects are also wrapped with reactive() when accessed. 
// It is also called by ref() internally when the ref value is an object.
// Unlike a ref which wraps the inner value in a special object, reactive() makes an object itself reactive
// it only works for object types

export function reactive(obj) {
  return new Proxy(obj, {
    get(target, key) {
      track(target, key);
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      trigger(target, key);
      return true; // ✅ important fix
    }
  });
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
            return this._value
        },
        set value(newValue) {
            this._value = newValue
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

let currentComponents = []
const bindings = {}
export function init(component, data, cname) {
    currentComponents[cname] = component
    const directives = [
        'v-text', 'v-component', 'v-bind:src',
        'v-if', 'v-for', 'v-on:click', 'v-on:mouseover',
        'v-bind:class', 'v-bind:disabled', 'v-component', 'v-on:submit', 'v-model'
    ]

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


    //updateComponent(component, data)

    effect(() => {
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

        const constituentsDotRaw = refName.split('.')
        const constituentsDot = constituentsDotRaw.map(cr => cr.trim())

        if (constituents.length > 1) {
            refName = constituents[1]
            if (!bindings[component][refName]) {
                bindings[component][refName] = []
            }
            if (!bindings[component][refName][directive]) {
                bindings[component][refName][directive] = []
            }
            bindings[component][refName][directive].push(el)
        } else if(constituentsComma.length > 1) {
            for (const refNameConst of constituentsComma) {
                if (!bindings[component][refNameConst]) {
                    bindings[component][refNameConst] = []
                }
                if (!bindings[component][refNameConst][directive]) {
                    bindings[component][refNameConst][directive] = []
                }
                bindings[component][refNameConst][directive].push(el)
            }
        } else if(constituentsDot.length === 2) {
            const refNameConst = constituentsDot[0]
            const refNameDot = constituentsDot[1]
            if (!bindings[component][refNameConst]) {
                bindings[component][refNameConst] = []
            }
            if (!bindings[component][refNameConst][refNameDot]) {
                bindings[component][refNameConst][refNameDot] = []
            }
            if (!bindings[component][refNameConst][refNameDot][directive]) {
                bindings[component][refNameConst][refNameDot][directive] = []
            }
            bindings[component][refNameConst][refNameDot][directive].push(el)
        }
         else {
            if (!bindings[component][refName]) {
                bindings[component][refName] = []
            }

            if (!bindings[component][refName][directive]) {
                bindings[component][refName][directive] = []
            }
            bindings[component][refName][directive].push(el)
        }
        
        // if (constituentsComma.length > 1) {
        //     for (const refNameConst of constituentsComma) {
        //         if (!bindings[component][refNameConst]) {
        //             bindings[component][refNameConst] = []
        //         }
        //         if (!bindings[component][refNameConst][directive]) {
        //             bindings[component][refNameConst][directive] = []
        //         }
        //         bindings[component][refNameConst][directive].push(el)
        //     }
        // } else {

        //     if (constituents.length > 1) {
        //         refName = constituents[1]
        //     }

        //     if (!bindings[component][refName]) {
        //         bindings[component][refName] = []
        //     }
        //     if (!bindings[component][refName][directive]) {
        //         bindings[component][refName][directive] = []
        //     }
        //     bindings[component][refName][directive].push(el)
        // }
    }
}

function updateComponent(component, data) {

  for (const variableName in data) {


    const foundBinds = bindings[component][variableName];
    if (!foundBinds) continue;

    const currentValue = 'value' in data[variableName]
      ? data[variableName].value
      : data[variableName];

     if (variableName === 'review') {

        for (const foundDot in foundBinds) {
            
                
            const foundDirectives = bindings[component][variableName][foundDot]
            
            for (const foundDirective in foundDirectives) {
                const els = bindings[component][variableName][foundDot][foundDirective];
                
                for (const el of els) {
                    // Initialize previous value store
                    el._prevValues ??= {};
                    const prevValue = el._prevValues[foundDirective];

                    // Only update if value changed
                    if (prevValue !== currentValue) {
                    el._prevValues[foundDirective] = currentValue;
                    updateElement(el, foundDirective, currentValue, data);
                    }
                }
            }
        }
    } else {
        for (const foundDirective in foundBinds) {
            const els = foundBinds[foundDirective];

            for (const el of els) {
                // Initialize previous value store
                el._prevValues ??= {};
                const prevValue = el._prevValues[foundDirective];

                // Only update if value changed
                if (prevValue !== currentValue) {
                el._prevValues[foundDirective] = currentValue;
                updateElement(el, foundDirective, currentValue, data);
                }
            }
        }
    }
  }
}

function updateElement(el, directive, value, data) {

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
    const attribute = el.getAttribute('v-for');
    // Parse "item in items" or "(item, index) in items"
    const [left, right] = attribute.split(' in ').map(s => s.trim());
    
    // Extract variable names (could be "item" or "(item, index)")
    let itemVar = left;
    let indexVar = null;
    const match = left.match(/^\(\s*([^,\s]+)\s*,\s*([^,\s]+)\s*\)$/);
    if (match) {
        itemVar = match[1];
        indexVar = match[2];
    }
    
    if (!Array.isArray(value)) {
        console.warn('v-for expects an array value');
        return;
    }

    // Remove old rendered items except the template element
    let nextSibling = el.nextElementSibling;
    while (nextSibling && nextSibling.hasAttribute('data-v-for-item')) {
        const toRemove = nextSibling;
        nextSibling = nextSibling.nextElementSibling;
        toRemove.remove();
    }

    // Save original template if not saved yet
    if (!el.dataset.template) {
        el.dataset.template = el.innerHTML;
    }

    // Render new elements from array
    value.forEach((item, index) => {
        const newEl = el.cloneNode(true);
        newEl.removeAttribute('v-for');
        newEl.setAttribute('data-v-for-item', ''); // mark it for removal next time

        // Build context for interpolation and event handlers
        const context = {};
        context[itemVar] = item;
        if (indexVar) context[indexVar] = index;

        // Handle v-on:mouseover inside v-for (optional enhancement)
        const onMouseover = newEl.getAttribute('v-on:mouseover');
        if (onMouseover) {
            const fnMatch = onMouseover.match(/^(\w+)\(([\w.]+)\)$/);
            if (fnMatch) {
                const fnName = fnMatch[1];
                const argPath = fnMatch[2];
                const fn = data[fnName];
                let argValue = argPath === indexVar ? index : getPropByPath(context, argPath);
                if (typeof fn === 'function') {
                    newEl.addEventListener('mouseover', () => fn(argValue));
                }
            }
        }

        // Handle v-bind:style inside v-for
        const styleBinding = newEl.getAttribute('v-bind:style');
        if (styleBinding) {
            const styleObject = new Function('with(this) { return ' + styleBinding + '; }').call(context);
            updateElement(newEl, 'v-bind:style', styleObject, data);
        }

        // Replace interpolations {{ }} inside the element
        // Set innerHTML to template first (clone content)
newEl.innerHTML = newEl.dataset.template;

// Then recursively interpolate all {{ }} in text nodes using full JS eval in context
interpolateMustache(newEl, context);

        el.insertAdjacentElement('afterend', newEl);
    });

    // Optionally hide the original template element itself
    el.style.display = 'none';
}


    if (directive === 'v-model') {
    const modelAttr = el.getAttribute(directive);
    const [modelPathRaw, ...modRaw] = modelAttr.split('.');
    const modifiers = modRaw || [];
    const pathParts = modelAttr.split('.');
    const modelName = pathParts[0];


    const getModelValue = () => getPropByPath(data, modelAttr);
    const setModelValue = (val) => {
        const path = pathParts.slice(1);
        let obj = data[modelName];
        if ('value' in obj) obj = obj.value; // unwrap ref
        let target = obj;

        for (let i = 0; i < path.length - 1; i++) {
            if (!target[path[i]]) return;
            target = target[path[i]];
        }

        const lastKey = path[path.length - 1];

        if (path.length === 0) {
            if ('value' in data[modelName]) {
                data[modelName].value = val;
            } else {
                data[modelName] = val;
            }
        } else {
            target[lastKey] = val;
        }
    };

    const currentValue = getModelValue();

    if (el.tagName === 'SELECT') {
        el.value = currentValue;
        el.addEventListener('change', (e) => {
            let newVal = e.target.value;
            if (modifiers.includes('number')) newVal = Number(newVal);
            setModelValue(newVal);
        });
    } else if (el.type === 'checkbox') {
        el.checked = currentValue;
        el.addEventListener('change', (e) => {
            setModelValue(e.target.checked);
        });
    } else {
        el.value = currentValue;
        el.addEventListener('input', (e) => {
            let newVal = e.target.value;
            if (modifiers.includes('number')) newVal = Number(newVal);
            if (modifiers.includes('trim')) newVal = newVal.trim();
            setModelValue(newVal);
        });
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
    if(directive === 'v-on:submit') {
        el.addEventListener('submit', value)
    }
    if(directive === 'v-on:mouseover') {
        el.addEventListener('mouseover', value)
    }
    if (directive === 'v-bind:class') {
        if (typeof value === 'object' && value !== null) {
            for (const [className, condition] of Object.entries(value)) {
            if (condition) {
                el.classList.add(className);
            } else {
                el.classList.remove(className);
            }
            }
        } else if (typeof value === 'string') {
            el.className = value;
        }
    }

    if (directive === 'v-bind:disabled') {
        el.disabled = value
    }
    if (directive === 'v-bind:style') {
        if (typeof value === 'object' && value !== null) {
            for (const [styleName, styleValue] of Object.entries(value)) {
            el.style[styleName] = styleValue;
            }
        } else if (typeof value === 'string') {
            el.style.cssText = value;
        }
    }
    if (directive === 'v-component') {
        const parent = el.parentNode

        el.replaceWith(value);
        Array.from(el.attributes).forEach(attr => {
            
            if (attr.name.startsWith('@')) {
                const eventName = attr.name.slice(1); // e.g. 'add-to-cart'
                const handlerName = attr.value;       // e.g. 'updateCart'
                const handlerFn = data[handlerName];
                if (typeof handlerFn === 'function') {
                    
                    value.addEventListener(eventName, handlerFn);
                }
            }
        });
    }
}

function interpolateMustache(node, scope) {
  if (node.nodeType === Node.TEXT_NODE) {
    const mustacheRE = /{{\s*(.+?)\s*}}/g
    node.textContent = node.textContent.replace(mustacheRE, (_, expr) => {
      try {
        // Create a function with the expression and evaluate it in scope
        // Use `with` for scope context (simplified example)
        return new Function('with(this) { return ' + expr + ' }').call(scope)
      } catch (e) {
        console.error('Failed to evaluate mustache expression:', expr, e)
        return ''
      }
    })
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    node.childNodes.forEach(child => interpolateMustache(child, scope))
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

export function defineEmits(eventNames = [], currentComponentName = null) {
  return function emit(eventName, payload) {
    if (!eventNames.includes(eventName)) {
      console.warn(`Event "${eventName}" is not defined in emits.`);
      return;
    }
    const currentComponent = currentComponents[currentComponentName] ?? false;

    // Dispatch a CustomEvent on the root element or component root
    if (currentComponent) {
        

      const event = new CustomEvent(eventName, {
        detail: payload,
        bubbles: true,
        composed: true,
      });
      currentComponent.dispatchEvent(event);
    }
  };
}
