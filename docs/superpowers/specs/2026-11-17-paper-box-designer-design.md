# PAPERFORM 纸盒设计器 — 设计规格

- 日期：2026-11-17
- 状态：待用户复核
- 路径：`docs/superpowers/specs/2026-11-17-paper-box-designer-design.md`
- 产品代号：PAPERFORM / 纸构

## 1. 产品定义

PAPERFORM 是一个面向包装设计师、品牌方与印刷采购的浏览器端纸盒设计工作台。用户在同一个界面中：

1. 查看、缩放并选中纸盒展开图上的任意面。
2. 在 3D 棚拍视图中拖拽旋转、缩放、点选面，并查看开合/升降结构。
3. 编辑盒型、毫米尺寸、材料、表面工艺，以及全局或单面的印刷设计。
4. 导出含出血和刀模分层的印刷 PDF、高清 PNG、可编辑 SVG 和工程 JSON。

首版是纯前端桌面优先工具，无账号、云端协作和后端服务。

### 成功标准

- 尺寸、盒型、材料、贴图的变化在 2D 展开图和 3D 视图中即时同步。
- 用户可以只靠鼠标完成“选面 → 改图 → 查看 3D → 导出”的完整闭环。
- 导出的 PDF 明确区分裁切线、折线、出血线，贴图按 300dpi 输出（超大盒型允许在像素上限内降级）。
- 首屏 3 秒内可交互；常规交互（拖拽、选面、滑杆）无明显掉帧。
- `pnpm build`、类型检查与单元测试全部通过。

### 不做的事

- 不提供账号、多人实时协作、云端素材库。
- 不宣称刀模可直接上机；具体刀模补偿、纸张纹向、印刷工艺必须由印厂复核。
- 不支持任意自定义多边形盒型；首版提供三种经过参数化的结构模板。
- 不做移动端完整编辑器；小于 1024px 的屏幕仅保证可查看和基础操作。

## 2. 视觉方向

### 关键词

工业编辑感、纸张样本册、制图桌、产品摄影棚。避免通用 SaaS 仪表盘风格。

### 视觉系统

- 顶栏：墨黑 `#121210`，纸色文字，朱橙状态点。
- 工作区：暖纸色 `#F4F0E6`；左右面板 `#FBF8F1`；细线 `#D9D2C3`。
- 3D 舞台：炭黑 `#151713` 到暖灰 `#38382F` 的径向光；纸盒受暖白主光，地面接触阴影。
- 强调色：朱橙 `#FF4D1F`，只用于选中面、当前页签、主按钮和关键数据。
- 制图色：钴蓝 `#2B4CFF`，只用于折线、出血和辅助标注。
- 成功色：`#2E7D5B`；警告色：`#B7791F`。
- 字体：Manrope Variable（界面）+ Newsreader Variable（展示标题、数字、项目名），均本地打包。
- 数字排版：尺寸值、缩放比例和 3D 视角编号使用 Newsreader 大号衬线，增强“样本册”气质。
- 成分：左栏是技术图纸（淡网格、图纸编号、图例），中栏是摄影棚（深色、聚光、悬浮标注），右栏是材料册（纸张色块、编号章节、细线分隔）。
- 大字号视觉锚点：左栏“NET / 展开图”竖排或超大编号；3D 舞台背景有低对比 `FORM 01` 字体水印；右栏章节使用 01/02/03 编号。
- 动效：180–240ms，选中描边、面板展开、3D 相机过渡；`prefers-reduced-motion` 时关闭自动旋转与位移动画。

### 布局

桌面端三栏：

```
┌──────────────────────────────────────────────────────────────────────┐
│ 顶栏 64px：品牌 / 项目名 / 保存状态 / 撤销重做 / 预览 / 导出        │
├──────────────┬───────────────────────────────────────┬───────────────┤
│ 左栏 390px   │ 中栏 minmax(460px, 1fr)               │ 右栏 380px    │
│ 展开图       │ 3D 舞台                               │ 属性面板      │
│ SVG / 缩放   │ 视角控制 / 面选中                     │ 结构/设计/输出│
└──────────────┴───────────────────────────────────────┴───────────────┘
```

