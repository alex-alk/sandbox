// Step 2: Computed system
const computedDeps = [];

export function bindReactive(review, template) {

  let component = template ?? document;

  const inputs = component.querySelectorAll('[v-model]');
  for (const el of inputs) {
    // e.g. el.getAttribute('v-model') → "review.name"
    const prop = el.getAttribute('v-model').split('.').pop();
    
    // 1) init
    el.value = review[prop];

    // 2) respond to user
    el.addEventListener('input', e => {
      // if you have v-model.number you can coerce to Number here
      review[prop] = el.hasAttribute('v-model.number')
        ? Number(el.value)
        : el.value;
    });

    // 3) respond to code
    review._subscribe(prop, newVal => {
      if (document.activeElement !== el) {
        el.value = newVal;
      }
    });
  }
}

export function computed(fn) {
  const listeners = [];
  const result = { value: fn() };

  const update = () => {
    const newVal = fn();
    result.value = newVal;
    listeners.forEach(l => l(newVal));
  };

  result._subscribe = (fn) => listeners.push(fn);

  computedDeps.push(update);

  return result;
}

export function getState(data) {

  return new Proxy(data, {
  set(target, key, value) {
    target[key] = value;
    // Notify all watchers
    computedDeps.forEach(fn => fn());
    return true;
  }
});
}

// export const state = new Proxy(data, {
//   set(target, key, value) {
//     target[key] = value;
//     // Notify all watchers
//     computedDeps.forEach(fn => fn());
//     return true;
//   }
// });

/**
 * Make an object *or* array reactive:
 * 
 * - You can read/write props or numeric indices as usual.
 * - Subscribe to a specific key: proxy._subscribe('foo', newVal => …)
 * - Subscribe to *all* changes:    proxy._subscribe(fn) // fn gets (newVal, key)
 */
export function reactive(initial) {
  // If it's an array, keep it as-is so forEach/etc still exist.
  const target = Array.isArray(initial) ? initial : { ...initial };

  // subscribers: per-key arrays, plus a "__all" list
  const subs = { __all: [] };

  return new Proxy(target, {
    get(t, key) {
      if (key === '_subscribe') {
        return (prop, fn) => {
          // allow proxy._subscribe(fn)  → subscribe to all changes
          if (typeof prop === 'function') {
            subs.__all.push(prop);
          } else {
            // proxy._subscribe('name', fn)
            subs[prop] = subs[prop] || [];
            subs[prop].push(fn);
          }
        };
      }
      return Reflect.get(t, key);
    },

    set(t, key, value) {
      const oldVal = t[key];
      const result = Reflect.set(t, key, value);
      // only notify if actually changed
      if (oldVal !== value) {
        // per-key subscribers
        (subs[key] || []).forEach(fn => fn(value, key));
        // global subscribers
        subs.__all.forEach(fn => fn(value, key));
      }
      return result;
    }
  });
}


/**
 * Make an object reactive:  
 *   - you can read/write its props as usual  
 *   - subscribe to changes via proxy._subscribe(propName, callback)  
 */
export function reactive_(initialObj) {
  // internal map: propName → [listenerFn, …]
  const subs = {};

  return new Proxy({...initialObj }, {
    get(target, key) {
      if (key === '_subscribe') {
        // usage: reactiveObj._subscribe('name', newVal => { … })
        return (propName, fn) => {
          if (!subs[propName]) subs[propName] = [];
          subs[propName].push(fn);
        };
      }
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      // notify any subscribers to this key
      if (subs[key]) {
        subs[key].forEach(fn => fn(value));
      }
      return true;
    }
  });
}




export function ref(initialValue) {
  const listeners = [];
  let _value = initialValue;

  // helper to notify all subscribers
  function notify() {
    listeners.forEach(fn => fn(_value));
  }

  // if the initial value is an array, wrap it so that mutating methods call notify()
  if (Array.isArray(_value)) {
    _value = new Proxy(_value, {
      get(target, prop) {
        const orig = target[prop];
        // intercept mutating array methods
        if (typeof orig === 'function' && [
            'push', 'pop', 'shift', 'unshift',
            'splice', 'sort', 'reverse'
          ].includes(prop)) {
          return function(...args) {
            const result = orig.apply(target, args);
            notify();
            return result;
          };
        }
        return orig;
      }
    });
  }

  return {
    get value() {
      return _value;
    },
    set value(newVal) {
      _value = newVal;
      notify();
    },
    _subscribe(fn) {
      listeners.push(fn);
    }
  };
}




export function ref_(initialValue) {
  const listeners = [];

  const obj = {
    _value: initialValue,
    get value() {
      return this._value;
    },
    set value(newVal) {
      this._value = newVal;
      // Trigger DOM updates
      listeners.forEach(fn => fn(newVal));
    },
    _subscribe(fn) {
      listeners.push(fn);
    }
  };

  return obj;
}


