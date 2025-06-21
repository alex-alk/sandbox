const bindings = {}
const computedDefs = {}

function evaluateStyleBinding(binding, context, alias) {
  try {
    const fn = new Function(alias, `return ${binding}`)
    const styles = fn(context)
    return Object.entries(styles)
      .map(([k, v]) => {
        const prop = k.replace(/([A-Z])/g, '-$1').toLowerCase()
        return `${prop}: ${v}`
      })
      .join('; ')
  } catch (err) {
    console.error('Style binding failed:', binding, err)
    return ''
  }
}

export const state = new Proxy({}, {
  set(target, variableName, value) {
    target[variableName] = value




    const binding = bindings[variableName]
    if (binding) {
      // Handle v-for cloning
      const forList = binding['v-for']
      if (forList) {
        for (const el of forList) {
          const elid = el.getAttribute('elid')
          const key = el.getAttribute('v-for') || ''
          let alias = '', arrayName = key
          if (key.includes(' in ')) {
            [alias, arrayName] = key.split(' in ').map(s => s.trim())
          } else {
            arrayName = key.trim()
          }
          const list = value
          if (!elid && Array.isArray(list)) {
            let refNode = el
            list.forEach((item, i) => {
              const clone = el.cloneNode(true)
              clone.setAttribute('elid', i)

              // Apply style
              const styleBinding = clone.getAttribute('v-bind:style')
              if (styleBinding && alias) {
                clone.setAttribute(
                  'style',
                  evaluateStyleBinding(styleBinding, item, alias)
                )
              } else if (!alias && typeof item === 'string') {
                clone.textContent = item
              }

              // Bind events
              for (const attr of clone.attributes) {
                if (attr.name.startsWith('v-on:')) {
                  const [_, eventName] = attr.name.split(':')
                  const handlerName = attr.value
                  if (handlerName && state[handlerName]) {
                    clone.addEventListener(eventName, state[handlerName])
                  }
                }
              }
              refNode.parentNode.insertBefore(clone, refNode.nextSibling)
              refNode = clone
            })
            el.remove()
          }
        }
      }

      // Handle other directives
      if (binding['v-text']) {
        binding['v-text'].forEach(el => {
          el.textContent = state[el.getAttribute('v-text')]
        })
      }
      if (binding['v-bind:src']) {
        binding['v-bind:src'].forEach(el => {
          el.src = state[el.getAttribute('v-bind:src')]
        })
      }

      
      if (binding['v-bind:class']) {
  binding['v-bind:class'].forEach(el => {
    const key = el.getAttribute('v-bind:class')
    const prevClass = el._prevClass || ''
    const newClass = state[key]

    if (prevClass && el.classList.contains(prevClass)) {
      el.classList.remove(prevClass)
    }

    if (newClass) {
      el.classList.add(newClass)
      el._prevClass = newClass
    } else {
      el._prevClass = ''
    }
  })
}
      if (binding['v-bind:disabled']) {
        binding['v-bind:disabled'].forEach(el => {
          el.disabled = state[el.getAttribute('v-bind:disabled')]
        })
      }
      if (binding['v-on:click']) {
        binding['v-on:click'].forEach(el => {
          el.onclick = state[el.getAttribute('v-on:click')]
        })
      }
      if (binding['v-if']) {
        binding['v-if'].forEach(el => {
          const key = el.getAttribute('v-if')
          const val = state[key]
          el.style.display = val ? '' : 'none'
          const next = el.nextElementSibling
          if (next?.hasAttribute('v-else')) {
            next.style.display = val ? 'none' : ''
          }
        })
      }
    }

    // Recompute computed properties (skip if setting a computed)
    if (!computedDefs[variableName]) {
      for (const [cName, getter] of Object.entries(computedDefs)) {
        const newVal = getter()
        if (state[cName] !== newVal) {
          state[cName] = newVal
        }
      }
    }

    return true
  }
})

// Define reactive reference
export function ref(variableName, value) {
  state[variableName] = value
  return {
    get value() {
      return state[variableName]
    },
    set value(val) {
      state[variableName] = val
    }
  }
}

// Define computed property
export function computed(name, getter) {
  computedDefs[name] = getter
  // Initialize computed value
  state[name] = getter()
  return () => state[name]
}

// Initialize bindings
export function init(component) {
  const all = component.querySelectorAll(
    '[v-text], [v-bind\\:src], [v-if], [v-for], ' +
    '[v-on\\:click], [v-on\\:mouseover], ' +
    '[v-bind\\:class], [v-bind\\:disabled], [v-bind\\:style], [v-component]'
  )
  all.forEach(el => {
    const directives = [
      { attr: 'v-text', key: el.getAttribute('v-text') },
      { attr: 'v-bind:src', key: el.getAttribute('v-bind:src') },
      { attr: 'v-if', key: el.getAttribute('v-if') },
      { attr: 'v-for', key: el.getAttribute('v-for') },
      { attr: 'v-on:click', key: el.getAttribute('v-on:click') },
      { attr: 'v-on:mouseover', key: el.getAttribute('v-on:mouseover') },
      { attr: 'v-bind:class', key: el.getAttribute('v-bind:class') },
      { attr: 'v-bind:disabled', key: el.getAttribute('v-bind:disabled') },
      { attr: 'v-component', key: el.getAttribute('v-component') }
    ]

    directives.forEach(({ attr, key }) => {
      if (!key) return

      let alias = '', arrayName = key
      if (attr === 'v-for') {
        if (key.includes(' in ')) {
          [alias, arrayName] = key.split(' in ').map(s => s.trim())
        } else {
          arrayName = key.trim()
        }
      } else {
        arrayName = key.split('::')[0]
      }

      if (!bindings[arrayName]) bindings[arrayName] = {}
      if (!bindings[arrayName][attr]) bindings[arrayName][attr] = []
      bindings[arrayName][attr].push(el)

      const value = state[arrayName]
      if (attr === 'v-text') el.textContent = value
      if (attr === 'v-bind:src') el.src = value
      if (attr === 'v-bind:class' && value) {

        el.classList.add(value)

      }
      if (attr === 'v-bind:disabled') el.disabled = value
      if (attr === 'v-if') {
        el.style.display = value ? '' : 'none'
        const next = el.nextElementSibling
        if (next?.hasAttribute('v-else')) next.style.display = value ? 'none' : ''
      }
      if (attr === 'v-on:click') el.onclick = value

      if (attr === 'v-for') {
        const elid = el.getAttribute('elid')
        const list = state[arrayName]
        if (!elid && Array.isArray(list)) {
          let refNode = el
          list.forEach((item, i) => {
            const clone = el.cloneNode(true)
            clone.setAttribute('elid', i)
            const styleBinding = clone.getAttribute('v-bind:style')
            if (styleBinding && alias) {
              clone.setAttribute(
                'style',
                evaluateStyleBinding(styleBinding, item, alias)
              )
            } else if (!alias && typeof item === 'string') {
              clone.textContent = item
            }
            for (const a of clone.attributes) {
              if (a.name.startsWith('v-on:')) {
                const [_, evt] = a.name.split(':')
                const handler = a.value
                if (handler && state[handler]) clone.addEventListener(evt, state[handler])
              }
            }
            refNode.parentNode.insertBefore(clone, refNode.nextSibling)
            refNode = clone
          })
          el.remove()
        }
      }
    })
  })
}
