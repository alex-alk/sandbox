// main.js

export function ref(initialValue) {
  let _value = initialValue;
  const subscribers = new Set();

  function notify() {
    subscribers.forEach(cb => cb(_value));
  }

  return {
    get value() { return _value; },
    set value(newVal) {
      _value = newVal;
      notify();
    },
    subscribe(cb) {
      subscribers.add(cb);
      // Optionally return unsubscribe function:
      return () => subscribers.delete(cb);
    }
  }
}


// Process {{ variable }} interpolations inside root node
export function processInterpolations(refs, root) {
  if (!(root instanceof Node)) {
    throw new TypeError("root must be a Node");
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  const mustacheRE = /{{\s*([^}\s]+)\s*}}/g;

  let node;
  while ((node = walker.nextNode())) {
    const originalText = node.textContent;
    if (!mustacheRE.test(originalText)) continue;
    mustacheRE.lastIndex = 0;

    const computeText = () =>
      originalText.replace(mustacheRE, (_, key) => {
        if (refs[key]) return refs[key].value;
        return `{{ ${key} }}`;
      });

    node.textContent = computeText();

    mustacheRE.lastIndex = 0;
    let match;
    while ((match = mustacheRE.exec(originalText)) !== null) {
      const key = match[1];
      const refObj = refs[key];
      if (refObj && typeof refObj.subscribe === "function") {
        refObj.subscribe(() => {
          node.textContent = computeText();
        });
      }
    }
  }
}

// Process v-bind:attr="refName" bindings
export function processBindings(refs, root) {
  if (!(root instanceof Node)) {
    throw new TypeError("root must be a Node");
  }
  // Find elements with attributes starting with 'v-bind:'
  const elements = root.querySelectorAll('*');

  elements.forEach(el => {
    for (const attr of el.attributes) {
      if (attr.name.startsWith('v-bind:')) {
        const attrName = attr.name.slice('v-bind:'.length); // e.g., "src"
        const refName = attr.value.trim();

        const refObj = refs[refName];
        if (!refObj || typeof refObj.subscribe !== "function") continue;

        // Initial set
        el.setAttribute(attrName, refObj.value);

        // Subscribe to changes
        refObj.subscribe((newVal) => {
          if (newVal == null || newVal === false) {
            el.removeAttribute(attrName);
          } else {
            el.setAttribute(attrName, newVal);
          }
        });
      }
    }
  });
}

export function processConditionals(refs, root) {
  if (!(root instanceof Node)) throw new TypeError("root must be a Node");

  const allEls = root.querySelectorAll('[v-if], [v-else]');
  const vIfMap = new Map();

  // Process v-if elements first
  allEls.forEach(el => {
    if (el.hasAttribute('v-if')) {
      const expr = el.getAttribute('v-if').trim();
      const refObj = refs[expr];

      const getValue = () => {
        if (refObj !== undefined && refObj !== null && typeof refObj === 'object' && 'value' in refObj) {
            return refObj.value;
        } else if (refObj !== undefined) {
            return refObj;
        }
        return !!expr;
        }

      const updateDisplay = (val) => {
        el.style.display = val ? '' : 'none';
        vIfMap.set(el, val);

        // Also update corresponding v-else if exists
        const next = el.nextElementSibling;
        if (next && next.hasAttribute('v-else')) {
          next.style.display = val ? 'none' : '';
        }
      };

      // Initial display
      updateDisplay(getValue());

      // Subscribe to reactive changes
      if (refObj && typeof refObj.subscribe === 'function') {
        refObj.subscribe((newVal) => {
          updateDisplay(newVal);
        });
      }
    }
  });

  // Now handle standalone v-else elements without a preceding v-if sibling
  allEls.forEach(el => {
    if (el.hasAttribute('v-else')) {
      // Check if previous sibling has v-if — if not, warn or hide
      let prev = el.previousElementSibling;
      while (prev && !prev.hasAttribute('v-if')) {
        prev = prev.previousElementSibling;
      }
      if (!prev) {
        console.warn('v-else element has no preceding v-if sibling', el);
        el.style.display = 'none';  // Hide since no paired v-if
      }
    }
  });
}

export function processFor(refs, root) {
  if (!(root instanceof Node)) throw new TypeError("root must be a Node");

  const els = root.querySelectorAll('[v-for]');

  els.forEach(el => {
    const expr = el.getAttribute('v-for').trim(); // e.g. "detail in details"
    const match = expr.match(/^(\w+)\s+in\s+(\w+)$/);
    if (!match) {
      console.warn(`Invalid v-for expression: ${expr}`);
      return;
    }
    const [_, itemName, listName] = match;
    const listRef = refs[listName];
    if (!listRef || !Array.isArray(listRef.value)) {
      console.warn(`v-for list ${listName} is not an array`);
      return;
    }

    const parent = el.parentNode;
    const placeholder = document.createComment(`v-for placeholder for ${expr}`);
    parent.insertBefore(placeholder, el);
    parent.removeChild(el);

    // Function to render list based on current value
    function renderList(arr) {
      // Remove previous rendered nodes after placeholder
      let next;
      while ((next = placeholder.nextSibling) && !next.isSameNode(parent.lastChild)) {
        if (next._vfor) parent.removeChild(next);
        else break;
      }

      // Remove any nodes marked _vfor
      let node = placeholder.nextSibling;
      while (node && node._vfor) {
        const toRemove = node;
        node = node.nextSibling;
        parent.removeChild(toRemove);
      }

      // Render new nodes
      arr.forEach(item => {
        const clone = el.cloneNode(true);
        clone.removeAttribute('v-for');
        clone._vfor = true; // mark node for cleanup

        // Replace text nodes with interpolation {{ itemName }} or {{ itemName.prop }}
        replaceInterpolationsInNode(clone, itemName, item);

        parent.insertBefore(clone, placeholder.nextSibling);
      });
    }

    // Initial render
    renderList(listRef.value);

    // Subscribe to reactive changes
    if (typeof listRef.subscribe === 'function') {
      listRef.subscribe(renderList);
    }
  });
}

function replaceInterpolationsInNode(node, itemName, item) {
  // If it's a text node, replace interpolation text
  if (node.nodeType === Node.TEXT_NODE) {
    node.textContent = node.textContent.replace(/\{\{\s*(.+?)\s*\}\}/g, (match, p1) => {
      if (p1 === itemName) return item;
      if (p1.startsWith(itemName + '.')) {
        const prop = p1.slice(itemName.length + 1);
        return item[prop] ?? '';
      }
      return match;
    });
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    // Otherwise, recurse on child nodes
    node.childNodes.forEach(child => replaceInterpolationsInNode(child, itemName, item));
  }
}


