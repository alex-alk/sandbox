#!/usr/bin/env node
const fs = require('fs');

function parseAttributes(str) {
  const attrs = {};
  let m;
  const bindRe = /v-bind:([^=\s]+)="([^"]+)"/g;
  while ((m = bindRe.exec(str))) {
    attrs[`v-bind:${m[1]}`] = m[2];
  }
  str = str.replace(bindRe, '');

  const ifRe = /v-if="([^"]+)"/;
  if ((m = ifRe.exec(str))) {
    attrs['v-if'] = m[1];
    str = str.replace(ifRe, '');
  }

  if (/v-else/.test(str)) {
    attrs['v-else'] = true;
    str = str.replace(/v-else/, '');
  }

  const forRe = /v-for="(\w+)\s+in\s+([^"]+)"/;
  if ((m = forRe.exec(str))) {
    attrs['v-for'] = { item: m[1], list: m[2] };
    str = str.replace(forRe, '');
  }

  const staticRe = /([^\s=]+)(?:="([^"]*)")?/g;
  while ((m = staticRe.exec(str))) {
    attrs[m[1]] = m[2] !== undefined ? m[2] : true;
  }

  return attrs;
}

const voids = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

function parseTemplate(tpl) {
  const regex = /<(\/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  const root = { type: 'root', children: [] };
  const stack = [root];
  let m;
  while ((m = regex.exec(tpl))) {
    if (m[4]) {
      if (m[4].trim()) {
        stack[stack.length - 1].children.push({ type: 'text', content: m[4] });
      }
    } else {
      const closing = !!m[1];
      const tag = m[2], attrs = m[3];
      if (!closing) {
        const a = parseAttributes(attrs);
        const node = {
          type: 'element',
          tag,
          className: a.class || null,
          attrs: a,
          children: []
        };
        stack[stack.length - 1].children.push(node);
        if (!voids.has(tag)) stack.push(node);
      } else {
        stack.pop();
      }
    }
  }
  return root.children;
}

function gen(node, parent, ctx = {}) {
  let code = '', v = node.attrs || {};

  if (v['v-for']) {
    const { item, list } = v['v-for'];
    code += `for (const ${item} of ${list}.value) {\n`;
    const childCtx = { ...ctx, [item]: true };
    const clone = { ...node, attrs: { ...node.attrs } };
    delete clone.attrs['v-for'];
    code += gen(clone, parent, childCtx);
    code += `}\n`;
    return code;
  }

  const varName = `el${gen.counter++}`;

  if (v['v-if']) { code += `if (${v['v-if']}) {\n`; }
  else if (v['v-else']) { code += `else {\n`; }

  if (node.type === 'element') {
    code += `  const ${varName} = document.createElement('${node.tag}');\n`;
    if (node.className) code += `  ${varName}.className = '${node.className}';\n`;

    for (const [k, val] of Object.entries(v)) {
      if (k.startsWith('v-bind:')) {
        const prop = k.slice(7);
        code += `  ${varName}.${prop} = typeof ${val} === 'object' ? ${val}.value : ${val};\n`;
        code += `  if (${val}.subscribe) ${val}.subscribe(v => ${varName}.${prop} = v);\n`;
      } else if (!['v-if','v-else'].includes(k)) {
        code += `  ${varName}.setAttribute('${k}', ${JSON.stringify(val)});\n`;
      }
    }

    code += `  ${parent}.appendChild(${varName});\n`;
    for (const child of node.children) {
      code += gen(child, varName, ctx);
    }
  } else if (node.type === 'text') {
    const parts = [], must = /{{\s*([^}]+)\s*}}/g;
    let last = 0, mm;
    while ((mm = must.exec(node.content))) {
      if (mm.index > last) parts.push(JSON.stringify(node.content.slice(last, mm.index)));
      parts.push({ expr: mm[1].trim() });
      last = mm.index + mm[0].length;
    }
    if (last < node.content.length) parts.push(JSON.stringify(node.content.slice(last)));

    const fn = `upd${gen.counter}`;
    code += `  const ${varName} = document.createTextNode('');\n`;
    code += `  ${parent}.appendChild(${varName});\n`;
    code += `  function ${fn}() { ${varName}.textContent = \``;
    for (const p of parts) {
      if (typeof p === 'string') code += p;
      else {
        code += `\${${ctx[p.expr] ? p.expr : p.expr + '.value'}}`;
      }
    }
    code += '`; }\n';

    for (const p of parts) {
      if (typeof p !== 'string' && !ctx[p.expr]) {
        code += `  if (${p.expr}.subscribe) ${p.expr}.subscribe(${fn});\n`;
      }
    }
    code += `  ${fn}();\n`;
  }

  if (v['v-if'] || v['v-else']) code += '}\n';
  return code;
}
gen.counter = 0;

function miniCompile(src) {
  const sc = src.match(/<script setup>([\s\S]*?)<\/script>/);
  const lines = sc ? sc[1].split(/\r?\n/).map(l => l.trim()) : [];

  const imports = [], assets = [], others = [];
  for (const ln of lines) {
    const am = ln.match(/import\s+(\w+)\s+from\s+['"](.+\.(?:png|jpe?g|svg))['"]/);
    if (am) assets.push(`const ${am[1]} = '${am[2]}';`);
    else if (ln.startsWith('import ')) imports.push(ln);
    else others.push(ln);
  }

  const tpl = (src.match(/<template>([\s\S]*?)<\/template>/) || [])[1] || '';
  const ast = parseTemplate(tpl);

  gen.counter = 0;
  let dom = '';
  for (const node of ast) dom += gen(node, 'target');

  return `${imports.join('\n')}\n${assets.join('\n')}\n${others.join('\n')}\n\nexport function createApp(target) {\n${dom}  return {};\n}`;
}

// CLI: node compiler.js App.vue App.compiled.js
if (require.main === module) {
  const [,, i, o] = process.argv;
  if (!i||!o) return console.error('Usage: compiler.js in.vue out.js');
  fs.writeFileSync(o, miniCompile(fs.readFileSync(i,'utf8')));
  console.log(`Compiled ${i} → ${o}`);
}