- ≥ 1440px：左 400px / 右 388px。
- 1280–1439px：左 360px / 右 360px。
- 1024–1279px：左栏可折叠为抽屉；中栏与右栏保留。
- < 1024px：3D 优先，左右面板改为底部抽屉式页签；不保证完整导出体验。
- 所有面板独立滚动，顶栏固定，3D 舞台占满剩余高度。

## 3. 信息架构与交互

### 顶栏

- 折叠纸品牌标志 + “PAPERFORM” 字标。
- 项目名可点击重命名，默认“未命名纸盒 01”。
- 自动保存状态：`全部更改已保存 / 保存中… / 仅本地`。
- 撤销 / 重做图标按钮，最多 30 步。
- “导出”朱橙主按钮，打开右侧“输出”页签并聚焦。
- 快捷键：`Cmd/Ctrl+Z`、`Shift+Cmd/Ctrl+Z`、`Cmd/Ctrl+S` 保存工程、`Cmd/Ctrl+E` 打开导出。

### 左栏：展开图

- 原生 SVG 渲染，真实毫米坐标，自动适配初始比例。
- 图层面：
  1. 出血层：`bleed` 宽的浅色外扩描边。
  2. 面板贴图层：各面裁剪后的贴图预览。
  3. 折线层：钴蓝虚线，`stroke-dasharray`。
  4. 裁切线：墨黑实线，圆角接头。
  5. 标注层：总长/总高尺寸线、面名称、盒盖与盒身标识。
- 选中面朱橙描边 + 半透明填充，其他面降低饱和度。
- 交互：
  - 滚轮缩放，以指针位置为中心；缩放范围 20%–400%。
  - 按住空白区拖拽平移；移动超过 4px 时取消点击选中。
  - 点击面选中并同步 3D 与右栏。
  - 工具栏：适配画布、放大、缩小、出血开关、标注开关。
- 天地盖并排显示两个 net，用 `BASE` / `LID` 标签区分，并保持整体适配。
- 粘口区域以斜线纹理表示，不参与印刷设计。
- 底部图例：裁切线、折线、出血、安全区。

### 中栏：3D 预览

- Three.js 场景，透视相机，OrbitControls：
  - 左键拖拽旋转，滚轮缩放，右键拖拽平移。
  - 阻尼 0.08；禁止翻转至极点；最小/最大距离根据盒型自适应。
- 场景：暖白主光 + 环境补光 + 柔和接触阴影；深色地面和极淡技术网格；纸张 `MeshStandardMaterial`，`roughness` 由表面工艺决定。
- 面点选：`Raycaster` 命中面；按下与抬起位移 < 4px 判定为点击；选中面显示朱橙描边和悬浮标签。
- 悬停：显示面名称 tooltip；cursor 变为 pointer。
- 底部悬浮控制条：
  - 前 / 后 / 左 / 右 / 顶 / 3/4 视角。
  - 自动旋转开关。
  - 重置视角。
- 结构演示：
  - 插口折叠盒：闭合展示，顶盖接缝可见。
  - 飞机盒：开合滑杆/按钮，默认微开 10°，最大 75°。
  - 天地盖：升降滑杆，默认升起 22mm，最大 120mm。
- 舞台左上显示盒型英文名和实时尺寸；右下显示 `WebGL` 状态和面数（技术感细节）。
- 材质/贴图更新不重建相机；尺寸变化时重建几何并自适应包围盒。

### 右栏：属性面板

顶部固定“当前面”卡片：全局或某个面；有面包屑和“回到全局”。

三个页签：

#### 结构