export function addEvent(type, methods, template = null) {
  const root = template ?? document;
  const els  = root.querySelectorAll(`[v-on\\:${type}]`);

  for (const el of els) {
    const methodName = el.getAttribute(`v-on:${type}`);
    const handler    = methods[methodName];
    if (typeof handler !== 'function') continue;

    el.addEventListener(type, event => {
      // if it’s our CustomEvent from defineEmits, pass event.detail
      if (event instanceof CustomEvent && 'detail' in event) {
        handler(event.detail);
      } else {
        // native DOM event
        handler(event);
      }
    });
  }
}


/**
 * Toggle elements with v-if based on a JS expression in the context of `data`.
 * Supports refs (unwrapping `.value`) and reactive proxies.
 *
 * @param {object} data                — e.g. { reviews: ref([...]), cart: ref(0), … }
 * @param {DocumentFragment|HTMLElement} [templateRoot=document]
 */
export function updateIf(data, templateRoot = null) {
  const root = templateRoot ?? document;
  const els  = root.querySelectorAll('[v-if]');

  // Evaluate all v-if expressions
  function run() {
    els.forEach(el => {
      const expr = el.getAttribute('v-if').trim();
      // Build a function: new Function('reviews','cart', 'return reviews.length>0')
      const fn = new Function(...Object.keys(data), `return ${expr};`);
      // Prepare args: unwrap any refs (give .value), otherwise pass raw
      const args = Object.values(data).map(v =>
        v && typeof v.value !== 'undefined' ? v.value : v
      );
      let result = false;
      try {
        result = !!fn(...args);
      } catch (e) {
        console.warn('v-if evaluation error:', expr, e);
      }
      el.style.display = result ? '' : 'none';
    });
  }

  run();

  // Subscribe to any reactive in data
  Object.values(data).forEach(v => {
    if (v && typeof v._subscribe === 'function') {
      // for refs: subscribe to value‑setter; for reactive arrays/objects: subscribe to any change
      v._subscribe(run);
    }
  });
}



export function addEvent__(type, data, template) {

  let component = template ?? document;

      //const parameterName = Object.keys(obj)[0];
      const li = component.querySelectorAll(`[v-on\\:${type}]`);

      for (const el of li) {

        const attrValue = el.getAttribute(`v-on:${type}`);


        // get variable
        const dataValue = data[attrValue];

        el.addEventListener(type, dataValue);
      }
    }

function isReactive(val) {
  return typeof val === 'object' && val !== null && 'value' in val && typeof val._subscribe === 'function';
}

    export function updateBinds(type, data, template) {

      let component = template ?? document;

      //const parameterName = Object.keys(obj)[0];
      const li = component.querySelectorAll(`[v-bind\\:${type}]`);

      for (const el of li) {

        const attrValue = el.getAttribute(`v-bind:${type}`);
        // get variable
        const dataValue = data[attrValue];

        if (type === 'class') {

          const content = attrValue.slice(1, -1).trim();

          // Split by colon
          const [key, value] = content.split(':').map(s => s.trim());

          // Build object
          const objAttr = { [key]: value };

          // get variable
          const variableName = Object.keys(objAttr)[0];
          const variableValue = objAttr[variableName];


          const variableSelected = data[variableValue]
         

          if (isReactive(variableSelected)) {
            
              if (variableSelected.value) {
                el.classList.add(variableName)
              }

              variableSelected._subscribe((newVal) => {

                if (newVal) {
                  el.classList.add(variableName)
                } else {
                  el.classList.remove(variableName)
                }

              });
            } else {

                el.classList.add(variableName)

            }


        } else  {
          if (isReactive(dataValue)) {

            el[type] = dataValue.value;
            dataValue._subscribe((newVal) => {
              el[type] = newVal;
            });
          } else {
            el[type] = dataValue;
          }

        }
        
      }
    }




/**
 * Renders a <… v-for="arrayName"> template for each item,
 * binds each clone to both the full array and its singular item,
 * and re‑renders whenever the array changes.
 *
 * @param {{ [arrayName: string]: any[]|Ref }} obj
 * @param {DocumentFragment|HTMLElement} [templateRoot=document]
 */
