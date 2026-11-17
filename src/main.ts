import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource-variable/manrope'
import '@fontsource-variable/newsreader'
import '@fontsource-variable/newsreader/opsz-italic.css'
import './styles/tokens.css'
import './styles/base.css'
import App from './App.vue'

async function bootstrap() {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready
    } catch {
      // Fonts are optional; system fallbacks remain usable.
    }
  }
  createApp(App).use(createPinia()).mount('#app')
}

void bootstrap()
