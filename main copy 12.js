// reactive() converts the object deeply: nested objects are also wrapped with reactive() when accessed. 
// It is also called by ref() internally when the ref value is an object.
// Unlike a ref which wraps the inner value in a special object, reactive() makes an object itself reactive
// it only works for object types

//const arrayMutations = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];

/*
export function reactive(obj) {
  return new Proxy(obj, {
    get(target, key) {
      track(target, key);

      if (Array.isArray(target) && arrayMutations.includes(key)) {
        return function(...args) {
          const result = Array.prototype[key].apply(target, args);
          // trigger on length so effects tracking length will rerun
          trigger(target, 'length');
          trigger(target, key);
          return result;
        }
      }
      return Reflect.get(target, key);
    },
    set(target, key, value) {
      const res = Reflect.set(target, key, value);
      trigger(target, key);
      return res;
    }
  });
}
  */

// todo: urmarit pe youtube
export function ref(initialValue) {

}

/*
export function ref(initialValue) {
  // wrap initialValue in reactive if it's object/array
  let _value = (initialValue != null && typeof initialValue === 'object')
    ? reactive(initialValue)
    : initialValue;

  return {
    get value() {
      // track access to the ref itself
      track(this, 'value');
      // if it's an array, also track its length
      if (Array.isArray(_value)) {
        track(_value, 'length');
      }
      return _value;
    },
    set value(newVal) {
      _value = (newVal != null && typeof newVal === 'object')
        ? reactive(newVal)
        : newVal;
      trigger(this, 'value');
    }
  };
}
  */

/*
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
    */

// Effect subscriptions are stored in a global WeakMap<target, Map<key, Set<effect>>> data structure. 
// If no subscribing effects Set was found for a property (tracked for the first time), 
// it will be created. 

/*
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
*/

let currentComponents = []
const bindings = {}
export function init(component, data, cname) {
    currentComponents[cname] = component

    const directives = [
		'v-for',
    ]

    const selector = directives.map(d => `[${d.replace(':', '\\:')}]`).join(', ')
    const elements = component.querySelectorAll(selector)

    if (!bindings[component]) {
        bindings[component] = []
    }

    elements.forEach(el => {
        for (const directive of directives) {
            bindAttribute(component, el, directive)
        }
    })

    // effect(() => {
    //     console.log('effect')

    // });
}


function bindAttribute(component, el, directive) {
    let refName = el.getAttribute(directive);

    if (refName) {

        const constituentsRaw = refName.split(' in ')
        const constituents = constituentsRaw.map(cr => cr.trim())

		refName = constituents[1]
		if (!bindings[component][refName]) {
			bindings[component][refName] = []
		}
		if (!bindings[component][refName][0]) {
			bindings[component][refName][0] = []
		}
		if (!bindings[component][refName][0][directive]) {
			bindings[component][refName][0][directive] = []
		}
		bindings[component][refName][0][directive].push(el)
    }
}
