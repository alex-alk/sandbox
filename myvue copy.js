export function createApp(objectWithSetup) {
    console.log('createApp')
    const myMessage = objectWithSetup.setup();
    console.log('returned msg: ', myMessage);

    // return object with mount function
    const objectWithMount = {
        mount(id) {
            console.log('mounting: ' + id);
            const el = document.querySelector(id);
            const raw = el.innerHTML;
            console.log(raw);
            //console.log('compile: ', compileToVNode(raw));

            // replace {{ }} with variable
            let run = true;
            let lastIndex = 0;
            /*
            while (run) {
                if (lastIndex === openIdx) {
                    break;
                }
                const openIdx = raw.indexOf('{{', lastIndex);
                const closeIdx = raw.indexOf('}}', openIdx + 2);
                lastIndex = openIdx;

                const inter = raw
                    .slice(openIdx + 2, closeIdx)
                    .trim();

                console.log('variable: ' + inter);

                const exp = new Function(inter, 'return ' + myMessage[inter]);

                console.log(exp);
                console.log(exp(messageStr));

                const replacedWith = myMessage[inter];
                console.log('variable value: ' + replacedWith);

                let result = raw.slice(0, openIdx);
                result += replacedWith;
                result += raw.slice(closeIdx + 2);

                el.innerHTML = result;
            }*/
            const vnode = compileToVNode(raw, myMessage);
            el.innerHTML = '';
            el.appendChild(renderVNode(vnode));
        }
    }
    return objectWithMount;
}

// ref() is a special box that holds a value
// is a special reactive variable that lets vue know when it changes 
export function ref(text) {
    return text;
}

function renderVNode(vnode) {
  if (vnode.type === 'text') {
    return document.createTextNode(vnode.value);
  }

  const el = document.createElement(vnode.type);

  for (const [key, value] of Object.entries(vnode.props || {})) {
    el.setAttribute(key, value);
  }

  for (const child of vnode.children || []) {
    el.appendChild(renderVNode(child));
  }

  return el;
}



function safeEval(expr, context) {
  // Extract variable names from context
  const vars = Object.keys(context);

  // Create an array of variable values in order
  const values = vars.map(k => context[k]);

  // Create a function with variables as arguments, no `with`
  // Wrap expr in parentheses for correct evaluation
  const func = new Function(...vars, `return (${expr});`);

  // Call the function with variable values
  return func(...values);
}

function compileToVNode(template, context = {}, rootProps = {}) {
  const container = document.createElement('div');
  container.innerHTML = template;
  console.log('context: ', context);

  function evaluate(expr) {
    console.log('evaluate: ', expr)
    try {
      return safeEval(expr, context);
    } catch (e) {
      console.warn(`Error evaluating: {{ ${expr} }}`, e);
      return '';
    }
  }

  function parseAttributes(node) {
    const props = {};
    for (const attr of node.attributes) {
      props[attr.name] = attr.value;
    }
    return props;
  }

  function parseTextNode(textNode) {
    const text = textNode.textContent;
    const parts = [];
    let idx = 0;

    while (idx < text.length) {
      const open = text.indexOf('{{', idx);
      if (open === -1) {
        parts.push({ type: 'static', content: text.slice(idx) });
        break;
      }
      if (open > idx) {
        parts.push({ type: 'static', content: text.slice(idx, open) });
      }
      const close = text.indexOf('}}', open + 2);
      if (close === -1) {
        parts.push({ type: 'static', content: text.slice(open) });
        break;
      }
      const expr = text.slice(open + 2, close).trim();
      parts.push({ type: 'binding', expr });
      idx = close + 2;
    }

    return parts.map(part => {
      if (part.type === 'static') {
        return { type: 'text', value: part.content };
      } else {
        return {
          type: 'text',
          isBinding: true,
          expr: part.expr,
          value: evaluate(part.expr)
        };
      }
    });
  }

  function toVNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return parseTextNode(node);
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      return {
        type: node.tagName.toLowerCase(),
        props: parseAttributes(node),
        children: Array.from(node.childNodes).flatMap(toVNode)
      };
    }

    return null;
  }

  return {
    type: 'div',
    props: rootProps,
    children: Array.from(container.childNodes)
      .flatMap(toVNode)
      .filter(Boolean)
  };
}
