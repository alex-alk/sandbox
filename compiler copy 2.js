const fs = require('fs');

// Simple HTML parser for very limited subset: tags, classes, text nodes with mustaches
function parseTemplate(template) {
  // This is a very basic parser that assumes well-formed HTML with no attributes except class.
  // For real-world usage, use a proper HTML parser or AST tool.
  const regex = /<(\/?)(\w+)([^>]*)>|([^<]+)/g;
  const stack = [{ children: [] }]; // root placeholder

  let match;
  while ((match = regex.exec(template))) {
    if (match[4]) {
      // Text node
      const text = match[4].trim();
      if (text.length) {
        stack[stack.length - 1].children.push({ type: 'text', content: text });
      }
    } else {
      const closing = !!match[1];
      const tag = match[2];
      const attrStr = match[3];

      if (!closing) {
        // Opening tag
        // Extract class attribute if any
        const classMatch = attrStr.match(/class\s*=\s*"([^"]+)"/);
        const className = classMatch ? classMatch[1] : null;

        const element = { type: 'element', tag, className, children: [] };
        stack[stack.length - 1].children.push(element);
        stack.push(element);
      } else {
        // Closing tag
        stack.pop();
      }
    }
  }

  return stack[0].children[0]; // return root element
}

function generateDOMCode(node, parentVar, varCounter) {
  let code = '';
  const elVar = `el${varCounter.count++}`;

  if (node.type === 'element') {
    code += `const ${elVar} = document.createElement('${node.tag}');\n`;

    if (node.className) {
      code += `${elVar}.className = '${node.className}';\n`;
    }

    code += `${parentVar}.appendChild(${elVar});\n`;

    for (const child of node.children) {
      code += generateDOMCode(child, elVar, varCounter);
    }
  } else if (node.type === 'text') {
    // Handle mustache bindings inside text node
    const parts = [];
    const mustacheRegex = /{{\s*([^}]+)\s*}}/g;
    let lastIndex = 0;
    let m;
    let hasBinding = false;

    while ((m = mustacheRegex.exec(node.content)) !== null) {
      hasBinding = true;
      if (m.index > lastIndex) {
        parts.push(JSON.stringify(node.content.slice(lastIndex, m.index)));
      }
      parts.push({ expr: m[1].trim() });
      lastIndex = mustacheRegex.lastIndex;
    }
    if (lastIndex < node.content.length) {
      parts.push(JSON.stringify(node.content.slice(lastIndex)));
    }

    if (!hasBinding) {
      // Static text node
      code += `const ${elVar} = document.createTextNode(${JSON.stringify(node.content)});\n`;
      code += `${parentVar}.appendChild(${elVar});\n`;
    } else {
      // Reactive text node — create empty text node and subscribe to changes
      code += `const ${elVar} = document.createTextNode('');\n`;
      code += `${parentVar}.appendChild(${elVar});\n`;

      // Build a template literal with ${expr}.value for all bindings
      let templateStr = '';
      parts.forEach(part => {
        if (typeof part === 'string') {
          templateStr += part;
        } else {
          templateStr += `\${${part.expr}.value}`;
        }
      });

      code += `function update${elVar}() {\n`;
      code += `  ${elVar}.textContent = \`${templateStr}\`;\n`;
      code += `}\n`;

      // Subscribe all reactive refs in the text
      const subscriptions = parts
        .filter(p => typeof p !== 'string')
        .map(p => `  ${p.expr}.subscribe(update${elVar});`)
        .join('\n');

      code += subscriptions + '\n';
      code += `update${elVar}();\n`;
    }
  }

  return code;
}

function miniCompile(vueFile) {
  // Extract <script setup>
  const scriptMatch = vueFile.match(/<script setup>([\s\S]*?)<\/script>/);
  let scriptContent = scriptMatch ? scriptMatch[1].trim() : '';

  // Separate import statements and the rest of script content
  const importLines = [];
  const otherLines = [];

  scriptContent.split('\n').forEach(line => {
    if (line.trim().startsWith('import ')) {
      importLines.push(line);
    } else {
      otherLines.push(line);
    }
  });

  const imports = importLines.join('\n');
  const scriptBody = otherLines.join('\n');

  // Extract <template>
  const templateMatch = vueFile.match(/<template>([\s\S]*?)<\/template>/);
  const templateContent = templateMatch ? templateMatch[1].trim() : '';

  // Parse template into node tree
  const rootNode = parseTemplate(templateContent);

  // Generate DOM creation + subscription code recursively
  const varCounter = { count: 0 };
  const domCode = generateDOMCode(rootNode, 'target', varCounter);

  // Compose full output
  const compiled = `\
${imports}

${scriptBody}

export function createApp(target) {
${domCode}
  return {
    // optionally expose reactive data here
  };
}
`;

  return compiled;
}

// CLI entry point
if (require.main === module) {
  const inputFile = process.argv[2];
  const outputFile = process.argv[3];

  if (!inputFile || !outputFile) {
    console.error('Usage: compiler.js <input.vue> <output.js>');
    process.exit(1);
  }

  console.log(`Reading file: ${inputFile}`);
  const vueContent = fs.readFileSync(inputFile, 'utf-8');
  console.log('File read successfully, compiling...');

  const output = miniCompile(vueContent);

  console.log(`Writing output to: ${outputFile}`);
  fs.writeFileSync(outputFile, output, 'utf-8');

  console.log(`Compiled JS written to ${outputFile}`);
}
