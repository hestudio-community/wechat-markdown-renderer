<script>
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'
import { saveAs } from 'file-saver'
import { ArrowDown } from '@element-plus/icons-vue'
import CssEditor from './CssEditor.vue'
import juice from 'juice'
import { useDark } from '@vueuse/core'
import { ElColorPickerPanel } from 'element-plus/es/components/color-picker-panel/index.mjs'

let purifierConfigured = false

const CODE_THEMES = [
  { label: 'GitHub', value: 'github' },
  { label: 'GitHub Dark', value: 'github-dark' },
  { label: 'VS Code', value: 'vs' },
  { label: 'VS Code Dark', value: 'vs2015' },
  { label: 'Atom One Light', value: 'atom-one-light' },
  { label: 'Atom One Dark', value: 'atom-one-dark' },
  { label: 'Monokai', value: 'monokai' },
  { label: 'Dracula', value: 'dracula' },
  { label: 'Nord', value: 'nord' },
  { label: 'Solarized Light', value: 'solarized-light' },
  { label: 'Solarized Dark', value: 'solarized-dark' },
  { label: 'Tomorrow', value: 'tomorrow' },
  { label: 'Tomorrow Night', value: 'tomorrow-night' },
  { label: 'Gruvbox Light', value: 'gruvbox-light' },
  { label: 'Gruvbox Dark', value: 'gruvbox-dark' }
]

const DEFAULT_STYLES = {
  fontSize: 14,
  lineHeight: 1.8,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  codeFontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
  textColor: '#24292e',
  backgroundColor: '#ffffff',
  linkColor: '#0366d6',
  codeBackground: '#f6f8fa',
  blockquoteBorderColor: '#dfe2e5',
  blockquoteTextColor: '#6a737d',
  tableBorderColor: '#dfe2e5',
  tableHeaderBackground: '#f6f8fa',
  h1FontSize: 2,
  h2FontSize: 1.5,
  h3FontSize: 1.25,
  customCss: '',
  customFonts: [],
  codeTheme: 'github',
  macStyleCodeBlock: true
}

const STORAGE_KEY = 'wx-markdown-renderer-styles'
const FONTS_STORAGE_KEY = 'wx-markdown-renderer-fonts'
const CONTENT_STORAGE_KEY = 'wx-markdown-renderer-content'

// 配置 marked 使用 highlight.js
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  }
}))

marked.setOptions({
  breaks: true,
  gfm: true
})

function configurePurifier() {
  if (purifierConfigured) return
  purifierConfigured = true

  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName === 'input') {
      const type = node.getAttribute('type')
      if (type !== 'checkbox') {
        node.parentNode && node.parentNode.removeChild(node)
      }
    }
  })
}

