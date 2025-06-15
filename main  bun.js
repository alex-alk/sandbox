// Simple Vue-like template parser + renderer with @click event support

function h(tag, props = {}, children = []) {
  return { tag, props, children };
}

function parseVNodeFromHTML(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();

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
        tokens.push(match[1]); // dynamic expression
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
      for (const child of node.childNodes) {
        const v = walk(child);
        if (v !== null && v !== '') children.push(v);
      }

      return h(tag, props, children);
    }

    return null;
  }

  return walk(template.content.firstElementChild);
}

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

  for (const key in vnode.props) {
    if (key.startsWith('@')) {
      // event listener e.g. @click="addToCart"
      const eventName = key.slice(1);
      const handlerName = vnode.props[key];
      const handler = ctx[handlerName];
      if (typeof handler === 'function') {
        el.addEventListener(eventName, handler.bind(ctx));
      }
    } else {
      el.setAttribute(key, vnode.props[key]);
    }
  }

  vnode.children.forEach(child => {
    el.appendChild(render(child, ctx, dynamicNodes));
  });

  return el;
}

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

// Example usage

const template = `
  <div>
    <h1>Count: {{ count }}</h1>
    <button class="button" @click="addToCart">Add to Cart</button>
  </div>
`;

const ctx = {
  count: 0,
  addToCart() {
    this.count++;
    patch(this, dynamicNodes);
  }
};

let dynamicNodes = [];
const vnode = parseVNodeFromHTML(template);
const app = document.getElementById('app');

function mount() {
  app.innerHTML = '';
  dynamicNodes = [];
  app.appendChild(render(vnode, ctx, dynamicNodes));
}

mount();
