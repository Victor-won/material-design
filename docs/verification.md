# PAPERFORM 验收记录

- 验收日期：2026-11-17
- 环境：macOS，Node.js v22.23.1，pnpm 12.3.4，Google Chrome（Playwright Core 1.65.1）
- 应用：`http://127.0.0.1:5173/`

## 自动化检查

| 检查 | 命令 | 结果 |
|---|---|---|
| 单元测试 | `pnpm test` | 7 个测试文件，31 个测试全部通过 |
| 类型检查 | `pnpm typecheck` | 通过，无类型错误 |
| 生产构建 | `pnpm build` | 通过；主包约 767KB，jsPDF 懒加载 |
| 控制台 | 浏览器 E2E | 无 error、无 pageerror |

单元测试覆盖：

- 三种盒型的 net / folds / glue tab / face ids / 几何有限性。
- 全局与单面贴图继承、同步到所有面、图层隔离。
- 工程校验、尺寸 clamp、文件名 slug、日期戳。
- SVG 刀模序列化、面命中目标、出血/折线/选区、XML 转义。
- 属性面板页签切换、盒型切换、快捷键输入保护。
- 2D / 3D / 属性视图开关、至少保留一个视图、单视图聚焦。

## 浏览器验收

分别在 1440×900 与 1280×800 下验证：

- 三栏布局完整，无横向溢出；任意隐藏一个视图切换为两栏，隐藏两个视图切换为单栏；900×760 下自动进入单栏且可通过视图开关切换 2D / 3D / 属性。
- 展开图放大至 400% 时 `viewBox` 变化，文字、刀模线和标注保持矢量清晰。
- 默认插口盒、飞机盒、天地盖均正常渲染。
- 修改长度后 2D、3D 尺寸同步；撤销 / 重做恢复正确。
- 3D 拖拽后视角变化；点击面后右栏作用域同步。
- 单面覆盖可启用，颜色与图片只影响选中面。
- 上传 SVG 图片、添加文字图层、图层列表更新。
- 刷新后尺寸与单面覆盖从 IndexedDB 恢复。
- PDF / PNG / SVG / JSON 均成功下载并通过文件头与 JSON 结构检查。
- 导入工程 JSON 成功，项目名恢复。

截图：

- [1440 首屏](screenshots/final-1440.png)
- [1280 首屏](screenshots/final-1280.png)
- [单栏 2D](screenshots/final-2d-only.png)
- [单栏 3D](screenshots/final-3d-only.png)
- [双栏 3D + 属性](screenshots/final-2col.png)
- [400% 放大清晰度](screenshots/final-2d-zoom.png)
- [小屏单栏](screenshots/final-compact.png)
- [设计页签](screenshots/final-design.png)
- [飞机盒开盖](screenshots/final-mailer.png)
- [天地盖升盖](screenshots/final-lidbase.png)
- [PDF 第 1 页（300dpi 贴图）](screenshots/final-pdf/page-1.png)
- [PDF 第 2 页（矢量刀模）](screenshots/final-pdf/page-2.png)

## 导出产物

| 文件 | 大小 | 说明 |
|---|---|---|
| `paperform-sample-print.pdf` | 915,232 bytes | 2 页，PDF 1.3；页面 648×355mm（含边距），含矢量出血线 |
| `paperform-sample-dieline.png` | 2,729,445 bytes | 7181×3390px，约 300dpi |
| `paperform-sample-dieline.svg` | 1,498,583 bytes | 根节点使用 mm 单位，内嵌高分辨率贴图 |
| `paperform-sample-project.json` | 2,001 bytes | schemaVersion 1 工程数据 |

样例位于 [`docs/samples/`](samples/)。

## 已知限制

- 自动保存依赖 IndexedDB；隐私模式或禁用存储时顶部状态显示“仅本次会话”。
- 内衬使用程序化纸色材质，不提供独立的内壁印刷编辑。
- 当前刀模为参数化设计模板，生产前必须由印厂确认刀模补偿、纸张纹向与拼版。
- 超大盒型会按最长边 6000px（PDF）或 8000px（PNG）降级，以保证浏览器可完成导出。
