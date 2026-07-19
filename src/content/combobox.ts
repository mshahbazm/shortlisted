// Custom dropdowns: the widget class that looks like a <select> to a person
// and like nothing at all to the DOM.
//
// A native <select> holds its value, lists its options and fires `change`.
// Component libraries replace all three. react-select — what Greenhouse uses —
// renders an <input role="combobox"> that is opacity:0 and 1px wide, purely to
// catch keystrokes: its .value stays "" forever. The chosen label is React
// state, painted into a sibling <div>. The options do not exist in the DOM at
// all until the flyout opens, and nothing fires a `change` event.
//
// So reading `el.value` returns "" for a question the user has answered, and
// the panel shows a text box for a question that only accepts fixed options.
// The same shape appears in Downshift, Headless UI, MUI, Ant Design, Vuetify,
// Element Plus, Quasar, Select2 and Chosen — i.e. most of the dropdowns on
// most application forms.
//
// The strategy is layered rather than per-library: ARIA first (standard across
// all of them), then a real <select> if one is hiding behind the widget
// (Select2/Chosen keep one, and it is the most reliable source there is), then
// known display-node class names, then a positional guess. Each layer is a
// fallback for the one above, so an unknown library still lands somewhere
// sensible.

/** Placeholder text a widget shows when nothing is chosen — never an answer. */
const PLACEHOLDER_RX = /^(select|choose|pick|please\s|--|none|any\b|search|type\s|start typing|seleccion|choisir|auswahl|selecteer|seleziona|wybierz)/i

/**
 * Display nodes, by library. Class names are matched loosely (`*=`) because
 * every one of these libraries hashes or prefixes them in production builds.
 */
const DISPLAY_SELECTORS = [
  '[class*="singleValue"]', '[class*="single-value"]', // react-select
  '[class*="multiValue"]', '[class*="multi-value"]', // react-select, multi
  '.ant-select-selection-item', // Ant Design
  '.v-select__selection', '.v-field__input > .v-select__selection', // Vuetify
  '.el-select__selected-item', '.el-select__placeholder', // Element Plus
  '.q-field__native', // Quasar
  '.select2-selection__rendered', // Select2
  '.chosen-single > span', // Chosen
  '.MuiSelect-select', // MUI Select
  '[class*="selectedItem"]', '[class*="selected-item"]',
]

/** The widget's outer box — where the display node and popup live. */
export function comboboxContainer(el: Element): Element {
  return container(el)
}

/**
 * These widgets label themselves with aria-labelledby far more reliably than
 * they use <label for>, because the real input is hidden and unclickable.
 */
export function comboboxLabel(el: Element): string {
  const ids = (el.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean)
  const parts = ids
    .map((id) => el.ownerDocument.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean)
  if (parts.length) return parts.join(' ').slice(0, 300)
  const aria = el.getAttribute('aria-label')?.trim()
  return aria ? aria.slice(0, 300) : ''
}

const CONTAINER_SELECTOR =
  '[class*="select"], [class*="combobox"], [class*="autocomplete"], [class*="dropdown"], .v-field, .q-field, .MuiFormControl-root'

function container(el: Element): Element {
  // Start from the PARENT, never the element itself. These libraries name the
  // input after the widget — react-select's is class="select__input" — so
  // closest() called on the input matches the input, and the "container" comes
  // back as the very element we were trying to look around. Everything then
  // fails quietly: no display node, so the value reads as empty; nothing else
  // claimed, so one question yields several rows.
  const start = el.parentElement
  if (!start) return el
  const box = start.closest(CONTAINER_SELECTOR)
  if (!box) return start
  // Climb past inner wrappers (`select__value-container` inside `select`) to
  // the outermost box still describing the same widget, so the display node
  // and the popup are both inside it.
  let out = box
  for (let i = 0; i < 3; i++) {
    const up = out.parentElement?.closest(CONTAINER_SELECTOR)
    if (!up || up === out) break
    out = up
  }
  return out
}

/**
 * True for a control that behaves as a dropdown despite not being a <select>.
 * Deliberately ARIA-led: role/aria-haspopup are what these libraries agree on,
 * and they are also what a screen reader uses, so anything accessible enough
 * for a real candidate to use is detectable here.
 */
