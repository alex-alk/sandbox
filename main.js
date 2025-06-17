export function setTexts(obj, component) {
    const texts = component.querySelectorAll('[f-text]');

    for (const el of texts) {
        const attributeValue = el.getAttribute('f-text');
        el.textContent =  obj[attributeValue]
    }
}

export function setText(obj, component) {
    const firstKey = Object.keys(obj)[0]
    const texts = component.querySelectorAll(`[f-text="${firstKey}"]`);

    for (const el of texts) {
        el.textContent = obj[firstKey]
    }
    
}

export function setBind(type, obj, component) {

    const texts = component.querySelectorAll(`[f-bind\\:${type}]`);

    for (const el of texts) {
        const attributeValue = el.getAttribute(`f-bind:${type}`);
        el[type] =  obj[attributeValue]
    }
}

export function setEvent(type, obj, component) {

    const texts = component.querySelectorAll(`[f-on\\:${type}]`);

    for (const el of texts) {
        const attributeValue = el.getAttribute(`f-on:${type}`);
        el.addEventListener(type, obj[attributeValue])
    }
}

export function setFor(obj, component) {

    const texts = component.querySelectorAll('[f-for]')

    for (const el of texts) {
        const attributeValue = el.getAttribute('f-for')
        const constituents = attributeValue.split('::')

        const parent = el.parentElement
        const original = el.cloneNode(true)
        el.remove()

        const array =  obj[constituents[0]]
        
        for (const arrEl of array) {
            const clone = original.cloneNode(true)
            if (constituents.length === 1) {
                clone.textContent = arrEl
            } else if (constituents.length === 2) {
                clone.textContent = arrEl[constituents[1]]
                if (arrEl['id']) {
                    clone.setAttribute('elid', arrEl['id'])
                }
            }
            
            parent.appendChild(clone);
        }
    }
}






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


/**
 * Replace {{ expr }} in text nodes under `root` with values from `data`,
 * and re‑render reactively when any ref()/reactive() in `data` changes.
 *
 * @param {{ [key: string]: any }} data
 * @param {DocumentFragment|HTMLElement} [root=document]
 */
export function updateCurly(data, root = document) {
  // 1) Find every text node containing a {{…}} template
  const mustacheRE = /{{\s*([^}]+?)\s*}}/g;
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        return mustacheRE.test(node.nodeValue)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    }
  );

  const entries = [];
  let node;
  while ((node = walker.nextNode())) {
    entries.push({
      node,
      template: node.nodeValue
    });
  }

  // 2) Render function: replaces all {{expr}} in each saved node
  function render() {
    for (const { node, template } of entries) {
      node.nodeValue = template.replace(mustacheRE, (_, expr) => {
        // evaluate simple dot‑paths against data
        const parts = expr.trim().split('.');
        let val = data[parts[0]];
        if (val == null) return '';
        // unwrap ref()
        if (typeof val.value !== 'undefined') {
          val = val.value;
        }
        // drill into reactive props or nested objects
        for (let i = 1; i < parts.length; i++) {
          val = val[parts[i]];
          if (val == null) return '';
          if (typeof val.value !== 'undefined') {
            val = val.value;
          }
        }
        return val != null ? val : '';
      });
    }
  }

  // 3) Initial pass
  render();

  // 4) Subscribe to all refs/reactives in data
  Object.values(data).forEach(v => {
    if (v && typeof v._subscribe === 'function') {
      v._subscribe(render);
    }
  });
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
 * Toggle elements with v-if / v-else based on JS expressions in the context of `data`.
 *
 * @param {object} data                — e.g. { inStock: computed(() => …), cart: ref(0), … }
 * @param {DocumentFragment|HTMLElement} [templateRoot=document]
 */
export function updateIf(data, templateRoot = null) {
  const root = templateRoot ?? document;
  // get all v-if / v-else in document order
  const all = Array.from(root.querySelectorAll('[v-if], [v-else]'));

  function run() {
    for (let i = 0; i < all.length; i++) {
      const el = all[i];

      if (el.hasAttribute('v-if')) {
        const expr = el.getAttribute('v-if').trim();
        // build fn(dataKeys...) → boolean
        const fn = new Function(...Object.keys(data), `return ${expr};`);
        // unwrap refs/reactives
        const args = Object.values(data).map(v =>
          v && typeof v.value !== 'undefined' ? v.value : v
        );

        let ok = false;
        try { ok = !!fn(...args); }
        catch (e) { console.warn('v-if error:', expr, e); }

        el.style.display = ok ? '' : 'none';

        // handle paired v-else if it immediately follows in our list
        const next = all[i + 1];
        if (next && next.hasAttribute('v-else')) {
          next.style.display = ok ? 'none' : '';
          i++; // skip the v-else in the next iteration
        }
      }
      else if (el.hasAttribute('v-else')) {
        // an orphan v-else (no preceding v-if) is always hidden
        el.style.display = 'none';
      }
    }
  }

  // initial run
  run();

  // subscribe to any reactive in data
  Object.values(data).forEach(val => {
    if (val && typeof val._subscribe === 'function') {
      val._subscribe(run);
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




export function updateBinds(data, root = document) {
  const allEls = root.querySelectorAll('*');
  const keys   = Object.keys(data);

  allEls.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      const m = attr.name.match(/^(?::|v-bind:)([\w-]+)$/);
      if (!m) return;
      const prop = m[1];
      // ← IGNORE key entirely
      if (prop === 'key') return;

      const expr = attr.value;
      const fn   = new Function(...keys, `return ${expr};`);

      function apply() {
        const args = keys.map(k => {
          const v = data[k];
          return v && typeof v.value !== 'undefined' ? v.value : v;
        });
        let val;
        try { val = fn(...args); }
        catch (e) {
          console.warn(`v-bind expression error: ${expr}`, e);
          return;
        }

        if (prop === 'class' && typeof val === 'object') {
          Object.entries(val).forEach(([cls, cond]) => {
            el.classList[cond ? 'add' : 'remove'](cls);
          });
        } else if (typeof el[prop] === 'boolean') {
        // boolean DOM properties, e.g. disabled
          el[prop] = !!val;
        } else if (prop in el && typeof el[prop] !== 'function') {
          // normal DOM property (covers `src`, `href`, `value`, etc.)
          el[prop] = val;
        } else if (prop in el.style && typeof val === 'string') {
          // inline style
          el.style[prop] = val;
        } else {
          // fallback to attribute
          el.setAttribute(prop, val);
        }
      }

      apply();
      Object.values(data).forEach(v => {
        if (v && typeof v._subscribe === 'function') {
          v._subscribe(apply);
        }
      });
      el.removeAttribute(attr.name);
    });
  });
}