- 盒型：三张带线框小图的卡片，选中朱橙描边；切换时保留尺寸与全局设计。
- 尺寸：长 / 宽 / 高，数字输入 + 滑杆；范围 30–600mm；步长 1mm。
  - 修改滑杆实时更新；输入框提交时校验并 clamp。
  - 天地盖额外显示“盒盖高度”30–150mm、“间隙”1–5mm。
- 尺寸预设：XS/S/M/L 四个标签，不覆盖用户自定义盒型。
- 材料：
  - 白卡 350g、牛皮卡 300g、瓦楞 E 楞、黑卡 350g、再生纸 300g。
  - 每种材料带底色、纹理和 3D roughness 参数。
- 厚度：0.3–3.0mm，显示 mm。
- 表面：哑光 / 亮光 / 触感膜，影响 3D roughness/clearness。
- 改尺寸后，3D 底部标注与展开图尺寸同步。

#### 设计

- 作用域切换 segmented control：`全局` / `当前面`。
- 当选中面且“跟随全局”开启时，设计控件禁用并显示“启用单面覆盖”按钮；点击后复制全局设计到该面。
- “同步到所有面”按钮：把当前面设计写入全局。
- 背景：
  - 底色：色板 + 原生取色器 + HEX 输入。
  - 纹理：无 / 牛皮纤维 / 细布纹 / 瓦楞 / 噪点。
  - 图案：无 / 网格 / 圆点 / 条纹 / 斜纹 / 棋盘 / 波纹 / 十字，图案颜色可调。
  - 整面图片：拖拽上传或点击选择；JPG/PNG/WebP/SVG；≤ 8MB；自动压缩到最长边 2000px。
  - 铺满 / 适应；缩放 50%–200%；水平/垂直位移 -50%–50%；旋转 0–360°。
- 图层：
  - 图层列表（缩略图/类型/名称），支持选中、显示/隐藏、上移/下移、删除。
  - 添加文字、添加 Logo/图片。
  - 文字图层：内容（支持多行）、字号 2–40mm、字重、颜色、字距、行高、对齐、旋转、透明度、位置。
  - 图片图层：宽度 5%–120% 面宽、旋转、透明度、位置；自动保持原始比例。
  - X/Y 位置用百分比表示，0–100，中心定位。
  - 选中图层后可在左栏选中面内直接拖拽位置（拖动文字/图片中心），拖动时显示十字参考线。
- 快捷模板：4 套全局视觉预设（牛皮极简、钴蓝编辑、朱橙大字、黑白网格），一键应用全局。
- 所有图片以 Data URL 存入工程，上传时统一压缩。

#### 输出

- 出血：0–5mm，默认 3mm。
- 安全区：0–5mm，默认 3mm。
- 分辨率说明：300dpi，超大幅面自动降级到最长边 6000px。
- 导出：
  - 印刷 PDF：两页，第 1 页 300dpi 贴图 + 矢量刀模叠加，第 2 页纯矢量刀模/折线/尺寸/材料信息。
  - 高清 PNG：含出血的展开图，300dpi 或像素上限降级。
  - SVG：矢量刀模 + 内嵌贴图，可在 Illustrator 编辑。
  - 工程 JSON：导出/导入完整项目。
- 导出前显示文件名输入和文件清单摘要。
- 导出中按钮进入 loading；失败显示可读错误和重试。

## 4. 盒型结构

所有尺寸单位为 mm。通用参数：粘口 `glue = 12mm`，插舌深度 `0.85 × W`，防尘翼深度 `0.55 × W`，纸厚 `t`。

### 4.1 插口折叠盒 `tuck`

- 四侧板 + 粘口 + 上下插舌，闭合 3D。
- 展开图横向：粘口 → 背面 → 右侧面 → 正面 → 左侧面。
- 顶部：正面连接插舌，左右侧板连接防尘翼；底部镜像，背面连接插舌。
- 3D：六面闭合盒子，顶盖接缝、插舌折边以细线表现。
- 可设计面：`front`、`back`、`left`、`right`、`top`、`bottom`。
- 辅助翼使用相邻主面设计或全局设计，不单独列出。