export default {
  name: 'WXMarkdownRendererTool',
  components: {
    ArrowDown,
    CssEditor,
    ElColorPickerPanel
  },
  setup() {
    // 自动跟随系统深色模式设置
    useDark()
    return {}
  },
  data() {
    return {
      markdownText: '',
      copySuccess: false,
      styleDrawerVisible: false,
      customStyles: { ...DEFAULT_STYLES },
      exporting: false,
      customCssDialogVisible: false,
      fontDialogVisible: false,
      tempCustomCss: '',
      newFontName: '',
      newFontUrl: '',
      activeStyleTab: 'basic',
      codeThemes: CODE_THEMES,
      highlightCss: '',
      highlightCssTheme: '',
      autoSaveTimer: null
    }
  },
  computed: {
    renderedHtml() {
      const cleanedMarkdown = this.stripFrontmatter(this.markdownText)
      // 使用 DOMPurify 清理 HTML 防止 XSS 攻击
      // 允许 highlight.js 生成的 span 标签和 class 属性
      return DOMPurify.sanitize(marked(cleanedMarkdown), {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'span', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'strong', 'em', 'del', 's', 'sup', 'sub', 'div', 'input'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel', 'type', 'checked', 'disabled', 'aria-checked']
      })
    },
    previewStyles() {
      const s = this.customStyles
      return {
        '--font-size': `${s.fontSize}px`,
        '--line-height': s.lineHeight,
        '--font-family': s.fontFamily,
        '--code-font-family': s.codeFontFamily,
        '--text-color': s.textColor,
        '--background-color': s.backgroundColor,
        '--link-color': s.linkColor,
        '--code-background': s.codeBackground,
        '--blockquote-border-color': s.blockquoteBorderColor,
        '--blockquote-text-color': s.blockquoteTextColor,
        '--table-border-color': s.tableBorderColor,
        '--table-header-background': s.tableHeaderBackground,
        '--h1-font-size': `${s.h1FontSize}em`,
        '--h2-font-size': `${s.h2FontSize}em`,
        '--h3-font-size': `${s.h3FontSize}em`
      }
    },
    presetColors() {
      return [
        '#ff6b6b',
        '#ffa502',
        '#ffdd59',
        '#7bed9f',
        '#70a1ff',
        '#5352ed',
        '#ff4757',
        '#2f3542',
        '#ffffff',
        '#000000'
      ]
    },
    fontOptions() {
      const defaultFonts = [
        { label: '系统默认', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' },
        { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
        { label: '宋体', value: 'SimSun, serif' },
        { label: '黑体', value: 'SimHei, sans-serif' }
      ]
      const customFonts = (this.customStyles.customFonts || []).map(f => ({
        label: f.name + ' (自定义)',
        value: `"${f.name}", sans-serif`
      }))
      return [...defaultFonts, ...customFonts]
    },
    codeFontOptions() {
      const defaultFonts = [
        { label: 'Monaco', value: 'Monaco, Menlo, "Ubuntu Mono", monospace' },
        { label: 'Consolas', value: 'Consolas, "Courier New", monospace' },
        { label: 'Fira Code', value: '"Fira Code", monospace' }
      ]
      const customFonts = (this.customStyles.customFonts || []).map(f => ({
        label: f.name + ' (自定义)',
        value: `"${f.name}", monospace`
      }))
      return [...defaultFonts, ...customFonts]
    }
  },
  watch: {
    'customStyles.codeBackground': {
      handler() {
        if (this.customStyles.codeBackground === DEFAULT_STYLES.codeBackground) {
          this.removeCodeBackgroundOverride()
        } else {
          this.updateCodeBackgroundOverride()
        }
      }
    },
    markdownText: {
      handler(newValue) {
        // 防抖保存，避免频繁写入 localStorage
        if (this.autoSaveTimer) {
          clearTimeout(this.autoSaveTimer)
        }
        this.autoSaveTimer = setTimeout(() => {
          this.saveContent()
        }, 500)
      }
    }
  },
  created() {
    // Note: highlight configuration is handled globally via markedHighlight plugin (lines 54-62)
    // marked.setOptions({ highlight }) is deprecated in marked v4+
    configurePurifier()
    this.loadStyles()
    this.loadCustomFonts()
    this.injectCustomCss()
    this.loadCodeTheme(this.customStyles.codeTheme || 'github')
    this.loadContent()
  },
  beforeUnmount() {
    // 清理定时器
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
    }
  },
  methods: {
    stripFrontmatter(text) {
      if (!text) return text
      const hasBom = text[0] === '\ufeff'
      const source = hasBom ? text.slice(1) : text
      if (!source.startsWith('---')) return text
      const match = source.match(/^---\s*\n[\s\S]*?\n---\s*\n?/)
      if (!match) return text
      return source.slice(match[0].length)
    },
    loadCodeTheme(theme) {
      const styleId = 'hljs-theme-style'
      let styleEl = document.getElementById(styleId)
      if (styleEl) {
        styleEl.remove()
      }

      const link = document.createElement('link')
      link.id = styleId
      link.rel = 'stylesheet'
      // Use version matching package.json highlight.js dependency
      link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/${theme}.min.css`

      link.onerror = () => {
        console.error(`Failed to load code theme: ${theme}`)
        this.$message({ message: `代码主题 "${theme}" 加载失败，请检查网络连接`, type: 'warning', plain: true })
      }

      document.head.appendChild(link)
    },
    updateCodeBackgroundOverride() {
      const styleId = 'hljs-background-override'
      let styleEl = document.getElementById(styleId)
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = styleId
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = `
        .markdown-body pre .hljs {
          background-color: ${this.customStyles.codeBackground} !important;
        }
      `
    },
    removeCodeBackgroundOverride() {
      const styleId = 'hljs-background-override'
      const styleEl = document.getElementById(styleId)
      if (styleEl) {
        styleEl.remove()
      }
    },
    onCodeThemeChange(theme) {
      this.loadCodeTheme(theme)
      this.highlightCss = ''
      this.highlightCssTheme = ''
      // 切换主题后，如果用户设置了自定义背景色（非默认值），则重新应用
      if (this.customStyles.codeBackground !== DEFAULT_STYLES.codeBackground) {
        // 延迟应用以确保主题样式先加载
        this.$nextTick(() => {
          this.updateCodeBackgroundOverride()
        })
      } else {
        // 使用主题原生背景色
        this.removeCodeBackgroundOverride()
      }
    },
    loadContent() {
      try {
        const saved = localStorage.getItem(CONTENT_STORAGE_KEY)
        if (saved) {
          this.markdownText = saved
        } else {
          // 如果没有保存的内容，使用默认示例
          this.markdownText = `# 微信公众号 Markdown 编辑器

## 功能特点

这是一款专为**微信公众号**设计的 Markdown 渲染工具，支持：

- 📝 实时预览 Markdown 渲染效果
- 🎨 自定义样式配置（字体、颜色、代码主题等）
- 📋 一键复制，直接粘贴到微信公众号编辑器
- 💾 导出为 HTML 文件
- 🎯 代码高亮支持多种主题
- 💻 Mac 风格代码块装饰
- 💾 自动保存编辑内容（防止意外关闭丢失内容）

### 代码示例

\`\`\`javascript
// 支持语法高亮的代码块
function greet(name) {
  return \`你好，\${name}！欢迎使用微信 Markdown 编辑器\`;
}

console.log(greet('微信公众号作者'));
\`\`\`

### 表格示例

| 功能 | 说明 |
|------|------|
| 实时预览 | 左侧编辑，右侧即时显示渲染效果 |
| 样式定制 | 丰富的样式配置选项，满足个性化需求 |
| 一键复制 | 复制后可直接粘贴到微信公众号编辑器 |
| 代码高亮 | 支持 15+ 种代码高亮主题 |
| 自动保存 | 编辑内容自动保存到本地存储 |

### 引用示例

> 💡 提示：点击右上角"样式设置"按钮，可以自定义字体、颜色和代码主题等样式。
>
> 编辑完成后，点击"复制"按钮，即可直接粘贴到微信公众号编辑器中！
>
> 你的编辑内容会自动保存，即使意外关闭浏览器也不会丢失！

---

开始在左侧编辑你的内容吧！✨
`
        }
      } catch (e) {
        console.error('Failed to load content:', e)
      }
    },
    saveContent() {
      try {
        localStorage.setItem(CONTENT_STORAGE_KEY, this.markdownText)
      } catch (e) {
        console.error('Failed to save content:', e)
      }
    },
    loadStyles() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          this.customStyles = { ...DEFAULT_STYLES, ...parsed }
        }
      } catch (e) {
        console.error('Failed to load styles:', e)
      }
    },
    loadCustomFonts() {
      const fonts = this.customStyles.customFonts || []
      fonts.forEach(font => {
        this.injectFontFace(font.name, font.url)
      })
    },
    clearCustomFontStyles() {
      document.querySelectorAll('[id^="custom-font-"]').forEach((node) => {
        node.remove()
      })
    },
    injectFontFace(name, url) {
      const styleId = `custom-font-${name.replace(/\s+/g, '-')}`
      if (document.getElementById(styleId)) return

      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        @font-face {
          font-family: "${name}";
          src: url("${url}");
        }
      `
      document.head.appendChild(style)
    },
    injectCustomCss() {
      const styleId = 'custom-markdown-css'
      let styleEl = document.getElementById(styleId)
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = styleId
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = this.customStyles.customCss || ''
    },
    saveStyles() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customStyles))
        this.injectCustomCss()
        this.$message({ message: '样式已保存', type: 'success', plain: true })
      } catch (e) {
        this.$message({ message: '保存失败', type: 'error', plain: true })
      }
    },
    resetStyles() {
      this.customStyles = { ...DEFAULT_STYLES }
      localStorage.removeItem(STORAGE_KEY)
      this.clearCustomFontStyles()
      this.injectCustomCss()
      this.removeCodeBackgroundOverride()
      this.$message({ message: '样式已重置', type: 'success', plain: true })
    },
    exportStyles() {
      const data = JSON.stringify(this.customStyles, null, 2)
      const blob = new Blob([data], { type: 'application/json;charset=utf-8' })
      saveAs(blob, 'markdown-styles.json')
      this.$message({ message: '样式配置已导出', type: 'success', plain: true })
    },
    importStyles() {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e) => {
        const file = e.target.files[0]
        if (file) {
          try {
            const text = await file.text()
            const parsed = JSON.parse(text)
            this.customStyles = { ...DEFAULT_STYLES, ...parsed }
            this.clearCustomFontStyles()
            this.loadCustomFonts()
            this.injectCustomCss()
            this.saveStyles()
            this.$message({ message: '样式配置已导入', type: 'success', plain: true })
          } catch (err) {
            this.$message({ message: '导入失败，请检查文件格式', type: 'error', plain: true })
          }
        }
      }
      input.click()
    },
    openCustomCssDialog() {
      this.tempCustomCss = this.customStyles.customCss || ''
      this.customCssDialogVisible = true
    },
    saveCustomCss() {
      this.customStyles.customCss = this.tempCustomCss
      this.injectCustomCss()
      this.customCssDialogVisible = false
      this.$message({ message: '自定义 CSS 已应用', type: 'success', plain: true })
    },
    openFontDialog() {
      this.newFontName = ''
      this.newFontUrl = ''
      this.fontDialogVisible = true
    },
    addCustomFont() {
      if (!this.newFontName || !this.newFontUrl) {
        this.$message({ message: '请填写字体名称和 URL', type: 'warning', plain: true })
        return
      }
      if (!this.customStyles.customFonts) {
        this.customStyles.customFonts = []
      }
      const exists = this.customStyles.customFonts.find(f => f.name === this.newFontName)
      if (exists) {
        this.$message({ message: '该字体名称已存在', type: 'warning', plain: true })
        return
      }
      this.customStyles.customFonts.push({
        name: this.newFontName,
        url: this.newFontUrl
      })
      this.injectFontFace(this.newFontName, this.newFontUrl)
      this.fontDialogVisible = false
      this.$message({ message: `字体 "${this.newFontName}" 已添加`, type: 'success', plain: true })
    },
    removeCustomFont(index) {
      const font = this.customStyles.customFonts[index]
      this.customStyles.customFonts.splice(index, 1)
      // 移除对应的 style 标签
      const styleId = `custom-font-${font.name.replace(/\s+/g, '-')}`
      const styleEl = document.getElementById(styleId)
      if (styleEl) {
        styleEl.remove()
      }
      this.$message({ message: `字体 "${font.name}" 已移除`, type: 'success', plain: true })
    },
    getFullHtml() {
      const s = this.customStyles
      const wrapperClass = `markdown-body${s.macStyleCodeBlock ? ' mac-style-code' : ''}`
      const wrapperStyle = Object.entries(this.previewStyles)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ')
      const customFontsCss = this.getCustomFontsCss()
      const markdownCss = this.getMarkdownCss()
      const customCss = s.customCss || ''
      const codeBackgroundOverride = this.getCodeBackgroundOverrideCss()
      const highlightCss = this.highlightCss
      const highlightLink = this.getHighlightThemeLink()
      const highlightBlock = highlightCss
        ? `<style>${highlightCss}</style>`
        : (highlightLink ? `<link rel="stylesheet" href="${highlightLink}">` : '')
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Markdown Export</title>
  ${highlightBlock}
  <style>
    ${customFontsCss}
    ${markdownCss}
    ${codeBackgroundOverride}
    ${customCss}
  </style>
</head>
<body>
  <div class="${wrapperClass}" style="${wrapperStyle}; background-color: var(--background-color); padding: 16px;">
    ${this.renderedHtml}
  </div>
</body>
</html>`
    },
    getHighlightThemeLink() {
      const link = document.getElementById('hljs-theme-style')
      return link && link.href ? link.href : ''
    },
    async ensureHighlightThemeCss() {
      if (this.highlightCss && this.highlightCssTheme === this.customStyles.codeTheme) {
        return this.highlightCss
      }
      const link = this.getHighlightThemeLink()
      if (!link) return ''
      try {
        const response = await fetch(link, { mode: 'cors' })
        if (!response.ok) return ''
        const css = await response.text()
        this.highlightCss = css
        this.highlightCssTheme = this.customStyles.codeTheme
        return css
      } catch (err) {
        console.warn('Failed to fetch highlight theme CSS:', err)
        return ''
      }
    },
    getCustomFontsCss() {
      const fonts = this.customStyles.customFonts || []
      if (!fonts.length) return ''
      return fonts.map(font => `
@font-face {
  font-family: "${font.name}";
  src: url("${font.url}");
}`).join('\n')
    },
    getCodeBackgroundOverrideCss() {
      if (this.customStyles.codeBackground === DEFAULT_STYLES.codeBackground) return ''
      return `
.markdown-body pre .hljs {
  background-color: ${this.customStyles.codeBackground} !important;
}`
    },
    getMarkdownCss() {
      return `
body {
  margin: 0;
}
.markdown-body {
  font-size: var(--font-size, 14px);
  line-height: var(--line-height, 1.8);
  font-family: var(--font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif);
  color: var(--text-color, #24292e);
}
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}
.markdown-body h1 {
  font-size: var(--h1-font-size, 2em);
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
}
.markdown-body h2 {
  font-size: var(--h2-font-size, 1.5em);
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
}
.markdown-body h3 {
  font-size: var(--h3-font-size, 1.25em);
}
.markdown-body p {
  margin-top: 0;
  margin-bottom: 16px;
}
.markdown-body ul,
.markdown-body ol {
  padding-left: 2em;
  margin-bottom: 16px;
}
.markdown-body li {
  margin-bottom: 4px;
}
.markdown-body code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  border-radius: 3px;
  font-family: var(--code-font-family, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
  white-space: pre-wrap;
}
.markdown-body :not(pre) > code {
  background-color: var(--code-background, rgba(27, 31, 35, 0.05));
}
.markdown-body pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  border-radius: 6px;
  margin-bottom: 16px;
  white-space: pre;
}
.markdown-body pre code.hljs {
  display: block;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  white-space: pre;
}
.markdown-body pre code {
  padding: 0;
  font-size: 100%;
  white-space: pre;
}
.markdown-body pre code:not(.hljs) {
  background-color: transparent;
}
.markdown-body blockquote {
  padding: 0 1em;
  color: var(--blockquote-text-color, #6a737d);
  border-left: 0.25em solid var(--blockquote-border-color, #dfe2e5);
  margin: 0 0 16px 0;
}
.markdown-body table {
  border-collapse: collapse;
  margin-bottom: 16px;
  width: 100%;
}
.markdown-body th,
.markdown-body td {
  padding: 6px 13px;
  border: 1px solid var(--table-border-color, #dfe2e5);
}
.markdown-body th {
  font-weight: 600;
  background-color: var(--table-header-background, #f6f8fa);
}
.markdown-body tr:nth-child(2n) {
  background-color: var(--table-header-background, #f6f8fa);
}
.markdown-body a {
  color: var(--link-color, #0366d6);
  text-decoration: none;
}
.markdown-body a:hover {
  text-decoration: underline;
}
.markdown-body img {
  max-width: 100%;
  height: auto;
}
.markdown-body hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #e1e4e8;
  border: 0;
}
.markdown-body.mac-style-code pre {
  position: relative;
  margin-bottom: 16px;
  padding: 0;
  border-radius: 10px;
  overflow: hidden;
}
.markdown-body.mac-style-code pre::before {
  content: '';
  position: absolute;
  top: 16px;
  left: 16px;
  width: 12px;
  height: 12px;
  background: #ff5f56;
  border-radius: 50%;
  box-shadow: 20px 0 0 #ffbd2e, 40px 0 0 #27c93f;
  z-index: 1;
}
.markdown-body.mac-style-code pre code,
.markdown-body.mac-style-code pre code.hljs {
  display: block;
  padding: 48px 16px 16px 16px;
  margin: 0;
  border-radius: 10px;
}
`
    },
    async importMarkdown() {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.md,.markdown,.txt'
      input.onchange = async (e) => {
        const file = e.target.files[0]
        if (file) {
          try {
            const text = await file.text()
            this.markdownText = text
            this.$message({ message: `已导入: ${file.name}`, type: 'success', plain: true })
          } catch (err) {
            this.$message({ message: '导入失败', type: 'error', plain: true })
          }
        }
      }
      input.click()
    },
    async exportToHtml() {
      this.exporting = true
      try {
        await this.ensureHighlightThemeCss()
        const html = this.getFullHtml()
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        saveAs(blob, 'markdown-export.html')
        this.$message({ message: 'HTML 导出成功', type: 'success', plain: true })
      } catch (err) {
        this.$message({ message: 'HTML 导出失败', type: 'error', plain: true })
        console.error(err)
      } finally {
        this.exporting = false
      }
    },
    async copyHtml() {
      try {
        await this.ensureHighlightThemeCss()
        const htmlContent = this.getFullHtml()
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const textBlob = new Blob([htmlContent], { type: 'text/plain' })

        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blob,
            'text/plain': textBlob
          })
        ])

        this.copySuccess = true
        this.$message({ message: 'HTML 已复制到剪贴板，可直接粘贴到富文本编辑器', type: 'success', plain: true })

        setTimeout(() => {
          this.copySuccess = false
        }, 2000)
      } catch (err) {
        try {
          const tempContainer = document.createElement('div')
          tempContainer.style.position = 'fixed'
          tempContainer.style.left = '-9999px'
          tempContainer.innerHTML = this.getFullHtml()
          document.body.appendChild(tempContainer)

          const range = document.createRange()
          range.selectNodeContents(tempContainer)
          const selection = window.getSelection()
          selection.removeAllRanges()
          selection.addRange(range)
          document.execCommand('copy')
          selection.removeAllRanges()
          document.body.removeChild(tempContainer)

          this.copySuccess = true
          this.$message({ message: 'HTML 已复制到剪贴板', type: 'success', plain: true })

          setTimeout(() => {
            this.copySuccess = false
          }, 2000)
        } catch (fallbackErr) {
          this.$message({ message: '复制失败，请手动选择复制', type: 'error', plain: true })
        }
      }
    },
    clearContent() {
      this.$confirm('确定要清空所有内容吗？此操作不可恢复。', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.markdownText = ''
        localStorage.removeItem(CONTENT_STORAGE_KEY)
        this.$message({ message: '内容已清空', type: 'success', plain: true })
      }).catch(() => {
        // 取消操作
      })
    },
    // 获取代码高亮的内联样式
    getInlineHighlightStyles() {
      const themeColors = {
        'github': {
          background: '#f6f8fa',
          text: '#24292e',
          keyword: '#d73a49',
          string: '#032f62',
          comment: '#6a737d',
          function: '#6f42c1',
          number: '#005cc5',
          operator: '#d73a49',
          variable: '#e36209',
          tag: '#22863a',
          attribute: '#6f42c1',
          property: '#005cc5'
        },
        'github-dark': {
          background: '#0d1117',
          text: '#c9d1d9',
          keyword: '#ff7b72',
          string: '#a5d6ff',
          comment: '#8b949e',
          function: '#d2a8ff',
          number: '#79c0ff',
          operator: '#ff7b72',
          variable: '#ffa657',
          tag: '#7ee787',
          attribute: '#d2a8ff',
          property: '#79c0ff'
        },
        'vs': {
          background: '#ffffff',
          text: '#000000',
          keyword: '#0000ff',
          string: '#a31515',
          comment: '#008000',
          function: '#795e26',
          number: '#098658',
          operator: '#0000ff',
          variable: '#001080',
          tag: '#800000',
          attribute: '#ff0000',
          property: '#001080'
        },
        'vs2015': {
          background: '#1e1e1e',
          text: '#dcdcdc',
          keyword: '#569cd6',
          string: '#ce9178',
          comment: '#6a9955',
          function: '#dcdcaa',
          number: '#b5cea8',
          operator: '#569cd6',
          variable: '#9cdcfe',
          tag: '#4ec9b0',
          attribute: '#9cdcfe',
          property: '#9cdcfe'
        },
        'atom-one-light': {
          background: '#fafafa',
          text: '#383a42',
          keyword: '#a626a4',
          string: '#50a14f',
          comment: '#a0a1a7',
          function: '#4078f2',
          number: '#986801',
          operator: '#a626a4',
          variable: '#e45649',
          tag: '#e45649',
          attribute: '#4078f2',
          property: '#986801'
        },
        'atom-one-dark': {
          background: '#282c34',
          text: '#abb2bf',
          keyword: '#c678dd',
          string: '#98c379',
          comment: '#5c6370',
          function: '#61afef',
          number: '#d19a66',
          operator: '#c678dd',
          variable: '#e06c75',
          tag: '#e06c75',
          attribute: '#61afef',
          property: '#d19a66'
        },
        'monokai': {
          background: '#272822',
          text: '#f8f8f2',
          keyword: '#f92672',
          string: '#e6db74',
          comment: '#75715e',
          function: '#a6e22e',
          number: '#ae81ff',
          operator: '#f92672',
          variable: '#f8f8f2',
          tag: '#f92672',
          attribute: '#a6e22e',
          property: '#66d9ef'
        },
        'dracula': {
          background: '#282a36',
          text: '#f8f8f2',
          keyword: '#ff79c6',
          string: '#f1fa8c',
          comment: '#6272a4',
          function: '#50fa7b',
          number: '#bd93f9',
          operator: '#ff79c6',
          variable: '#f8f8f2',
          tag: '#ff79c6',
          attribute: '#50fa7b',
          property: '#8be9fd'
        },
        'nord': {
          background: '#2e3440',
          text: '#d8dee9',
          keyword: '#81a1c1',
          string: '#a3be8c',
          comment: '#616e88',
          function: '#88c0d0',
          number: '#b48ead',
          operator: '#81a1c1',
          variable: '#d8dee9',
          tag: '#81a1c1',
          attribute: '#88c0d0',
          property: '#8fbcbb'
        },
        'solarized-light': {
          background: '#fdf6e3',
          text: '#657b83',
          keyword: '#859900',
          string: '#2aa198',
          comment: '#93a1a1',
          function: '#268bd2',
          number: '#d33682',
          operator: '#859900',
          variable: '#268bd2',
          tag: '#268bd2',
          attribute: '#93a1a1',
          property: '#cb4b16'
        },
        'solarized-dark': {
          background: '#002b36',
          text: '#839496',
          keyword: '#859900',
          string: '#2aa198',
          comment: '#586e75',
          function: '#268bd2',
          number: '#d33682',
          operator: '#859900',
          variable: '#268bd2',
          tag: '#268bd2',
          attribute: '#586e75',
          property: '#cb4b16'
        },
        'tomorrow': {
          background: '#ffffff',
          text: '#4d4d4c',
          keyword: '#8959a8',
          string: '#718c00',
          comment: '#8e908c',
          function: '#4271ae',
          number: '#f5871f',
          operator: '#8959a8',
          variable: '#c82829',
          tag: '#c82829',
          attribute: '#4271ae',
          property: '#f5871f'
        },
        'tomorrow-night': {
          background: '#1d1f21',
          text: '#c5c8c6',
          keyword: '#b294bb',
          string: '#b5bd68',
          comment: '#969896',
          function: '#81a2be',
          number: '#de935f',
          operator: '#b294bb',
          variable: '#cc6666',
          tag: '#cc6666',
          attribute: '#81a2be',
          property: '#de935f'
        },
        'gruvbox-light': {
          background: '#fbf1c7',
          text: '#3c3836',
          keyword: '#9d0006',
          string: '#79740e',
          comment: '#928374',
          function: '#b57614',
          number: '#8f3f71',
          operator: '#9d0006',
          variable: '#076678',
          tag: '#9d0006',
          attribute: '#b57614',
          property: '#427b58'
        },
        'gruvbox-dark': {
          background: '#282828',
          text: '#ebdbb2',
          keyword: '#fb4934',
          string: '#b8bb26',
          comment: '#928374',
          function: '#fabd2f',
          number: '#d3869b',
          operator: '#fb4934',
          variable: '#83a598',
          tag: '#fb4934',
          attribute: '#fabd2f',
          property: '#8ec07c'
        }
      }

      const theme = themeColors[this.customStyles.codeTheme] || themeColors['github']

      return `
        .hljs { background: ${theme.background}; color: ${theme.text}; }
        .hljs-keyword { color: ${theme.keyword}; font-weight: bold; }
        .hljs-string { color: ${theme.string}; }
        .hljs-comment { color: ${theme.comment}; font-style: italic; }
        .hljs-function { color: ${theme.function}; }
        .hljs-number { color: ${theme.number}; }
        .hljs-operator { color: ${theme.operator}; }
        .hljs-variable { color: ${theme.variable}; }
        .hljs-tag { color: ${theme.tag}; }
        .hljs-attribute { color: ${theme.attribute}; }
        .hljs-property { color: ${theme.property}; }
        .hljs-built_in { color: ${theme.function}; }
        .hljs-selector-tag { color: ${theme.tag}; }
        .hljs-selector-class { color: ${theme.property}; }
        .hljs-selector-id { color: ${theme.property}; }
        .hljs-title { color: ${theme.function}; font-weight: bold; }
        .hljs-class { color: ${theme.function}; }
        .hljs-name { color: ${theme.tag}; }
        .hljs-params { color: ${theme.variable}; }
        .hljs-literal { color: ${theme.number}; }
        .hljs-regexp { color: ${theme.string}; }
        .hljs-meta { color: ${theme.comment}; }
        .hljs-doctag { color: ${theme.comment}; }
        .hljs-type { color: ${theme.function}; }
        .hljs-attr { color: ${theme.attribute}; }
        .hljs-symbol { color: ${theme.number}; }
        .hljs-bullet { color: ${theme.keyword}; }
        .hljs-link { color: ${theme.string}; text-decoration: underline; }
        .hljs-section { color: ${theme.function}; font-weight: bold; }
        .hljs-quote { color: ${theme.comment}; font-style: italic; }
        .hljs-emphasis { font-style: italic; }
        .hljs-strong { font-weight: bold; }
        .hljs-deletion { color: ${theme.variable}; }
        .hljs-addition { color: ${theme.string}; }
      `
    },
    // 替换 CSS 变量为实际值
    replaceCssVariables(html) {
      const s = this.customStyles
      const varMap = {
        'var(--font-size)': `${s.fontSize}px`,
        'var(--line-height)': `${s.lineHeight}`,
        'var(--font-family)': s.fontFamily,
        'var(--code-font-family)': s.codeFontFamily,
        'var(--text-color)': s.textColor,
        'var(--background-color)': s.backgroundColor,
        'var(--link-color)': s.linkColor,
        'var(--code-background)': s.codeBackground,
        'var(--blockquote-border-color)': s.blockquoteBorderColor,
        'var(--blockquote-text-color)': s.blockquoteTextColor,
        'var(--table-border-color)': s.tableBorderColor,
        'var(--table-header-background)': s.tableHeaderBackground,
        'var(--h1-font-size)': `${s.h1FontSize}em`,
        'var(--h2-font-size)': `${s.h2FontSize}em`,
        'var(--h3-font-size)': `${s.h3FontSize}em`
      }

      let result = html
      for (const [varName, value] of Object.entries(varMap)) {
        result = result.replace(new RegExp(varName.replace(/[()]/g, '\\$&'), 'g'), value)
      }

      // 替换带有默认值的变量，例如 var(--font-size, 14px)
      result = result.replace(/var\(--[\w-]+,\s*([^)]+)\)/g, '$1')

      return result
    },
    // 生成微信兼容的 HTML
    getWechatHtml() {
      const s = this.customStyles

      // 构建完整 CSS（不包含 Mac 风格伪元素，不使用 CSS 变量）
      const baseStyles = this.getMarkdownCss()
      const highlightStyles = this.getInlineHighlightStyles()
      const customCss = s.customCss || ''
      const darkTableCss = this.getWechatDarkTableCss()

      // 合并所有 CSS
      let fullCss = `
        ${baseStyles}
        ${highlightStyles}
        ${darkTableCss}
        ${customCss}
      `

      // 移除 Mac 风格代码块的伪元素样式（微信不支持）
      fullCss = fullCss.replace(/\.markdown-body\.mac-style-code[^}]*::before[^}]*\{[^}]*\}/g, '')

      // 创建临时 HTML 结构
      const macClass = s.macStyleCodeBlock ? ' mac-style-code' : ''
      const tempHtml = `
        <html>
          <body>
            <div class="markdown-body${macClass}">
              ${this.renderedHtml}
            </div>
          </body>
        </html>
      `

      try {
        // 使用 juice 内联化 CSS
        let inlinedHtml = juice(tempHtml, {
          extraCss: fullCss,
          removeStyleTags: true,
          preserveMediaQueries: false,
          preserveFontFaces: false,
          applyWidthAttributes: false,
          applyHeightAttributes: false,
          inlinePseudoElements: false
        })

        // 替换 CSS 变量为实际值
        inlinedHtml = this.replaceCssVariables(inlinedHtml)

        // 手动为 pre 和 code 元素添加 white-space 样式（确保空格保留）
        inlinedHtml = inlinedHtml.replace(/<pre([^>]*)>/g, (match, attrs) => {
          if (attrs.includes('style=')) {
            return match.replace(/style="([^"]*)"/, 'style="$1; white-space: pre; overflow-x: auto;"')
          } else {
            return `<pre${attrs} style="white-space: pre; overflow-x: auto;">`
          }
        })

        inlinedHtml = inlinedHtml.replace(/<code([^>]*class="[^"]*hljs[^"]*"[^>]*)>/g, (match, attrs) => {
          if (attrs.includes('style=')) {
            return match.replace(/style="([^"]*)"/, 'style="$1; white-space: pre; display: block;"')
          } else {
            return `<code${attrs} style="white-space: pre; display: block;">`
          }
        })

        // 将代码块中的空格替换为不换行空格，避免微信公众号编辑器折叠空格
        inlinedHtml = this.preserveCodeBlockSpaces(inlinedHtml)

        // 微信不支持 ::before，手动插入 Mac 代码块的窗口按钮
        if (this.customStyles.macStyleCodeBlock) {
          inlinedHtml = this.injectMacCodeHeader(inlinedHtml)
        }

        // 提取 body 内容
        const bodyMatch = inlinedHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        if (bodyMatch) {
          inlinedHtml = bodyMatch[1]
        }

        // 提取 markdown-body div 的内容
        const divMatch = inlinedHtml.match(/<div[^>]*class="markdown-body"[^>]*>([\s\S]*)<\/div>/i)
        if (divMatch) {
          // 保留 div 标签但移除 class 属性，保留内联样式
          const divTag = inlinedHtml.match(/<div[^>]*class="markdown-body"[^>]*>/i)[0]
          const styleMatch = divTag.match(/style="([^"]*)"/i)
          const styles = styleMatch ? styleMatch[1] : ''

          // 添加必要的基础样式
          const baseStyle = `
            font-size: ${s.fontSize}px;
            line-height: ${s.lineHeight};
            font-family: ${s.fontFamily};
            color: ${s.textColor};
            background-color: ${s.backgroundColor};
            padding: 16px;
            word-wrap: break-word;
          `.replace(/\s+/g, ' ').trim()

          inlinedHtml = `<div style="${baseStyle}${styles ? '; ' + styles : ''}">${divMatch[1]}</div>`
        }

        return inlinedHtml
      } catch (err) {
        console.error('Juice inlining failed:', err)
        this.$message({ message: 'HTML 转换失败，请检查样式配置', type: 'error', plain: true })
        return ''
      }
    },
    getWechatDarkTableCss() {
      const s = this.customStyles
      if (!this.isDarkColor(s.backgroundColor)) return ''

      const headerIsDark = this.isDarkColor(s.tableHeaderBackground)
      const borderIsDark = this.isDarkColor(s.tableBorderColor)
      if (headerIsDark && borderIsDark) return ''

      return `
.markdown-body table {
  border-color: #3a3a3a;
}
.markdown-body th,
.markdown-body td {
  border-color: #3a3a3a;
  background-color: #1f1f1f;
}
.markdown-body th {
  background-color: #2a2a2a;
}
.markdown-body tr:nth-child(2n) {
  background-color: #1f1f1f;
}
`
    },
    isDarkColor(input) {
      const rgb = this.parseColorToRgb(input)
      if (!rgb) return false
      const [r, g, b] = rgb.map((v) => v / 255)
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      return luminance < 0.5
    },
    parseColorToRgb(input) {
      if (!input || typeof input !== 'string') return null
      const color = input.trim().toLowerCase()
      const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
      if (hexMatch) {
        let hex = hexMatch[1]
        if (hex.length === 3) {
          hex = hex.split('').map((c) => c + c).join('')
        }
        const num = parseInt(hex, 16)
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
      }
      const rgbMatch = color.match(/^rgb\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)$/)
      if (rgbMatch) {
        return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])]
      }
      return null
    },
    preserveCodeBlockSpaces(html) {
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const codeBlocks = doc.querySelectorAll('pre code')

        codeBlocks.forEach((code) => {
          const walker = doc.createTreeWalker(code, NodeFilter.SHOW_TEXT)
          const textNodes = []
          let current = walker.nextNode()

          while (current) {
            textNodes.push(current)
            current = walker.nextNode()
          }

          textNodes.forEach((node) => {
            const replaced = node.nodeValue
              .replace(/\t/g, '    ')
              .replace(/ /g, '\u00A0')
            node.nodeValue = replaced
          })
        })

        return doc.body.innerHTML
      } catch (err) {
        console.warn('Failed to preserve code block spaces:', err)
        return html
      }
    },
    injectMacCodeHeader(html) {
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const pres = doc.querySelectorAll('pre')

        pres.forEach((pre) => {
          if (pre.querySelector('[data-mac-header]')) return

          pre.style.padding = '0'
          pre.style.boxSizing = 'border-box'

          const header = doc.createElement('div')
          header.setAttribute('data-mac-header', 'true')
          header.style.display = 'block'
          header.style.padding = '12px 12px 8px 12px'
          header.style.lineHeight = '0'
          header.style.fontSize = '0'

          const makeDot = (color) => {
            const dot = doc.createElement('span')
            dot.style.display = 'inline-block'
            dot.style.width = '12px'
            dot.style.height = '12px'
            dot.style.borderRadius = '999px'
            dot.style.background = color
            dot.style.marginRight = '8px'
            return dot
          }

          header.appendChild(makeDot('#ff5f56'))
          header.appendChild(makeDot('#ffbd2e'))
          const greenDot = makeDot('#27c93f')
          greenDot.style.marginRight = '0'
          header.appendChild(greenDot)

          pre.insertBefore(header, pre.firstChild)

          const code = pre.querySelector('code')
          if (code) {
            code.style.display = 'block'
            code.style.padding = '0 12px 12px 12px'
          }

          const codeBg = code && code.style && code.style.backgroundColor
          const preBg = pre.style.backgroundColor
          const bg = codeBg || preBg || this.customStyles.codeBackground || DEFAULT_STYLES.codeBackground
          if (bg) {
            pre.style.backgroundColor = bg
            header.style.backgroundColor = bg
          }
        })

        return doc.body.innerHTML
      } catch (err) {
        console.warn('Failed to inject Mac code header:', err)
        return html
      }
    },
    // 复制微信兼容的 HTML
    async copyForWechat() {
      try {
        const wechatHtml = this.getWechatHtml()
        if (!wechatHtml) return

        const blob = new Blob([wechatHtml], { type: 'text/html' })
        const textBlob = new Blob([wechatHtml], { type: 'text/plain' })

        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blob,
            'text/plain': textBlob
          })
        ])

        this.copySuccess = true
        this.$message({ message: '已复制到剪贴板！可直接粘贴到微信公众号编辑器', type: 'success', plain: true })

        setTimeout(() => {
          this.copySuccess = false
        }, 2000)
      } catch (err) {
        // 降级方案
        try {
          const wechatHtml = this.getWechatHtml()
          const tempContainer = document.createElement('div')
          tempContainer.style.position = 'fixed'
          tempContainer.style.left = '-9999px'
          tempContainer.innerHTML = wechatHtml
          document.body.appendChild(tempContainer)

          const range = document.createRange()
          range.selectNodeContents(tempContainer)
          const selection = window.getSelection()
          selection.removeAllRanges()
          selection.addRange(range)
          document.execCommand('copy')
          selection.removeAllRanges()
          document.body.removeChild(tempContainer)

          this.copySuccess = true
          this.$message({ message: '已复制到剪贴板！可直接粘贴到微信公众号编辑器', type: 'success', plain: true })

          setTimeout(() => {
            this.copySuccess = false
          }, 2000)
        } catch (fallbackErr) {
          this.$message({ message: '复制失败，请手动选择复制', type: 'error', plain: true })
          console.error('Copy failed:', fallbackErr)
        }
      }
    }
  }
}
</script>

