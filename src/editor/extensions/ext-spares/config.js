/**
 * @file config.js
 *
 * @license MIT
 *
 * The template and the user's editor settings from spares, shaped like
 * `spares_core::api::image_occlusion::ImageOcclusionEditorConfig`.
 *
 * The spares frontend passes it in the `config` URL parameter. The standalone editor fetches it
 * from the dev server, which `spares_frontend --image-occlusion` gives it to. Missing settings
 * are left to `index.html`.
 */

export const STANDALONE_CONFIG_PATH = '/__spares/image-occlusion-editor.json'

const urlParams = new URLSearchParams(window.location.search)

const load = async () => {
  if (urlParams.get('embedded') === '1') {
    try {
      return JSON.parse(urlParams.get('config') ?? '{}')
    } catch (error) {
      console.error('Invalid image occlusion editor config', error)
      return {}
    }
  }
  try {
    const res = await fetch(STANDALONE_CONFIG_PATH)
    if (res.ok) return await res.json()
    console.error(`Failed to fetch ${STANDALONE_CONFIG_PATH}: ${res.status}`)
  } catch (error) {
    console.error(`Failed to fetch ${STANDALONE_CONFIG_PATH}`, error)
  }
  return {}
}

export const sparesConfig = await load()
