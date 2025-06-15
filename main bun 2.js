// Virtual Node helper
function h(tag, props = {}, children = []) {
  return { tag, props, children };
}

// Escape HTML utility (basic)
function e(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Parse HTML string with mandatory <template> root, return array of VNodes for children
function parseVNodeFromHTML(html) {
  const container = document.createElement('template');
  container.innerHTML = html.trim();

  const root = container.content.firstElementChild;
  if (!root || root.tagName.toLowerCase() !== 'template') {
    throw new Error('Root node must be a <template>');
  }

  function walk(node) {
    if (!node) return null;

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
      if (tokens.length === 1) {
        const t = tokens[0];
        if (t.startsWith('"') && t.endsWith('"')) {
          return JSON.parse(t);
        }
        return { type: 'dynamicText', expr: t };
      }
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
      return h(tag, props, children);
    }
    return null;
  }

  // Parse all children of <template> and return array of VNodes
  const childrenVNodes = [];
  root.content.childNodes.forEach(child => {
    const v = walk(child);
    if (v !== null && v !== '') childrenVNodes.push(v);
  });

  return childrenVNodes;
}

// Render VNode or text node, collect dynamic text nodes and handle @click
function render(vnode, ctx, dynamicNodes = []) {
  if (typeof vnode === 'string') {
    return document.createTextNode(vnode);
  }
  if (vnode.type === 'dynamicText') {
    let text = '';
    try {
      text = new Function(...Object.keys(ctx), `return ${vnode.expr}`)(...Object.values(ctx));
    } catch {
      text = '';
    }
    const textNode = document.createTextNode(text);
    dynamicNodes.push({ vnode, textNode });
    return textNode;
  }
  const el = document.createElement(vnode.tag);

  // Set attributes and event listeners
  for (const key in vnode.props) {
    const val = vnode.props[key];
    if (key.startsWith('@')) {
      // Event handler like @click="addToCart"
      const eventName = key.slice(1);
      if (typeof ctx[val] === 'function') {
        el.addEventListener(eventName, ctx[val].bind(ctx));
      }
    } else {
      el.setAttribute(key, val);
    }
  }

  vnode.children.forEach(child => {
    el.appendChild(render(child, ctx, dynamicNodes));
  });
  return el;
}

// Patch dynamic text nodes when context changes
function patch(ctx, dynamicNodes) {
  dynamicNodes.forEach(({ vnode, textNode }) => {
    let newText = '';
    try {
      newText = new Function(...Object.keys(ctx), `return ${vnode.expr}`)(...Object.values(ctx));
    } catch {
      newText = '';
    }
    if (textNode.textContent !== newText) {
      textNode.textContent = newText;
    }
  });
}

// EXAMPLE usage:

const template = `
  <template>
    <h1>Count: {{ count }}</h1>
    <button class="button" @click="addToCart">Add to Cart</button>
  </template>
`;

const ctx = {
  count: 10,
  addToCart() {
    this.count++;
    patch(this, dynamicNodes);
  }
};

const app = document.getElementById('app');
app.innerHTML = '';

const dynamicNodes = [];
const vnodes = parseVNodeFromHTML(template);
vnodes.forEach(vnode => {
  app.appendChild(render(vnode, ctx, dynamicNodes));
});
