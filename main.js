let activeEffect = null
const targetMap = new WeakMap();

function effect(fn) {
    activeEffect = fn
    if (activeEffect) {
        activeEffect()
    }
    activeEffect = null
}

// subscribe add
// This will be set right before an effect is about
// to be run
function track(target, key) {
    if (activeEffect) {
        const effects = getSubscribersForProperty(target, key)
        effects.add(activeEffect)
    }
}

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

// notify
function trigger(target, key) {
    const effects = getSubscribersForProperty(target, key)
    effects.forEach(effect => effect())
}

export function reactive(obj) {
    let objProxy = new Proxy(obj, {
        get(target, key, receiver) {
            const result = Reflect.get(target, key, receiver)
            track(target, key)
            return result
        },
        set(target, key, value, receiver) {
            Reflect.set(target, key, value, receiver)
            trigger(target, key)
            return true
        }
    })
    return objProxy
}

class RefImpl {
    constructor(initialValue) {
        this._value = (initialValue != null && typeof initialValue === 'object') 
            ? reactive(initialValue) 
            : initialValue;
    }

    get value() {
        track(this, 'value');
        return this._value;
    }

    set value(newVal) {
        this._value = (newVal != null && typeof newVal === 'object') 
            ? reactive(newVal) 
            : newVal;
        trigger(this, 'value');
    }
}

export function ref(val) {
    return new RefImpl(val);
}

function isRef(val) {
    return val instanceof RefImpl;
}


/*
function isReactiveSource(val) {
    return isRef(val) || isReactive(val);
}

const ReactiveFlag = Symbol('reactive');

function reactive(obj) {
    obj[ReactiveFlag] = true;

    const proxy = new Proxy(obj, {
        get(target, key, receiver) {
            const result = Reflect.get(target, key, receiver)
            track(target, key)
            return result
        },
        set(target, key, value, receiver) {
            Reflect.set(target, key, value, receiver)
            trigger(target, key)
            return true
        }
    });

    return proxy;
}
    function isReactive(obj) {
    return obj && obj[ReactiveFlag] === true;
}
*/

// ------------------------- init ---------------------------------

let rootComponents = []
const bindings = {}
export function init(rootComponent, data, cname) {
    rootComponents[cname] = rootComponent

    const directives = [
        'v-for', 'v-text', 'v-bind:src', 'v-if', 'v-on:click', ':class', 'v-bind:class', ':disabled',
        ':style', 'v-component', 'v-on:submit', 'v-model'
    ]

    // build a comma separated selector
    const selector = directives.map(d => `[${d.replace(':', '\\:')}]`).join(', ')
    const elements = rootComponent.querySelectorAll(selector)

    if (!bindings[rootComponent]) {
        bindings[rootComponent] = {}
    }

    for (const el of elements) {
        hydrate(rootComponent, el, data)
    }
}

