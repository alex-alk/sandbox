// store/counterStore.js
const state = { count: 0 };
const listeners = [];

export function subscribe(fn) {
  listeners.push(fn);
}

export function increment() {
  state.count++;
  listeners.forEach(fn => fn(state));
}

export function getState() {
  return { ...state };
}