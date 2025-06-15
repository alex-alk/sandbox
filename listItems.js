export function listItems(array) {
  return `
    <ul>
      ${array.map(item => `<li>${item}</li>`).join('')}
    </ul>
  `;
}