function hydrate(rootComponent, el, data) {
    // get directives
    const vModel = el.getAttribute('v-model')
    if (vModel) {
        const modelAttr = vModel;
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


    const vSubmit = el.getAttribute('v-on:submit')
    if (vSubmit) {
        el.addEventListener('submit', data[vSubmit])
    }

    const vComponent = el.getAttribute('v-component');
    if (vComponent) {
        //const parent = el.parentNode

        const component = data[vComponent]
        el.replaceWith(component);
        Array.from(el.attributes).forEach(attr => {
            
            if (attr.name.startsWith('@')) {
                const eventName = attr.name.slice(1); // e.g. 'add-to-cart'
                const handlerName = attr.value;       // e.g. 'updateCart'
                const handlerFn = data[handlerName];

                if (typeof handlerFn === 'function') {
                    component.addEventListener(eventName,  e => handlerFn(e.detail));
                }
            }
        });
    }

    const vClass = el.getAttribute(':class') || el.getAttribute('v-bind:class');

    if (vClass) {
        effect(() => {
            const classObj = parseClassBinding(vClass, data);
            for (const className in classObj) {
                if (classObj[className]) {
                    el.classList.add(className);
                } else {
                    el.classList.remove(className);
                }
            }
        });
    }

    const vDisabled = el.getAttribute(':disabled') || el.getAttribute('v-bind:disabled');
    if (vDisabled) {
        effect(() => {
            let isNegated = false;
            let path = vDisabled.trim();

            // Handle negation
            if (path.startsWith('!')) {
                isNegated = true;
                path = path.slice(1).trim();
            }

            // Support `ref` and `reactive` values
            const reactiveValue = getPropByPath(data, path);
            const actualValue = reactiveValue?.value !== undefined ? reactiveValue.value : reactiveValue;
            const shouldDisable = isNegated ? !actualValue : !!actualValue;

            // Apply or remove attribute
            if (shouldDisable) {
                el.setAttribute('disabled', '');
            } else {
                el.removeAttribute('disabled');
            }
        });
    }

    const vFor = el.getAttribute('v-for');

    if (vFor) {
        const display = el.style.display;
        if (!el.dataset.template) {
            el.dataset.template = el.textContent; // Save original with {{ }}
            el.style.display = 'none'
        }

        const [left, right] = vFor.split(' in ').map(s => s.trim());
        let itemVar = left;
        let indexVar = null;

        // (a, b)
        const match = left.match(/^\(\s*([^,\s]+)\s*,\s*([^,\s]+)\s*\)$/);
        if (match) {
            itemVar = match[1];
            indexVar = match[2];
        }

        effect(() => {
            const dataToBind = data[right].value

            let dataToBindIndexed = []
            for (const dataItem of dataToBind) {
                dataToBindIndexed[dataItem.id] = dataItem
            }

            const vFors = bindings[rootComponent][right]?.['v-for'];
            
            if (vFors) {
                for (const elId of Object.keys(vFors)) {
                    if (!(elId in dataToBindIndexed)) {
                        const elem = bindings[rootComponent][right]['v-for'][elId]
                        if (elem.getAttribute('v-bind:key') !== 'item.id') {
                            elem.remove()
                            delete bindings[rootComponent][right]['v-for'][elId]
                        }
                    }
                }
            }

            // todo: sunt necesare aceste bindings?
            for (const itemKey in dataToBind) {

                const item = dataToBind[itemKey]
                if (!bindings[rootComponent][right]?.['v-for']?.[item.id ?? itemKey]) {

                    const clone = el.cloneNode()
                    clone.style.display = display
                    clone.removeAttribute('data-template')

                    const context = {}
                    context[itemVar] = item;
                    if (indexVar !== null) {
                        context[indexVar] = itemKey;
                    }

                    const replacedText = interpolate(el.dataset.template, context)
                    clone.textContent = replacedText

                    clone.setAttribute('v-bind:key', item.id ?? itemKey)

                    const onMouseover = el.getAttribute('@mouseover')
                    if (onMouseover) {
                        // methodName(argument)
                        const fnMatch = onMouseover.match(/^(\w+)\(([\w.]+)\)$/);
                        if (fnMatch) {
                            const fnName = fnMatch[1];
                            const argExpr = fnMatch[2];

                            const fn = data[fnName];
                            const argValue = getPropByPath(context, argExpr);

                            if (typeof fn === 'function') {
                                clone.addEventListener('mouseover', () => fn(argValue));
                            }
                        }

                        // daca contine paranteze
                        // daca nu contine paranteze


                        // clone.addEventListener('mouseover', data[vOnMouseOver])
                    }

                    const vStyle = el.getAttribute(':style') || el.getAttribute('v-bind:style');

                    if (vStyle) {
                        effect(() => {
                            // We assume vStyle is an object literal string like: "{ backgroundColor: variant.color }"
                            // Parse it safely:
                            
                            // 1. Remove outer curly braces and whitespace
                            const objLiteral = vStyle.trim();
                            if (!objLiteral.startsWith('{') || !objLiteral.endsWith('}')) {
                                console.warn('Only simple object literals are supported in :style');
                                return;
                            }

                            // 2. Extract inside of { ... }
                            const styleBody = objLiteral.slice(1, -1).trim();

                            // 3. Split by commas for multiple styles (naive approach)
                            const styles = styleBody.split(',').map(s => s.trim()).filter(Boolean);
                            

                            // 4. Build style object
                            const styleObj = {};
                            for (const stylePair of styles) {
                                const [key, valExpr] = stylePair.split(':').map(s => s.trim());
                                if (!key || !valExpr) continue;

                                // Use the correct context, not root data!
                                const val = getPropByPath(context, valExpr);
                                styleObj[key] = val?.value !== undefined ? val.value : val;
                            }

                            for (const [cssProp, cssVal] of Object.entries(styleObj)) {
                                clone.style[cssProp] = cssVal ?? '';
                            }
                        });
                    }

                    el.insertAdjacentElement('beforeBegin', clone)

                    bindings[rootComponent] ??= {};
                    bindings[rootComponent][right] ??= {};
                    bindings[rootComponent][right]['v-for'] ??= {};
                    bindings[rootComponent][right]['v-for'][item.id ?? itemKey] = clone;
                }
            }
        })
    }

    const vSrc = el.getAttribute('v-bind:src');
    if (vSrc) {
        effect(() => {
            const dataToBind = data[vSrc].value
            el.src = dataToBind
        })
    }

    const vClick = el.getAttribute('v-on:click');
    if (vClick) {
        effect(() => {
            const dataToBind = data[vClick]
            el.addEventListener('click', dataToBind)
        })
    }

    const vText = el.getAttribute('v-text');
    if (vText) {
        effect(() => {
            
            const dataToBind = data[vText].value
            
            if (!el.dataset.template) {
                el.dataset.template = el.textContent
            }

            const context = {}
            context[vText] = dataToBind;

            // if (right !== null) {
            //     context[right] = item.id;
            // }

            const replacedText = interpolate(el.dataset.template, context)
            el.textContent = replacedText
        })
    }

    const vIf = el.getAttribute('v-if');

    if (vIf) {
        effect(() => {
            // todo: verificat daca e reactiv
            const dataToBind = data[vIf].value ?? data[vIf]

            el.style.display = dataToBind ? '' : 'none'
            const next = el.nextElementSibling

            if (next?.hasAttribute('v-else')) {
                next.style.display = dataToBind ? 'none' : ''
            }
        })

    }
}

function getPropByPath(initialValue, path) {
    const constituents = path.split('.')
    const result = constituents.reduce(
        (acc, part) => {
            return acc && acc[part] !== undefined ? acc[part] : undefined;
        }, 
        initialValue
    );
    
    return result
}

function interpolate(str, context) {
    return str.replace(/{{\s*([\w.]+)\s*}}/g, (match, path) => {
        // path is the expression, ex: item.name
        const value = getPropByPath(context, path);
        return value !== undefined ? value : match;
    });
}

function parseClassBinding(str, context) {
  const obj = {};

  const match = str.match(/^{\s*(\w+)\s*:\s*(!)?(\w+)\s*}$/);
  if (match) {
    const className = match[1];
    const isNegated = !!match[2];
    const variableName = match[3];

    // todo: verificat daca e reactiv
    const value = context[variableName].value ?? context[variableName];
    obj[className] = isNegated ? !value : !!value;
  }

  return obj;
}

export function computed(getter) {
    return {
        get value() {
            return getter()
        }
    }
}

export function defineEmits(eventNames = [], currentComponentName = null) {
  return function emit(eventName, payload) {
    if (!eventNames.includes(eventName)) {
      console.warn(`Event "${eventName}" is not defined in emits.`);
      return;
    }
    const currentComponent = rootComponents[currentComponentName] ?? false;

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