export function createEls(obj, templateRoot = null) {
  const root      = templateRoot ?? document;
  const arrayName = Object.keys(obj)[0];        // e.g. "reviews"
  const source    = obj[arrayName];             // array, ref or reactive

  // determine how to read & subscribe
  let getList, subscribe;
  if (source && typeof source._subscribe === "function" && "value" in source) {
    // ref([...])
    getList   = () => Array.from(source.value || []);
    subscribe = cb => source._subscribe(cb);
  } else if (source && typeof source._subscribe === "function" && "length" in source) {
    // reactive([...])
    getList   = () => Array.from(source);
    subscribe = cb => source._subscribe(cb);
  } else {
    // plain array
    getList   = () => Array.from(source || []);
    subscribe = null;
  }

  // derive singular name (reviews → review)
  const singular = arrayName.endsWith("s")
    ? arrayName.slice(0, -1)
    : "item";

  // locate template node
  const tpl = root.querySelector(`[v-for="${arrayName}"]`);
  if (!tpl) return;
  const parent = tpl.parentElement;

  // clone & remove placeholder
  const proto = tpl.cloneNode(true);
  parent.removeChild(tpl);

  // insertion marker
  const marker = document.createComment(`v-for ${arrayName}`);
  parent.appendChild(marker);

  let clones = [];

  function render() {
    // teardown old clones
    clones.forEach(n => parent.removeChild(n));
    clones = [];

    // rebuild from current list
    getList().forEach((item, idx) => {
      const el = proto.cloneNode(true);
      el.setAttribute("elid", idx);
      parent.insertBefore(el, marker);
      clones.push(el);

      // per‑clone context: full array + this item
      const ctx = {
        [arrayName]: getList(),
        [singular]:  item
      };

      // apply all your directives to this clone
      updateText(ctx,      el);
      updateTexts(ctx,     el);
      updateBinds("src",      ctx, el);
      updateBinds("class",    ctx, el);
      updateBinds("disabled", ctx, el);

      // wire up v-on: for common events
      ["click", "mouseover", "submit"].forEach(evt =>
        addEvent(evt, ctx, el)
      );
    });
  }

  // initial render
  render();

  // re-render on mutations
  if (subscribe) {
    subscribe(() => render());
  }
}




/**
 * Renders one clone per item in a reactive or plain array/ref/array‑like,
 * and re‑renders whenever the array changes.
 *
 * @param {{ [arrayName: string]: any[]|Ref } } obj
 * @param {DocumentFragment|HTMLElement} [templateRoot=document]
 */
export function createEls___(obj, templateRoot = null) {
  const root      = templateRoot ?? document;
  const arrayName = Object.keys(obj)[0];
  const source    = obj[arrayName];

  // Figure out how to get the real array each time, and where to subscribe
  let getList, subscribe;
  if (source && typeof source._subscribe === 'function' && 'value' in source) {
    // it's a ref([...])
    getList   = () => Array.from(source.value || []);
    subscribe = cb => source._subscribe(cb);
  } else if (source && typeof source._subscribe === 'function' && 'length' in source) {
    // it's a reactive([...])
    getList   = () => Array.from(source);
    subscribe = cb => source._subscribe(cb);
  } else {
    // plain array (or array‑like)
    getList   = () => Array.from(source || []);
    subscribe = null;
  }

  // 1) find the template node
  const tpl = root.querySelector(`[v-for="${arrayName}"]`);
  if (!tpl) return;
  const parent = tpl.parentElement;

  // 2) clone and remove original
  const proto = tpl.cloneNode(true);
  parent.removeChild(tpl);

  // 3) marker for insertion
  const marker = document.createComment(`v-for ${arrayName}`);
  parent.appendChild(marker);

  let clones = [];

  function render() {
    // remove old clones
    clones.forEach(n => parent.removeChild(n));
    clones = [];

    // build new clones
    getList().forEach((item, idx) => {
      const el = proto.cloneNode(true);
      el.setAttribute('elid', idx);
      parent.insertBefore(el, marker);
      clones.push(el);
    });
  }

  // initial
  render();

  // subscribe if we can
  if (subscribe) {
    subscribe(() => {
      render();
      // re‑run your directive passes on the newly inserted nodes:
      // updateText({ [arrayName]: source.value ?? source }, root);
      // updateBinds(…, root);
      // addEvent(…, root);
    });
  }
}





/**
 * For each element matching [v-for="arrayName"] in `templateRoot`,
 * deep‑clone the original node (preserving tagName, attributes, children),
 * set an elid=index on each clone, and append them to the parent.
 *
 * @param {{ [arrayName: string]: any[] }} obj      — e.g. { reviews: [...] }
 * @param {DocumentFragment|HTMLElement} [templateRoot=document]
 */
export function createEls__(obj, templateRoot = null) {
  const root = templateRoot ?? document;
  const arrayName = Object.keys(obj)[0];        // e.g. "reviews"
  const items = obj[arrayName];                  // the array
 
  // find the single template element: any tag with v-for="reviews"
  const tpl = root.querySelector(`[v-for="${arrayName}"]`);
  if (!tpl) return;

  const parent = tpl.parentElement;
  // clone the node itself (with all children) for reuse as the template
  const proto = tpl.cloneNode(true);

  // remove the original placeholder
  parent.removeChild(tpl);

  // for each item, clone and insert
  items.forEach((item, idx) => {
    const el = proto.cloneNode(true);           // deep clone
    el.setAttribute('elid', idx);               // index if needed

    // optionally attach the item directly for later lookups:
    // el.__v_item = item;

    parent.appendChild(el);
  });
}


