# WeChat Markdown Renderer

一款专为微信公众号设计的 Vue 3 Markdown 编辑器组件，支持实时预览、自定义样式、一键复制粘贴到微信公众号编辑器。

## ✨ 功能特点

- 📝 **实时预览** - 左侧编辑，右侧即时显示渲染效果
- 🎨 **样式定制** - 自定义字体、颜色、代码主题等
- 💻 **代码高亮** - 支持 15+ 种代码高亮主题（GitHub, VS Code, Monokai, Dracula 等）
- 🎯 **Mac 风格代码块** - 可选的 macOS 终端风格代码块装饰
- 📋 **一键复制** - 复制后可直接粘贴到微信公众号编辑器
- 💾 **导出 HTML** - 支持导出为独立 HTML 文件
- 📦 **样式配置导入导出** - 保存和分享你的样式配置
- 🔤 **自定义字体** - 支持添加自定义 Web 字体
- ✏️ **自定义 CSS** - 支持编写自定义 CSS 来完全控制样式
- 💾 **自动保存** - 编辑内容自动保存到本地存储

## 📦 安装

```bash
npm install wechat-markdown-renderer
# 或
pnpm add wechat-markdown-renderer
# 或
yarn add wechat-markdown-renderer
```

## 🚀 快速开始

### 全局注册

```javascript
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import { WXMarkdownRendererTool } from 'wechat-markdown-renderer'
import 'wechat-markdown-renderer/dist/wechat-markdown-renderer.css'
import 'element-plus/dist/index.css'

const app = createApp(App)
app.component('WXMarkdownRendererTool', WXMarkdownRendererTool)
app.mount('#app')
```

然后在模板中使用：

```vue
<template>
  <WXMarkdownRendererTool />
</template>
```

### 局部注册

```vue
<script setup>
import { WXMarkdownRendererTool } from 'wechat-markdown-renderer'
import 'wechat-markdown-renderer/dist/wechat-markdown-renderer.css'
</script>

<template>
  <WXMarkdownRendererTool />
</template>
```

### 选项式 API

```vue
<template>
  <WXMarkdownRendererTool />
</template>

<script>
import { WXMarkdownRendererTool } from 'wechat-markdown-renderer'
import 'wechat-markdown-renderer/dist/wechat-markdown-renderer.css'

export default {
  components: {
    WXMarkdownRendererTool
  }
}
</script>
```

## 📋 依赖要求

本组件依赖 Element Plus，安装时会自动安装相关依赖。如果你的项目还没有安装 Element Plus 样式，需要引入：

```javascript
import 'element-plus/dist/index.css'
```

## 🎨 使用说明

1. **编辑 Markdown** - 在左侧编辑器输入 Markdown 内容
2. **实时预览** - 右侧实时预览渲染效果
3. **自定义样式** - 点击"样式设置"按钮自定义字体、颜色、代码主题等
4. **复制内容** - 点击"复制"按钮将渲染后的内容复制到剪贴板
5. **粘贴到微信** - 直接粘贴到微信公众号编辑器中

## 🔧 技术栈

- Vue 3 - 渐进式 JavaScript 框架
- Element Plus - Vue 3 组件库
- Marked - Markdown 解析器
- Highlight.js - 代码高亮
- DOMPurify - HTML 清理（防止 XSS）
- Juice - CSS 内联化（确保微信兼容性）
- VueUse - Vue 组合式工具集

## 🎯 代码高亮主题

支持以下代码高亮主题：

- GitHub / GitHub Dark
- VS Code / VS Code Dark
- Atom One Light / Atom One Dark
- Monokai
- Dracula
- Nord
- Solarized Light / Solarized Dark
- Tomorrow / Tomorrow Night
- Gruvbox Light / Gruvbox Dark

## 📝 组件导出

```javascript
import {
  WXMarkdownRendererTool,  // 主组件
  CssEditor,               // CSS 编辑器子组件
  install                  // 安装函数
} from 'wechat-markdown-renderer'
```

使用 `install` 进行插件式注册（可选）：

```javascript
import { install } from 'wechat-markdown-renderer'
import 'wechat-markdown-renderer/dist/wechat-markdown-renderer.css'
import 'element-plus/dist/index.css'

app.use({ install })
```

## 🛠️ 本地开发

```bash
# 克隆仓库
git clone <repository-url>

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建库
pnpm build
```

## 📄 License

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 反馈

如果你在使用过程中遇到问题或有任何建议，欢迎提交 Issue。
