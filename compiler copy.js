#!/usr/bin/env node

const fs = require('fs');

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

  // Find all {{ ... }} bindings
  const bindings = [...templateContent.matchAll(/{{\s*([^}]+?)\s*}}/g)];

  // Determine element type and inner content
  const tagMatch = templateContent.match(/<(\w+)[^>]*>/);
  const tagName = tagMatch ? tagMatch[1] : 'div';

  // Extract raw text inside template tags (ignoring mustache bindings)
  const rawContent = templateContent
    .replace(/<[^>]+>/g, '')
    .replace(/<\/[\w]+>/g, '')
    .trim();

  // Generate compiled output
  let compiled = `\
${imports}

${scriptBody}

export function createApp(target) {
  const el = document.createElement('${tagName}');
  target.appendChild(el);
`;

  if (bindings.length === 1) {
    const expr = bindings[0][1].trim();
    compiled += `
  ${expr}.subscribe(value => {
    el.textContent = value;
  });
`;
  } else if (bindings.length > 1) {
    // For multiple bindings, build a template literal with subscriptions
    let textExpr = rawContent;
    bindings.forEach(match => {
      const expr = match[1].trim();
      textExpr = textExpr.replace(match[0], `\${${expr}.value}`);
    });
    compiled += `
  function updateText() {
    el.textContent = \`${textExpr}\`;
  }
  ${bindings.map(b => `  ${b[1].trim()}.subscribe(updateText);`).join('\n')}
`;
  } else {
    // No bindings, static text
    if (rawContent.length > 0) {
      compiled += `  el.textContent = \`${rawContent}\`;\n`;
    }
  }

  compiled += `
  return {
    // optionally expose reactive data here
  };
}
`;

  return compiled;
}

// CLI Entry point
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
