---
title: Unity项目 - 探迹寻理
date: 2026-05-06
lastMod: 2026-05-06T00:00:00.000Z
summary: 一款俯视角2D平面解谜游戏，利用场上的机关抵达终点。
category: Unity
tags: [Unity]
---

## 项目简介

<p style="text-indent: 2em;">这是一款俯视角2D平面解谜游戏，利用磁极相互排斥吸引的特性越过重重阻碍，抵达终点。作品美术采用了水墨风格，

<p style="text-indent: 2em;">该项目是2025年计算机设计大赛参赛作品，主题是中国古代物理相关。很可惜只拿了省优秀奖。不过这也是我的首次团队协作作品，借此机会学习了和美术、音乐、程序、策划之间合作开发的流程，也是在这次开发之后，我和新的团队都确定了使用飞书进行阶段性规划和使用git进行项目管理的开发方式。虽然作品很简陋，但是让我收获良多。

## 技术栈

- **引擎：** Unity
- **平台：** Windows

## 核心玩法

1. **解谜通关** — 利用磁极吸引排斥的特性，抵达目标地点
2. **双极配合** — 在后续的关卡中加入机关，玩家需要同时操控机关和主角并相互配合
3. **背景收集** — 获取通关后的主角日记，还原完整的故事

## 项目地址
[github地址](https://github.com/mixwcat/TraceTruth)

## 演示

<video src="https://res.cloudinary.com/dmlj5k2k2/video/upload/v1777618449/tjxl-pressed_pra3y0.mp4" controls width="100%" style="max-width: 720px; border-radius: 8px;"></video>

## 开发笔记

### 一、ScriptableObject 事件系统

<p style="text-indent: 2em;">基于 ScriptableObject 的泛型事件系统。泛型基类内部维护了一个 UnityAction 委托，调用 RaiseEvent 方法时触发所有注册的监听者。具体事件类型通过空继承一行代码即可定义，泛型监听器在 OnEnable 和 OnDisable 中自动完成事件的注册与注销。每个事件通道是一个 ScriptableObject 资源文件，在 Inspector 中拖拽即可完成模块间的连接。比较关键的是 InputManager 只负责发出方向事件、PlayerMove 只负责响应，双方互不感知。

### 二、单例基类

<p style="text-indent: 2em;">项目参考了唐老狮教程单例基类管理模式。8 个 Manager 全部继承自同一个泛型单例基类，提供了懒加载查找、DontDestroyOnLoad 跨场景持久、以及 IsExisted 标记防止销毁后访问等能力。

### 三、操作回溯系统

<p style="text-indent: 2em;">PlayerManager 中实现了一个轻量级的撤销系统，核心数据结构是 Stack。每回合结束时将全体玩家的位置和磁极状态打包压入栈中；玩家点击退回按钮时从栈顶弹出当前状态并恢复到上一步。如果新状态与栈顶完全一致则不重复压栈，这通过实现 IEqualityComparer 自定义比较逻辑来完成。

### 四、射线检测的模板方法

<p style="text-indent: 2em;">RaycastBase 封装了对四周四个方向的射线检测逻辑，检测结果不直接调用具体方法，而是通过 Vector2 事件广播出去，PlayerMove 中分别注册 OnMagnetDetected 和 OnPlayerDetected 两个方向的回调。

### 五、自定义 Tile 的磁极系统

<p style="text-indent: 2em;">游戏的核心玩法是磁极吸引与排斥，磁极被实现为自定义 Tilemap 瓦片。MagnetTile 继承 TileBase 并重写 GetTileData 方法，在渲染时动态判断当前是 N 极还是 S 极瓦片，切换对应的 Sprite 显示。NMagnetTile 和 SMagnetTile 作为空类继承 MagnetTile，仅充当"类型标签"。MagnetManager 遍历 Tilemap 时通过 is 关键字判断类型来还原每个格子的磁极信息。

### 六、Addressables 异步场景管理

<p style="text-indent: 2em;">场景的管理模式参考了<a href="https://www.bilibili.com/video/BV1p94y1b7ka?spm_id_from=333.788.videopod.sections&vd_source=1b92cf198e80738be5840dce6f82bf9d" target="_blank" rel="noopener noreferrer">麦扣老师的视频</a>。SceneLoadManager 使用 Unity Addressables 进行异步场景加载，配合 DOTween 实现淡入淡出过渡。场景以 Additive 模式加载，保持 Manager 所在的 Persistent 场景常驻不被卸载。异步流程使用了 Unity 6 的 Awaitable 模式，加载完成后通过 await 等待 FadePanel 的淡出动画。

### 七、UI Toolkit 方案

<p style="text-indent: 2em;">项目尝试了 UI Toolkit 方案。所有面板通过 UIDocument.rootVisualElement 获取根元素，使用 Q 选择器查找组件，按钮回调通过 clicked 注册，样式操作直接修改 style 属性。

### 八、音乐音效管理器

<p style="text-indent: 2em;">MusicManager 分别管理背景音乐和音效两个通道。BGM 使用独立的、标记了 DontDestroyOnLoad 的 AudioSource，确保场景切换时不中断；音效则挂在一个共用的 soundObj 节点下，运行时产生的 AudioSource 存入 List 中统一管理。FixedUpdate 中采用逆向遍历清理已播放完毕的音效组件，避免迭代时删除导致的索引错位。两者的音频资源都通过 Addressables 异步加载。
