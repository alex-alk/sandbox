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

function render(vnode, ctx, dynamicNodes, scope = {}, elseBlock = { skipNextElse: false }) {
  // Text node
  if (typeof vnode === 'string') {
    return document.createTextNode(vnode);
  }

  // Dynamic text node
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

  // Guard if props is missing (text nodes or null)
  const props = vnode.props || {};

  // Handle v-if
  if ('v-if' in props) {
    let show = false;
    try {
      const fullCtx = { ...ctx, ...scope };
      show = new Function(...Object.keys(fullCtx), `return ${props['v-if']}`)(...Object.values(fullCtx));
    } catch {
      show = false;
    }
    if (!show) {
      elseBlock.skipNextElse = false; // mark that this v-if failed, so next v-else can run
      return document.createComment('v-if');
    } else {
      elseBlock.skipNextElse = true; // v-if passed, skip next v-else
    }
  } else if ('v-else' in props) {
    // If previous v-if failed, show this; otherwise skip
    if (elseBlock.skipNextElse) {
      return document.createComment('v-else');
    }
    // elseBlock.skipNextElse = false; // reset
  } else {
    // If no v-if or v-else, reset elseBlock flag so next v-else is not skipped incorrectly
    elseBlock.skipNextElse = false;
  }

  // Handle v-for
  if ('v-for' in props) {
    // e.g. v-for="item in items"
    const [item, listExpr] = props['v-for'].split(' in ').map(s => s.trim());
    let list = [];
    try {
      const fullCtx = { ...ctx, ...scope };
      list = new Function(...Object.keys(fullCtx), `return ${listExpr}`)(...Object.values(fullCtx));
    } catch {
      list = [];
    }
    const el = document.createElement(vnode.tag);

    list.forEach(value => {
      const childScope = { ...scope, [item]: value };
      // Clone vnode without v-for to avoid infinite recursion
      const clone = deepClone(vnode);
      delete clone.props['v-for'];
      // Render children with current loop scope
      el.appendChild(render(clone, ctx, dynamicNodes, childScope, elseBlock));
    });
    return el;
  }

  // Create element
  const el = document.createElement(vnode.tag);

  // Set attributes and event listeners
  for (const key in props) {
    const val = props[key];
    if (key.startsWith('v-bind:') || key.startsWith(':')) {
      const attr = key.split(':')[1];
      try {
        const fullCtx = { ...ctx, ...scope };
        const evaluated = new Function(...Object.keys(fullCtx), `return ${val}`)(...Object.values(fullCtx));
        el.setAttribute(attr, evaluated);
      } catch {
        // fail silently
      }
    } else if (key.startsWith('v-on:') || key.startsWith('@')) {
      const event = key.includes(':') ? key.split(':')[1] : key.slice(1);
      try {
        if (typeof ctx[val] === 'function') {
          el.addEventListener(event, ctx[val].bind(ctx));
        } else {
          // For inline expressions (like @click="cart++")
          const fullCtx = { ...ctx, ...scope };
          el.addEventListener(event, () => {
            try {
              new Function(...Object.keys(fullCtx), val)(...Object.values(fullCtx));
              if (typeof ctx.__patch === 'function') ctx.__patch();
            } catch {}
          });
        }
      } catch {}
    } else if (!key.startsWith('v-')) {
      el.setAttribute(key, val);
    }
  }

  // Render children
  vnode.children.forEach(child => {
    el.appendChild(render(child, ctx, dynamicNodes, scope, elseBlock));
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

// Deep clone helper (simple)
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
