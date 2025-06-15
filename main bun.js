function parseTemplate(templateStr) {
  const container = document.createElement("div");
  container.innerHTML = templateStr.trim();
  const templateEl = container.querySelector("template");
  if (!templateEl) {
    throw new Error("Root <template> is required");
  }

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (!text.trim()) return null;

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

      if (tokens.length === 0) {
        return text;
      } else if (tokens.length === 1) {
        const t = tokens[0];
        if (t.startsWith('"') && t.endsWith('"')) {
          return JSON.parse(t);
        }
        return { type: "dynamicText", expr: t };
      } else {
        return { type: "dynamicText", expr: tokens.join(" + ") };
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      const props = {};
      for (const attr of node.attributes) {
        props[attr.name] = attr.value;
      }
      const children = [];
      node.childNodes.forEach(child => {
        const v = walk(child);
        if (v !== null) children.push(v);
      });
      return { tag, props, children };
    }
    return null;
  }

  const vnodes = [];
  templateEl.content.childNodes.forEach(child => {
    const v = walk(child);
    if (v !== null) vnodes.push(v);
  });
  return vnodes;
}

function render(vnode, ctx, dynamicNodes = [], conditionalNodes = []) {
  if (typeof vnode === "string") {
    const tn = document.createTextNode(vnode);
    return { domNode: tn, vnode, dynamicNodes: [] };
  }
  if (vnode.type === "dynamicText") {
    let text = "";
    try {
      text = new Function(...Object.keys(ctx), `return ${vnode.expr}`)(
        ...Object.values(ctx)
      );
    } catch {
      text = "";
    }
    const tn = document.createTextNode(text);
    dynamicNodes.push({ vnode, textNode: tn });
    return { domNode: tn, vnode, dynamicNodes: [{ vnode, textNode: tn }] };
  }

  // Handle v-for
  if (vnode.props && vnode.props["v-for"]) {
    const vforExp = vnode.props["v-for"]; // e.g. "item in items"
    const match = vforExp.match(/^\s*(\w+)\s+in\s+(.+)\s*$/);
    if (!match) {
      throw new Error(`Invalid v-for expression: ${vforExp}`);
    }
    const [, itemVar, listExpr] = match;
    let list = [];
    try {
      list = new Function(...Object.keys(ctx), `return ${listExpr}`)(...Object.values(ctx));
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }

    const fragment = document.createDocumentFragment();
    const allDynamicNodes = [];

    list.forEach((item, index) => {
      // Create new context extending parent ctx with itemVar and optionally index
      const childCtx = Object.create(ctx);
      childCtx[itemVar] = item;
      childCtx["index"] = index;

      // Clone vnode but remove v-for to avoid recursion
      const clone = {
        tag: vnode.tag,
        props: { ...vnode.props },
        children: vnode.children
      };
      delete clone.props["v-for"];

      const { domNode, dynamicNodes: childDynamicNodes = [] } = render(clone, childCtx, [], conditionalNodes);
      fragment.appendChild(domNode);
      allDynamicNodes.push(...childDynamicNodes);
    });

    dynamicNodes.push(...allDynamicNodes);
    return { domNode: fragment, vnode, dynamicNodes: allDynamicNodes };
  }

  // Evaluate v-if condition
  let isShown = true;
  if (vnode.props && vnode.props["v-if"] !== undefined) {
    try {
      isShown = new Function(...Object.keys(ctx), `return ${vnode.props["v-if"]}`)(
        ...Object.values(ctx)
      );
    } catch {
      isShown = false;
    }
  }

  if (!isShown) {
    const placeholder = document.createComment("v-if false");
    conditionalNodes.push({ vnode, ctx, placeholder, renderedNode: null, isShown: false, dynamicNodes: [] });
    return { domNode: placeholder, vnode, isShown: false, dynamicNodes: [] };
  }

  const el = document.createElement(vnode.tag);
  for (const key in vnode.props) {
    if (key === "v-if") continue;
    if (key === "v-for") continue;

    const val = vnode.props[key];
    if (key.startsWith("@")) {
      const eventName = key.slice(1);
      const handler = ctx[val];
      if (typeof handler === "function") {
        el.addEventListener(eventName, handler.bind(ctx));
      }
    } else {
      el.setAttribute(key, val);
    }
  }

  const childDynamicNodes = [];
  vnode.children.forEach(child => {
    const { domNode, dynamicNodes: childDN = [] } = render(child, ctx, childDynamicNodes, conditionalNodes);
    el.appendChild(domNode);
    if (childDN && childDN.length) {
      childDynamicNodes.push(...childDN);
    }
  });

  if (vnode.props && vnode.props["v-if"] !== undefined) {
    conditionalNodes.push({
      vnode,
      ctx,
      placeholder: null,
      renderedNode: el,
      isShown: true,
      dynamicNodes: childDynamicNodes,
    });
  }

  dynamicNodes.push(...childDynamicNodes);

  return { domNode: el, vnode, isShown: true, dynamicNodes: childDynamicNodes };
}

function patch(ctx, dynamicNodes, conditionalNodes) {
  dynamicNodes.forEach(({ vnode, textNode }) => {
    let newText = "";
    try {
      newText = new Function(...Object.keys(ctx), `return ${vnode.expr}`)(
        ...Object.values(ctx)
      );
    } catch {
      newText = "";
    }
    if (textNode.textContent !== newText) {
      textNode.textContent = newText;
    }
  });

  conditionalNodes.forEach(node => {
    const { vnode } = node;
    let shouldShow = true;
    try {
      shouldShow = new Function(...Object.keys(ctx), `return ${vnode.props["v-if"]}`)(
        ...Object.values(ctx)
      );
    } catch {
      shouldShow = false;
    }

    if (shouldShow !== node.isShown) {
      node.isShown = shouldShow;
      if (shouldShow) {
        const { domNode, dynamicNodes: childDynamicNodes = [] } = render(vnode, ctx, [], conditionalNodes);
        node.renderedNode = domNode;
        node.placeholder.parentNode.replaceChild(domNode, node.placeholder);
        node.placeholder = null;
        dynamicNodes.push(...childDynamicNodes);
      } else {
        const placeholder = document.createComment("v-if false");
        node.renderedNode.parentNode.replaceChild(placeholder, node.renderedNode);
        node.placeholder = placeholder;
        node.renderedNode = null;
      }
    }
  });
}

// === Example app ===
const template = `
  <template>
    <h1>Count: {{ count }}</h1>
    <button class="button" @click="addToCart">Add to Cart</button>
    <p v-if="count > 0">You have items in your cart!</p>
    <ul>
      <li v-for="item in items">{{ item }}</li>
    </ul>
  </template>
`;

const ctx = {
  count: 0,
  items: ["Apple", "Banana"],
  addToCart() {
    this.count++;
    this.items.push("Item " + this.count);
    patch(this, dynamicNodes, conditionalNodes);
  }
};

const dynamicNodes = [];
const conditionalNodes = [];
const vnodes = parseTemplate(template);
const app = document.getElementById("app");

vnodes.forEach(vnode => {
  const { domNode } = render(vnode, ctx, dynamicNodes, conditionalNodes);
  app.appendChild(domNode);
});
