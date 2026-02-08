<template>
  <div class="css-editor-container">
    <pre class="hljs css-highlight-layer" ref="highlightLayer"><code v-html="highlightedCode"></code></pre>
    <textarea
      ref="textarea"
      class="css-textarea-layer"
      :value="modelValue"
      :placeholder="placeholder"
      @input="handleInput"
      @scroll="syncScroll"
      @keydown="handleKeydown"
      spellcheck="false"
    ></textarea>
  </div>
</template>

<script>
import hljs from 'highlight.js'

export default {
  name: 'CssEditor',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: ''
    },
    rows: {
      type: Number,
      default: 15
    }
  },
  emits: ['update:modelValue'],
  computed: {
    highlightedCode() {
      if (!this.modelValue) {
        return '<span class="css-placeholder">' + this.escapeHtml(this.placeholder) + '</span>'
      }
      try {
        return hljs.highlight(this.modelValue, { language: 'css' }).value
      } catch (e) {
        return this.escapeHtml(this.modelValue)
      }
    },
    textareaHeight() {
      // 每行约 20px，加上 padding
      return (this.rows * 20 + 20) + 'px'
    }
  },
  methods: {
    handleInput(event) {
      this.$emit('update:modelValue', event.target.value)
    },
    syncScroll() {
      const textarea = this.$refs.textarea
      const highlightLayer = this.$refs.highlightLayer
      if (textarea && highlightLayer) {
        highlightLayer.scrollTop = textarea.scrollTop
        highlightLayer.scrollLeft = textarea.scrollLeft
      }
    },
    handleKeydown(event) {
      // Tab 键支持
      if (event.key === 'Tab') {
        event.preventDefault()
        const textarea = event.target
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const value = textarea.value

        // 插入两个空格作为缩进
        const newValue = value.substring(0, start) + '  ' + value.substring(end)
        this.$emit('update:modelValue', newValue)

        // 恢复光标位置
        this.$nextTick(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2
        })
      }
    },
    escapeHtml(text) {
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
    }
  }
}
</script>

<style scoped>
.css-editor-container {
  position: relative;
  width: 100%;
  height: v-bind(textareaHeight);
  font-family: Monaco, Menlo, 'Ubuntu Mono', Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.css-highlight-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  padding: 10px;
  overflow: auto;
  pointer-events: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.css-highlight-layer code {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  background: transparent !important;
  padding: 0 !important;
}

.css-textarea-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 10px;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: transparent;
  caret-color: #333;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow: auto;
  box-sizing: border-box;
}

.css-textarea-layer::placeholder {
  color: transparent;
}

.css-placeholder {
  color: #a8abb2;
  white-space: pre-wrap;
}

/* 确保滚动条样式一致 */
.css-highlight-layer::-webkit-scrollbar,
.css-textarea-layer::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.css-highlight-layer::-webkit-scrollbar-thumb,
.css-textarea-layer::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 4px;
}

.css-highlight-layer::-webkit-scrollbar-track,
.css-textarea-layer::-webkit-scrollbar-track {
  background: #f5f7fa;
}

/* 深色模式适配 */
html.dark .css-editor-container {
  border-color: #3a3a3a;
}

html.dark .css-textarea-layer {
  caret-color: #e5e5e5;
}

html.dark .css-placeholder {
  color: #6a6a6a;
}

html.dark .css-highlight-layer::-webkit-scrollbar-thumb,
html.dark .css-textarea-layer::-webkit-scrollbar-thumb {
  background: #5a5a5a;
}

html.dark .css-highlight-layer::-webkit-scrollbar-track,
html.dark .css-textarea-layer::-webkit-scrollbar-track {
  background: #2a2a2a;
}
</style>
