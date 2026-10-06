// Svelte action: call `select` when the element gets focus, except focus from a primary-button
// press. That press focuses a draggable card or row before a drag can start, and selecting on
// it opens the detail tab over the editor-tab board. The click that ends the press selects.
// A press on a control inside (a label chip) focuses that control, so it arms nothing.
import type { Action } from 'svelte/action';

export const selectOnFocus: Action<HTMLElement, (() => void) | undefined> = (node, select) => {
  let pressed = false;
  const onPointerDown = (e: PointerEvent) => {
    const control = (e.target as Element).closest('button, a, input, select, textarea');
    pressed = e.button === 0 && (!control || control === node);
  };
  const clear = () => (pressed = false);
  const onFocus = () => {
    if (!pressed) select?.();
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
