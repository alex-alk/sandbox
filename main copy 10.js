const importCache = new Map();

async function fetchCached(path) {
  if (importCache.has(path)) return importCache.get(path);
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  const text = await res.text();
  importCache.set(path, text);
  return text;
}

async function loadImportsRecursively(context = document) {
  const imports = [];
  if (context.matches && context.matches('template[x-import]')) {
    imports.push(context);
  }
  imports.push(...context.querySelectorAll('template[x-import]'));

  for (const tmpl of imports) {
    const path = tmpl.getAttribute('x-import');
    let raw;
    try {
      raw = await fetchCached(path);
    } catch (e) {
      console.error(e);
      tmpl.replaceWith(document.createComment(`import failed: ${path}`));
      continue;
    }

    let props = {};
    if (tmpl.hasAttribute('x-props')) {
      try {
        props = JSON.parse(tmpl.getAttribute('x-props'));
      } catch {
        console.warn('Invalid x-props JSON on', tmpl);
      }
    }

    const container = document.createElement('div');
    container.innerHTML = raw;
    const nodes = Array.from(container.childNodes);
    for (const node of nodes) {
      tmpl.parentNode.insertBefore(node, tmpl);
      if (node.nodeType === Node.ELEMENT_NODE) {
        node.__props = props;
      }
    }
    tmpl.remove();

    for (const node of nodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        await loadImportsRecursively(node);
      }
    }
  }
}

function evaluate(expr, state, event = null) {
  try {
    return new Function('state', 'event', `with(state){ return ${expr} }`)(state, event);
  } catch (e) {
    console.error(`Eval error "${expr}":`, e);
  }
}

function bindClick(el, attrValue, state) {
  const root = el.closest('[x-data]');
  const [expr, ...mods] = attrValue.split('|').map(s => s.trim());
  el.addEventListener('click', e => {
    if (mods.includes('prevent')) e.preventDefault();
    if (mods.includes('stop')) e.stopPropagation();
    evaluate(expr, state, e);
    updateComponent(root, state);
  });
}

function initComponent(root) {
  const dataExpr = root.getAttribute('x-data');
  if (!dataExpr) return;

  const initial = Object.assign({}, root.__props || {}, eval(`(${dataExpr})`));
  const state = new Proxy(initial, {
    set(obj, key, val) {
      obj[key] = val;
      updateComponent(root, state);
      return true;
    }
  });

  root.querySelectorAll('[x-model]').forEach(el => {
    const prop = el.getAttribute('x-model');
    el.value = state[prop] ?? '';
    el.addEventListener('input', () => {
      state[prop] = el.value;
    });
  });

  root.querySelectorAll('[x-on\\:click]').forEach(el => {
    const attr = el.getAttribute('x-on:click');
    bindClick(el, attr, state);
  });

  root.querySelectorAll('*').forEach(el => {
    if (!el.hasAttribute('@click')) return;
    bindClick(el, el.getAttribute('@click'), state);
  });

  updateComponent(root, state);
}

function updateComponent(root, state) {
  root.querySelectorAll('[x-show]').forEach(el => {
    const show = evaluate(el.getAttribute('x-show'), state);
    el.style.display = show ? '' : 'none';
  });

  root.querySelectorAll('[x-text]').forEach(el => {
    el.textContent = evaluate(el.getAttribute('x-text'), state);
  });

  root.querySelectorAll('[x-model]').forEach(el => {
    const prop = el.getAttribute('x-model');
    if (el.value !== state[prop]) {
      el.value = state[prop];
    }
  });
}

async function init() {
  await loadImportsRecursively();
  document.querySelectorAll('[x-data]').forEach(initComponent);
}

document.addEventListener('DOMContentLoaded', init);
