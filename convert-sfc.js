// convert-sfc.js
// A simple Node.js script to transform a Vue SFC (App.vue) into a plain JS module (App.js)

const fs = require('fs');
const path = require('path');

// Paths (customize if needed)
const inputSFC = path.resolve(__dirname, 'App.vue');
const outputJS = path.resolve(__dirname, 'App.js');
const indexHTML = path.resolve(__dirname, 'index.html');

// Read App.vue
const sfc = fs.readFileSync(inputSFC, 'utf-8');

// Extract <template> content
const templateMatch = sfc.match(/<template>([\s\S]*?)<\/template>/);
if (!templateMatch) {
  console.error('Error: <template> block not found.');
  process.exit(1);
}
const template = templateMatch[1].trim().replace(/`/g, '\`');

// Extract <script setup> content
const scriptMatch = sfc.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
const setupCode = scriptMatch ? scriptMatch[1].trim() : '';

// Build JS module content
const jsModule = `// Auto-generated from App.vue
import { ref } from './vue.js';

export default ({ template: \`
${template}
\`, setup: (ref) => {
${setupCode ? setupCode + '\n' : ''}
  return { ${
    // collect declared const/let names for return object
    setupCode.split(/\r?\n/)
      .map(line => {
        const m = line.match(/^(?:const|let)\s+(\w+)\s*=/);
        return m ? m[1] : null;
      })
      .filter(Boolean)
      .join(', ')
 } } });
`;

// Write App.js
fs.writeFileSync(outputJS, jsModule, 'utf-8');
console.log('Generated:', outputJS);

// Update index.html: replace import of .vue to .js
let html = fs.readFileSync(indexHTML, 'utf-8');
html = html.replace(/import\s+App\s+from\s+['"].+\.vue['"];?/, "import App from './App.js';");
fs.writeFileSync(indexHTML, html, 'utf-8');
console.log('Updated:', indexHTML);
