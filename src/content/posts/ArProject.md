---
title: Unity项目 - 一木见千秋
date: 2026-04-30
lastMod: 2026-04-30T00:00:00.000Z
summary: 一款基于Unity+Vufora的AR建筑科普应用
category: Unity
tags: [Unity]
---

## 项目简介

计算机设计大赛的参赛作品，工期一周，项目完善度不高，暂无更新计划。

## 技术栈

- **引擎：** Unity 6000.2.13f1
- **AR 框架：** Vuforia 11.4
- **平台：** Android (Quest3 开发中)

## 核心功能

1. **图片识别** — 识别到建筑图片后，显示建筑的3D模型并出现交互按钮
2. **建筑交互** — 内置答题、视频介绍、建筑零部件拼装等功能
3. **知识学习** — 大量建筑文字介绍信息

## 演示

<video src="https://res.cloudinary.com/dmlj5k2k2/video/upload/v1777617192/ymjqq_neduxu.mp4" controls width="100%" style="max-width: 240px; border-radius: 8px;"></video>

## 项目下载地址

[Apk文件下载链接](https://github.com/mixwcat/ArBuilding/releases/download/developing/ar.apk)

## 分享

### 开发背景

<p style="text-indent: 2em;">本次比赛以中国古代建筑为主题，恰好我了解过Vuforia引擎，便决定做出一个以增强现实技术为基础，实现建筑文化的数字化科普展示的软件。确定方向后，我在网上翻阅了现有同类作品，参考了基于 Vuforia 开发的 AR 建筑应用（<a href="https://www.bilibili.com/video/BV1Uz421h7ZJ/?spm_id_from=333.1391.0.0&vd_source=1b92cf198e80738be5840dce6f82bf9d">演示视频</a>）的视觉呈现。

<p style="text-indent: 2em;">技术验证阶段，我们先是完成了 Vuforia 核心功能的可行性 Demo，确认图像识别、模型渲染与交互触发等关键能力满足需求后，再与策划团队敲定游戏玩法，明确各模块的功能。

<p style="text-indent: 2em;">只不过很可惜的是，Vuforia官方在一次更新之后弃用了Virtual Button功能，使得我们没法实现现实中交互并触发逻辑的功能。在网上也没有找到其他替代方案，最后我们只能把所有交互环节都放在运行设备上。

### 开发笔记

<p style="text-indent: 2em;">项目中期开发Video播放功能时，我在安卓机上运行时碰上严重卡顿的问题--画面撕裂、音画不同步、Slider拖动无响应。起初以为是视频文件过大，随后对视频进行了压缩和更换编码方式处理，问题还是没解决。深入排查发现，VideoPlayer在每帧Update中轮询进度并更新UI。后来改用了事件驱动，视频开始时启用协程，以0.5秒间隔同步Slider进度。重新打包执行后，发现画面虽然是正常了，但是Slider拖动没有响应。后来发现是为了优化性能，避免拖动Slider导致高频触发事件，改成了Slider隔一段时间监听一回，导致Slider的监听逻辑错误。最后使用脏标记解决了问题。

<p style="text-indent: 2em;">此外，这个游戏核心玩法之一是部件拖动--用户选中部件，手指滑动移动位置，靠近目标时自动吸附。最初的设计是将所有逻辑集中在一个DisassemblablePart类中，包含输入处理、状态管理、高亮反馈、吸附检测等。这种"大而全"的设计在原型阶段尚可运行，但很快暴露出问题：鼠标点击和安卓触控拖动的逻辑交织在一起，修改一处代码常常引发连锁故障；不同部件的行为差异需要大量if-else分支，代码迅速膨胀到难以维护的程度，可读性极低。

<p style="text-indent: 2em;">重构架构后，将输入逻辑与业务逻辑彻底分离，拆解出三个关注点不同的组件：SelectablePart负责部件的状态管理、高亮和吸附逻辑；PartInputHandler专门处理鼠标和触控输入，通过平台条件编译统一接口；RaycastTarget作为射线检测的独立目标。

<p style="text-indent: 2em;">在Unity中解决完问题后，移动端的适配又产生新的问题了。我们最初只实现了XZ平面移动（锁定Y轴，模拟将部件放置在桌面），但AR场景中用户可能从任意角度观察模型，有时需要将部件拼接到建筑立面上。后来我为每个组件设计了XY双平面模式，让部件可以在垂直面内移动。实现过程中，XY平面需要创建一个朝向相机的垂直面而非Vector3.up水平面。最后实现效果倒是勉强符合预期，只不过这时候已经接近DeadLine了，考虑到还有大量文档要写，功能优化只好到此结束。

---

_持续更新中..._
