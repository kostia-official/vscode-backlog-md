// Svelte action: call `select` when the element gets focus, except focus from a primary-button
// press. That press focuses a draggable card or row before a drag can start, and selecting on
// it opens the detail tab over the editor-tab board. The click that ends the press selects.
// A press on a control inside (a label chip) focuses that control, so it arms nothing.
import type { Action } from 'svelte/action';

// Focus selects only inside the task of a key press, or of a pointer press on the element
// itself. A focus that VS Code restores when the window or webview gets focus back (a click
// elsewhere on the board included) has no such input, and would open an unasked detail tab.
let input: { key: true } | { target: EventTarget | null } | undefined;
const markInput = (e: Event) => {
  input = e.type === 'keydown' ? { key: true } : { target: e.target };
  setTimeout(() => (input = undefined));
};
document.addEventListener('keydown', markInput, true);
document.addEventListener('pointerdown', markInput, true);
const fromInput = (node: HTMLElement) =>
  input !== undefined && ('key' in input || node.contains(input.target as Node | null));

export const selectOnFocus: Action<HTMLElement, (() => void) | undefined> = (node, select) => {
  let pressed = false;
  const onPointerDown = (e: PointerEvent) => {
    const control = (e.target as Element).closest('button, a, input, select, textarea');
    pressed = e.button === 0 && (!control || control === node);
  };
  const clear = () => (pressed = false);
  const onFocus = () => {
    if (!pressed && fromInput(node)) select?.();
  };
  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('pointercancel', clear);
  node.addEventListener('blur', clear);
  node.addEventListener('focus', onFocus);
  return {
    update(next) {
      select = next;
    },
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointercancel', clear);
      node.removeEventListener('blur', clear);
      node.removeEventListener('focus', onFocus);
    },
  };
};
