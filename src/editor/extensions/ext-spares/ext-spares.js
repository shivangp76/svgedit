/**
 * @file ext-spares.js
 *
 * @license MIT
 *
 *
 */
import { fileOpen, fileSave } from 'browser-fs-access'

const name = 'spares'

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

export default {
  name,
  async init (_S) {
    const svgEditor = this
    const { svgCanvas } = svgEditor
    const { $id, $click, $qq, $qa } = svgCanvas
    await loadExtensionTranslation(svgEditor)

    const setup = () => {
      svgEditor.loadFromString('<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <g class="layer" id="markup-group"> <title>Markup</title> </g> <g class="layer" id="clozes-group"> <title>Clozes</title> </g> </svg>')
      svgEditor.bottomPanel.changeZoom('canvas');
    }

    const getFileStem = (filepath) => {
        return filepath.split('/').pop().split('.').slice(0, -1).join('.');
    }

    const showInput = (on) => {
      $id('elem_cloze_settings').style.display = (on) ? 'block' : 'none'
    }

    const clickOpen = async function () {
      try {
        const blob = await fileOpen({
          mimeTypes: ['image/*']
        })
        const imageURL = URL.createObjectURL(blob);
        const title = getFileStem(blob.name) + "-clozes.svg"
        const img = new Image()
        img.src = imageURL
        img.onload = function() {
          svgCanvas.setBackground("#000", imageURL)
          const width = img.naturalWidth
          const height = img.naturalHeight
          svgEditor.svgCanvas.setResolution(width, height)
          svgEditor.bottomPanel.changeZoom('canvas');
          svgEditor.topPanel.updateTitle(title)
          // Clean up the URL
          URL.revokeObjectURL(imageURL);
        };
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
        <se-input id="elem_cloze_settings" data-attr="cloze-settings" size="10" label="${label0}" title="${title0}"></se-input>`
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
          svgCanvas.changeSelectedAttribute('data-cloze-settings', event.target.value)
        })

        // Change background image
        const label1 = `${name}:contextTools.1.label`
        const shortcut1 = 'B'
        const buttonTemplate = `
        <se-menu-item id="tool_change_background" label="${label1}" shortcut="${shortcut1}" src="new.svg"></se-menu-item>`
        svgCanvas.insertChildAtIndex($id('main_button'), buttonTemplate, 0)
        $click($id('tool_change_background'), clickOpen.bind(this))

        // Change clozes file
        $id('tool_open').label = "Open Clozes SVG"
      },
      selectedChanged (opts) {
        const { elems: selElems } = opts
        if (selElems.length == 0 && $id('elem_cloze_settings') != null) {
          showInput(false)
        }
        for (const elem of selElems) {
          const validNodeNames = [
            "rect",
            "circle",
            "ellipse",
            "polygon",
            "path",
          ]
          if (validNodeNames.includes(elem.nodeName)) {
            const currentClozeSettings = elem.getAttribute("data-cloze-settings") || ""
            $id('elem_cloze_settings').value = currentClozeSettings
            showInput(true)
          } else {
            showInput(false)
          }
        }
      },
    }
  }
}
