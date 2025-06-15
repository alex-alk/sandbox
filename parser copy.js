// framework.js

// 1) Turn your <template> string into a VNode tree
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

// 2) Render into DOM, tracking dynamic text
export function render(vnode, ctx, dynamicNodes = []) {
  if (typeof vnode === 'string') return document.createTextNode(vnode);
  if (vnode.type === 'dynamicText') {
    let txt = '';
    try {
      txt = new Function(...Object.keys(ctx), `return ${vnode.expr}`)(
        ...Object.values(ctx)
      );
    } catch {
      txt = '';
    }
    const tn = document.createTextNode(txt);
    dynamicNodes.push({ vnode, textNode: tn });
    return tn;
  }
  const el = document.createElement(vnode.tag);
  for (const [k, v] of Object.entries(vnode.props)) {
    el.setAttribute(k, v);
  }
  vnode.children.forEach(child => {
    el.appendChild(render(child, ctx, dynamicNodes));
  });
  return el;
}

// 3) Patch: update all tracked text nodes
export function patch(ctx, dynamicNodes) {
  for (const { vnode, textNode } of dynamicNodes) {
    let newText = '';
    try {
      newText = new Function(...Object.keys(ctx), `return ${vnode.expr}`)(
        ...Object.values(ctx)
      );
    } catch {
      newText = '';
    }
    if (textNode.textContent !== newText) {
      textNode.textContent = newText;
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
      const vnodes = parseTemplate(component.template);

      root.innerHTML = '';
      for (const vnode of vnodes) {
        root.appendChild(render(vnode, ctx, dynamicNodes));
      }

      // proxy your data so assignments auto-patch
      return new Proxy(ctx, {
        set(target, prop, val) {
          target[prop] = val;
          patch(ctx, dynamicNodes);
          return true;
        }
      });
    }
  };
}
