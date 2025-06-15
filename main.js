
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

export function addEvent(type, data) {

      //const parameterName = Object.keys(obj)[0];
      const li = document.querySelectorAll(`[v-on\\:${type}]`);

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

    export function updateBinds(type, data) {

      //const parameterName = Object.keys(obj)[0];
      const li = document.querySelectorAll(`[v-bind\\:${type}]`);

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
            
             console.log(variableValue, variableName, dataValue, attrValue, variableSelected)

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
            // console.log('attr', attrValue);
            // console.log('dv', dataValue.value)

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


export    function createEls(type, obj, key) {
      const parameterName = Object.keys(obj)[0];  // "product"
      const detailsArray = obj[parameterName];            // "product"
      
      const li = document.querySelector(`[${type}-${parameterName}]`);

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

        if (key) {
          newLi.textContent = detail[key];
        } else {
          if (typeof detail === 'string') {
            newLi.textContent = detail
          }
        }
        newLi.setAttribute('elid', index)
        // if (detail['id']) {
        //   newLi.setAttribute('elid', detail['id'])
        // }
        parent.appendChild(newLi);
      });
    }

export    function createLis(obj) {
      const parameterName = Object.keys(obj)[0];  // "product"
      const detailsArray = obj[parameterName];            // "product"
      
      const li = document.querySelector(`[lis-${parameterName}]`);

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

export    function updateTexts(data) {

      // const parameterName = Object.keys(obj)[0];  // "product"
      // const text = obj[parameterName];            // "product"
      
      const els = document.querySelectorAll(`[v-text]`);

      for (const el of els) {
        const attrValue = el.getAttribute('v-text');
        const dataValue = data[attrValue];

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

    export    function updateText(data) {

      const parameterName = Object.keys(obj)[0];  // "product"
      const text = obj[parameterName];            // "product"
      
      const el = document.querySelector(`[text-${parameterName}]`);
      if (el) {
        el.textContent = text;
      }
    }

 export   function updateSrc(obj) {
      const parameterName = Object.keys(obj)[0];  // "product"
      const text = obj[parameterName];            // "product"
      const el = document.querySelector(`[src-${parameterName}]`);
      if (el) {
        el.src = text;
      }
    }