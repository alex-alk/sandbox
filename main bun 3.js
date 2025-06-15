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
          // If it's all whitespace, skip it
          if (!text.trim()) return null;

          // Handle {{ expr }} in text
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
            // Pure text
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

    // 2) Render a VNode to real DOM, collecting dynamic text nodes
    function render(vnode, ctx, dynamicNodes = []) {
      if (typeof vnode === "string") {
        return document.createTextNode(vnode);
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
        return tn;
      }
      const el = document.createElement(vnode.tag);
      for (const key in vnode.props) {
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
      vnode.children.forEach(child =>
        el.appendChild(render(child, ctx, dynamicNodes))
      );
      return el;
    }

    // 3) Patch only dynamic text nodes
    function patch(ctx, dynamicNodes) {
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
    }

    // === Example App ===

    const template = `
      <template>
        <h1>Count: {{ count }}</h1>
        <button class="button" @click="addToCart">Add to Cart</button>
      </template>
    `;

    const ctx = {
      count: 0,
      addToCart() {
        this.count++;
        patch(this, dynamicNodes);
      }
    };

    // Parse once, then render and mount
    const dynamicNodes = [];
    const vnodes = parseTemplate(template);
    const app = document.getElementById("app");

    vnodes.forEach(vnode => {
      app.appendChild(render(vnode, ctx, dynamicNodes));
    });