// Minimal reactive system with interpolation support

export function ref(value) {
  const r = {
    _isRef: true,
    _val: value,
    _subs: [],
    get value() {
      return this._val;
    },
    set value(v) {
      this._val = v;
      this._subs.forEach(fn => fn());
    }
  };
  return r;
}

export function computed(fn) {
  const result = ref();
  const update = () => result.value = fn();
  update();
  const c = {
    _isComputed: true,
    get value() {
      return result.value;
    },
    _update: update,
    _subs: result._subs
  };
  return c;
}

export function reactive(obj) {
  const proxy = new Proxy(obj, {
    get(target, key) {
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      if (proxy._subs) proxy._subs.forEach(fn => fn());
      return true;
    }
  });
  proxy._subs = [];
  return proxy;
}

export function getState(data) {
  return data;
}

export function defineEmits(events, root) {
  return function emit(eventName, payload) {
    if (events.includes(eventName)) {
      root.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
    }
  };
}

export function bindReactive(state, component) {
  updateBinds(state, component);
}

export function updateText(vars, component) {
  for (const key in vars) {
    const els = component.querySelectorAll(`[v-text=${key}]`);
    els.forEach(el => el.textContent = vars[key]);
  }
}

export function updateTexts(vars, component) {
  for (const key in vars) {
    const val = vars[key];
    if (val && (val._isRef || val._isComputed)) {
      const els = component.querySelectorAll(`[v-text=${key}]`);
      val._subs.push(() => {
        els.forEach(el => el.textContent = val.value);
      });
    }
  }
  updateText(Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, v._isRef || v._isComputed ? v.value : v])
  ), component);
}

export function updateBinds(data, component) {
  for (const key in data) {
    const val = data[key];
    const selector = `[v-bind\\:src=${key}], [v-bind=${key}]`;
    const els = component.querySelectorAll(selector);
    els.forEach(el => {
      const update = () => el.setAttribute('src', val.value);
      update();
      if (val._subs) val._subs.push(update);
    });
  }
}

export function createEls(arrayMap, component) {
  for (const key in arrayMap) {
    const template = component.querySelector(`[v-for=${key}]`);
    if (!template) continue;
    const arr = arrayMap[key];
    const parent = template.parentNode;
    arr.forEach((item, i) => {
      const clone = template.cloneNode(true);
      clone.removeAttribute('v-for');
      clone.textContent = item;
      parent.appendChild(clone);
    });
    parent.removeChild(template);
  }
}

export function addEvent(type, methods, component) {
  const els = component.querySelectorAll(`[v-on\\:${type}], [@${type}]`);
  els.forEach(el => {
    const fnName = el.getAttribute(`v-on:${type}`) || el.getAttribute(`@${type}`);
    if (methods[fnName]) {
      el.addEventListener(type, methods[fnName]);
    }
  });
}

export function updateIf(vars, component) {
  for (const key in vars) {
    const val = vars[key];
    const els = component.querySelectorAll(`[v-if=${key}]`);
    val._subs.push(() => {
      els.forEach(el => {
        el.style.display = val.value ? '' : 'none';
      });
    });
    els.forEach(el => {
      el.style.display = val.value ? '' : 'none';
    });
  }
}

export function processInterpolations(component, state) {
  const walker = document.createTreeWalker(component, NodeFilter.SHOW_TEXT, null, false);
  const originalNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeValue.includes('{{')) {
      originalNodes.push({ node, template: node.nodeValue });
    }
  }
  const updateTextNodes = () => {
    for (const { node, template } of originalNodes) {
      node.nodeValue = template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
        const val = state[key];
        if (val?._isRef || val?._isComputed) return val.value;
        return val ?? '';
      });
    }
  };
  updateTextNodes();
  for (const key in state) {
    const val = state[key];
    if (val && (val._isRef || val._isComputed)) {
      if (!val._subs) val._subs = [];
      val._subs.push(updateTextNodes);
    }
  }
}
