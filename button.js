export function createButton(text, onClick) {
  const button = document.createElement('button');
  
  button.textContent = text;
  button.className = 'button'
  button.addEventListener('click', onClick);
  return button;
}

export function createDivWithText(text = '') {
  const button = document.createElement('div');
    button.appendChild(document.createTextNode(text));
  return button;
}

export function createDiv(className, text) {
  const button = document.createElement('div');
    button.appendChild(text);
    button.className = className;
  return button;
}

export function createImg(src = '') {
  const button = document.createElement('img');
    button.src = src;
  return button;
}

export function createDivWithClass(className) {
  const button = document.createElement('div');
  button.className = className
  return button;
}

export function createText(text = '') {
  return document.createTextNode(text);
}

export function createH1(className, text) {
  const button = document.createElement('h1');
  button.appendChild(text)
  button.className = className
  return button;
}