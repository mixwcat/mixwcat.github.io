---
title: 前端 - 自定义光标
date: 2026-05-09
lastMod: 2026-05-09T00:00:00.000Z
summary: 从一套 .ani 动画光标出发，用 DOM 元素跟随方案在实现了自定义光标状态
category: Vibe Coding
tags: [Astro, 前端, Vibe Coding]
---

## 需求背景

手上有几套 Windows `.ani` 动态光标，想在博客网站上复刻同样的效果。浏览器原生不支持 ANI 格式，而且系统级光标自定义能力非常有限（只能改 `cursor: url()` 的静态图），所以必须走「DOM 元素跟随鼠标」的方案。

项目栈：**Astro + React + TailwindCSS + framer-motion + jotai**

## 方案选型

| 方案 | 优点 | 缺点 |
|---|---|---|
| CSS `cursor: url()` | 最简单 | 不支持动画，不能动态切换状态 |
| DOM 元素 + `mousemove` | 完全可控，支持动画/切换 | 需要自己处理性能、边界情况 |
| Canvas 绘制 | 性能最好，可做复杂轨迹 | 过度设计，本项目不需要 |

最终选择 **DOM 元素 + framer-motion** 的弹簧动画，用 `motion.div` 跟随鼠标坐标。

## 核心实现

### 1. 坐标跟随

用 `useMotionValue` 实时记录鼠标位置，再包一层 `useSpring` 提供物理平滑效果：

```tsx
const cursorX = useMotionValue(-100)
const cursorY = useMotionValue(-100)

// 默认零延迟（damping 改小就会晃，干脆提供 smooth 开关）
const springX = smooth ? useSpring(cursorX, { stiffness, damping: 20 }) : cursorX
const springY = smooth ? useSpring(cursorY, { stiffness, damping: 20 }) : cursorY
```

`mousemove` 事件直接写进 `useEffect`，`framer-motion` 负责把数值映射到 `transform`。实测 `requestAnimationFrame` 级别的流畅度，不会掉帧。

### 2. 四套状态自动切换

博客里需要四种光标语义：

| 状态 | 触发场景 |
|---|---|
| `normal` | 默认状态 |
| `choose` | 悬停在 `<a>`、`<button>`、`cursor: pointer` 元素上 |
| `vertical` | 悬停在输入框、文本域、`cursor: text` 区域 |
| `loading` | 页面加载中 / swup 路由切换时 |

自动检测逻辑是向上冒泡遍历 DOM，优先读 `data-cursor` 属性（允许手动覆盖），再按标签和计算样式判断：

```tsx
function getHoverState(el: HTMLElement): HoverState {
  let node: HTMLElement | null = el
  while (node && node !== document.body) {
    // 1. 优先读 data-cursor
    const dataCursor = node.getAttribute('data-cursor')
    if (dataCursor) return dataCursor as HoverState

    // 2. 检测可点击元素
    if (isClickable(node)) return 'choose'

    // 3. 检测文本输入元素
    if (isText(node)) return 'vertical'

    node = node.parentElement
  }
  return 'normal'
}
```

`loading` 状态单独处理：监听 `document.readyState` 和 swup 的 `visit:start` / `visit:end` 事件。

### 3. 窗口离开自动隐藏

自定义光标在鼠标离开浏览器窗口后应该消失，否则它会「冻」在最后一个位置，很丑。检测四种事件：

```tsx
document.documentElement.addEventListener('mouseleave', () => setVisible(false))
document.documentElement.addEventListener('mouseenter', () => setVisible(true))
window.addEventListener('blur', () => setVisible(false))
window.addEventListener('focus', () => setVisible(true))
```

- `mouseleave` / `mouseenter`：鼠标移出/回到文档区域（移到任务栏、桌面等）
- `blur` / `focus`：浏览器窗口失去/获得焦点（Alt+Tab、切换标签页）

隐藏用 `framer-motion` 的 `animate={{ opacity }}` 做 150ms 淡出，视觉上比较柔和。

### 4. 用户可配置：光标大小切换

在页脚主题切换按钮旁边加一个圆形按钮，点击在 **32 / 40 / 48 px** 之间循环切换：

```tsx
// store/cursor.ts
export const cursorSizeAtom = atom(getLocalCursorSize())

// utils/cursor.ts
export function getNextCursorSize(size: number): number {
  const SIZES = [32, 40, 48]
  return SIZES[(SIZES.indexOf(size) + 1) % SIZES.length]
}
```

大小通过 `jotai` 的 `cursorSizeAtom` 全局共享，切换后写进 `localStorage`，刷新保留。`CustomCursor` 组件内部用 `useAtomValue` 读取，这样 `Layout.astro` 上完全不用传 `size` prop。

### 5. ANI 转 GIF 格式

浏览器不支持 `.ani`，需要转换:

1. 下载RealWorldCursorEditor，将anim文件导出为gif格式。期间让我比较意外的是，有一个anim文件损坏，无法导入进RWCursorEditor，最后使用AI竟然修复成功了。
2. 放进 `public/cursors/` 目录

GIF 最简单但透明边缘有锯齿；APNG 质量更好但文件稍大。我目前用的是 GIF，后续可以考虑换 WebP 动画进一步压缩体积。

## 踩过的坑

### 1. damping 为 0 时光标疯狂晃动

`framer-motion` 的 `useSpring` 底层是弹簧物理模型，`damping: 0` 表示零阻尼，会永远振荡。想要零延迟不要调 `damping`，直接绕过 `useSpring`，用原始 `motionValue`：

```tsx
const springX = smooth ? useSpring(cursorX, ...) : cursorX  // smooth=false 时零延迟
```

### 2. 触摸设备自动禁用

自定义光标在手机上完全是负体验（挡内容、跟手精度差）。用 `matchMedia('(hover: hover)')` 检测，移动端直接 `return null`，同时 CSS 里也要恢复系统光标：

```css
@media (hover: hover) {
  html, html * { cursor: none !important; }
}
```

### 3. swup 页面过渡期间光标状态

这个项目用了 `@swup/astro` 做无刷新路由，页面切换期间需要把光标切到 `loading` 状态，避免用户以为卡死了。监听 `swup:visit:start` 和 `swup:visit:end` 即可。

## 最终效果

- 默认状态：小圆点（或自定义 GIF）跟手移动
- 悬停链接：光标换成「手指」动画
- 悬停输入框：光标换成「I-beam」竖线
- 页面切换：光标变成「加载中」旋转动画
- 离开窗口：光标淡出消失
- 页脚按钮：一键切换 32/40/48 px 三种尺寸

## 参考代码

完整组件见仓库：

- `src/components/CustomCursor.tsx` — 核心光标组件
- `src/components/footer/CursorSizeSwitch.tsx` — 大小切换按钮
- `src/store/cursor.ts` / `src/utils/cursor.ts` — 状态和持久化

---

*写于 2026-05-09，项目栈 Astro 5.18 + React 18 + framer-motion 11.18*
