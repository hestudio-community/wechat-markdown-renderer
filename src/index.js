import WXMarkdownRendererTool from './components/WXMarkdownRendererTool.vue'
import CssEditor from './components/CssEditor.vue'

// 导出组件
export { WXMarkdownRendererTool, CssEditor }

// 默认导出主组件
export default WXMarkdownRendererTool

// 支持 Vue.use() 安装
export const install = (app) => {
  app.component('WXMarkdownRendererTool', WXMarkdownRendererTool)
  app.component('CssEditor', CssEditor)
}
