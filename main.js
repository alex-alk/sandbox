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

function reactive(obj) {
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

function ref(val) {
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
function init(rootComponent, data, cname) {
    rootComponents[cname] = rootComponent

    const directives = [
        'v-for', 'v-text', 'v-bind:src', 'v-if', 'v-on:click', ':class', 'v-bind:class', ':disabled',
        ':style'
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

                    context = {}
                    context[left] = item;
                    if (indexVar !== null) {
                        context[indexVar] = item.id;
                    }

                    const replacedText = interpolate(el.dataset.template, context)
                    clone.textContent = replacedText

                    clone.setAttribute('v-bind:key', item.id ?? itemKey)

                    const onMouseover = el.getAttribute('v-on:mouseover')
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

                        // console.log(data, vOnMouseOver, data[vOnMouseOver])
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
                    bindings[rootComponent][right]['v-for'][item.id] = el;
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

            context = {}
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
            const dataToBind = data[vIf]
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
        //console.log('interpolate', context, path)
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

    const value = context[variableName];
    obj[className] = isNegated ? !value : !!value;
  }

  return obj;
}