### 4.2 飞机盒 `mailer`

- 盒身 + 后铰链盒盖，盒盖可开合。
- 展开图：盒底居中，四壁展开；后壁连接盒盖；盒盖连接前裙边与两个侧翼。
- 盒身高度 `0.56H`，盒盖裙边高度 `0.34H`，盒盖顶面为完整 `L × W`。
- 3D：盒盖 Group 以后壁顶部为铰链旋转，默认 10°，最大 75°。
- 可设计面：`front`、`back`、`left`、`right`、`bottom`、`top`（盒盖顶）、`lidFront`、`lidLeft`、`lidRight`。
- 盒盖打开的预览用于展示内壁和盒盖印刷。

### 4.3 天地盖 `lidbase`

- 盒身 + 独立盒盖，盒盖悬停升起。
- 盒身尺寸 `L × W × H`；盒盖尺寸 `(L + 2 × gap) × (W + 2 × gap) × lidHeight`；默认 `gap = 2mm`，`lidHeight = 35mm`。
- 展开图并排两套十字形 net：`BASE` 与 `LID`。
- 3D：盒身顶部开放；盒盖倒扣悬于上方，升起距离滑杆 0–120mm，默认 22mm。
- 可设计面：`front`、`back`、`left`、`right`、`bottom`、`lidTop`、`lidFront`、`lidLeft`、`lidRight`、`lidBack`。

## 5. 数据模型

```ts
type BoxType = 'tuck' | 'mailer' | 'lidbase'

type FaceId =
  | 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'
  | 'lidTop' | 'lidFront' | 'lidLeft' | 'lidRight' | 'lidBack'

type MaterialId = 'white-card' | 'kraft' | 'corrugated' | 'black-card' | 'recycled'
type FinishId = 'matte' | 'gloss' | 'soft-touch'
type PatternId = 'none' | 'grid' | 'dots' | 'stripes' | 'diagonal' | 'checker' | 'waves' | 'cross'
type PaperTextureId = 'none' | 'fiber' | 'linen' | 'flute' | 'noise'

interface Dimensions {
  length: number
  width: number
  height: number
}

interface BackgroundImage {
  src: string
  fit: 'cover' | 'contain'
  scale: number       // 0.5–2
  offsetX: number     // -0.5–0.5
  offsetY: number
  rotation: number    // deg
  opacity: number     // 0–1
}

interface Artwork {
  color: string
  paperTexture: PaperTextureId
  pattern: PatternId
  patternColor: string
  image: BackgroundImage | null
  layers: DesignLayer[]
}

interface BaseLayer {
  id: string
  name: string
  visible: boolean
  x: number          // 0–100，相对面宽/高中心
  y: number
  rotation: number
  opacity: number
}

interface TextLayer extends BaseLayer {
  type: 'text'
  text: string
  fontSize: number   // mm
  fontFamily: 'manrope' | 'newsreader' | 'mono'
  weight: number
  color: string
  letterSpacing: number // mm
  lineHeight: number
  align: 'left' | 'center' | 'right'
}

interface ImageLayer extends BaseLayer {
  type: 'image'
  src: string
  widthPct: number   // 面宽百分比
}

type DesignLayer = TextLayer | ImageLayer

interface FaceDesign {
  useGlobal: boolean
  artwork: Artwork    // useGlobal 为 true 时作为覆盖缓存保留
}

interface Project {
  schemaVersion: 1
  id: string
  name: string
  boxType: BoxType
  dimensions: Dimensions
  lidHeight: number
  lidGap: number
  material: MaterialId
  finish: FinishId
  thickness: number
  bleed: number
  safeArea: number
  globalDesign: Artwork
  faces: Partial<Record<FaceId, FaceDesign>>
  createdAt: string
  updatedAt: string
}
```

### 设计继承规则

