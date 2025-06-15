// framework.js

// 1) Parse your <template> into a VNode tree
export function parseTemplate(templateStr) {
  const container = document.createElement('div');
  container.innerHTML = templateStr.trim();
  const tpl = container.querySelector('template');
  if (!tpl) throw new Error('Your component.template must have a <template> root');

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
      if (!tokens.length) return text;
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

// 2) Render into DOM, tracking dynamic text, attributes, conditions, and v-for
export function render(vnode, ctx, dynamicNodes = [], dynamicAttrs = [], dynamicConds = []) {
  // Text node
  if (typeof vnode === 'string') return document.createTextNode(vnode);

  // Dynamic text
  if (vnode.type === 'dynamicText') {
    let txt = '';
    try { txt = new Function(...Object.keys(ctx), `return ${vnode.expr}`)(...Object.values(ctx)); }
    catch { txt = ''; }
    const tn = document.createTextNode(txt);
    dynamicNodes.push({ vnode, textNode: tn });
    return tn;
  }

  // v-for directive
  if (vnode.props['v-for']) {
    const exp = vnode.props['v-for'].trim();
    const match = exp.match(/^\s*(\w+)(?:,\s*(\w+))?\s+in\s+(.+)$/);
    if (!match) throw new Error(`Invalid v-for expression: ${exp}`);
    const [, itemVar, indexVar, listExpr] = match;
    let list = [];
    try { list = new Function(...Object.keys(ctx), `return ${listExpr}`)(...Object.values(ctx)); }
    catch { list = []; }
    if (!Array.isArray(list)) list = [];

    const frag = document.createDocumentFragment();
    list.forEach((item, idx) => {
      const childCtx = Object.create(ctx);
      childCtx[itemVar] = item;
      if (indexVar) childCtx[indexVar] = idx;
      const clone = { tag: vnode.tag, props: { ...vnode.props }, children: vnode.children };
      delete clone.props['v-for'];
      frag.appendChild(render(clone, childCtx, dynamicNodes, dynamicAttrs, dynamicConds));
    });
    return frag;
  }

  // Element node
  const el = document.createElement(vnode.tag);

  // v-if / v-else
  if ('v-if' in vnode.props || 'v-else' in vnode.props) {
    let expr;
    if ('v-if' in vnode.props) expr = vnode.props['v-if'];
    else {
      const prev = dynamicConds[dynamicConds.length - 1];
      expr = prev ? `!(${prev.expr})` : 'false';
    }
    let show = false;
    try { show = new Function(...Object.keys(ctx), `return ${expr}`)(...Object.values(ctx)); }
    catch { show = false; }
    el.style.display = show ? '' : 'none';
    dynamicConds.push({ el, expr });
  }

  // Attributes (static, dynamic)
  for (const [key, val] of Object.entries(vnode.props)) {
    if (key === 'v-if' || key === 'v-else') continue;
    if (key.startsWith(':') || key.startsWith('v-bind:')) {
      const attrName = key.startsWith(':') ? key.slice(1) : key.slice(7);
      let evaluated = '';
      try { evaluated = new Function(...Object.keys(ctx), `return ${val}`)(...Object.values(ctx)); }
      catch { evaluated = ''; }
      if (evaluated != null) el.setAttribute(attrName, evaluated);
      dynamicAttrs.push({ el, attrName, expr: val });
    } else if (key.startsWith('@')) {
      const event = key.slice(1);
      if (typeof ctx[val] === 'function') {
        el.addEventListener(event, e => { ctx[val].call(ctx, e); patch(ctx, dynamicNodes, dynamicAttrs, dynamicConds); });
      }
    } else {
      el.setAttribute(key, val);
    }
  }

  // Children
  vnode.children.forEach(child => {
    el.appendChild(render(child, ctx, dynamicNodes, dynamicAttrs, dynamicConds));
  });
  return el;
}

// 3) Patch: update dynamic text, attributes, and conditions
export function patch(ctx, dynamicNodes, dynamicAttrs, dynamicConds) {
  for (const { vnode, textNode } of dynamicNodes) {
    let newText = '';
    try { newText = new Function(...Object.keys(ctx), `return ${vnode.expr}`)(...Object.values(ctx)); }
    catch { newText = ''; }
    if (textNode.textContent !== newText) textNode.textContent = newText;
  }
  for (const { el, attrName, expr } of dynamicAttrs) {
    let newVal = '';
    try { newVal = new Function(...Object.keys(ctx), `return ${expr}`)(...Object.values(ctx)); }
    catch { newVal = ''; }
    if (newVal != null) el.setAttribute(attrName, newVal);
  }
  for (const { el, expr } of dynamicConds) {
    let show = false;
    try { show = new Function(...Object.keys(ctx), `return ${expr}`)(...Object.values(ctx)); }
    catch { show = false; }
    el.style.display = show ? '' : 'none';
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
      const dynamicConds = [];
      const vnodes = parseTemplate(component.template);

      root.innerHTML = '';
      for (const vnode of vnodes) {
        root.appendChild(render(vnode, ctx, dynamicNodes, dynamicAttrs, dynamicConds));
      }

      return new Proxy(ctx, {
        set(target, prop, val) {
          target[prop] = val;
          patch(ctx, dynamicNodes, dynamicAttrs, dynamicConds);
          return true;
        }
      });
    }
  };
}
