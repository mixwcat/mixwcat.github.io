---
title: 设计模式学习
date: 2026-05-09
lastMod: 2026-09-06T00:00:00.000Z
summary: 总结一些设计模式
category: C#
tags: [C#]
---

## 一些准则

1. 抽象和解耦让扩展代码更快更容易，但除非确信需要灵活性，否则不要在这上面浪费时间。

2. 在整个开发周期中为性能考虑并做好设计，但是尽可能推迟那些底层的，基于假设的优化，那会锁死代码。

3. 在一对一的情况下，没有必要特地去实现解耦

## 命令模式

### 简介

命令模式的 **撤销与重做** 功能是其最主要的用处。将命令对象抽象出来后，不仅可以用来执行函数功能，更可以将此刻的状态记录下来，以便后续回滚。

在下述案例中，由于[原网页教学](https://gpp.tkchu.me/command.html)是面向初级开发者的，所以并没有对Command造成的内存浪费做出优化。文中提到了享元模式（全程复用一个全局静态实例）和对象池两种解决方案。不过使用享元模式，似乎会导致Stack压入的所有对象指向同一个Command，导致撤销操作无法正确执行，这点还有待后续实际开发时再思考🤔。

### 脚本示例

1. BaseCommand 指令

```cs
public abstract class Command {
    // 传入要控制的角色对象
    public abstract void Execute(GameActor actor);
    // 撤销该操作
    public abstract void Undo(GameActor actor);
}
```

2. MoveCommand/JumpCommand 实现

```cs
public class MoveCommand : Command {
    private int _xBefore, _yBefore;  // GameLoop中
    private int _dx, _dy;

    public MoveCommand(int dx, int dy) {
        _dx = dx;
        _dy = dy;
    }

    public override void Execute(GameActor actor) {
        // 1. 记录当前位置，方便后续撤销
        _xBefore = actor.X;
        _yBefore = actor.Y;

        // 2. 执行移动。具体实现写在角色里，这里只调用。
        actor.MoveTo(_xBefore + _dx, _yBefore + _dy);
    }

    public override void Undo(GameActor actor) {
        // 回滚到执行前的坐标。
        actor.MoveTo(_xBefore, _yBefore);
    }
}
```

3. InputHandler 监听输入

```cs
public class InputHandler {
    public Command HandleInput() {
		// 需要添加UpArrow逻辑时，写在这里。
        if (Input.GetKeyDown(KeyCode.W)) return new MoveCommand(0, 1);
        if (Input.GetKeyDown(KeyCode.S)) return new MoveCommand(0, -1);

        return null;
    }
}
```

4. GameLoop（PlayerController） 主循环

```cs
public class GameLoop : MonoBehaviour {
    private Stack<Command> history = new Stack<Command>();
    private GameActor player = new GameActor();
    private InputHandler inputHandler = new InputHandler();

    void Update() {
        // 1. 获取输入对应的命令
        Command command = inputHandler.HandleInput();

        if (command != null) {
            // 2. 执行并存入历史
            command.Execute(player);
            history.Push(command);
        }

        // 3. 按下 Control + Z 撤销
        if (Input.GetKeyDown(KeyCode.Z) && history.Count > 0) {
            Command lastCommand = history.Pop();
            lastCommand.Undo(player);
        }
    }
}
```

##