- `resolveArtwork(faceId)`：
  - 面无覆盖记录或 `useGlobal === true` → 返回 `globalDesign`。
  - 否则返回该面的 `artwork`。
- 开启单面覆盖时，把当前解析结果深拷贝到面设计。
- 修改全局设计只影响 `useGlobal === true` 的面。
- “同步到所有面”把当前面 artwork 写入全局，并把所有面 `useGlobal` 设为 true。
- 切换盒型时保留全局设计、尺寸和材料；仅保留新盒型存在的面的覆盖，其他面数据缓存但不出现在列表中。

### 状态切片

- `project`：持久化，参与撤销/重做和自动保存。
- `ui`：当前页签、选中面、当前作用域、缩放、面板开关、导出状态；不持久化，不进入历史。
- `history`：最多 30 个 project 快照；连续滑杆更改使用 300ms 合并。
- `textureCache`：按 `faceId + 尺寸 + artwork hash` 缓存 CanvasTexture；上限 40 项，超出淘汰最旧项。

## 6. 渲染架构

```
Project store
  ├─ generateBoxModel(boxType, dims, lidParams)
  │    ├─ net: panels / cutPaths / foldLines / labels / bleed
  │    └─ scene3d: faces / groups / pivots / camera fit
  ├─ resolveArtwork(faceId)
  │    └─ renderArtworkCanvas(face size, artwork, { dpi, bleed })
  │         ├─ SVG <image> 裁剪到 panel
  │         └─ CanvasTexture → Three.js 材质
  └─ exporters
       ├─ PDF (jsPDF)
       ├─ PNG (canvas → blob)
       ├─ SVG (serialize + embedded images)
       └─ JSON (project schema)
```

### 2D 渲染

- `NetPanel` 带 `faceId`、多边形点集、艺术区域矩形、是否粘口。
- 面板贴图先按艺术区域尺寸生成 canvas，再作为 `<image>` 放入 SVG，通过 `clipPath` 裁剪。
- 尺寸标注、图例和出血不进入贴图 canvas，仅作为 SVG 层。
- 面板名称使用系统无衬线英文字体，避免导出依赖。
- 选中、悬停状态由 SVG 层实时叠加，不触发贴图重算。

### 贴图合成

`renderArtworkCanvas(widthMm, heightMm, artwork, options)`：

1. 按目标 DPI 计算 px/mm，长边上限 4096（预览）或 6000（导出）。
2. 填充底色。
3. 绘制纸张纹理（程序化纤维/细布/瓦楞/噪点；种子固定，保证重复渲染一致）。
4. 绘制图案层，图案尺寸按 mm 对齐。
5. 绘制整面图片，按 cover/contain + scale/offset/rotation 变换，裁剪到画布。
6. 按顺序绘制图层：文字使用 mm 字号的 Canvas 字体；图片保持宽高比。
7. 返回 `HTMLCanvasElement`，调用方转 Data URL 或 `CanvasTexture`。

- 中文使用系统中文字体栈（PingFang SC / Microsoft YaHei / Noto Sans SC），避免字体下载失败。
- 文字和 Logo 均按面尺寸缩放，不随屏幕缩放变化。
- 图片上传后在浏览器端压缩：最长边 2000px，JPEG 0.86 或 PNG 保留透明。
- 透明 PNG 保留 alpha；3D 材质启用透明。

### 3D 渲染

- `BoxViewer.vue` 管理 renderer、scene、camera、controls、lights、raycaster。
- 面 mesh 使用 `PlaneGeometry` + `MeshStandardMaterial`；每个面独立材质，贴图来自统一合成器。
- 选中描边：每个面预生成 `LineSegments`/`LineLoop`，选中时显示朱橙色轮廓；悬停时显示细白线。
- 几何重建与贴图更新分离：
  - 尺寸/盒型变化 → rebuild geometry + fit camera。
  - 设计变化 → 只替换 material.map 并 `needsUpdate`。
