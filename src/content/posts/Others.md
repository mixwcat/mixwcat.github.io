---
title: Unity其他项目
date: 2026-05-07
lastMod: 2026-05-07T00:00:00.000Z
summary: 一些训练项目
category: Unity
tags: [Unity]
---

# 类银河恶魔城

## 项目简介

<p style="text-indent: 2em;">本人学习unity的入门课程，观看的是B站上国外视频的<a href="https://www.bilibili.com/video/BV1cM4y1p7RF/?spm_id_from=333.337.search-card.all.click&vd_source=1b92cf198e80738be5840dce6f82bf9d" target="_blank" rel="noopener noreferrer">搬运</a>。做完后上传到了<a href="https://github.com/mixwcat/TeachRPG/tree/master" target="_blank" rel="noopener noreferrer">Github仓库</a>里。效果比较简陋，这里就不展示了。

---

# 梦境迷宫

## 项目简介

<p style="text-indent: 2em;">吉比特高校赛参赛作品，也是我的第一个作品，以平台跳跃为核心玩法。设计了多段跳、飘浮、重力旋转等玩法。使用有限状态机管理人物状态。项目比较简陋，代码管理较差。

## 核心玩法

**平台跳跃** — 通过多段跳、飘浮、世界旋转等方式抵达终点

## 演示

<video src="https://res.cloudinary.com/dmlj5k2k2/video/upload/q_auto/f_auto/v1777618254/mjmg-pressed_vt1sxx.mp4" controls width="100%" style="max-width: 720px; border-radius: 8px;"></video>

---

# 第三人称近战战斗系统

## 项目简介

<p style="text-indent: 2em;">对<a href="https://www.bilibili.com/video/BV12ty1Y4Esq/?spm_id_from=333.1391.0.0&p=34&vd_source=1b92cf198e80738be5840dce6f82bf9d" target="_blank" rel="noopener noreferrer">B站视频</a>的项目跟练，主要是学习3D开发的基础，包括网格、材质、3D动画、Shader、AI Navigation等组件的使用，以及对新版输入系统进行更深入的使用。

## 演示

<video src="https://res.cloudinary.com/dmlj5k2k2/video/upload/v1780831274/6%E6%9C%887%E6%97%A5_afymdo.mp4" controls width="100%" style="max-width: 720px; border-radius: 8px;"></video>

## 心得

<p style="text-indent: 2em;">随着项目经验的增加，日常开发里我会特意注重架构的设计，以尽力避免代码管理混乱，可读性差等问题。以往很多项目都是开发到最后代码乱作一团，所以我特地去学习了<a href="/posts/designpattern/">设计模式</a>，也接触到例如单一职责原则、最少知识原则等开发思想。在这个项目的开发中，我也能够下意识的思考课程里代码的问题了。

<p style="text-indent: 2em;">跟练过程里，很劝退的地方是原教程里代码的管理非常混乱。例如 PlayerController、 MeeleFighter、 CombatController 三个脚本互相引用，职责混乱（MeeleFight 同时负责攻击执行 + 移动 + 转向 + 受击 + 反击 + Combo 管理 + 距离判断， CombatController 同时负责战斗模式 + 目标管理 + 攻击输入 + 根运动 + 攻击调度），多个脚本同时控制 Animator 和 Transform，状态管理分散在各个脚本里（例如 PlayerController 和 MeeleFighter 同时修改 AttackState）。

项目中 Animator 的控制逻辑分散在各个脚本中

```c#
  // PlayerController.cs
  void Update() {
      anim.SetFloat("MoveSpeed", moveAmount);
  }

  // CombatController.cs
  void Update() {
      anim.SetBool("CombatMode", combatMode);
  }

  // MeeleFight.cs
  IEnumerator Attack() {
      anim.CrossFade("Attack", 0.2f);
  }
```

也许这里可以专门设计管理类

```c#
public class AnimationController : MonoBehaviour {
    Animator anim;
    bool isLocked = false;

    public void SetMovement(float speed) {
       if (isLocked) return; 
         anim.SetFloat("MoveSpeed", speed);
  }

    public IEnumerator PlayAttack(string name) {
        isLocked = true;
        anim.CrossFade(name, 0.2f);
      yield return new WaitForSeconds(...);
      isLocked = false;
    }
}
```

<p style="text-indent: 2em;">或者同时使用 transform.position 和 CharacterController 组件控制玩家的移动。此外，项目为 Enemy 设计了一套简陋的状态机，而 Player 完全依赖于状态判断。这些设计共同导致了项目中激增的 if 等防御性判断。实话说，随着教程进行到后面几节时，我已经很难轻松理解教程中某一处代码的修改意图和某一段代码的工作方式了。

<p style="text-indent: 2em;">当然，在自己学习了一些开发思想之后，有时也能够感觉出哪些地方应该设计可扩展的框架，哪些地方就当作小项目的特色代码，例如用命令模式实现攻击指令的调用，以便后续扩展 RangedAttack 时免去重新修改 CombatController 的攻击调用函数的步骤。总之，这个项目于我而言也是很好的学习样本。

_开发中，持续更新..._
