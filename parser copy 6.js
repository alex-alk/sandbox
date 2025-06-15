// parser.js

export function createApp(component) {
  const state = reactive(component.data);
  const dynamicNodes = [];
  const vnodes = parseTemplate(component.template);
  const app = document.getElementById('app');
  app.innerHTML = ''; // clear before mount

  vnodes.forEach(vnode => {
    app.appendChild(render(vnode, state, dynamicNodes));
  });

  state.__patch = () => patch(state, dynamicNodes);
  return state;
}

function reactive(obj) {
  return new Proxy(obj, {
    set(target, key, value) {
      target[key] = value;
      if (typeof target.__patch === 'function') target.__patch();
      return true;
    }
  });
}

function parseTemplate(html) {
  const container = document.createElement('template');
  container.innerHTML = html.trim();

  const root = container.content.firstElementChild;
  if (!root || root.tagName.toLowerCase() !== 'template') {
    throw new Error('Root node must be a <template>');
  }

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const regex = /\{\{\s*(.+?)\s*\}\}/g;
      let lastIndex = 0;
      const tokens = [];
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          tokens.push(JSON.stringify(text.slice(lastIndex, match.index)));
        }
        tokens.push(match[1]);
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        tokens.push(JSON.stringify(text.slice(lastIndex)));
      }

      if (tokens.length === 0) return text;
      if (tokens.length === 1) return { type: 'dynamicText', expr: tokens[0] };
      return { type: 'dynamicText', expr: tokens.join(' + ') };
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      const props = {};
      for (const attr of node.attributes) {
        props[attr.name] = attr.value;
      }
      const children = [];
      node.childNodes.forEach(child => {
        const v = walk(child);
        if (v !== null && v !== '') children.push(v);
      });
      return { tag, props, children };
    }
    return null;
  }

  const children = [];
  root.content.childNodes.forEach(child => {
    const v = walk(child);
    if (v !== null && v !== '') children.push(v);
  });
  return children;
}

// Helper: Create element (without v-if and v-for, those handled outside)
function createElement(vnode, ctx, dynamicNodes, scope) {
  const el = document.createElement(vnode.tag);

  // Set attributes and event listeners
  for (const key in vnode.props) {
    const val = vnode.props[key];

    // Skip directives handled elsewhere
    if (key === 'v-if' || key === 'v-for' || key === 'v-else' || key === 'v-else-if') continue;

    if (key.startsWith('v-bind:') || key.startsWith(':')) {
      // e.g. v-bind:src="image" or :src="image"
      const attr = key.includes(':') ? key.split(':')[1] : key.slice(1);
      try {
        const value = new Function(...Object.keys(ctx), ...Object.keys(scope), `return ${val}`)(...Object.values(ctx), ...Object.values(scope));
        el.setAttribute(attr, value);
      } catch {
        el.setAttribute(attr, val);
      }
    } else if (key.startsWith('v-on:') || key.startsWith('@')) {
      // e.g. v-on:click="addToCart" or @click="addToCart"
      const event = key.includes(':') ? key.split(':')[1] : key.slice(1);
      if (typeof ctx[val] === 'function') {
        el.addEventListener(event, ctx[val].bind(ctx));
      }
    } else {
      el.setAttribute(key, val);
    }
  }

  vnode.children.forEach(child => {
    el.appendChild(render(child, ctx, dynamicNodes, scope));
  });

  return el;
}

