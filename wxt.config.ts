import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  manifest: {
    name: 'Truely Dark',
    short_name: 'Truely Dark',
    description:
      'Instantly dark. Never sluggish. Never double-dark. Flash-free dark mode for Chrome and Firefox.',
    version: '1.0.0',
    author: 'Chauhan Sahil',
    homepage_url: 'https://github.com/pwnapplehat/Truely-Dark',
    permissions: ['storage', 'tabs', 'scripting', 'alarms', 'activeTab'],
    host_permissions: [
      '<all_urls>',
      'https://chromewebstore.google.com/*',
      'https://chrome.google.com/*',
    ],
    optional_permissions: [
      'https://chromewebstore.google.com/*',
      'https://chrome.google.com/*',
    ],
    commands: {
      'toggle-global': {
        suggested_key: {
          default: 'Alt+Shift+D',
          mac: 'Alt+Shift+D',
        },
        description: 'Toggle Truely Dark globally',
      },
      'toggle-site': {
        suggested_key: {
          default: 'Alt+Shift+S',
          mac: 'Alt+Shift+S',
        },
        description: 'Toggle Truely Dark for current site',
      },
    },
    action: {
      default_title: 'Truely Dark',
      default_popup: 'popup.html',
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    browser_specific_settings: {
      gecko: {
        id: 'truely-dark@pwnapplehat.github.io',
        strict_min_version: '109.0',
      },
    },
  },
});
