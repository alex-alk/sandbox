#!/usr/bin/env node

const fs = require('fs');

// Utility: parse attributes including v-bind, v-if, v-else, and static
function parseAttributes(attrStr) {
  const attrs = {};
  let match;

  // Extract v-bind:foo="expr"
  const bindRe = /v-bind:([^\s=]+)="([^"]+)"/g;
  while ((match = bindRe.exec(attrStr))) {
    attrs[`v-bind:${match[1]}`] = match[2];
  }
  attrStr = attrStr.replace(bindRe, '');

  // Extract v-if="expr"
  const ifRe = /v-if="([^"]+)"/;
  if ((match = ifRe.exec(attrStr))) {
    attrs['v-if'] = match[1];
    attrStr = attrStr.replace(ifRe, '');
  }

  // Extract v-else
  if (/v-else/.test(attrStr)) {
    attrs['v-else'] = true;
    attrStr = attrStr.replace(/v-else/, '');
  }

  // Static attributes: name="value" or boolean
  const staticRe = /([^\s=]+)(?:="([^"]*)")?/g;
  while ((match = staticRe.exec(attrStr))) {
    const name = match[1];
    const value = match[2] !== undefined ? match[2] : true;
    attrs[name] = value;
  }
  return attrs;
}

// Void elements that self-close
const voidElements = new Set([ 'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr' ]);

// Parse template into an array of AST nodes (support multiple roots)
function parseTemplate(template) {
  const regex = /<(\/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  const root = { type: 'root', children: [] };
  const stack = [ root ];
  let match;

  while ((match = regex.exec(template))) {
    if (match[4]) {
      const text = match[4];
      if (text.trim()) {
        stack[stack.length - 1].children.push({ type: 'text', content: text });
      }
    } else {
      const closing = !!match[1];
      const tag = match[2];
      const attrStr = match[3] || '';

      if (!closing) {
        const attrs = parseAttributes(attrStr);
        const className = attrs['class'] || null;
        if (className) delete attrs['class'];
        const node = { type: 'element', tag, className, attrs, children: [] };
        stack[stack.length - 1].children.push(node);
        if (!voidElements.has(tag)) stack.push(node);
      } else {
        stack.pop();
      }
    }
  }
  return root.children;
}

// Generate JavaScript for a node, recursively
function generateNodeCode(node, parentVar, counter) {
  let code = '';
  const attrs = node.attrs || {};
  const varName = `el${counter.count++}`;

  // Conditional wrappers
  if (attrs['v-if']) {
    code += `if(${attrs['v-if']}) {\n`;
  } else if (attrs['v-else']) {
    code += `else {\n`;
  }

  if (node.type === 'element') {
    code += `  const ${varName} = document.createElement('${node.tag}');\n`;
    if (node.className) {
      code += `  ${varName}.className = '${node.className}';\n`;
    }
    // Attributes
    for (const [attr, val] of Object.entries(attrs)) {
      if (attr === 'v-if' || attr === 'v-else') continue;
      if (attr.startsWith('v-bind:')) {
        const real = attr.slice(7);
        code += `  ${varName}.${real} = ${val}.value;\n`;
        code += `  ${val}.subscribe(v => { ${varName}.${real} = v; });\n`;
      } else {
        code += `  ${varName}.setAttribute('${attr}', ${JSON.stringify(val)});\n`;
      }
    }
    code += `  ${parentVar}.appendChild(${varName});\n`;
    // Children
    for (const child of node.children) {
      code += generateNodeCode(child, varName, counter);
    }
  } else if (node.type === 'text') {
    // Text node: handle interpolation
    const parts = [];
    const mustache = /{{\s*([^}]+)\s*}}/g;
    let lastIndex = 0;
    let m;
    while ((m = mustache.exec(node.content))) {
      if (m.index > lastIndex) {
        parts.push(JSON.stringify(node.content.slice(lastIndex, m.index)));
      }
      parts.push({ expr: m[1].trim() });
      lastIndex = mustache.lastIndex;
    }
    if (lastIndex < node.content.length) {
      parts.push(JSON.stringify(node.content.slice(lastIndex)));
    }
    // Generate text code
    if (parts.length === 1 && typeof parts[0] === 'string') {
      code += `  const ${varName} = document.createTextNode(${parts[0]});\n`;
      code += `  ${parentVar}.appendChild(${varName});\n`;
    } else {
      code += `  const ${varName} = document.createTextNode('');\n`;
      code += `  ${parentVar}.appendChild(${varName});\n`;
      // Update function
      code += `  function update${varName}() { ${varName}.textContent = \``;
      for (const part of parts) {
        if (typeof part === 'string') code += part;
        else code += `\${${part.expr}.value}`;
      }
      code += `\`; }\n`;
      // Subscriptions
      for (const part of parts) {
        if (typeof part !== 'string') {
          code += `  ${part.expr}.subscribe(update${varName});\n`;
        }
      }
      code += `  update${varName}();\n`;
    }
  }

  if (attrs['v-if'] || attrs['v-else']) {
    code += `}\n`;
  }
  return code;
}

// Main compile function
function miniCompile(source) {
  const scriptMatch = source.match(/<script setup>([\s\S]*?)<\/script>/);
  const script = scriptMatch ? scriptMatch[1].trim() : '';

  // Separate JS imports, asset imports, and other lines
  const lines = script.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const jsImports = [];
  const assetConsts = [];
  const otherLines = [];
  for (const line of lines) {
    const assetMatch = line.match(/import\s+(\w+)\s+from\s+['"](.+\.(?:png|jpe?g|gif|svg))['"]/);
    if (assetMatch) {
      assetConsts.push(`const ${assetMatch[1]} = '${assetMatch[2]}';`);
    } else if (line.startsWith('import ')) {
      jsImports.push(line);
    } else {
      otherLines.push(line);
    }
  }

  // Extract template and parse
  const tplMatch = source.match(/<template>([\s\S]*?)<\/template>/);
  const tpl = tplMatch ? tplMatch[1].trim() : '';
  const ast = parseTemplate(tpl);

  // Generate DOM code for all root nodes
  const counter = { count: 0 };
  let domCode = '';
  for (const node of ast) domCode += generateNodeCode(node, 'target', counter);

  // Assemble output
  return `${jsImports.join('\n')}\n${assetConsts.join('\n')}\n\n${otherLines.join('\n')}\nexport function createApp(target) {\n${domCode}  return {};\n}`;
}

// CLI support
if (require.main === module) {
  const [,, inFile, outFile] = process.argv;
  if (!inFile || !outFile) {
    console.error('Usage: compiler.js <input.vue> <output.js>');
    process.exit(1);
  }
  const src = fs.readFileSync(inFile, 'utf-8');
  const result = miniCompile(src);
  fs.writeFileSync(outFile, result, 'utf-8');
  console.log(`Compiled ${inFile} → ${outFile}`);
}

module.exports = { miniCompile };