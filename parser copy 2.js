// framework.js

// 1) Parse your <template> into a VNode tree
export function parseTemplate(templateStr) {
  const container = document.createElement('div');
  container.innerHTML = templateStr.trim();
  const tpl = container.querySelector('template');
  if (!tpl) {
    throw new Error('Your component.template must have a <template> root');
  }

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const re = /\{\{\s*(.+?)\s*\}\}/g;
      let last = 0, m, tokens = [];
      while ((m = re.exec(text))) {
        if (m.index > last) tokens.push(JSON.stringify(text.slice(last, m.index)));
        tokens.push(m[1]);
        last = re.lastIndex;
      }
      if (last < text.length) tokens.push(JSON.stringify(text.slice(last)));
      if (tokens.length === 0) return text;
      if (tokens.length === 1) {
        const t = tokens[0];
        if (t.startsWith('"') && t.endsWith('"')) return JSON.parse(t);
        return { type: 'dynamicText', expr: t };
      }
      return { type: 'dynamicText', expr: tokens.join(' + ') };
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      const props = {};
      for (const attr of node.attributes) props[attr.name] = attr.value;
      const children = [];
      node.childNodes.forEach(child => {
        const v = walk(child);
        if (v != null && v !== '') children.push(v);
      });
      return { tag, props, children };
    }
    return null;
  }

  return Array.from(tpl.content.childNodes)
    .map(walk)
    .filter(v => v != null && v !== '');
}

// 2) Render into DOM, tracking dynamic text and dynamic attributes
export function render(vnode, ctx, dynamicNodes = [], dynamicAttrs = []) {
  if (typeof vnode === 'string') return document.createTextNode(vnode);
  if (vnode.type === 'dynamicText') {
    let txt = '';
    try {
      txt = new Function(...Object.keys(ctx), `return ${vnode.expr}`)(...Object.values(ctx));
    } catch {
      txt = '';
    }
    const tn = document.createTextNode(txt);
    dynamicNodes.push({ vnode, textNode: tn });
    return tn;
  }
  const el = document.createElement(vnode.tag);

  // handle props (static and dynamic)
  for (const [key, val] of Object.entries(vnode.props)) {
    if (key.startsWith(':') || key.startsWith('v-bind:')) {
      // dynamic attribute
      const attrName = key.startsWith(':') ? key.slice(1) : key.slice(7);
      // evaluate initial
      let evaluated = '';
      try {
        evaluated = new Function(...Object.keys(ctx), `return ${val}`)(...Object.values(ctx));
      } catch {
        evaluated = '';
      }
      if (evaluated != null) el.setAttribute(attrName, evaluated);
      // track for patching
      dynamicAttrs.push({ vnode, el, attrName, expr: val });
    } else if (key.startsWith('@')) {
      // event listener
      const event = key.slice(1);
      if (typeof ctx[val] === 'function') {
        el.addEventListener(event, e => {
          ctx[val].call(ctx, e);
          // after handler, patch both text and attributes
          patch(ctx, dynamicNodes, dynamicAttrs);
        });
      }
    } else {
      // static attribute
      el.setAttribute(key, val);
    }
  }

  vnode.children.forEach(child => {
    el.appendChild(render(child, ctx, dynamicNodes, dynamicAttrs));
  });
  return el;
}

// 3) Patch: update dynamic text and attributes
export function patch(ctx, dynamicNodes, dynamicAttrs) {
  // text
  for (const { vnode, textNode } of dynamicNodes) {
    let newText = '';
    try {
      newText = new Function(...Object.keys(ctx), `return ${vnode.expr}`)(...Object.values(ctx));
    } catch {
      newText = '';
    }
    if (textNode.textContent !== newText) {
      textNode.textContent = newText;
    }
  }
  // attributes
  for (const { el, attrName, expr } of dynamicAttrs) {
    let newVal = '';
    try {
      newVal = new Function(...Object.keys(ctx), `return ${expr}`)(...Object.values(ctx));
    } catch {
      newVal = '';
    }
    if (newVal != null) {
      el.setAttribute(attrName, newVal);
    }
  }
}

// 4) createApp: mounts your component and returns a reactive ctx
export function createApp(component) {
  return {
    mount(selector) {
      const root = document.querySelector(selector);
      if (!root) throw new Error(`Cannot find element "${selector}"`);
      const ctx = component.data;
      const dynamicNodes = [];
      const dynamicAttrs = [];
      const vnodes = parseTemplate(component.template);

      root.innerHTML = '';
      for (const vnode of vnodes) {
        root.appendChild(render(vnode, ctx, dynamicNodes, dynamicAttrs));
      }

      // proxy your data so assignments auto-patch
      return new Proxy(ctx, {
        set(target, prop, val) {
          target[prop] = val;
          patch(ctx, dynamicNodes, dynamicAttrs);
          return true;
        }
      });
    }
  };
}