export function createEls_(type, obj, template) {

  let component = template ?? document;


      const parameterName = Object.keys(obj)[0];  // "product"
      const detailsArray = obj[parameterName];            // "product"
      
      const li = component.querySelector(`[${type}-${parameterName}]`);

      // Get parent element (likely <ul> or <ol>)
      const parent = li.parentElement;

      const attrs = [...li.attributes];

      // Remove the original <li>
      parent.removeChild(li);

      // Create and append new <li> elements for each detail
      detailsArray.forEach((detail, index) => {
        const newLi = document.createElement(type);

        // Copy all attributes to the new <li>
        attrs.forEach(attr => {
          newLi.setAttribute(attr.name, attr.value);
        });

        //if (key) {
          //newLi.textContent = detail[key];
        //} else {
          if (typeof detail === 'string') {
            newLi.textContent = detail
          }
        //}
        newLi.setAttribute('elid', index)
        // if (detail['id']) {
        //   newLi.setAttribute('elid', detail['id'])
        // }
        parent.appendChild(newLi);
      });
    }

export    function createLis(obj, template) {
  let component = template ?? document;

      const parameterName = Object.keys(obj)[0];  // "product"
      const detailsArray = obj[parameterName];            // "product"
      
      const li = component.querySelector(`[lis-${parameterName}]`);

      // Get parent element (likely <ul> or <ol>)
      const parent = li.parentElement;

      const attrs = [...li.attributes];

      // Remove the original <li>
      parent.removeChild(li);

      // Create and append new <li> elements for each detail
      detailsArray.forEach(detail => {
        const newLi = document.createElement('li');

        // Copy all attributes to the new <li>
        attrs.forEach(attr => {
          newLi.setAttribute(attr.name, attr.value);
        });

        newLi.textContent = detail;
        parent.appendChild(newLi);
      });
    }

export    function updateTexts(data, template = null) {

      // const parameterName = Object.keys(obj)[0];  // "product"
      // const text = obj[parameterName];            // "product"

      let component = template ?? document;
      
      const els = component.querySelectorAll(`[v-text]`);

      for (const el of els) {
        const attrValue = el.getAttribute('v-text');

        const dataValue = data[attrValue];
        if (dataValue) {

          if (isReactive(dataValue)) {
            el.textContent = dataValue.value;
          
            dataValue._subscribe((newVal) => {
              el.textContent = newVal;
            });
          } else {
            el.textContent = dataValue;
          }
        }
      }
    }

  /**
 * Update all [v-text="…"] nodes inside `template` (or document)
 * Supports:
 *   - simple refs:    { cart: ref(0) }            + <span v-text="cart"></span>
 *   - reactive props: { review: reactive({name}) } + <span v-text="review.name"></span>
 */
export function updateText(data, template = null) {
  const root = template ?? document;
  const els = root.querySelectorAll('[v-text]');

  els.forEach(el => {
    const expr = el.getAttribute('v-text').trim();    // e.g. "review.name" or "cart"
    const [key, prop] = expr.split('.', 2);            // prop is undefined for simple keys

    const target = data[key];
    if (target === undefined) return;

    // Helper: set initial text
    const setText = val => { el.textContent = val == null ? '' : val; };

    // 1) Nested path (reactive object)
    if (prop) {
      // initial
      setText(target[prop]);
      // subscribe if reactive
      if (typeof target._subscribe === 'function') {
        target._subscribe(prop, newVal => setText(newVal));
      }
    }
    // 2) Simple key: could be a ref or primitive
    else {
      // ref()
      if (target && typeof target === 'object' && 'value' in target) {
        setText(target.value);
        if (typeof target._subscribe === 'function') {
          target._subscribe(newVal => setText(newVal));
        }
      }
      // plain value
      else {
        setText(target);
      }
    }
  });
}



 export   function updateSrc(obj, template) {
  let component = template ?? document;

      const parameterName = Object.keys(obj)[0];  // "product"
      const text = obj[parameterName];            // "product"
      const el = component.querySelector(`[src-${parameterName}]`);
      if (el) {
        el.src = text;
      }
    }


/**
 * @param {string[]} emits — the list of event names your component can emit
 * @param {HTMLElement} rootEl — the root element of the component
 */
export function defineEmits(emits, rootEl) {

  return (eventName, payload = null) => {
    if (!emits.includes(eventName)) {
      throw new Error(`[defineEmits] "${eventName}" is not declared in ${JSON.stringify(emits)}`);
    }
    const ev = new CustomEvent(eventName, {
      detail: payload,
      bubbles: true,
    });
    rootEl.dispatchEvent(ev);
  };
}