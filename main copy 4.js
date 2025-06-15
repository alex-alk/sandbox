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
    if (key === "v-if" || key === "v-for" || key === "v-show") continue;

    const val = vnode.props[key];

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

    if (key === "v-model" && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) {
      el.value = ctx[val] ?? "";
      el.addEventListener("input", e => {
        ctx[val] = e.target.value;
      });
      twoWayBindings.push({ el, modelKey: val });
      continue;
    }

    if (key.startsWith("@")) {
      const parts = key.slice(1).split(".");
      const eventName = parts[0];
      const modifiers = parts.slice(1);
      const handlerFn = ctx[val];
      if (typeof handlerFn === "function") {
        el.addEventListener(eventName, e => {
          if (modifiers.includes("prevent")) e.preventDefault();
          if (modifiers.includes("stop")) e.stopPropagation();
          handlerFn.call(ctx, e);
        });
      }
      continue;
    }

    el.setAttribute(key, val);
  }

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
    const { vnode, renderedNode, placeholder, isVShow } = node;

    if (isVShow) {
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

  twoWayBindings.forEach(({ el, modelKey }) => {
    if (el.value !== ctx[modelKey]) {
      el.value = ctx[modelKey] ?? "";
    }
  });
}

// --- Reactive Proxy with Computed Properties ---

function reactive(ctx, patchFn, computed = {}) {
  const computedCache = {};
  const depsMap = new Map();
  let currentComputed = null;

  function track(prop) {
    if (currentComputed) {
      if (!depsMap.has(prop)) depsMap.set(prop, new Set());
      depsMap.get(prop).add(currentComputed);
    }
  }

  function trigger(prop) {
    if (depsMap.has(prop)) {
      depsMap.get(prop).forEach(cKey => {
        computedCache[cKey] = undefined; // Invalidate cache
        patchFn();
      });
    }
  }

  return new Proxy(ctx, {
    get(target, prop) {
      if (prop in computed) {
        if (computedCache[prop] === undefined) {
          currentComputed = prop;
          computedCache[prop] = computed[prop].call(proxy);
          currentComputed = null;
        }
        return computedCache[prop];
      }
      track(prop);
      return target[prop];
    },
    set(target, prop, value) {
      const oldVal = target[prop];
      if (oldVal !== value) {
        target[prop] = value;
        trigger(prop);
        patchFn();
      }
      return true;
    }
  });
}

// === Example App ===

const template = `
  <template>
    <h1>{{ title }}</h1>
    <p>Count: {{ count }}</p>
    <p>Double Count: {{ doubleCount }}</p>
    <button @click="increment">Increment</button>

    <input type="text" v-model="title" />
    
    <ul>
      <li v-for="item in items" v-if="item.show">{{ item.name }}</li>
    </ul>

    <p v-show="count > 2">You have more than 2 items!</p>
  </template>
`;

const ctxData = {
  title: "My Reactive App",
  count: 0,
  items: [
    { name: "Apple", show: true },
    { name: "Banana", show: true },
    { name: "Orange", show: false },
  ],
  increment() {
    this.count++;
  }
};

const computed = {
  doubleCount() {
    return this.count * 2;
  }
};

const dynamicNodes = [];
const conditionalNodes = [];
const twoWayBindings = [];
const vnodes = parseTemplate(template);
const app = document.getElementById("app");

const ctx = reactive(ctxData, () => patch(ctx, dynamicNodes, conditionalNodes, twoWayBindings), computed);

vnodes.forEach(vnode => {
  const { domNode } = render(vnode, ctx, dynamicNodes, conditionalNodes, twoWayBindings);
  app.appendChild(domNode);
});