- 飞机盒盒盖、天地盖盒盖使用 Group 和 pivot 旋转/位移。
- 阴影：`PCFSoftShadowMap`；地面使用 `ShadowMaterial`；环境光使用 `RoomEnvironment` 生成 PMREM。
- 可访问性：canvas 有 `aria-label`；所有相机操作另有按钮，不依赖手势。

## 7. 导出规格

### 印刷 PDF

- 文件名：`paperform-<project-slug>-<yyyymmdd>.pdf`。
- 页面：自定义尺寸 = net 宽高 + 20mm 边距 + 28mm 顶部信息区。
- 第 1 页：300dpi 贴图整版栅格 + 矢量裁切/折线覆盖 + 出血线。
- 第 2 页：白底矢量刀模图，含：
  - 裁切线（实线，0.25mm）
  - 折线（虚线，0.25mm）
  - 出血线（浅色点线）
  - 总尺寸、面名称、盒型、材料、厚度、日期
  - 图例与“DIELINE — VERIFY WITH PRINTER”声明
- 中文文字只存在于贴图栅格中；矢量标签使用英文。
- 使用 jsPDF 的 mm 单位，确保 1:1 尺寸。

### PNG

- 长边 = net 长边 mm × 300/25.4，上限 8000px。
- 透明背景或纸白背景可选，默认纸白。
- 包含出血与极淡安全区标记；不包含交互选中态。

### SVG

- `<defs>` 中嵌入每个面板的贴图 data URL 与 clipPath。
- 刀模线、折线保持矢量。
- 不含选中态、悬停态和 UI 装饰。
- 文件体积超过 12MB 时提示用户改用 PDF。

### JSON

- 导出完整 `Project`，包括图片 data URL。
- 导入时校验 `schemaVersion`、盒型、数值范围和 data URL MIME。
- 校验失败给出具体字段错误，不覆盖当前工程。

### 持久化

- IndexedDB 保存最近一次工程（key: `paperform.current`），700ms debounce。
- 启动时恢复；恢复失败则加载默认演示工程。
- 提供“新建工程”与“导入工程”。

## 8. 默认演示内容

首次打开加载：

- 盒型：插口折叠盒。
- 尺寸：180 × 90 × 60mm。
- 材料：牛皮卡 + 哑光。
- 全局设计：
  - 底色 `#D8B98A`，牛皮纤维。
  - 图案无。
  - 文字层：`PAPERFORM`（Newsreader，10mm，深墨色，居中偏上）+ `OBJECTS FOR EVERYDAY`（Manrope，3.2mm，字距 0.6mm）。
  - 一个极简折叠标记图形以纯 CSS/SVG 绘制为图片层或直接使用文字图形。
- 3D 初始 3/4 视角，微自动旋转关闭；相机可一键自动旋转。

## 9. 错误处理与边界

- 图片超过 8MB 或格式不支持：拒绝并显示 toast，保留原设计。
- IndexedDB 不可用：降级为不自动保存，顶栏显示“仅本次会话”。
- WebGL 不可用：中栏显示静态示意图和说明，其余 2D/导出功能可用。
- 导出失败：保留设置，显示错误原因（浏览器内存/画布尺寸），建议降低尺寸或分辨率。
- 尺寸极值：clamp 后显示范围提示；net 超出可视区域时自动适配。
- 切换盒型时面选中若不存在，自动回到全局。
- 导入损坏 JSON：不覆盖当前工程。
- 撤销/重做在导出进行中禁用。

## 10. 可访问性与性能

- 所有图标按钮有 `aria-label` 和 tooltip；键盘 focus 可见。
- 右栏使用真实 label 关联 input；滑杆显示当前值。
- 颜色对比：正文对纸色 ≥ 7:1；弱化文字 ≥ 4.5:1。
- `prefers-reduced-motion`：关闭自动旋转，缩短过渡到 0ms。
- 贴图合成只在设计变化后触发；滑杆拖动使用 `requestAnimationFrame` 合并。
- 3D 渲染限制 devicePixelRatio ≤ 2；页面隐藏时暂停 RAF。
- 图片上传压缩，防止 IndexedDB 膨胀。
- 每次 rebuild 释放旧 geometry/material/texture，避免 WebGL 内存泄漏。