/**
 * @param {{ [arrayName: string]: any[]|Ref|Reactive }} obj
 * @param {DocumentFragment|HTMLElement} [root=document]
 * @param {object} [methods={}]   – name→fn for inline v-on / @ handlers
 */
export function createEls(obj, root = document, methods = {}) {
  const arrayName = Object.keys(obj)[0];
  const source    = obj[arrayName];

  // 1) Array getter + subscribe (same as before)
  let getList, subscribe;
  if (source && typeof source._subscribe === 'function' && 'value' in source) {
    getList   = () => Array.from(source.value || []);
    subscribe = fn => source._subscribe(fn);
  } else if (source && typeof source._subscribe === 'function') {
    getList   = () => Array.from(source);
    subscribe = fn => source._subscribe(fn);
  } else {
    getList   = () => Array.from(source || []);
    subscribe = null;
  }

  // 2) Find all <… v-for="… in arrayName">
  const templates = Array.from(
    root.querySelectorAll(`[v-for*="${arrayName}"]`)
  ).filter(el => {
    const v = el.getAttribute('v-for').trim();
    return v === arrayName || v.endsWith(` in ${arrayName}`);
  });

  templates.forEach(tpl => {
    const rawExpr = tpl.getAttribute('v-for').trim();
    // parse singular name
    const singular = rawExpr.includes(' in ')
      ? rawExpr.split(' in ')[0].trim()
      : (arrayName.endsWith('s') ? arrayName.slice(0,-1) : 'item');

    // detect key
    let keyExpr = null;
    if (tpl.hasAttribute(':key'))           keyExpr = tpl.getAttribute(':key').trim();
    else if (tpl.hasAttribute('v-bind:key')) keyExpr = tpl.getAttribute('v-bind:key').trim();

    // replace template with marker
    const parent = tpl.parentElement;
    const proto  = tpl.cloneNode(true);
    parent.removeChild(tpl);
    const marker = document.createComment(`v-for ${rawExpr}`);
    parent.appendChild(marker);

    let clones = [];
    function render() {
      // remove old
      clones.forEach(n => parent.removeChild(n));
      clones = [];

      const list = getList();
      list.forEach((item, idx) => {
        const el = proto.cloneNode(true);
        parent.insertBefore(el, marker);
        clones.push(el);

        // build context
        const ctx = {
          [arrayName]: list,
          [singular]:  item,
          ...methods
        };

        // key
        if (keyExpr) {
          const fnKey = new Function(singular, arrayName, `return ${keyExpr};`);
          let k;
          try { k = fnKey(item, list); } catch { k = idx; }
          el.setAttribute('key', k);
        }

        // run interpolation + v-text etc.
        updateCurly(ctx, el);
        updateText(ctx, el);
        updateTexts(ctx, el);
        updateBinds(ctx, el);

        // 3) handle :style / v-bind:style
        if (el.hasAttribute(':style') || el.hasAttribute('v-bind:style')) {
          const expr = (el.getAttribute(':style') || el.getAttribute('v-bind:style')).trim();
          // build a fn that returns an object
          const fnStyle = new Function(singular, arrayName, `return ${expr};`);
          let styleObj = {};
          try { styleObj = fnStyle(item, list) || {}; }
          catch (e) { console.warn('v-bind:style error', expr, e); }
          // apply each key
          Object.entries(styleObj).forEach(([prop, val]) => {
            // camelCase prop on element.style
            el.style[prop] = val;
          });
          el.removeAttribute(':style');
          el.removeAttribute('v-bind:style');
        }

        // 4) inline event handlers: @evt or v-on:evt
        Array.from(el.attributes).forEach(attr => {
          // match either @evt or v-on:evt
          const m = attr.name.match(/^(?:@|v-on:)([\w-]+)$/);
          if (!m) return;
          const eventName = m[1];
          const expr      = attr.value.trim();
          // create fn that has (singular, arrayName, ...methods, event)
          const fnEvt = new Function(
            ...Object.keys(ctx), 
            'event',
            `return ${expr};`
          );
          el.addEventListener(eventName, e => fnEvt(...Object.values(ctx), e));
          el.removeAttribute(attr.name);
        });
      });
    }

    render();
    if (subscribe) subscribe(render);
  });
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