<template>
  <div class="markdown-tool">
    <div class="header">
      <h1>Markdown 渲染工具</h1>
      <div class="actions">
        <el-button @click="importMarkdown">
          导入 Markdown
        </el-button>
        <el-dropdown @command="(cmd) => cmd()">
          <el-button type="primary" :loading="exporting">
            导出 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :command="exportToHtml">导出 HTML</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button
          type="success"
          @click="copyForWechat"
          :class="{ 'copy-success': copySuccess }"
        >
          {{ copySuccess ? '复制成功!' : '复制' }}
        </el-button>
        <el-button @click="styleDrawerVisible = true">
          样式设置
        </el-button>
        <el-button type="danger" plain @click="clearContent">
          清空
        </el-button>
      </div>
    </div>

    <div class="container">
      <div class="panel editor-panel">
        <div class="panel-header">
          <span>Markdown 输入</span>
        </div>
        <el-input
          v-model="markdownText"
          type="textarea"
          placeholder="在此输入 Markdown 内容..."
          class="markdown-input"
          resize="none"
        />
      </div>

      <div class="panel preview-panel">
        <div class="panel-header">
          <span>实时预览</span>
        </div>
        <div
          ref="preview"
          class="preview-content markdown-body"
          :class="{ 'mac-style-code': customStyles.macStyleCodeBlock }"
          :style="previewStyles"
          v-html="renderedHtml"
        />
      </div>
    </div>

    <!-- 样式设置抽屉 -->
    <el-drawer
      v-model="styleDrawerVisible"
      title="样式设置"
      direction="rtl"
      size="400px"
    >
      <div class="style-settings">
        <div class="style-toolbar">
          <el-button size="small" @click="importStyles">导入配置</el-button>
          <el-button size="small" @click="exportStyles">导出配置</el-button>
        </div>

        <el-tabs v-model="activeStyleTab">
          <el-tab-pane label="基础样式" name="basic">
            <el-form label-position="top" size="small">
              <el-form-item label="字体大小 (px)">
                <el-slider v-model="customStyles.fontSize" :min="12" :max="24" show-input />
              </el-form-item>

              <el-form-item label="行高">
                <el-slider v-model="customStyles.lineHeight" :min="1.2" :max="2.5" :step="0.1" show-input />
              </el-form-item>

              <el-form-item label="正文字体">
                <el-select v-model="customStyles.fontFamily" style="width: 100%">
                  <el-option
                    v-for="font in fontOptions"
                    :key="font.value"
                    :label="font.label"
                    :value="font.value"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="代码字体">
                <el-select v-model="customStyles.codeFontFamily" style="width: 100%">
                  <el-option
                    v-for="font in codeFontOptions"
                    :key="font.value"
                    :label="font.label"
                    :value="font.value"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="代码块风格">
                <el-select
                  v-model="customStyles.codeTheme"
                  style="width: 100%"
                  @change="onCodeThemeChange"
                >
                  <el-option
                    v-for="theme in codeThemes"
                    :key="theme.value"
                    :label="theme.label"
                    :value="theme.value"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="Mac 风格代码块">
                <el-switch
                  v-model="customStyles.macStyleCodeBlock"
                  active-text="启用"
                  inactive-text="关闭"
                />
                <div class="form-item-hint">启用后代码块显示 macOS 终端风格的红黄绿按钮装饰</div>
              </el-form-item>

              <el-divider content-position="left">标题大小</el-divider>

              <el-form-item label="H1 大小 (em)">
                <el-slider v-model="customStyles.h1FontSize" :min="1.5" :max="3" :step="0.1" show-input />
              </el-form-item>

              <el-form-item label="H2 大小 (em)">
                <el-slider v-model="customStyles.h2FontSize" :min="1.2" :max="2.5" :step="0.1" show-input />
              </el-form-item>

              <el-form-item label="H3 大小 (em)">
                <el-slider v-model="customStyles.h3FontSize" :min="1" :max="2" :step="0.1" show-input />
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="颜色设置" name="colors">
            <el-form label-position="top" size="small">
              <el-form-item label="文字颜色">
                <el-popover trigger="click" width="auto" popper-class="color-popover-custom">
                  <template #reference>
                    <div
                      class="color-trigger-btn"
                      :style="{ backgroundColor: customStyles.textColor }"
                    />
                  </template>
                  <ElColorPickerPanel
                    v-model="customStyles.textColor"
                    :predefine="presetColors"
                  />
                </el-popover>
              </el-form-item>

              <el-form-item label="背景颜色">
                <el-popover trigger="click" width="auto" popper-class="color-popover-custom">
                  <template #reference>
                    <div
                      class="color-trigger-btn"
                      :style="{ backgroundColor: customStyles.backgroundColor }"
                    />
                  </template>
                  <ElColorPickerPanel
                    v-model="customStyles.backgroundColor"
                    :predefine="presetColors"
                  />
                </el-popover>
              </el-form-item>

              <el-form-item label="链接颜色">
                <el-popover trigger="click" width="auto" popper-class="color-popover-custom">
                  <template #reference>
                    <div
                      class="color-trigger-btn"
                      :style="{ backgroundColor: customStyles.linkColor }"
                    />
                  </template>
                  <ElColorPickerPanel
                    v-model="customStyles.linkColor"
                    :predefine="presetColors"
                  />
                </el-popover>
              </el-form-item>

              <el-form-item label="代码背景">
                <el-popover trigger="click" width="auto" popper-class="color-popover-custom">
                  <template #reference>
                    <div
                      class="color-trigger-btn"
                      :style="{ backgroundColor: customStyles.codeBackground }"
                    />
                  </template>
                  <ElColorPickerPanel
                    v-model="customStyles.codeBackground"
                    :predefine="presetColors"
                  />
                </el-popover>
              </el-form-item>

              <el-form-item label="引用边框颜色">
                <el-popover trigger="click" width="auto" popper-class="color-popover-custom">
                  <template #reference>
                    <div
                      class="color-trigger-btn"
                      :style="{ backgroundColor: customStyles.blockquoteBorderColor }"
                    />
                  </template>
                  <ElColorPickerPanel
                    v-model="customStyles.blockquoteBorderColor"
                    :predefine="presetColors"
                  />
                </el-popover>
              </el-form-item>

              <el-form-item label="引用文字颜色">
                <el-popover trigger="click" width="auto" popper-class="color-popover-custom">
                  <template #reference>
                    <div
                      class="color-trigger-btn"
                      :style="{ backgroundColor: customStyles.blockquoteTextColor }"
                    />
                  </template>
                  <ElColorPickerPanel
                    v-model="customStyles.blockquoteTextColor"
                    :predefine="presetColors"
                  />
                </el-popover>
              </el-form-item>

              <el-form-item label="表格边框颜色">
                <el-popover trigger="click" width="auto" popper-class="color-popover-custom">
                  <template #reference>
                    <div
                      class="color-trigger-btn"
                      :style="{ backgroundColor: customStyles.tableBorderColor }"
                    />
                  </template>
                  <ElColorPickerPanel
                    v-model="customStyles.tableBorderColor"
                    :predefine="presetColors"
                  />
                </el-popover>
              </el-form-item>

              <el-form-item label="表头背景色">
                <el-popover trigger="click" width="auto" popper-class="color-popover-custom">
                  <template #reference>
                    <div
                      class="color-trigger-btn"
                      :style="{ backgroundColor: customStyles.tableHeaderBackground }"
                    />
                  </template>
                  <ElColorPickerPanel
                    v-model="customStyles.tableHeaderBackground"
                    :predefine="presetColors"
                  />
                </el-popover>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="自定义字体" name="fonts">
            <div class="font-section">
              <el-button type="primary" size="small" @click="openFontDialog">
                添加自定义字体
              </el-button>
              <div class="font-list" v-if="customStyles.customFonts && customStyles.customFonts.length">
                <div
                  v-for="(font, index) in customStyles.customFonts"
                  :key="font.name"
                  class="font-item"
                >
                  <span class="font-name" :style="{ fontFamily: font.name }">{{ font.name }}</span>
                  <el-button type="danger" size="small" text @click="removeCustomFont(index)">
                    删除
                  </el-button>
                </div>
              </div>
              <el-empty v-else description="暂无自定义字体" :image-size="60" />
            </div>
          </el-tab-pane>

          <el-tab-pane label="自定义 CSS" name="css">
            <div class="css-section">
              <p class="css-hint">在此编写自定义 CSS 来覆盖默认样式</p>
              <el-button type="primary" size="small" @click="openCustomCssDialog">
                编辑自定义 CSS
              </el-button>
              <div class="css-preview" v-if="customStyles.customCss">
                <pre>{{ customStyles.customCss.slice(0, 200) }}{{ customStyles.customCss.length > 200 ? '...' : '' }}</pre>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>

        <div class="style-actions">
          <el-button type="primary" @click="saveStyles">保存设置</el-button>
          <el-button @click="resetStyles">重置默认</el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 自定义 CSS 对话框 -->
    <el-dialog
      v-model="customCssDialogVisible"
      title="编辑自定义 CSS"
      width="600px"
    >
      <CssEditor
        v-model="tempCustomCss"
        :rows="15"
        placeholder="/* 在此输入自定义 CSS */
