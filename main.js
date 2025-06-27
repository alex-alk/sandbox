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

function ref(initialValue) {
    let value = (initialValue != null && typeof initialValue === 'object') ? 
        reactive(initialValue) : initialValue;

    return {
        get value() {
            track(this, 'value');
            return value;
        },
        set value(newVal) {
            value = (newVal != null && typeof newVal === 'object') ? 
                reactive(newVal) : newVal;
            trigger(this, 'value');
        }
    };
}

// ------------------------- init ---------------------------------

let rootComponents = []
const bindings = {}
function init(rootComponent, data, cname) {
    rootComponents[cname] = rootComponent

    const directives = [
        'v-for', 'v-text'
    ]

    // build a comma separated selector
    const selector = directives.map(d => `[${d.replace(':', '\\:')}]`).join(', ')
    const elements = rootComponent.querySelectorAll(selector)

    if (!bindings[rootComponent]) {
        bindings[rootComponent] = []
    }

    for (const el of elements) {
        hydrate(rootComponent, el, data)
    }
}

function hydrate(rootComponent, el, data) {
    // get directives
    const vFor = el.getAttribute('v-for');
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
                    
                    clone.textContent = item.name
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
}