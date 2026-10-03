/**
 * @file ext-spares.js
 *
 * @license MIT
 *
 *
 */
import { fileOpen } from 'browser-fs-access'
import { STANDALONE_CONFIG_PATH, sparesConfig } from './config.js'
import { createShortcutsDialog } from './shortcuts.js'

const name = 'spares'

// The spares frontend embeds the editor in an iframe with `?embedded=1`. It then provides the
// image and SVG, and saves them to the server, through `window.sparesBridge`.
const urlParams = new URLSearchParams(window.location.search)
const embedded = urlParams.get('embedded') === '1'

// Menu items that would replace the image occlusion or save it somewhere spares cannot see
const EMBEDDED_HIDDEN_TOOLS = [
  'tool_clear',
  'tool_open',
  'tool_save',
  'tool_save_as',
  'tool_change_background',
  'tool_docprops',
  'tool_editor_homepage'
]

// Number keys select layers
const SHORTCUT_LAYERS = { 1: 'Markup', 2: 'Clozes' }

// Stored on each cloze for the image occlusion parser
const clozeSettingsDataKey = 'cloze-settings'
const clozeSettingsKey = `data-${clozeSettingsDataKey}`

const loadExtensionTranslation = async function (svgEditor) {
  let translationModule
  const lang = svgEditor.configObj.pref('lang')
  try {
    translationModule = await import(`./locale/${lang}.js`)
  } catch (_error) {
    console.warn(`Missing translation (${lang}) for ${name} - using 'en'`)
    translationModule = await import('./locale/en.js')
  }
  svgEditor.i18next.addResourceBundle(lang, name, translationModule.default)
}

