// main.js

export function ref(initialValue) {
  let _value = initialValue;
  const subscribers = new Set();

  return {
    get value() {
      return _value;
    },
    set value(newVal) {
      if (_value !== newVal) {
        _value = newVal;
        subscribers.forEach((fn) => fn(_value));
      }
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
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
