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
      // Here we combine consecutive text nodes and dynamicText nodes into one dynamicText vnode
      const children = [];
      let bufferTokens = [];

      function flushBuffer() {
        if (bufferTokens.length === 0) return;
        if (bufferTokens.length === 1) {
          children.push(bufferTokens[0]);
        } else {
          // Join all tokens with ' + '
          const expr = bufferTokens
            .map(tok => (typeof tok === "string" ? JSON.stringify(tok) : tok.expr || tok))
            .join(" + ");
          children.push({ type: "dynamicText", expr });
        }
        bufferTokens = [];
      }

      node.childNodes.forEach(child => {
        const v = walk(child);
        if (v === null) return;
        if (typeof v === "string" || (v.type === "dynamicText")) {
          // Accumulate text tokens
          bufferTokens.push(v);
        } else {
          // Flush buffer when hitting an element vnode
          flushBuffer();
          children.push(v);
        }
      });
      flushBuffer();

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

// Render and patch functions as before:

function render(vnode, ctx, dynamicNodes = [], conditionalNodes = [], twoWayBindings = []) {
  if (typeof vnode === "string") {
    return { domNode: document.createTextNode(vnode), dynamicNodes: [] };
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
    return { domNode: tn, dynamicNodes: [{ vnode, textNode: tn }] };
  }
  if (vnode.props && vnode.props["v-if"] !== undefined) {
    const expr = vnode.props["v-if"];
    let show = false;
    try {
      show = new Function(...Object.keys(ctx), `return ${expr}`)(...Object.values(ctx));
    } catch {
      show = false;
    }
    const placeholder = document.createComment("v-if placeholder");
    conditionalNodes.push({ vnode, placeholder, parent: null, ctx, expr });
    if (!show) return { domNode: placeholder, dynamicNodes: [] };
  }
  if (vnode.props && vnode.props["v-show"] !== undefined) {
    // Just render normally; v-show will update style display later
  }

  const el = document.createElement(vnode.tag);

  for (const key in vnode.props) {
    const val = vnode.props[key];
    if (key === "v-if" || key === "v-show") continue;
    if (key.startsWith("@")) {
      const eventName = key.slice(1);
      const handler = ctx[val];
      if (typeof handler === "function") {
        el.addEventListener(eventName, handler.bind(ctx));
      }
    } else if (key === "v-model") {
      const modelKey = val;
      el.value = ctx[modelKey];
      el.addEventListener("input", e => {
        ctx[modelKey] = e.target.value;
      });
      twoWayBindings.push({ el, modelKey });
    } else {
      el.setAttribute(key, val);
    }
  }

  vnode.children.forEach(child => {
    const { domNode, dynamicNodes: childDynamicNodes } = render(child, ctx, dynamicNodes, conditionalNodes, twoWayBindings);
    el.appendChild(domNode);
  });

  // Handle v-show
  if (vnode.props && vnode.props["v-show"] !== undefined) {
    const expr = vnode.props["v-show"];
    let show = false;
    try {
      show = new Function(...Object.keys(ctx), `return ${expr}`)(...Object.values(ctx));
    } catch {
      show = false;
    }
    el.style.display = show ? "" : "none";
    conditionalNodes.push({ vnode, el, ctx, expr, type: "v-show" });
  }

  return { domNode: el, dynamicNodes };
}

function patch(ctx, dynamicNodes, conditionalNodes = [], twoWayBindings = []) {
  if (typeof ctx.beforeUpdate === "function") ctx.beforeUpdate();

  // Patch dynamic text nodes
  dynamicNodes.forEach(({ vnode, textNode }) => {
    let newText = "";
    try {
      newText = new Function(...Object.keys(ctx), `return ${vnode.expr}`)(...Object.values(ctx));
    } catch {
      newText = "";
    }
    if (textNode.textContent !== newText) {
      textNode.textContent = newText;
    }
  });

  // Patch conditional nodes (v-if, v-show)
  conditionalNodes.forEach(item => {
    if (item.vnode.props && item.vnode.props["v-if"] !== undefined) {
      let show = false;
      try {
        show = new Function(...Object.keys(ctx), `return ${item.expr}`)(...Object.values(ctx));
      } catch {
        show = false;
      }
      if (show && item.placeholder.parentNode) {
        // Insert the element if not already inserted
        if (!item.el) {
          const { domNode } = render(item.vnode, ctx, dynamicNodes, conditionalNodes, twoWayBindings);
          item.el = domNode;
        }
        if (item.placeholder.parentNode && item.el.parentNode !== item.placeholder.parentNode) {
          item.placeholder.parentNode.insertBefore(item.el, item.placeholder);
          item.placeholder.parentNode.removeChild(item.placeholder);
        }
      } else if (!show && item.el && item.el.parentNode) {
        // Remove the element, add placeholder
        item.el.parentNode.insertBefore(item.placeholder, item.el);
        item.el.parentNode.removeChild(item.el);
      }
    } else if (item.type === "v-show") {
      let show = false;
      try {
        show = new Function(...Object.keys(ctx), `return ${item.expr}`)(...Object.values(ctx));
      } catch {
        show = false;
      }
      if (item.el) {
        item.el.style.display = show ? "" : "none";
      }
    }
  });

  // Patch two-way bindings
  twoWayBindings.forEach(({ el, modelKey }) => {
    if (el.value !== ctx[modelKey]) {
      el.value = ctx[modelKey];
    }
  });

  if (typeof ctx.updated === "function") ctx.updated();
}

// Reactive and watcher utilities (same as your last snippet)
const watchers = new Map();

function watch(ctx, prop, callback) {
  if (!watchers.has(prop)) {
    watchers.set(prop, new Set());
  }
  watchers.get(prop).add(callback);
}

// reactive function unchanged from your snippet...

function reactive(target, patchFn, computed = {}) {
  const depsMap = new Map();
  const computedCache = {};
  let activeEffect = null;

  function track(prop) {
    if (activeEffect) {
      if (!depsMap.has(prop)) depsMap.set(prop, new Set());
      depsMap.get(prop).add(activeEffect);
    }
  }

  function trigger(prop) {
    if (depsMap.has(prop)) {
      depsMap.get(prop).forEach(cKey => {
        computedCache[cKey] = undefined;
        patchFn();
      });
    }
    if (watchers.has(prop)) {
      watchers.get(prop).forEach(cb => cb(proxy[prop]));
    }
  }

  const proxy = new Proxy(target, {
    get(target, prop) {
      if (prop in computed) {
        if (computedCache[prop] === undefined) {
          activeEffect = prop;
          try {
            computedCache[prop] = computed[prop].call(proxy);
          } finally {
            activeEffect = null;
          }
        }
        track(prop);
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
      }
      return true;
    }
  });

  return proxy;
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
  },
  mounted() {
    console.log("App mounted!");
  },
  beforeUpdate() {
    console.log("Before update");
  },
  updated() {
    console.log("DOM updated");
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

if (typeof ctx.mounted === "function") ctx.mounted();

// Watch example:
watch(ctx, "count", val => {
  console.log("Count changed to:", val);
});
