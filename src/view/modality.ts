// Is the user on a pointer or a keyboard right now? Tracked for the whole page, so a card opened
// by pressing Enter in the composer shows its focus ring, and one opened by clicking Send doesn't.
// One pair of listeners for every instance, added on first use.

let pointer = true;
let installed = false;

export function usingPointer(): boolean {
  if (!installed && typeof document !== 'undefined') {
    installed = true;
    document.addEventListener('pointerdown', () => (pointer = true), true);
    document.addEventListener('keydown', (e) => {
      // Modifier-only presses (like ⌘ on its way to ⌘Tab) don't mean the user switched to the keyboard.
      if (!['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) pointer = false;
    }, true);
  }
  return pointer;
}
