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
 * Make an object reactive:  
 *   - you can read/write its props as usual  
 *   - subscribe to changes via proxy._subscribe(propName, callback)  
 */
export function reactive(initialObj) {
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

export function addEvent(type, data, template) {

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

// export    function addMouseOver(obj) {
//       const parameterName = Object.keys(obj)[0];
//       const li = document.querySelectorAll(`[mouseover-${parameterName}]`);

      
//       li.addEventListener('click', obj[parameterName]);
//     }


export    function createEls(type, obj, template) {

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

    export function updateText(data, template) {

      let component = template ?? document;

      const parameterName = Object.keys(data)[0];  // "product"
      const text = data[parameterName];            // "product"
      
      const els = component.querySelectorAll(`[v-text="${parameterName}"]`);

      for (const el of els) {
        const attrValue = el.getAttribute(`v-text="${parameterName}"}`);
        const dataValue = data[parameterName];

        if (isReactive(dataValue)) {
          


          el.textContent = dataValue.value


          dataValue._subscribe((newVal) => {
            
            el.textContent = newVal;
          });
        } else {
          el.textContent = dataValue;
        }
      }
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