export function isCombobox(el: Element): boolean {
  const role = el.getAttribute('role')
  if (role === 'combobox' || role === 'listbox') return true
  const pop = (el.getAttribute('aria-haspopup') ?? '').toLowerCase()
  if (pop === 'listbox' || pop === 'menu' || pop === 'true') return true
  // Readonly text inputs sitting inside a select-ish wrapper: Vuetify and
  // Element Plus do this instead of using role=combobox.
  if (el instanceof HTMLInputElement && el.readOnly && /select|combobox|dropdown/i.test(container(el).className)) {
    return true
  }
  return false
}

/**
 * A real <select> hiding behind the widget. Select2 and Chosen hide the
 * original and render their own UI beside it, so the authoritative value is
 * still sitting in the DOM — by far the most reliable source when it exists.
 *
 * The walk goes up a few levels because the <select> is usually a SIBLING of
 * the widget, not inside it, and stops as soon as a level holds more than one:
 * two selects means we have climbed into a container holding several questions
 * and can no longer tell which one belongs to this widget.
 */
export function backingSelect(el: Element): HTMLSelectElement | null {
  if (el instanceof HTMLSelectElement) return el
  let node: Element | null = container(el)
  for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
    const found = [...node.querySelectorAll('select')]
    if (found.length === 1) return found[0] as HTMLSelectElement
    if (found.length > 1) return null
  }
  return null
}

/**
 * What the user has currently chosen, as the text they see. Empty string when
 * nothing is selected — a placeholder is not an answer.
 */
export function comboboxValue(el: Element): string {
  const backing = backingSelect(el)
  if (backing?.value) {
    const text = backing.selectedOptions[0]?.textContent?.trim() ?? ''
    if (text && !PLACEHOLDER_RX.test(text)) return text
  }

  // While the flyout is open the active option is authoritative.
  const activeId = el.getAttribute('aria-activedescendant')
  if (activeId) {
    const active = el.ownerDocument.getElementById(activeId)
    const text = active?.textContent?.trim()
    if (text && !PLACEHOLDER_RX.test(text)) return text
  }

  // MUI Autocomplete and Element Plus do keep the label in the input.
  if (el instanceof HTMLInputElement && el.value.trim() && !PLACEHOLDER_RX.test(el.value.trim())) {
    return el.value.trim()
  }

  const box = container(el)
  for (const sel of DISPLAY_SELECTORS) {
    const nodes = [...box.querySelectorAll(sel)]
      .map((n) => n.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter((t) => t && !PLACEHOLDER_RX.test(t))
    // Multi-select shows one node per chosen value.
    if (nodes.length) return [...new Set(nodes)].join(', ').slice(0, 300)
  }

  // Unknown library: the widget's own text, minus the input's. Crude, but it
  // beats reporting an answered question as blank.
  const own = (box.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (own && own.length < 120 && !PLACEHOLDER_RX.test(own)) return own
  return ''
}

/** Is the popup open right now? */
function isOpen(el: Element): boolean {
  return el.getAttribute('aria-expanded') === 'true'
}

/**
 * The listbox this control drives.
 *
 * Order matters, and getting it wrong is worse than finding nothing: a form
 * has many of these open or mounted at once, so "whichever listbox is visible"
 * once returned a neighbouring field's 250 country codes for a pronouns
 * question. Own declaration first, then our own subtree, and only then a
 * page-level popup — and that last one only when it is unambiguous.
 */
function listbox(el: Element): Element | null {
  const doc = el.ownerDocument
  for (const attr of ['aria-controls', 'aria-owns']) {
    const id = el.getAttribute(attr)
    if (id) {
      const node = doc.getElementById(id)
      if (node) return node
    }
  }
  const box = container(el)
  const own = box.querySelector('[role="listbox"], [class*="menu"], [class*="dropdown"], [class*="options"]')
  if (own) return own
  // Portalled popups (MUI, Ant, Vuetify) render at body level. Only usable
  // when exactly one is open, otherwise we cannot tell whose it is.
  const visible = [...doc.querySelectorAll('[role="listbox"]')].filter((n) => (n as HTMLElement).offsetParent !== null)
  return visible.length === 1 ? visible[0] : null
}

/**
 * The element that actually responds to a click. The real input is often
 * invisible and inert — react-select opens on mousedown on its control, not
 * on the 1px input inside it.
 */
function control(el: Element): HTMLElement {
  const box = container(el)
  const hit = box.querySelector<HTMLElement>(
    '[class*="control"], [class*="selector"], [class*="__field"], [class*="field__input"], [role="button"]',
  )
  return hit ?? (box as HTMLElement)
}

function optionNodes(root: Element): HTMLElement[] {
  const byRole = [...root.querySelectorAll<HTMLElement>('[role="option"]')]
  if (byRole.length) return byRole
  // Libraries that skip role=option on the items themselves.
  return [...root.querySelectorAll<HTMLElement>('li, .ant-select-item-option, [class*="option"]')].filter(
    (n) => n.children.length === 0 || !!n.textContent?.trim(),
  )
}

/** Open the popup by the means the widget actually responds to. */
function open(el: Element): void {
  if (isOpen(el)) return
  const target = control(el)
  // mousedown is the one that counts: react-select and most others open there,
  // not on click, so that a drag out of the menu still cancels cleanly.
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  target.click()
}

function close(el: Element): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  ;(el as HTMLElement).blur?.()
}

/** Options a backing <select> can answer for immediately, if there is one. */
export function comboboxOptionsSync(el: Element): string[] | undefined {
  const backing = backingSelect(el)
  if (!backing) return undefined
  return [...backing.options]
    .map((o) => o.textContent?.trim() ?? '')
    .filter((t) => t && !PLACEHOLDER_RX.test(t))
    .slice(0, 80)
}

/**
 * Wait for the popup to actually exist. Opening one is a state change in the
 * component, so the menu is rendered on a later frame — querying in the same
 * tick as the click reliably finds nothing, which is what made every option
 * list come back empty.
 */
async function waitForMenu(el: Element, timeoutMs = 1000): Promise<Element | null> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const list = listbox(el)
    if (list && optionNodes(list).length) return list
    if (Date.now() > deadline) return listbox(el)
    await new Promise((r) => setTimeout(r, 50))
  }
}

