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
        'v-for', 'v-text', 'v-bind:src', 'v-if'
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
    const vFor = el.getAttribute('v-for');
    if (!el.dataset.template) {
        el.dataset.template = el.textContent; // Save original with {{ }}
    }

    if (vFor) {
        const [left, right] = vFor.split(' in ').map(s => s.trim());

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

            for (const item of dataToBind) {
                if (!bindings[rootComponent][right]?.['v-for']?.[item.id]) {

                    const clone = el.cloneNode()

                    context = {}
                    context[left] = item;
                    if (right !== null) {
                        context[right] = item.id;
                    }

                    const replacedText = interpolate(el.dataset.template, context)
                    clone.textContent = replacedText

                    clone.setAttribute('v-bind:key', item.id)
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

    const vText = el.getAttribute('v-text');
    if (vText) {
        effect(() => {
            const dataToBind = data[vText].value
            el.textContent = dataToBind
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
        const value = getPropByPath(context, path);
        return value !== undefined ? value : match;
    });
}