## 11. 测试与验收

### 自动化

- Vitest：
  - `generateBoxModel` 对三种盒型和尺寸极值的面板/折线/尺寸。
  - `resolveArtwork` 的全局/单面继承、同步到所有面。
  - `formatDimensions`、文件名 slug、颜色校验。
  - 导入 JSON 校验成功与失败路径。
- `vue-tsc --noEmit` 与 `vite build` 必须通过。
- 使用浏览器自动化验证：
  - 首屏渲染三栏与默认纸盒。
  - 切换三种盒型。
  - 修改长宽高后 2D 标注与 3D 同步。
  - 拖拽旋转、点击面、右栏选中面同步。
  - 开启单面覆盖、改色，确认只影响该面。
  - 上传图片、添加文字层，确认 2D 与 3D 出现。
  - 导出 PDF/PNG/SVG/JSON，确认文件非空且可解析。
  - 1440×900、1280×800 两档无横向溢出。

### 人工验收清单

- 3D 视图能清楚看到每个面的贴图，拖拽流畅。
- 面板层级和视觉重心清晰，不像模板化后台。
- 导出文件包含出血、刀模线和尺寸标注。
- 设计工具的所有按钮都有明确反馈，无“死”控件。
- 关闭/刷新后工程能恢复。

## 12. 技术栈与目录

- Vue 3 + TypeScript + Vite + Pinia。
- Three.js（含 OrbitControls、RoomEnvironment）。
- jsPDF。
- @fontsource-variable/manrope、@fontsource-variable/newsreader。
- lucide-vue-next 图标。
- Vitest + @vue/test-utils。
- 目录：

```
src/
  components/
    AppHeader.vue
    NetViewer.vue
    BoxViewer.vue
    PropertyPanel.vue
    panels/StructurePanel.vue
    panels/DesignPanel.vue
    panels/ExportPanel.vue
    ui/...
  core/
    boxes/
      tuck.ts
      mailer.ts
      lidbase.ts
      types.ts
    artwork.ts
    svg.ts
    exporters/
      pdf.ts
      png.ts
      svg.ts
      json.ts
    storage.ts
    history.ts
  stores/designer.ts
  styles/tokens.css
  styles/base.css
  App.vue
  main.ts
```

## 13. 实施切分

1. 工程脚手架、设计令牌、字体、三栏布局与默认数据。
2. 刀模生成器 + 2D SVG 展开图 + 面选中同步。
3. Three.js 场景、盒型几何、拖拽与面拾取。
4. 贴图数据模型、Canvas 合成器、右栏设计页签、面继承。
5. 三种盒型 3D 开合/升降差异与结构面板。
6. 导出 PDF/PNG/SVG/JSON、IndexedDB 自动保存、撤销重做。
7. 视觉打磨、响应式、测试、浏览器验收与修复。


## 14. 修订记录

### v1.1 — 2026-11-17

- 布局从固定三栏升级为可组合视图：顶栏提供 `2D / 3D / 属性` 三个开关，按可见视图数量自动切换三栏、两栏或单栏；支持只显示 2D、只显示 3D 或只显示属性。
- 展开图缩放改为修改 SVG `viewBox`，不再对整层 HTML 做位图缩放；贴图缓存分辨率提升到 2000px，400% 放大时刀模线、标注和文字保持清晰。
- 小屏（< 1024px）默认聚焦 3D，使用同一组视图开关切换为单栏 2D 或属性。
- 全面放大界面字号：正文、表单、面板标题、图层属性、导出说明和辅助标签整体提升约 2–3px，并相应调整面板宽度与顶部栏布局。
