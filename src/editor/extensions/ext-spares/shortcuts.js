/**
 * @file The keyboard shortcuts popup, opened with `?`.
 *
 * @license MIT
 */
import { isMac } from '@svgedit/svgcanvas/common/browser'

const mod = isMac() ? 'Cmd' : 'Ctrl'

/**
 * The shortcuts in `Editor.js`, the panels' buttons and this extension. They are listed here,
 * rather than collected from the buttons, since many have no button to describe them.
 * @param {boolean} embedded Leaves out the tools the embedded editor hides
 * @returns {{ title: string, shortcuts: [string[], string][] }[]}
 */
const shortcutSections = (embedded) => [
  {
    title: 'Image occlusion',
    shortcuts: [
      [['1'], 'Select the Markup layer'],
      [['2'], 'Select the Clozes layer'],
      [['Shift+C'], 'Edit the cloze settings of the selected shape (Enter or Escape returns to the canvas)'],
      ...(embedded ? [] : [[['Shift+B'], 'Change the background image']]),
      [['?'], 'Show these shortcuts']
    ]
  },
  {
    title: 'Tools',
    shortcuts: [
      [['V'], 'Select'],
      [['R'], 'Rectangle'],
      [['E'], 'Ellipse'],
      [['L'], 'Line'],
      [['P'], 'Path'],
      [['Q'], 'Freehand'],
      [['T'], 'Text'],
      [['Z'], 'Zoom (hold Shift to zoom out)'],
      [['Escape'], 'Cancel the current tool']
    ]
  },
  {
    title: 'Edit',
    shortcuts: [
      [[`${mod}+Z`], 'Undo'],
      [isMac() ? ['Cmd+Shift+Z', 'Cmd+Y'] : ['Ctrl+Y'], 'Redo'],
      [[`${mod}+X`], 'Cut'],
      [[`${mod}+C`], 'Copy'],
      [[`${mod}+V`], 'Paste'],
      [['D'], 'Duplicate the selected element'],
      [['C'], 'Duplicate the selected elements'],
      [['Delete', 'Backspace'], 'Delete the selection'],
      [['G'], 'Group the selected elements'],
      [['B'], 'Bold text'],
      [['I'], 'Italic text']
    ]
  },
  {
    title: 'Selection',
    shortcuts: [
      [['A', `${mod}+A`], 'Select everything in the current layer'],
      [['Tab', 'Shift+O'], 'Select the next element'],
      [['Shift+Tab', 'Shift+P'], 'Select the previous element'],
      [['Arrows'], 'Move by 1px'],
      [['Shift+Arrows'], 'Move by 10px'],
      [['Alt+Arrows'], 'Duplicate and move by 1px'],
      [['Alt+Shift+Arrows'], 'Duplicate and move by 10px'],
      [['Ctrl+Left/Right'], 'Rotate by 1°'],
      [['Ctrl+Shift+Left/Right'], 'Rotate by 5°'],
      [[`${mod}+]`], 'Bring forward'],
      [[`${mod}+[`], 'Send backward']
    ]
  },
  {
    title: 'View',
    shortcuts: [
      [[`${mod}+Up`], 'Zoom in'],
      [[`${mod}+Down`], 'Zoom out'],
      [['Alt+Wheel'], 'Zoom'],
      [['Space+Drag'], 'Pan'],
      [['F'], 'Wireframe mode'],
      [['U'], 'Edit the SVG source'],
      ...(embedded ? [] : [[['Shift+D'], 'Document properties']])
    ]
  }
]

const style = `
#spares_shortcuts {
  max-width: min(90vw, 40rem);
  max-height: 85vh;
  padding: 1rem 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-family: sans-serif;
  font-size: 0.85rem;
}
#spares_shortcuts::backdrop { background: rgb(0 0 0 / 40%); }
#spares_shortcuts header { display: flex; justify-content: space-between; align-items: center; }
#spares_shortcuts h2 { margin: 0; font-size: 1.1rem; }
#spares_shortcuts table { border-collapse: collapse; width: 100%; }
#spares_shortcuts th { padding: 1rem 0 0.25rem; text-align: left; font-size: 0.95rem; }
#spares_shortcuts td { padding: 0.2rem 0.5rem 0.2rem 0; vertical-align: top; }
#spares_shortcuts td:first-child { white-space: nowrap; width: 1%; }
#spares_shortcuts kbd {
  padding: 0.05rem 0.3rem;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  font-family: monospace;
}
`

const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

/**
 * Adds the shortcuts popup to the document.
 * @param {boolean} embedded
 * @returns {() => void} Shows the popup
 */
export const createShortcutsDialog = (embedded) => {
  const styleElement = document.createElement('style')
  styleElement.textContent = style
  document.head.appendChild(styleElement)

  const dialog = document.createElement('dialog')
  dialog.id = 'spares_shortcuts'
  const sections = shortcutSections(embedded).map(({ title, shortcuts }) => {
    const rows = shortcuts.map(([keys, description]) => {
      const kbds = keys.map((key) => `<kbd>${escapeHtml(key)}</kbd>`).join(' / ')
      return `<tr><td>${kbds}</td><td>${escapeHtml(description)}</td></tr>`
    }).join('')
    return `<tr><th colspan="2">${escapeHtml(title)}</th></tr>${rows}`
  }).join('')
  dialog.innerHTML = `
    <header>
      <h2>Keyboard shortcuts</h2>
      <button type="button" aria-label="Close">✕</button>
    </header>
    <table>${sections}</table>`
  dialog.querySelector('button').addEventListener('click', () => dialog.close())
  // Escape closes it natively. `?` toggles it, and a click on the backdrop closes it.
  dialog.addEventListener('keydown', (event) => {
    if (event.key === '?') dialog.close()
  })
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect()
      const inside = event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom
      if (!inside) dialog.close()
    }
  })
  // Closing focuses whatever opened it, e.g. the main menu, where the editor's shortcuts are
  // ignored. Hand the keyboard back to them.
  dialog.addEventListener('close', () => document.activeElement?.blur())
  document.body.appendChild(dialog)

  return () => {
    if (!dialog.open) dialog.showModal()
  }
}