.markdown-body h1 {
  color: #333;
}
.markdown-body code {
  background: #f0f0f0;
}"
      />
      <template #footer>
        <el-button @click="customCssDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCustomCss">应用</el-button>
      </template>
    </el-dialog>

    <!-- 添加字体对话框 -->
    <el-dialog
      v-model="fontDialogVisible"
      title="添加自定义字体"
      width="500px"
    >
      <el-form label-position="top">
        <el-form-item label="字体名称">
          <el-input v-model="newFontName" placeholder="例如: My Custom Font" />
        </el-form-item>
        <el-form-item label="字体 URL">
          <el-input v-model="newFontUrl" placeholder="例如: https://example.com/font.woff2" />
          <div class="font-url-hint">
            支持 .woff, .woff2, .ttf, .otf 格式。可使用 Google Fonts 或其他 CDN 链接。
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fontDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addCustomFont">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.markdown-tool {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header h1 {
  font-size: 20px;
  color: #303133;
  margin: 0;
}

.actions {
  display: flex;
  gap: 12px;
}

.copy-success {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
}

.container {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.panel-header {
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #e4e7ed;
  font-weight: 500;
  color: #606266;
}

.editor-panel {
  display: flex;
  flex-direction: column;
}

.markdown-input {
  flex: 1;
  height: 100%;
}

.markdown-input :deep(.el-textarea__inner) {
  height: 100% !important;
  border: none;
  border-radius: 0;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
}

.preview-panel {
  overflow: hidden;
}

.preview-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background-color: var(--background-color, #ffffff);
}

/* Markdown 渲染样式 - 使用 CSS 变量 */
.markdown-body {
  font-size: var(--font-size, 14px);
  line-height: var(--line-height, 1.8);
  font-family: var(--font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif);
  color: var(--text-color, #24292e);
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-body :deep(h1) {
  font-size: var(--h1-font-size, 2em);
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
}

.markdown-body :deep(h2) {
  font-size: var(--h2-font-size, 1.5em);
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
}

.markdown-body :deep(h3) {
  font-size: var(--h3-font-size, 1.25em);
}

.markdown-body :deep(p) {
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 2em;
  margin-bottom: 16px;
}

.markdown-body :deep(li) {
  margin-bottom: 4px;
}

.markdown-body :deep(code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  border-radius: 3px;
  font-family: var(--code-font-family, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
}

/* Inline code only (not inside pre) */
.markdown-body :deep(:not(pre) > code) {
  background-color: var(--code-background, rgba(27, 31, 35, 0.05));
}

.markdown-body :deep(pre) {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  border-radius: 6px;
  margin-bottom: 16px;
  /* Let hljs theme control background, don't set default here */
}

.markdown-body :deep(pre code.hljs) {
  /* hljs theme controls background */
  display: block;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
}

.markdown-body :deep(pre code) {
  padding: 0;
  font-size: 100%;
}

.markdown-body :deep(pre code:not(.hljs)) {
  background-color: transparent;
}

.markdown-body :deep(blockquote) {
  padding: 0 1em;
  color: var(--blockquote-text-color, #6a737d);
  border-left: 0.25em solid var(--blockquote-border-color, #dfe2e5);
  margin: 0 0 16px 0;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  margin-bottom: 16px;
  width: 100%;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 6px 13px;
  border: 1px solid var(--table-border-color, #dfe2e5);
}

.markdown-body :deep(th) {
  font-weight: 600;
  background-color: var(--table-header-background, #f6f8fa);
}

.markdown-body :deep(tr:nth-child(2n)) {
  background-color: var(--table-header-background, #f6f8fa);
}

.markdown-body :deep(a) {
  color: var(--link-color, #0366d6);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
}

.markdown-body :deep(hr) {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #e1e4e8;
  border: 0;
}

/* 样式设置面板 */
.style-settings {
  padding: 0 10px;
}

.style-settings :deep(.el-form-item) {
  margin-bottom: 16px;
}

.style-settings :deep(.el-divider) {
  margin: 20px 0 16px;
}

.color-trigger-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--el-border-color);
  cursor: pointer;
  display: inline-block;
  box-sizing: border-box;
}

:deep(.color-popover-custom) {
  padding: 0 !important;
  min-width: unset !important;
  width: auto !important;
}

:deep(.color-popover-custom .el-color-picker-panel) {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

.style-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.style-actions .el-button {
  flex: 1;
}

/* 样式工具栏 */
.style-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

/* 字体管理 */
.font-section {
  padding: 10px 0;
}

.font-list {
  margin-top: 16px;
}

.font-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.font-name {
  font-size: 14px;
}

/* 自定义 CSS */
.css-section {
  padding: 10px 0;
}

.css-hint {
  color: #909399;
  font-size: 12px;
  margin-bottom: 12px;
}

.css-preview {
  margin-top: 16px;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 12px;
}

.css-preview pre {
  margin: 0;
  font-size: 12px;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-all;
}

.css-editor :deep(.el-textarea__inner) {
  font-family: Monaco, Menlo, 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.font-url-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.form-item-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

/* Mac 风格代码块 */
.markdown-body.mac-style-code :deep(pre) {
  position: relative;
  margin-bottom: 16px;
  padding: 0;
  border-radius: 10px;
  overflow: hidden;
}

/* 红黄绿按钮 */
.markdown-body.mac-style-code :deep(pre)::before {
  content: '';
  position: absolute;
  top: 16px;
  left: 16px;
  width: 12px;
  height: 12px;
  background: #ff5f56;
  border-radius: 50%;
  box-shadow:
    20px 0 0 #ffbd2e,
    40px 0 0 #27c93f;
  z-index: 1;
}

/* 调整代码内容区域 */
.markdown-body.mac-style-code :deep(pre code),
.markdown-body.mac-style-code :deep(pre code.hljs) {
  display: block;
  padding: 48px 16px 16px 16px;
  margin: 0;
  border-radius: 10px;
}

/* 深色模式适配 */
html.dark .markdown-tool {
  background: #1a1a1a;
}

html.dark .header {
  background: #242424;
  border-bottom-color: #3a3a3a;
}

html.dark .header h1 {
  color: #e5e5e5;
}

html.dark .panel {
  background: #242424;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

html.dark .panel-header {
  background: #2a2a2a;
  border-bottom-color: #3a3a3a;
  color: #b0b0b0;
}

html.dark .markdown-input :deep(.el-textarea__inner) {
  background: #1e1e1e;
  color: #d4d4d4;
  border-color: #3a3a3a;
}

/* 预览区域保持用户自定义的背景色，不受深色模式影响 */

html.dark .font-item {
  background: #2a2a2a;
}

html.dark .css-preview {
  background: #2a2a2a;
}

html.dark .css-preview pre {
  color: #d4d4d4;
}

html.dark .style-toolbar {
  border-bottom-color: #3a3a3a;
}

html.dark .style-actions {
  border-top-color: #3a3a3a;
}
</style>
