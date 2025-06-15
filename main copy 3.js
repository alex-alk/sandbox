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

function render(vnode, ctx, dynamicNodes = [], conditionalNodes = [], twoWayBindings = []) {
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
    const vforExp = vnode.props["v-for"];
    const match = vforExp.match(/^\s*(\w+)(?:,\s*(\w+))?\s+in\s+(.+)\s*$/);
    if (!match) {
      throw new Error(`Invalid v-for expression: ${vforExp}`);
    }
    const [, itemVar, indexVar, listExpr] = match;
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
      const childCtx = Object.create(ctx);
      childCtx[itemVar] = item;
      if (indexVar) childCtx[indexVar] = index;

      const clone = {
        tag: vnode.tag,
        props: { ...vnode.props },
        children: vnode.children
      };
      delete clone.props["v-for"];

      const { domNode, dynamicNodes: childDynamicNodes = [] } = render(clone, childCtx, [], conditionalNodes, twoWayBindings);
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

  // Set attributes & event listeners
  for (const key in vnode.props) {
    if (key === "v-if" || key === "v-for" || key === "v-show") continue;

    const val = vnode.props[key];

    // v-bind shorthand: :attr or v-bind:attr
    if (key.startsWith(":")) {
      const attrName = key.slice(1);
      let attrVal = "";
      try {
        attrVal = new Function(...Object.keys(ctx), `return ${val}`)(...Object.values(ctx));
      } catch {
        attrVal = "";
      }
      el.setAttribute(attrName, attrVal);
      continue;
    }

    if (key.startsWith("v-bind:")) {
      const attrName = key.slice(7);
      let attrVal = "";
      try {
        attrVal = new Function(...Object.keys(ctx), `return ${val}`)(...Object.values(ctx));
      } catch {
        attrVal = "";
      }
      el.setAttribute(attrName, attrVal);
      continue;
    }

    // Handle v-model for inputs & textareas
    if (key === "v-model" && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) {
      // Set initial value
      el.value = ctx[val] ?? "";

      // Listen for input and update ctx[val]
      el.addEventListener("input", e => {
        ctx[val] = e.target.value;
        patch(ctx, dynamicNodes, conditionalNodes, twoWayBindings);
      });

      // Track two way bindings for patch (if needed)
      twoWayBindings.push({ el, modelKey: val });

      continue;
    }

    // Event listeners with modifiers: @click.prevent, @input.stop, etc.
    if (key.startsWith("@")) {
      // Parse event name & modifiers, e.g. "click.prevent.stop"
      const parts = key.slice(1).split(".");
      const eventName = parts[0];
      const modifiers = parts.slice(1);
      const handlerFn = ctx[val];
      if (typeof handlerFn === "function") {
        el.addEventListener(eventName, e => {
          if (modifiers.includes("prevent")) e.preventDefault();
          if (modifiers.includes("stop")) e.stopPropagation();
          handlerFn.call(ctx, e);
          patch(ctx, dynamicNodes, conditionalNodes, twoWayBindings);
        });
      }
      continue;
    }

    // Normal attribute
    el.setAttribute(key, val);
  }

  // Handle v-show (toggle visibility by CSS)
  if (vnode.props && vnode.props["v-show"] !== undefined) {
    let visible = true;
    try {
      visible = new Function(...Object.keys(ctx), `return ${vnode.props["v-show"]}`)(
        ...Object.values(ctx)
      );
    } catch {
      visible = false;
    }
    el.style.display = visible ? "" : "none";

    // Keep track to update on patch
    conditionalNodes.push({
      vnode,
      ctx,
      renderedNode: el,
      isShown: visible,
      isVShow: true,
    });
  }

  const childDynamicNodes = [];
  vnode.children.forEach(child => {
    const { domNode, dynamicNodes: childDN = [] } = render(child, ctx, childDynamicNodes, conditionalNodes, twoWayBindings);
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
      isVShow: false,
    });
  }

  dynamicNodes.push(...childDynamicNodes);

  return { domNode: el, vnode, isShown: true, dynamicNodes: childDynamicNodes };
}

function patch(ctx, dynamicNodes, conditionalNodes, twoWayBindings = []) {
  // Update dynamic text nodes
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

  // Update v-if & v-show conditional nodes
  conditionalNodes.forEach(node => {
    const { vnode, renderedNode, placeholder, isVShow } = node;

    if (isVShow) {
      // v-show toggles display CSS
      let visible = true;
      try {
        visible = new Function(...Object.keys(ctx), `return ${vnode.props["v-show"]}`)(
          ...Object.values(ctx)
        );
      } catch {
        visible = false;
      }
      if (visible !== node.isShown) {
        node.isShown = visible;
        renderedNode.style.display = visible ? "" : "none";
      }
      return;
    }

    // v-if toggle
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
        const { domNode, dynamicNodes: childDynamicNodes = [] } = render(vnode, ctx, [], conditionalNodes, twoWayBindings);
        node.renderedNode = domNode;
        if (node.placeholder && node.placeholder.parentNode) {
          node.placeholder.parentNode.replaceChild(domNode, node.placeholder);
          node.placeholder = null;
        }
        dynamicNodes.push(...childDynamicNodes);
      } else {
        const placeholder = document.createComment("v-if false");
        if (renderedNode && renderedNode.parentNode) {
          renderedNode.parentNode.replaceChild(placeholder, renderedNode);
          node.placeholder = placeholder;
          node.renderedNode = null;
        }
      }
    }
  });

  // Update two-way bound inputs (in case ctx changed programmatically)
  twoWayBindings.forEach(({ el, modelKey }) => {
    if (el.value !== ctx[modelKey]) {
      el.value = ctx[modelKey] ?? "";
    }
  });
}

// Example usage:
const template = `
  <template>
    <h1>Count: {{ count }}</h1>
    <input v-model="count" type="number" />
    <button @click.prevent="addToCart">Add to Cart</button>
    <p v-if="count > 0">You have items in your cart!</p>
    <ul>
      <li v-for="item in items">{{ item }}</li>
    </ul>
    <img :src="imageUrl" alt="Dynamic Image" />
    <p v-show="count % 2 === 0">Count is even!</p>
  </template>
`;

const ctx = {
  count: 0,
  items: ["Apple", "Banana"],
  imageUrl: "https://picsum.photos/100",
  addToCart() {
    this.count++;
    this.items.push("Item " + this.count);
    patch(this, dynamicNodes, conditionalNodes, twoWayBindings);
  }
};

const dynamicNodes = [];
const conditionalNodes = [];
const twoWayBindings = [];
const vnodes = parseTemplate(template);
const app = document.getElementById("app");

vnodes.forEach(vnode => {
  const { domNode } = render(vnode, ctx, dynamicNodes, conditionalNodes, twoWayBindings);
  app.appendChild(domNode);
});
