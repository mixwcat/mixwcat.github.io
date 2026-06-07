---
title: 序列模式
date: 2026-05-13
lastMod: 2026-05-13T00:00:00.000Z
summary: 双缓冲模式、游戏循环等序列模式学习
category: C#
tags: [C#]
---

## 双缓冲模式

### 简介

双缓冲模式主要用于 **把一连串逐步完成的修改包装成一次看起来瞬间完成的变化**。计算机通常按顺序执行操作，但游戏画面、角色状态、AI 交互等系统，经常需要让玩家感觉“这一帧里的所有事情是同时发生的”。如果外部代码在修改到一半时读取状态，就会看到不完整或不一致的结果。

以渲染为例，程序逐个像素绘制画面，显示设备却可能在绘制过程中读取帧缓冲。如果读到一半已更新、一半未更新的缓冲，屏幕上就会出现撕裂或闪烁。双缓冲的做法是准备两个缓冲区：`current` 当前缓冲给外部读取，`next` 下一缓冲给内部写入。一帧绘制完成后，再用一次 `Swap()` 把它们交换。

这个模式不只适合图形。只要满足这些条件，就可以考虑双缓冲：状态会被逐步修改；修改过程中可能被读取；外部不应该看到半成品；读取方也不想一直等待写入完成。

双缓冲的代价也很明确：需要保存两份状态，并且交换操作必须足够快、足够原子。如果交换本身比修改状态还慢，或者内存无法承受两份数据，就需要换别的方案。

### 脚本示例

1. FrameBuffer 缓冲区

```cs
public class FrameBuffer {
    private const int Width = 160;
    private const int Height = 120;

    private readonly Color[] _pixels = new Color[Width * Height];

    public FrameBuffer() {
        Clear();
    }

    public void Clear() {
        for (int i = 0; i < _pixels.Length; i++) {
            _pixels[i] = Color.White;
        }
    }

    public void Draw(int x, int y, Color color) {
        _pixels[Width * y + x] = color;
    }

    public IReadOnlyList<Color> GetPixels() {
        return _pixels;
    }
}
```

`FrameBuffer` 表示一整帧像素数据。真实游戏中这个对象通常由图形 API 或引擎封装，这里手写出来只是为了说明双缓冲的读写关系。

2. 没有双缓冲时的问题

```cs
public class Scene {
    private readonly FrameBuffer _buffer = new FrameBuffer();

    public void Draw() {
        _buffer.Clear();
        _buffer.Draw(1, 1, Color.Black);
        _buffer.Draw(4, 1, Color.Black);

        // 如果显示设备这时读取 _buffer，就只能看到画到一半的画面。

        _buffer.Draw(1, 3, Color.Black);
        _buffer.Draw(2, 4, Color.Black);
        _buffer.Draw(3, 4, Color.Black);
        _buffer.Draw(4, 3, Color.Black);
    }

    public FrameBuffer GetBuffer() {
        return _buffer;
    }
}
```

这里 `Draw()` 会逐步修改同一块缓冲，而 `GetBuffer()` 又把这块缓冲暴露给显示设备。只要读取发生在绘制中途，就会看到半成品。

3. 使用双缓冲

```cs
public class DoubleBufferedScene {
    private readonly FrameBuffer[] _buffers = {
        new FrameBuffer(),
        new FrameBuffer()
    };

    private int _currentIndex = 0;

    private int NextIndex => 1 - _currentIndex;

    public void Draw() {
        FrameBuffer next = _buffers[NextIndex];

        next.Clear();
        next.Draw(1, 1, Color.Black);
        next.Draw(4, 1, Color.Black);
        next.Draw(1, 3, Color.Black);
        next.Draw(2, 4, Color.Black);
        next.Draw(3, 4, Color.Black);
        next.Draw(4, 3, Color.Black);

        Swap();
    }

    public FrameBuffer GetBuffer() {
        return _buffers[_currentIndex];
    }

    private void Swap() {
        _currentIndex = NextIndex;
    }
}
```

现在外部读取的永远是 `current`，内部写入的永远是 `next`。只有一帧完整绘制结束后，`Swap()` 才会让新缓冲对外可见。这样显示设备不会看到正在施工的画面。

4. 角色交互中的双缓冲

```cs
public abstract class Actor {
    private bool _currentSlapped;
    private bool _nextSlapped;

    public abstract void Update();

    public void Slap() {
        _nextSlapped = true;
    }

    public bool WasSlapped() {
        return _currentSlapped;
    }

    public void Swap() {
        _currentSlapped = _nextSlapped;
        _nextSlapped = false;
    }
}
```

这个例子对应原文里的“演员互相扇巴掌”。如果每个演员在自己的 `Update()` 中立刻修改别人当前帧的状态，结果就会受更新顺序影响。双缓冲后，演员只读取 `_currentSlapped`，只写入 `_nextSlapped`，本帧产生的影响要到下一帧才可见。

5. Stage 统一交换状态

```cs
public class Stage {
    private readonly List<Actor> _actors = new List<Actor>();

    public void Add(Actor actor) {
        _actors.Add(actor);
    }

    public void Update() {
        for (int i = 0; i < _actors.Count; i++) {
            _actors[i].Update();
        }

        for (int i = 0; i < _actors.Count; i++) {
            _actors[i].Swap();
        }
    }
}
```

`Stage` 先让所有角色基于当前状态完成更新，再统一交换到下一状态。这样角色数组的顺序不会影响本帧结果，玩家看到的是所有角色同步响应。

6. 交换方式的选择

```cs
public class BufferedValue<T> {
    private T _current;
    private T _next;

    public T Current => _current;

    public void WriteNext(T value) {
        _next = value;
    }

    public void SwapByCopy() {
        _current = _next;
    }

    public void SwapByReference(ref T current, ref T next) {
        T temp = current;
        current = next;
        next = temp;
    }
}
```

如果缓冲区很大，通常用交换引用或索引的方式，只需要改几个指针；如果状态很小，比如一个布尔值，直接复制也可以接受。需要注意的是，交换引用时，外部代码不能长期保存旧缓冲的引用，否则下一帧它可能指向错误的数据。

总结来说，双缓冲的本质是：**读当前，写下一个，写完再交换**。它牺牲一份额外内存，换来读取方永远看到完整状态，并让顺序执行的代码呈现出“同时发生”的效果。

## 游戏循环

### 简介

游戏循环主要用于 **把游戏运行和玩家输入、处理器速度解耦**。普通命令行程序通常是输入一次、处理一次、输出一次；图形界面程序则多半等待事件发生后再响应。但游戏不能停在那里等玩家输入。即使玩家什么都不做，动画、物理、AI、音效也要继续运行。

在[原网页教学](https://gpp.tkchu.me/game-loop.html)中，作者把游戏循环总结成三个核心步骤：`processInput()` 处理输入，`update()` 推进游戏世界，`render()` 绘制当前画面。循环会在游戏运行期间持续执行，并且不阻塞等待输入。

游戏循环真正麻烦的地方在于时间。循环跑得太快，游戏就会加速；循环跑得太慢，游戏就会变成慢动作。现代游戏还要适配不同硬件、不同刷新率和不同平台事件循环，所以不能简单地让 `while` 无限制空转。

常见方案有四类：尽可能快地运行、固定帧率并等待、动态时间步长、固定更新时间步长配合动态渲染。原文更推荐最后一种：用固定时间步长更新游戏逻辑，保证物理和 AI 稳定；渲染则尽可能灵活，根据剩余时间插值，让画面更平滑。

### 脚本示例

1. 最简单的游戏循环

```cs
public class Game {
    private bool _isRunning = true;

    public void Run() {
        while (_isRunning) {
            ProcessInput();
            Update();
            Render();
        }
    }

    private void ProcessInput() {
        // 处理从上一帧到现在收到的输入
    }

    private void Update() {
        // 推进 AI、物理、动画、游戏规则
    }

    private void Render() {
        // 绘制当前游戏状态
    }
}
```

这个版本可以说明游戏循环的基本形状，但不适合真实项目。它会跑到机器允许的最快速度，导致游戏速度直接受硬件性能影响。

2. 固定帧率并等待

```cs
public class FixedFrameGame {
    private const double MsPerFrame = 1000.0 / 60.0;
    private bool _isRunning = true;

    public void Run() {
        while (_isRunning) {
            double start = GetCurrentTimeMs();

            ProcessInput();
            Update();
            Render();

            double elapsed = GetCurrentTimeMs() - start;
            double sleepTime = MsPerFrame - elapsed;

            if (sleepTime > 0) {
                Sleep(sleepTime);
            }
        }
    }

    private double GetCurrentTimeMs() {
        return Time.realtimeSinceStartupAsDouble * 1000.0;
    }

    private void Sleep(double milliseconds) {
        Thread.Sleep((int)milliseconds);
    }
}
```

如果一帧很快完成，就休眠到下一帧开始，避免游戏运行得过快。这种方式简单、省电，适合移动平台限制最高帧率。但如果一帧计算超过 16.67ms，它只能不睡，游戏仍然会变慢。

3. 动态时间步长

```cs
public class VariableDeltaGame {
    private bool _isRunning = true;

    public void Run() {
        double lastTime = GetCurrentTimeSeconds();

        while (_isRunning) {
            double currentTime = GetCurrentTimeSeconds();
            double elapsed = currentTime - lastTime;

            ProcessInput();
            Update(elapsed);
            Render();

            lastTime = currentTime;
        }
    }

    private void Update(double deltaTime) {
        // 例如：position += velocity * deltaTime;
    }
}
```

动态时间步长会把真实经过的时间传给 `Update()`。这样不同机器上的游戏速度看起来能对齐真实时间，但它会破坏确定性。物理、网络同步、回放系统都可能因为浮点误差和不同更新次数而出现差异，所以原文把它作为需要谨慎对待的警示方案。

4. 固定更新时间步长，动态渲染

```cs
public class FixedUpdateGame {
    private const double MsPerUpdate = 1000.0 / 60.0;
    private const int MaxUpdatesPerFrame = 5;

    private double _previousTime;
    private double _lag;
    private bool _isRunning = true;

    public void Run() {
        _previousTime = GetCurrentTimeMs();

        while (_isRunning) {
            double currentTime = GetCurrentTimeMs();
            double elapsed = currentTime - _previousTime;
            _previousTime = currentTime;
            _lag += elapsed;

            ProcessInput();

            int updateCount = 0;
            while (_lag >= MsPerUpdate && updateCount < MaxUpdatesPerFrame) {
                Update();
                _lag -= MsPerUpdate;
                updateCount++;
            }

            double interpolation = _lag / MsPerUpdate;
            Render(interpolation);
        }
    }

    private void Update() {
        // 固定步长更新，不接收 deltaTime
    }

    private void Render(double interpolation) {
        // 根据 interpolation 在上一状态和当前状态之间插值渲染
    }
}
```

这个版本把“游戏模拟”和“画面渲染”分开。`Update()` 每次都推进固定时间，所以物理和 AI 更稳定；如果机器慢了，一帧里可以连续执行多次更新来追上真实时间；如果机器快了，就多渲染几次更平滑的画面。

`MaxUpdatesPerFrame` 用来避免极端情况下的死亡螺旋。如果游戏已经落后太多，还无限补更新，就可能越补越慢，最终整帧卡死。限制单帧补更新次数后，游戏可能短暂变慢，但至少还能继续响应。

5. 插值渲染对象

```cs
public class Bullet {
    private Vector2 _previousPosition;
    private Vector2 _currentPosition;
    private Vector2 _velocity;

    public void Update() {
        _previousPosition = _currentPosition;
        _currentPosition += _velocity;
    }

    public void Render(double interpolation) {
        Vector2 drawPosition = Vector2.Lerp(
            _previousPosition,
            _currentPosition,
            (float)interpolation
        );

        DrawAt(drawPosition);
    }

    private void DrawAt(Vector2 position) {
        // 在插值位置绘制子弹
    }
}
```

固定更新会让逻辑位置只在离散时间点变化，而渲染可能发生在两次更新之间。`interpolation` 表示当前渲染时刻处于上一帧和当前帧之间的比例。渲染器用它做插值，玩家看到的移动就会更平滑。

6. 平台拥有循环时

```cs
public class BrowserLikeGame {
    private double _previousTime;
    private double _lag;

    public void OnAnimationFrame(double currentTime) {
        double elapsed = currentTime - _previousTime;
        _previousTime = currentTime;
        _lag += elapsed;

        ProcessInput();

        while (_lag >= 16.67) {
            Update();
            _lag -= 16.67;
        }

        Render(_lag / 16.67);

        RequestNextAnimationFrame(OnAnimationFrame);
    }
}
```

如果在浏览器、移动系统或现成引擎里开发，通常不是你拥有最外层 `while`，而是平台在合适的时机回调你。区别在于循环入口变了，但核心仍然是：非阻塞输入、固定更新、灵活渲染。

总的来说，游戏循环是游戏程序的心跳。它每一轮都处理输入、推进世界、绘制画面，并通过时间控制让游戏速度尽量独立于硬件。真实项目中可以依赖 Unity、Godot、Unreal 等引擎的循环，但理解它的时间步长和渲染插值，能帮助你判断为什么某些逻辑应该写在固定更新里，而另一些只适合放在渲染帧里。

## 更新方法

### 简介

更新方法模式主要用于 **让一组独立对象每帧各自推进自己的行为**。游戏循环只负责遍历对象集合，并在每个对象上调用 `Update()`；至于骷髅怎么巡逻、雕像怎么发射闪电、子弹怎么飞行，都放回对象自己内部。

在[原网页教学](https://gpp.tkchu.me/update-method.html)中，以骷髅巡逻举例。如果直接写一个 `while` 或 `for` 循环让骷髅从左走到右，再从右走到左，程序会卡在这段行为里，玩家看不到画面更新，也无法输入。真正需要的是让骷髅每帧只走一步，把“下一帧继续走”的机会交还给外层游戏循环。

当实体变多后，把所有行为都写在游戏循环里会迅速失控：骷髅有方向变量，雕像有计时变量，敌人、机关、弹幕、掉落物继续往里塞，主循环就会变成一锅混合逻辑。更新方法的做法是让每个对象保存自己的状态，并实现自己的 `Update()`。

这个模式非常常见，Unity 的 `MonoBehaviour.Update()` 就是典型例子。它适合大量需要随时间运行、彼此大多独立的对象；但如果是棋类这种一步一回合的抽象规则，未必需要让每个棋子每帧更新。

### 脚本示例

1. 可更新对象接口

```cs
public interface IUpdatable {
    bool IsAlive { get; }
    void Update();
}
```

游戏世界只需要知道对象能被更新，不需要知道它是骷髅、雕像还是子弹。`IsAlive` 用来配合后面的延迟删除，避免在遍历列表时直接移除对象。

2. World 每帧更新对象

```cs
public class World {
    private readonly List<IUpdatable> _objects = new List<IUpdatable>();
    private readonly List<IUpdatable> _pendingAdd = new List<IUpdatable>();

    public void Add(IUpdatable obj) {
        _pendingAdd.Add(obj);
    }

    public void Update() {
        int countThisFrame = _objects.Count;

        for (int i = 0; i < countThisFrame; i++) {
            IUpdatable obj = _objects[i];

            if (obj.IsAlive) {
                obj.Update();
            }
        }

        _objects.RemoveAll(obj => !obj.IsAlive);
        _objects.AddRange(_pendingAdd);
        _pendingAdd.Clear();
    }
}
```

这里没有在遍历中直接增删 `_objects`。新对象先进入 `_pendingAdd`，这一帧不会立刻更新；死亡对象先被标记，等本帧所有对象更新完再统一删除。这样可以避免“删除前面的对象导致后面的对象被跳过”的问题。

3. Skeleton 保存自己的巡逻状态

```cs
public class Skeleton : IUpdatable {
    private const float Left = 0f;
    private const float Right = 100f;

    private float _x;
    private bool _patrollingLeft;

    public bool IsAlive { get; private set; } = true;

    public void Update() {
        if (_patrollingLeft) {
            _x -= 1f;

            if (_x <= Left) {
                _x = Left;
                _patrollingLeft = false;
            }
        } else {
            _x += 1f;

            if (_x >= Right) {
                _x = Right;
                _patrollingLeft = true;
            }
        }
    }
}
```

原本循环里隐含的“我现在正向左走还是向右走”，在更新方法里必须显式保存成 `_patrollingLeft`。这是更新方法的一个重要代价：行为被切成一帧一帧后，跨帧继续执行所需的信息都要变成对象状态。

4. Statue 保存自己的计时器

```cs
public class Statue : IUpdatable {
    private readonly int _delayFrames;
    private int _frames;

    public bool IsAlive { get; private set; } = true;

    public Statue(int delayFrames) {
        _delayFrames = delayFrames;
    }

    public void Update() {
        _frames++;

        if (_frames >= _delayFrames) {
            ShootLightning();
            _frames = 0;
        }
    }

    private void ShootLightning() {
        // 发射闪电
    }
}
```

每个雕像都有自己的 `_frames` 和 `_delayFrames`，所以关卡里可以摆多个发射频率不同的雕像，不需要在主循环里为它们分别维护 `leftStatueFrames`、`rightStatueFrames` 之类的变量。

5. 传入时间步长

```cs
public interface ITimedUpdatable {
    bool IsAlive { get; }
    void Update(float deltaTime);
}

public class TimedSkeleton : ITimedUpdatable {
    private const float Left = 0f;
    private const float Right = 100f;

    private float _x;
    private float _speed = 30f;
    private bool _patrollingLeft;

    public bool IsAlive { get; private set; } = true;

    public void Update(float deltaTime) {
        float direction = _patrollingLeft ? -1f : 1f;
        _x += direction * _speed * deltaTime;

        if (_x <= Left) {
            _x = Left;
            _patrollingLeft = false;
        } else if (_x >= Right) {
            _x = Right;
            _patrollingLeft = true;
        }
    }
}
```

如果项目使用可变时间步长，就要把 `deltaTime` 传给更新方法。这样移动速度能按真实时间计算，但逻辑也会变复杂：一次过大的 `deltaTime` 可能让对象越过边界、碰撞体或触发区域，所以物理和关键逻辑通常更适合固定步长。

6. 组件里的更新方法

```cs
public abstract class Component {
    public Entity Entity { get; private set; }
    public bool Enabled { get; set; } = true;

    public void Attach(Entity entity) {
        Entity = entity;
    }

    public virtual void Update() {
    }
}

public class Entity {
    private readonly List<Component> _components = new List<Component>();

    public void AddComponent(Component component) {
        component.Attach(this);
        _components.Add(component);
    }

    public void Update() {
        for (int i = 0; i < _components.Count; i++) {
            if (_components[i].Enabled) {
                _components[i].Update();
            }
        }
    }
}
```

原文提醒过，直接靠 `Entity` 继承层级来实现不同行为，在项目变大后容易变成庞大的类型树。更常见的做法是把 `Update()` 放进组件里：移动组件更新位置，AI 组件更新决策，动画组件更新播放状态。实体只负责组合这些组件。

7. 活跃对象集合

```cs
public class UpdateScheduler {
    private readonly List<IUpdatable> _activeObjects = new List<IUpdatable>();

    public void Activate(IUpdatable obj) {
        if (!_activeObjects.Contains(obj)) {
            _activeObjects.Add(obj);
        }
    }

    public void Deactivate(IUpdatable obj) {
        _activeObjects.Remove(obj);
    }

    public void Update() {
        for (int i = 0; i < _activeObjects.Count; i++) {
            _activeObjects[i].Update();
        }
    }
}
```

如果很多对象暂时不需要更新，比如离屏敌人、休眠机关、未激活的任务对象，就可以维护单独的活跃列表。这样主更新循环只遍历真正需要运行的对象，减少无意义的 `if (!enabled) return` 和缓存浪费。

### 注意点

1. 更新顺序会影响结果

更新方法看起来像“所有对象同时行动”，但底层仍然是顺序遍历。A 在 B 前面更新时，A 看到的是 B 的旧状态，B 看到的却可能是 A 的新状态。如果这会影响游戏结果，可以固定排序规则，或者使用双缓冲让所有对象都读取上一帧状态。

2. 切成每帧会增加状态字段

一个连续行为被拆成每帧一小步后，函数调用结束时局部变量会丢失，所以对象必须保存“下一帧从哪里继续”的信息。状态模式、协程、行为树、脚本字节码都可以帮助管理这种跨帧状态。

3. 增删对象要延迟处理

在遍历列表时直接添加对象，可能让新对象在出现的同一帧就行动；直接删除对象，可能导致索引错位并跳过某些对象。更稳妥的做法是缓存本帧对象数量、反向遍历，或使用待添加/待删除列表。

总结来说，更新方法模式把主循环从“写满所有实体细节”变成“统一调度一批可更新对象”。它简单、朴素，却是游戏引擎最核心的组织方式之一。和游戏循环、组件模式结合起来，它就构成了很多实时游戏的基本骨架。
