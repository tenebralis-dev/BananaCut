# 🍌 BananaCut

一个基于浏览器的图片切割工具，支持 **网格切割** 和 **自由拉框** 两种模式，帮助你快速将图片分割成多个区块并批量导出。

## ✨ 功能特性

- **双模式切割**
  - 🔲 **网格模式** — 设置行列数自动生成等分网格，支持拖动调整分割线
  - ✂️ **自由模式** — 手动拉框选取任意区域，支持自由比例 / 1:1 / 自定义比例
- **画布交互** — 缩放、平移，流畅操作大图
- **批量命名** — 支持名称池 + 多种命名格式（名称、坐标、名称_坐标、坐标_名称）
- **正方形补全** — 输出可补全为正方形，背景支持透明 PNG 或自定义纯色
- **预览 & 导出** — 实时预览切割结果，一键打包导出为 ZIP
- **撤销 / 重做** — Ctrl+Z / Ctrl+Y 快捷键支持

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [Next.js](https://nextjs.org/) 16 + React 19 |
| 语言 | TypeScript |
| 导出 | [JSZip](https://stuk.github.io/jszip/) + [FileSaver.js](https://github.com/eligrey/FileSaver.js) |
| 状态管理 | React Context + useReducer |

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18
- npm / yarn / pnpm

### 安装 & 运行

```bash
# 克隆项目
git clone https://github.com/tenebralis-dev/BananaCut.git
cd BananaCut

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

### 构建生产版本

```bash
npm run build
npm start
```

## 📁 项目结构

```
src/
├── app/                # Next.js App Router 页面
├── components/         # UI 组件
│   ├── ControlPanel    # 左侧控制面板
│   ├── ImageUploader   # 图片上传
│   ├── ImageViewer     # 画布 & 图片展示
│   ├── GridOverlay     # 网格覆盖层
│   ├── FreeformOverlay # 自由拉框覆盖层
│   ├── NamePanel       # 右侧命名面板
│   ├── PreviewModal    # 预览弹窗
│   └── ExportProgress  # 导出进度条
├── store/              # 全局状态管理 (EditorStore)
├── types/              # TypeScript 类型定义
└── utils/              # 工具函数 (切割、导出等)
```

## 📄 许可证

本项目基于 [MIT 许可证](./LICENSE) 开源。
