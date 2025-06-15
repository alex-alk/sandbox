// Recursively load and replace all <template x-import="..."> tags,
// including if the context node itself is a template
async function loadImportsRecursively(context = document) {
  // 1. Gather templates on context itself, then any descendants
  const imports = [];
  if (
    context.nodeType === Node.ELEMENT_NODE &&
    context.matches('template[x-import]')
  ) {
    imports.push(context);
  }
  imports.push(
    ...context.querySelectorAll('template[x-import]')
  );

  for (const tmpl of imports) {
    const path = tmpl.getAttribute('x-import');
    console.log('→ importing', path);
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      // Parse and insert
      const container = document.createElement('div');
      container.innerHTML = html;
      const nodes = Array.from(container.childNodes);
      console.log('   inserting nodes:', nodes);
      for (const node of nodes) {
        tmpl.parentNode.insertBefore(node, tmpl);
      }
      tmpl.remove();

      // Recurse into each inserted element node
      for (const node of nodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          await loadImportsRecursively(node);
        }
      }
    } catch (e) {
      console.error(`Failed to import: ${path}`, e);
    }
  }
}

function evaluate(expr, state) {
  try {
    return new Function('state', `with(state){return ${expr}}`)(state);
  } catch (e) {
    console.error(`Eval error in "${expr}":`, e);
    return undefined;
  }
}

function initComponent(root) {
  const dataExpr = root.getAttribute('x-data');
  if (!dataExpr) return;

  const state = new Proxy(eval(`(${dataExpr})`), {
    set(obj, key, value) {
      obj[key] = value;
      updateComponent(root, state);
      return true;
    }
  });

  // x-model
  root.querySelectorAll('[x-model]').forEach(el => {
    const prop = el.getAttribute('x-model');
    el.addEventListener('input', () => {
      state[prop] = el.value;
    });
  });

  // x-on:click
  root.querySelectorAll('[x-on\\:click]').forEach(el => {
    const expr = el.getAttribute('x-on:click');
    el.addEventListener('click', () => {
      evaluate(expr, state);
      updateComponent(root, state);
    });
  });

  // initial render
  updateComponent(root, state);
}

function updateComponent(root, state) {
  root.querySelectorAll('[x-show]').forEach(el => {
    el.style.display = evaluate(el.getAttribute('x-show'), state)
      ? ''
      : 'none';
  });
  root.querySelectorAll('[x-text]').forEach(el => {
    el.textContent = evaluate(el.getAttribute('x-text'), state);
  });
  root.querySelectorAll('[x-model]').forEach(el => {
    const prop = el.getAttribute('x-model');
    if (el.value !== state[prop]) el.value = state[prop];
  });
}

async function init() {
  await loadImportsRecursively();
  document.querySelectorAll('[x-data]').forEach(initComponent);
}

document.addEventListener('DOMContentLoaded', init);