/** Resolves with the element with `id` once it is in the document. */
const whenElement = (id) => new Promise((resolve) => {
  const find = () => document.getElementById(id)
  const element = find()
  if (element) return resolve(element)
  const observer = new MutationObserver(() => {
    const found = find()
    if (found) {
      observer.disconnect()
      resolve(found)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
})

export default {
  name,
  async init (_S) {
    const svgEditor = this
    const { svgCanvas } = svgEditor
    const { $id, $click } = svgCanvas
    await loadExtensionTranslation(svgEditor)

    // Shapes drawn after loading should be clozes. Loading a string does not refresh the layers
    // panel, so it is repopulated.
    const selectClozesLayer = () => {
      svgCanvas.setCurrentLayer('Clozes')
      svgEditor.layersPanel.populateLayers()
    }

    const setup = async () => {
      if (!sparesConfig.template) {
        alert(`The image occlusion template could not be loaded from ${STANDALONE_CONFIG_PATH}. Start the editor with \`spares_frontend --image-occlusion\`.`)
        return
      }
      await svgEditor.loadFromString(sparesConfig.template)
      selectClozesLayer()
      svgEditor.bottomPanel.changeZoom('canvas')
      // Undoing the template would remove the layers the parser looks for
      svgCanvas.undoMgr.resetUndoStack()
      // Given by `spares_frontend --image-occlusion --image <PATH>`
      const { background } = sparesConfig
      if (background && !embedded) {
        try {
          await loadBackgroundImage(background.url, background.name)
          svgCanvas.undoMgr.resetUndoStack()
        } catch (error) {
          alert(error.message)
        }
      }
    }

    const setBackgroundImage = (imageURL, width, height, title) => {
      svgCanvas.setBackground('#000', imageURL)
      svgEditor.svgCanvas.setResolution(width, height)
      svgEditor.bottomPanel.changeZoom('canvas')
      if (title) svgEditor.topPanel.updateTitle(title)
    }

    let resolveReady
    const ready = new Promise((resolve) => { resolveReady = resolve })
    if (embedded) {
      window.sparesBridge = {
        ready,
        /**
         * Shows `imageUrl` behind the clozes in `svg`, or the template for a new image
         * occlusion. The canvas takes the image's size, which the parser expects of the clozes
         * file.
         */
        async load ({ imageUrl, width, height, svg, title }) {
          await svgEditor.loadFromString(svg ?? sparesConfig.template, { noAlert: true })
          selectClozesLayer()
          setBackgroundImage(imageUrl, width, height, title)
          // Loading is not an edit the user would want to undo or be warned about
          svgCanvas.undoMgr.resetUndoStack()
        },
        getClozesSvg () {
          svgCanvas.clearSelection()
          return svgCanvas.getSvgString()
        },
        isDirty () {
          return svgCanvas.undoMgr.getUndoStackSize() > 0
        }
      }
    }

    const getFileStem = (filepath) => {
      return filepath.split('/').pop().split('.').slice(0, -1).join('.')
    }

    const showInput = (on) => {
      $id('elem_cloze_settings').style.display = (on) ? 'block' : 'none'
    }

    /** Shows the image at `imageURL` behind the clozes, and names them after `fileName`. */
    const loadBackgroundImage = (imageURL, fileName) => new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        setBackgroundImage(imageURL, img.naturalWidth, img.naturalHeight, getFileStem(fileName) + '_clozes.svg')
        resolve()
      }
      img.onerror = () => reject(new Error(`Failed to load the image ${fileName}`))
      img.src = imageURL
    })

    const clickOpen = async function () {
      try {
        const blob = await fileOpen({
          mimeTypes: ['image/*']
        })
        const imageURL = URL.createObjectURL(blob)
        await loadBackgroundImage(imageURL, blob.name)
        // Clean up the URL
        URL.revokeObjectURL(imageURL)
      } catch (err) {
        if (err.name !== 'AbortError') {
          return console.error(err)
        }
      }
    }

    return {
      name: svgEditor.i18next.t(`${name}:name`),
      // The callback should be used to load the DOM with the appropriate UI items
      callback () {
        setup()

        // Add Cloze Settings input
        const element = document.createElement('template')
        const label0 = `${name}:contextTools.0.label`
        const title0 = `${name}:contextTools.0.title`
        element.innerHTML = `
        <se-input id="elem_cloze_settings" data-attr="${clozeSettingsDataKey}" size="10" label="${label0}" title="${title0}"></se-input>`
        // const classNames = [
        //   // Rectangle,
        //   "rect_panel",
        //   // Circle,
        //   "circle_panel",
        //   // Ellipse,
        //   "ellipse_panel",
        //   // Line,
        //   // "line_panel",
        //   // Polyline,
        //   // Polygon,
        //   "polygon_panel",
        //   // Path,
        //   // "path_node_panel", // This is for an edge within a path
        // ]
        // for (const className of classNames) {
        //   $qa(`.${className}`).forEach(el => el.appendChild(element.content.cloneNode(true)))
        // }
        $id('editor_panel').appendChild(element.content.cloneNode(true))
        $id('elem_cloze_settings').addEventListener('change', (event) => {
          svgCanvas.changeSelectedAttribute(clozeSettingsKey, event.target.value)
        })
        // Hand the keyboard back to the editor's shortcuts. Blurring commits the value.
        $id('elem_cloze_settings').addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === 'Escape') document.activeElement.blur()
        })
        document.addEventListener('keydown', (event) => {
          // Like the editor's shortcuts, ignore keys typed into inputs
          if (event.target.nodeName !== 'BODY' || event.metaKey || event.ctrlKey || event.altKey) return
          const layer = SHORTCUT_LAYERS[event.key]
          if (layer && !event.shiftKey) {
            svgCanvas.clearSelection()
            svgCanvas.setCurrentLayer(layer)
            svgEditor.layersPanel.populateLayers()
          } else if (event.key === 'C' && event.shiftKey) {
            const input = $id('elem_cloze_settings')
            if (input.style.display === 'none') return
            input.$input.focus()
          } else {
            return
          }
          event.preventDefault()
        })

        // Change background image
        const label1 = `${name}:contextTools.1.label`
        // `B` is bold
        const shortcut1 = 'shift+B'
        const buttonTemplate = `
        <se-menu-item id="tool_change_background" label="${label1}" shortcut="${shortcut1}" src="new.svg"></se-menu-item>`
        svgCanvas.insertChildAtIndex($id('main_button'), buttonTemplate, 0)
        $click($id('tool_change_background'), clickOpen.bind(this))

        // Keyboard shortcuts popup, last in the main menu
        const label2 = `${name}:contextTools.2.label`
        const shortcutsTemplate = `
        <se-menu-item id="tool_spares_shortcuts" label="${label2}" shortcut="shift+?" src="context_menu.svg"></se-menu-item>`
        svgCanvas.insertChildAtIndex($id('main_button'), shortcutsTemplate, Infinity)
        $click($id('tool_spares_shortcuts'), createShortcutsDialog(embedded))

        // Change clozes file. Extensions load in parallel, so ext-opensave may not have added it yet.
        whenElement('tool_open').then((toolOpen) => { toolOpen.label = 'Open Clozes SVG' })

        if (embedded) {
          // A stylesheet also hides tools other extensions have not added yet
          const style = document.createElement('style')
          style.textContent = `${EMBEDDED_HIDDEN_TOOLS.map((id) => `#${id}`).join(', ')} { display: none !important; }`
          document.head.appendChild(style)
          resolveReady()
          window.parent.postMessage({ type: 'spares:ready' }, window.location.origin)
        }
      },
      selectedChanged (opts) {
        const { elems: selElems } = opts
        if (selElems.length === 0 && $id('elem_cloze_settings') != null) {
          showInput(false)
        }
        for (const elem of selElems) {
          const validNodeNames = [
            'rect',
            'circle',
            'ellipse',
            'polygon',
            'path'
          ]
          if (elem && validNodeNames.includes(elem.nodeName)) {
            const currentClozeSettings = elem.getAttribute(clozeSettingsKey) || ''
            $id('elem_cloze_settings').value = currentClozeSettings
            showInput(true)
          } else {
            showInput(false)
          }
        }
      }
    }
  }
}
