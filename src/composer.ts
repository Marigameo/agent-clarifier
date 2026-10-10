// The app's message box (BUILD §7): hide it, change its placeholder, start a sentence in it,
// and notice when the user sends from it. Everything changed here is put back exactly.

type Field = HTMLTextAreaElement | HTMLInputElement | HTMLElement;

const isTextField = (el: Element): el is HTMLTextAreaElement | HTMLInputElement =>
  el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement;

export class Composer {
  readonly field: Field;
  readonly container: HTMLElement;
  #onSend: (text: string) => boolean;
  /** The app's own `hidden` value before we hid it (it can also be 'until-found'). */
  #hidden: HTMLElement['hidden'] | null = null;
  #display: [string, string] = ['', ''];
  #placeholder: string | null = null;
  #inserted: { text: string; rest: string } | null = null;

  constructor(field: Field, container: HTMLElement | null, onSend: (text: string) => boolean) {
    this.field = field;
    this.container = container ?? field.closest('form') ?? field;
    this.#onSend = onSend;
    this.field.closest('form')?.addEventListener('submit', this.#submit, true);
  }

  /** Put everything back and stop listening. */
  destroy(): void {
    this.field.closest('form')?.removeEventListener('submit', this.#submit, true);
    this.hide(false);
    this.placeholder(null);
    this.dock(false);
  }

  get value(): string {
    return isTextField(this.field) ? this.field.value : (this.field.textContent ?? '');
  }

  set value(v: string) {
    if (isTextField(this.field)) this.field.value = v;
    else this.field.textContent = v;
    this.field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /**
   * Capture phase on the form, so this runs before the app's own submit handler.
   * While the card is waiting for an answer, a sent message *is* the answer: it's delivered as
   * clarify:reply instead of a normal send, and the box is cleared as a send would.
   */
  #submit = (e: Event): void => {
    const text = this.value.trim();
    if (!text || !this.#onSend(text)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    this.#inserted = null;
    this.value = '';
  };

  /**
   * replace mode: hide the box while the card is open. `hidden` tells assistive tech; the inline
   * `display: none !important` makes sure the app's own CSS (say `.composer { display: flex }`)
   * can't override it. Both are put back exactly as they were.
   */
  hide(on: boolean): void {
    const style = this.container.style;
    if (on && this.#hidden === null) {
      this.#hidden = this.container.hidden;
      this.#display = [style.getPropertyValue('display'), style.getPropertyPriority('display')];
      this.container.hidden = true;
      style.setProperty('display', 'none', 'important');
    } else if (!on && this.#hidden !== null) {
      this.container.hidden = this.#hidden;
      const [value, priority] = this.#display;
      if (value) style.setProperty('display', value, priority);
      else style.removeProperty('display');
      if (!this.container.getAttribute('style')) this.container.removeAttribute('style');
      this.#hidden = null;
    }
  }

  /** Swap the placeholder; null puts the app's back. */
  placeholder(text: string | null): void {
    const attr = isTextField(this.field) ? 'placeholder' : 'aria-placeholder';
    if (text !== null) {
      if (this.#placeholder === null) this.#placeholder = this.field.getAttribute(attr) ?? '';
      if (this.field.getAttribute(attr) !== text) this.field.setAttribute(attr, text);
      if (!isTextField(this.field)) this.field.dataset.placeholder = text;
    } else if (this.#placeholder !== null) {
      this.field.setAttribute(attr, this.#placeholder);
      if (!isTextField(this.field)) this.field.dataset.placeholder = this.#placeholder;
      this.#placeholder = null;
    }
  }

  /** dock mode: lets the app square off the box's top corners under the card (README recipe). */
  dock(on: boolean): void {
    this.container.toggleAttribute('data-clarifier-docked', on);
  }

  /**
   * Start a sentence in front of whatever is already typed (never overwrite), put the caret
   * after it, and briefly show where it landed.
   */
  insert(text: string): void {
    const rest = this.value;
    this.#inserted = { text, rest };
    this.value = text + rest;
    this.field.focus();
    if (isTextField(this.field)) this.field.setSelectionRange(text.length, text.length);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.container.animate(
        [{ boxShadow: '0 0 0 3px color-mix(in srgb, currentColor 18%, transparent)' }, { boxShadow: '0 0 0 3px transparent' }],
        { duration: 600, easing: 'ease-out' },
      );
    }
  }

  /** Reopening after a compose pick: take the sentence back out, but only if the user didn't touch it. */
  takeBack(): void {
    const ins = this.#inserted;
    this.#inserted = null;
    if (ins && this.value === ins.text + ins.rest) this.value = ins.rest;
  }

  focus(): void {
    this.field.focus();
  }
}

/** Find the composer from a selector (searched next to the element first) or take an element as is. */
export function findComposer(host: Element, ref: string | Element | null): Field | null {
  if (!ref) return null;
  if (typeof ref !== 'string') return ref as Field;
  const root = host.getRootNode() as Document | ShadowRoot;
  return (root.querySelector?.(ref) ?? document.querySelector(ref)) as Field | null;
}
