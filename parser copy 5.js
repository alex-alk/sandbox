// parser.js

export function createApp(component) {
  const state = reactive(component.data);
  const dynamicNodes = [];
  const vnodes = parseTemplate(component.template);
  const app = document.getElementById('app');

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

function render(vnode, ctx, dynamicNodes, scope = {}) {
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
  if (vnode.props['v-if']) {
    const cond = vnode.props['v-if'];
    const show = new Function(...Object.keys(ctx), `return ${cond}`)(...Object.values(ctx));
    if (!show) return document.createComment('v-if');
  }

  const el = document.createElement(vnode.tag);

  for (const key in vnode.props) {
    const val = vnode.props[key];
    if (key.startsWith('v-bind:') || key.startsWith(':')) {
      const attr = key.split(':')[1];
      el.setAttribute(attr, ctx[val]);
    } else if (key.startsWith('v-on:') || key.startsWith('@')) {
      const event = key.includes(':') ? key.split(':')[1] : key.slice(1);
      if (typeof ctx[val] === 'function') {
        el.addEventListener(event, ctx[val].bind(ctx));
      }
    } else if (!key.startsWith('v-')) {
      el.setAttribute(key, val);
    }
  }

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

  vnode.children.forEach(child => {
    el.appendChild(render(child, ctx, dynamicNodes, scope));
  });
  return el;
}

function patch(ctx, dynamicNodes) {
  dynamicNodes.forEach(({ vnode, textNode, scope = {} }) => {
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