function render(vnode, ctx, dynamicNodes, scope = {}, parentContext = { lastIfPassed: true }) {
  if (typeof vnode === 'string') {
    return document.createTextNode(vnode);
  }
  if (vnode.type === 'dynamicText') {
    let text = '';
    try {
      const fullCtx = { ...ctx, ...scope };
      text = new Function(...Object.keys(fullCtx), `return ${vnode.expr}`)(...Object.values(fullCtx));
    } catch {
      text = '';
    }
    const textNode = document.createTextNode(text);
    dynamicNodes.push({ vnode, textNode, scope });
    return textNode;
  }

  // Handle v-if and v-else
  if (vnode.props['v-if']) {
    const cond = vnode.props['v-if'];
    const fullCtx = { ...ctx, ...scope };
    let show = false;
    try {
      show = new Function(...Object.keys(fullCtx), `return ${cond}`)(...Object.values(fullCtx));
    } catch {
      show = false;
    }
    parentContext.lastIfPassed = show; // store for siblings
    if (!show) return document.createComment('v-if');
  } else if (vnode.props['v-else'] !== undefined) {
    // Render only if last sibling v-if was false
    if (parentContext.lastIfPassed) {
      return document.createComment('v-else');
    }
    parentContext.lastIfPassed = false; // reset for subsequent siblings
  } else {
    // reset for non-if/else siblings
    parentContext.lastIfPassed = true;
  }

  const el = document.createElement(vnode.tag);

  // v-for handling (keep it above children rendering)
  if (vnode.props['v-for']) {
    const [item, listExpr] = vnode.props['v-for'].split(' in ');
    const list = new Function(...Object.keys(ctx), `return ${listExpr}`)(...Object.values(ctx));
    list.forEach(value => {
      const childScope = { [item.trim()]: value };
      const cloned = JSON.parse(JSON.stringify({ ...vnode, props: { ...vnode.props } }));
      delete cloned.props['v-for'];
      const node = render(cloned, ctx, dynamicNodes, childScope);
      el.appendChild(node);
    });
    return el;
  }

  // Attributes & events
  for (const key in vnode.props) {
    const val = vnode.props[key];
    if (key.startsWith('v-bind:') || key.startsWith(':')) {
      const attr = key.split(':')[1];
      const fullCtx = { ...ctx, ...scope };
      try {
        const attrVal = new Function(...Object.keys(fullCtx), `return ${val}`)(...Object.values(fullCtx));
        el.setAttribute(attr, attrVal);
      } catch {
        // fail silently
      }
    } else if (key.startsWith('v-on:') || key.startsWith('@')) {
      const event = key.includes(':') ? key.split(':')[1] : key.slice(1);
      if (typeof ctx[val] === 'function') {
        el.addEventListener(event, ctx[val].bind(ctx));
      }
    } else if (!key.startsWith('v-')) {
      el.setAttribute(key, val);
    }
  }

  // Render children with new parentContext (track v-if/v-else sequence among siblings)
  vnode.children.forEach(child => {
    el.appendChild(render(child, ctx, dynamicNodes, scope, { lastIfPassed: true }));
  });

  return el;
}


function patch(ctx, dynamicNodes) {
  dynamicNodes.forEach(node => {
    if (node.type === 'if') {
      const fullCtx = { ...ctx, ...node.scope };
      let shouldShow = false;
      try {
        shouldShow = new Function(...Object.keys(fullCtx), `return ${node.expr}`)(...Object.values(fullCtx));
      } catch {}

      const parent = node.el ? node.el.parentNode : node.placeholder.parentNode;
      if (!parent) return;

      if (shouldShow && !node.el) {
        // create new element and replace placeholder
        const newEl = createElement(node.vnode, ctx, dynamicNodes, node.scope);
        parent.replaceChild(newEl, node.placeholder);
        node.el = newEl;
      } else if (!shouldShow && node.el) {
        // replace element with placeholder
        parent.replaceChild(node.placeholder, node.el);
        node.el = null;
      }
      return;
    }

    // patch dynamicText nodes
    const { vnode, textNode, scope = {} } = node;
    let newText = '';
    try {
      const fullCtx = { ...ctx, ...scope };
      newText = new Function(...Object.keys(fullCtx), `return ${vnode.expr}`)(...Object.values(fullCtx));
    } catch {
      newText = '';
    }
    if (textNode.textContent !== newText) {
      textNode.textContent = newText;
    }
  });
}