/**
 * The choices on offer. A backing <select> answers for free; otherwise the
 * popup has to be opened, because the options are not in the DOM until then.
 */
export async function comboboxOptions(el: Element): Promise<string[]> {
  const fromSelect = comboboxOptionsSync(el)
  if (fromSelect) return fromSelect

  const wasOpen = isOpen(el)
  if (!wasOpen) open(el)
  const list = await waitForMenu(el)
  const texts = list
    ? optionNodes(list)
        .map((n) => n.textContent?.replace(/\s+/g, ' ').trim() ?? '')
        .filter((t) => t && !PLACEHOLDER_RX.test(t))
    : []
  if (!wasOpen) close(el)
  return [...new Set(texts)].slice(0, 80)
}

/**
 * Choose an option by its visible text. Setting .value is useless here — the
 * component owns its state — so the option has to be clicked the way a person
 * would. Returns whether the selection took.
 */
export async function selectComboboxOption(el: Element, wanted: string): Promise<boolean> {
  const want = wanted.trim().toLowerCase()
  if (!want) return false

  const backing = backingSelect(el)
  if (backing) {
    const match = [...backing.options].find((o) => (o.textContent ?? '').trim().toLowerCase() === want)
    if (match) {
      backing.value = match.value
      backing.dispatchEvent(new Event('change', { bubbles: true }))
      // Select2/Chosen listen on jQuery events, which the native one triggers.
      return true
    }
  }

  const wasOpen = isOpen(el)
  if (!wasOpen) open(el)
  const list = await waitForMenu(el)
  if (!list) {
    if (!wasOpen) close(el)
    return false
  }
  const text = (n: Element) => (n.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
  const nodes = optionNodes(list)
  const pick = nodes.find((n) => text(n) === want) ?? nodes.find((n) => text(n).includes(want))
  if (!pick) {
    if (!wasOpen) close(el)
    return false
  }
  pick.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  pick.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  pick.click()
  // Confirm the component accepted it rather than assuming the click landed —
  // reporting a dropdown as filled when it is still empty is worse than
  // reporting failure, because the user submits without noticing.
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 50))
    if (comboboxValue(el).toLowerCase().includes(want)) return true
  }
  return false
}

/**
 * Call back when the selection changes. These widgets fire no `change` event,
 * so the rendered value is watched instead — that is the only thing guaranteed
 * to move when the user picks something.
 */
export function watchCombobox(el: Element, onChange: (value: string) => void): () => void {
  let last = comboboxValue(el)
  const check = () => {
    const now = comboboxValue(el)
    if (now !== last) {
      last = now
      onChange(now)
    }
  }
  const mo = new MutationObserver(check)
  mo.observe(container(el), { childList: true, subtree: true, characterData: true, attributes: true })
  // Some widgets only settle the display after blur.
  el.addEventListener('blur', check, true)
  return () => {
    mo.disconnect()
    el.removeEventListener('blur', check, true)
  }
}
