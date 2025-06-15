

function h(tag, props = {}, children = []) {
  return { tag, props, children };
}

function parseTemplate(template) {
  const container = document.createElement('div');
  container.innerHTML = template.trim();

  const tpl = container.querySelector('template');
  let nodesToParse;
  if (tpl) {
    nodesToParse = tpl.content.childNodes;
  } else {
    nodesToParse = container.childNodes;
  }

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const tokens = [];
      let lastIndex = 0;
      const regex = /\{\{\s*(.+?)\s*\}\}/g;
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

      if (tokens.length === 0) return '';
      if (tokens.length === 1) {
        const t = tokens[0];
        if (t.startsWith('"') && t.endsWith('"')) {
          return t.slice(1, -1);
        } else {
          return { type: 'dynamicText', expr: t };
        }
      }
      return { type: 'dynamicText', expr: tokens.join(' + ') };
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      const props = {};
      for (const attr of node.attributes) {
        props[attr.name] = attr.value;
      }
      const children = [];
      node.childNodes.forEach(child => {
        const childVNode = walk(child);
        if (childVNode !== '') children.push(childVNode);
      });
      return h(tag, props, children);
    }
    return '';
  }

  const vnodes = [];
  nodesToParse.forEach(node => {
    const vnode = walk(node);
    if (vnode !== '') vnodes.push(vnode);
  });
  return vnodes;
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
    el.setAttribute(key, vnode.props[key]);
  }
  vnode.children.forEach(child => {
    el.appendChild(render(child, ctx, dynamicNodes));
  });
  return el;
}

function patch(ctx) {
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

const template = `
  <template>
    <div>{{ constant }}</div>
    <div>{{ variable }}</div>
    <button id="btn">Update Variable</button>
  </template>
`;

const ctx = {
  constant: 'I do not change',
  variable: 'Initial variable'
};

const dynamicNodes = [];
const vnodes = parseTemplate(template);

const app = document.getElementById('app');
vnodes.forEach(vnode => app.appendChild(render(vnode, ctx, dynamicNodes)));

document.getElementById('btn').addEventListener('click', () => {
  ctx.variable = `Updated at ${new Date().toLocaleTimeString()}`;
  patch(ctx);
});
