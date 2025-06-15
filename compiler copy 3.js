#!/usr/bin/env node

const fs = require('fs');

// Parse attributes string into { attrName: attrValue }
function parseAttributes(attrStr) {
  const attrs = {};
  let m;

  // Extract reactive bindings v-bind:attr="expr"
  const bindRegex = /v-bind:([^\s=]+)="([^"]+)"/g;
  while ((m = bindRegex.exec(attrStr))) {
    attrs[`v-bind:${m[1]}`] = m[2];
  }
  attrStr = attrStr.replace(bindRegex, '');

  // Extract static attributes name="value" or boolean
  const staticRegex = /([^\s=]+)(?:="([^"]*)")?/g;
  while ((m = staticRegex.exec(attrStr))) {
    const name = m[1];
    const value = m[2] !== undefined ? m[2] : true;
    attrs[name] = value;
  }
  return attrs;
}

// Void/ self-closing tags
const voidElements = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

// Parse template into AST nodes, handling void elements
function parseTemplate(template) {
  const regex = /<(\/?)(\w+)([^>]*)>|([^<]+)/g;
  const stack = [{ children: [] }];
  let match;

  while ((match = regex.exec(template))) {
    if (match[4]) {
      const text = match[4];
      if (text.trim()) {
        stack[stack.length - 1].children.push({ type: 'text', content: text });
      }
    } else {
      const closing = Boolean(match[1]);
      const tag = match[2];
      const attrStr = match[3] || '';

      if (!closing) {
        const attrs = parseAttributes(attrStr);
        const className = attrs['class'] || null;
        if (className) delete attrs['class'];

        const element = { type: 'element', tag, className, attrs, children: [] };
        stack[stack.length - 1].children.push(element);
        if (!voidElements.has(tag)) {
          stack.push(element);
        }
      } else {
        // closing tag
        stack.pop();
      }
    }
  }
  return stack[0].children[0];
}

// Generate JS code for DOM creation & reactive subscriptions
function generateDOMCode(node, parentVar, varCounter) {
  let code = '';
  const elVar = `el${varCounter.count++}`;

  if (node.type === 'element') {
    code += `const ${elVar} = document.createElement('${node.tag}');\n`;
    if (node.className) {
      code += `${elVar}.className = '${node.className}';\n`;
    }
    for (const attrName in node.attrs) {
      const attrValue = node.attrs[attrName];
      if (attrName.startsWith('v-bind:')) {
        const realAttr = attrName.slice('v-bind:'.length);
        code += `${elVar}.${realAttr} = ${attrValue}.value;\n`;
        code += `${attrValue}.subscribe(val => { ${elVar}.${realAttr} = val; });\n`;
      } else {
        code += `${elVar}.setAttribute('${attrName}', ${JSON.stringify(attrValue)});\n`;
      }
    }
    code += `${parentVar}.appendChild(${elVar});\n`;
    node.children.forEach(child => {
      code += generateDOMCode(child, elVar, varCounter);
    });
  } else if (node.type === 'text') {
    const parts = [];
    const mustache = /{{\s*([^}]+)\s*}}/g;
    let last = 0, m2;
    while ((m2 = mustache.exec(node.content))) {
      if (m2.index > last) parts.push(JSON.stringify(node.content.slice(last, m2.index)));
      parts.push({ expr: m2[1].trim() });
      last = mustache.lastIndex;
    }
    if (last < node.content.length) parts.push(JSON.stringify(node.content.slice(last)));

    if (parts.length === 1 && typeof parts[0] === 'string') {
      code += `const ${elVar} = document.createTextNode(${parts[0]});\n`;
      code += `${parentVar}.appendChild(${elVar});\n`;
    } else {
      code += `const ${elVar} = document.createTextNode('');\n`;
      code += `${parentVar}.appendChild(${elVar});\n`;
      let tpl = '';
      parts.forEach(p => {
        tpl += typeof p === 'string' ? p : `\${${p.expr}.value}`;
      });
      code += `function update${elVar}() { ${elVar}.textContent = \`${tpl}\`; }\n`;
      parts.filter(p => typeof p !== 'string')
        .forEach(p => code += `${p.expr}.subscribe(update${elVar});\n`);
      code += `update${elVar}();\n`;
    }
  }
  return code;
}

// Main compiler
function miniCompile(vueFile) {
  const scriptMatch = vueFile.match(/<script setup>([\s\S]*?)<\/script>/);
  const script = scriptMatch ? scriptMatch[1].trim() : '';
  const lines = script.split(/\r?\n/).map(l => l.trim());
  const jsImports = [];
  const assetDefs = [];
  const bodyLines = [];
  lines.forEach(line => {
    const asset = line.match(/import\s+(\w+)\s+from\s+['"](.+\.(?:png|jpe?g|gif|svg))['"]/);
    if (asset) assetDefs.push(`const ${asset[1]} = '${asset[2]}';`);
    else if (line.startsWith('import ')) jsImports.push(line);
    else if (line) bodyLines.push(line);
  });
  const imports = jsImports.join('\n');
  const assets = assetDefs.join('\n');
  const body = bodyLines.join('\n');
  const tplMatch = vueFile.match(/<template>([\s\S]*?)<\/template>/);
  const tpl = tplMatch ? tplMatch[1].trim() : '';
  const root = parseTemplate(tpl);
  const dom = generateDOMCode(root, 'target', { count: 0 });
  return `${imports}\n${assets ? '\n' + assets : ''}\n${body ? '\n' + body : ''}\nexport function createApp(target) {\n${dom}  return {};\n}`;
}

// CLI entry
if (require.main === module) {
  const [,, inF, outF] = process.argv;
  if (!inF || !outF) { console.error('Usage: compiler.js <in.vue> <out.js>'); process.exit(1); }
  const content = fs.readFileSync(inF, 'utf-8');
  const result = miniCompile(content);
  fs.writeFileSync(outF, result, 'utf-8');
  console.log(`Compiled ${inF} → ${outF}`);
}

module.exports = { miniCompile };