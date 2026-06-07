---
title: 设计模式
date: 2026-05-09
lastMod: 2026-09-06T00:00:00.000Z
summary: 命令模式、观察者模式、状态模式等设计模式学习
category: C#
tags: [C#]
---

## 一、命令模式

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

---

## 二、享元模式

### 简介

享元模式主要用于 **减少大量相似对象带来的内存和传输开销**。它的核心做法是：把对象中可以共享、不依赖具体实例的部分拆出来，统一保存为一个共享对象；每个实例只保留自己独有的状态。

在[原网页教学](https://gpp.tkchu.me/flyweight.html)示例中，森林里可能有成千上万棵树，但它们大多使用同一套网格、树皮纹理、树叶纹理；真正不同的只是位置、缩放、颜色等参数。享元模式就是把这些公共资源抽成 `TreeModel`，每棵树只引用它，而不是重复保存一份模型数据。

享元对象通常应该是 **不可变对象**。因为它会被多个实例共享，一旦修改共享对象，所有引用它的地方都会同时变化。如果某些数据必须因实例而异，就不要放进享元对象中，而应该作为外部状态保存在具体实例或上下文里。

### 脚本示例

1. Terrain 享元对象

```cs
public class Terrain {
    public int MovementCost { get; }
    public bool IsWater { get; }
    public string TexturePath { get; }

    public Terrain(int movementCost, bool isWater, string texturePath) {
        MovementCost = movementCost;
        IsWater = isWater;
        TexturePath = texturePath;
    }
}
```

2. World 保存共享地形实例

在这个案例中，虽然全图有大量的grass，但是所有grass指向同一个对象，最终只把这一个模型数据交给了GPU渲染。

```cs
public class World {
    private const int Width = 100;
    private const int Height = 100;

    private readonly Terrain _grass = new Terrain(1, false, "textures/grass.png");
    private readonly Terrain _hill = new Terrain(3, false, "textures/hill.png");
    private readonly Terrain _river = new Terrain(2, true, "textures/river.png");

    private readonly Terrain[,] _tiles = new Terrain[Width, Height];

    public void GenerateTerrain() {
        for (int x = 0; x < Width; x++) {
            for (int y = 0; y < Height; y++) {
                _tiles[x, y] = Random.Range(0, 10) == 0 ? _hill : _grass;
            }
        }

        int riverX = Random.Range(0, Width);
        for (int y = 0; y < Height; y++) {
            _tiles[riverX, y] = _river;
        }
    }

    public Terrain GetTile(int x, int y) {
        return _tiles[x, y];
    }
}
```

3. 读取地形数据

```cs
public class PlayerMovement {
    private World _world;

    public void MoveTo(int x, int y) {
        Terrain terrain = _world.GetTile(x, y);

        if (terrain.IsWater) {
            // 没有船时禁止进入水域
            return;
        }

        int cost = terrain.MovementCost;
        ConsumeActionPoint(cost);
    }

    private void ConsumeActionPoint(int cost) {
        // 扣除行动点
    }
}
```

4. 树木对象的享元拆分

```cs
public class TreeModel {
    public Mesh Mesh { get; }
    public Texture Bark { get; }
    public Texture Leaves { get; }

    public TreeModel(Mesh mesh, Texture bark, Texture leaves) {
        Mesh = mesh;
        Bark = bark;
        Leaves = leaves;
    }
}

public class Tree {
    private TreeModel _model;

    private Vector3 _position;
    private float _height;
    private float _thickness;
    private Color _barkTint;
    private Color _leafTint;

    public Tree(TreeModel model, Vector3 position, float height, float thickness) {
        _model = model;
        _position = position;
        _height = height;
        _thickness = thickness;
    }
}
```

这里的 `TreeModel` 就是享元对象，保存网格和贴图这些昂贵资源；`Tree` 保存位置、大小、颜色这些每棵树独有的外部状态。渲染大量树木时，可以只上传一次模型数据，再把每棵树的实例参数交给 GPU 做实例化渲染。

---

## 三、观察者模式

### 简介

观察者模式主要用于 **解耦事件发生者和事件响应者**。被观察者只负责在某件事发生时发出通知，不需要知道谁会处理这个通知；观察者自己注册到被观察者上，在收到通知后执行各自的逻辑。

在[原网页教学](https://gpp.tkchu.me/observer.html)中，作者用成就系统举例：物理系统能判断角色是否从桥上掉下去，但它不应该直接调用成就系统的函数。更好的做法是物理系统只发出“实体开始下落”的通知，成就系统、音频系统、任务系统等对这件事感兴趣的模块自己去监听。

需要注意的是，经典观察者模式通常是 **同步通知**：被观察者会直接遍历观察者列表并调用它们的方法，所以观察者里的逻辑应该尽快结束。如果响应逻辑很重，或者涉及线程、锁、加载资源等操作，更适合把事件推入队列，交给事件队列异步处理。另外，观察者不用时要及时取消注册，否则被观察者持有它的引用，容易产生无效监听者和内存泄漏。

### 脚本示例

1. 事件类型

```cs
public enum GameEvent {
    EntityFell,
    EntityLanded,
    HeroEnteredBridge,
    HeroLeftBridge
}
```

2. Observer 观察者接口

```cs
public interface IObserver {
    void OnNotify(GameActor actor, GameEvent gameEvent);
}
```

3. Subject 被观察者基类

```cs
public class Subject {
    private readonly List<IObserver> _observers = new List<IObserver>();

    public void AddObserver(IObserver observer) {
        if (!_observers.Contains(observer)) {
            _observers.Add(observer);
        }
    }

    public void RemoveObserver(IObserver observer) {
        _observers.Remove(observer);
    }

    protected void Notify(GameActor actor, GameEvent gameEvent) {
        for (int i = 0; i < _observers.Count; i++) {
            _observers[i].OnNotify(actor, gameEvent);
        }
    }
}
```

4. PhysicsSystem 发出通知

```cs
public class PhysicsSystem : Subject {
    public void UpdateActor(GameActor actor) {
        bool wasOnSurface = actor.IsOnSurface;

        actor.ApplyGravity();
        actor.UpdatePosition();

        if (wasOnSurface && !actor.IsOnSurface) {
            Notify(actor, GameEvent.EntityFell);
        }
    }
}
```

5. AchievementSystem 响应通知

```cs
public class AchievementSystem : IObserver {
    private bool _heroIsOnBridge;

    public void OnNotify(GameActor actor, GameEvent gameEvent) {
        if (!actor.IsHero) return;

        switch (gameEvent) {
            case GameEvent.HeroEnteredBridge:
                _heroIsOnBridge = true;
                break;

            case GameEvent.HeroLeftBridge:
                _heroIsOnBridge = false;
                break;

            case GameEvent.EntityFell:
                if (_heroIsOnBridge) {
                    Unlock("FellOffBridge");
                }
                break;
        }
    }

    private void Unlock(string achievementId) {
        // 解锁成就
    }
}
```

6. 注册和取消注册

```cs
public class GameLoop : MonoBehaviour {
    private PhysicsSystem _physicsSystem;
    private AchievementSystem _achievementSystem;

    void Start() {
        _physicsSystem = new PhysicsSystem();
        _achievementSystem = new AchievementSystem();

        _physicsSystem.AddObserver(_achievementSystem);
    }

    void OnDestroy() {
        _physicsSystem.RemoveObserver(_achievementSystem);
    }
}
```

这里的 `PhysicsSystem` 只知道自己发出了 `EntityFell` 事件，不知道成就系统会不会处理它；`AchievementSystem` 也不需要侵入物理系统内部，只要注册为观察者即可。多个系统可以同时监听同一个被观察者，例如音频系统也可以监听 `EntityFell` 来播放坠落音效。

---

## 四、原型模式

### 简介

原型模式主要用于 **通过复制已有对象来创建新对象**。如果某类对象的初始化成本比较高，或者它的配置项很多、组合很复杂，就可以先准备一个“原型对象”，之后需要新实例时直接复制它，而不是重新走一遍构造流程。

在[原网页教学](https://gpp.tkchu.me/prototype.html)中提到了 GoF 原型模式：基类提供 `Clone()` 方法，子类自己决定怎样复制自身。这样调用方不需要知道具体类型，只要拿到一个原型，就能复制出同类型对象。

不过在游戏开发里，原型模式更常见的形态是 **数据原型**。比如游戏里有一堆怪物，它们都有生命值、攻击力、模型、掉落物等配置。如果每个怪物都把所有字段完整写一遍，会产生大量重复数据。更好的方式是先定义一个基础怪物原型，然后让其他怪物通过 `prototype` 字段继承它，只覆盖自己不同的属性。

原型模式的关键风险在于 **深拷贝和浅拷贝**。如果对象里有引用类型字段，浅拷贝只会复制引用，两个对象可能会共享同一个列表、组件或配置对象。复制后如果某一方修改了共享数据，另一方也会受到影响。因此，可变引用数据要么做深拷贝，要么设计成只读共享资源。

### 脚本示例

1. Prototype 原型接口

```cs
public abstract class MonsterPrototype {
    public abstract MonsterPrototype Clone();
}
```

2. Ghost 复制自身

```cs
public class Ghost : MonsterPrototype {
    public int Health { get; private set; }
    public int Speed { get; private set; }
    public string SkillName { get; private set; }

    public Ghost(int health, int speed, string skillName) {
        Health = health;
        Speed = speed;
        SkillName = skillName;
    }

    public override MonsterPrototype Clone() {
        return new Ghost(Health, Speed, SkillName);
    }
}
```

3. Spawner 使用原型生成怪物

```cs
public class Spawner {
    private MonsterPrototype _prototype;

    public Spawner(MonsterPrototype prototype) {
        _prototype = prototype;
    }

    public MonsterPrototype Spawn() {
        return _prototype.Clone();
    }
}
```

这样 `Spawner` 不需要知道自己生成的是 `Ghost`、`Demon` 还是其他怪物，只负责复制传入的原型对象。之后想换生成物，只要替换 `_prototype` 即可。

4. 数据原型配置

```json
{
  "orc": {
    "health": 20,
    "attack": 3,
    "model": "models/orc.glb",
    "drops": ["coin"]
  },
  "orc_warrior": {
    "prototype": "orc",
    "health": 40,
    "attack": 8,
    "drops": ["coin", "iron_axe"]
  },
  "orc_shaman": {
    "prototype": "orc",
    "health": 25,
    "attack": 4,
    "skill": "lightning",
    "drops": ["coin", "mana_stone"]
  }
}
```

5. 解析数据原型

```cs
public class MonsterData {
    public string PrototypeId;
    public int Health;
    public int Attack;
    public string Model;
    public List<string> Drops = new List<string>();
    public string Skill;

    public MonsterData Clone() {
        return new MonsterData {
            PrototypeId = PrototypeId,
            Health = Health,
            Attack = Attack,
            Model = Model,
            Drops = new List<string>(Drops),
            Skill = Skill
        };
    }
}
```

6. 继承并覆盖字段

```cs
public class MonsterDatabase {
    private Dictionary<string, MonsterData> _rawData;
    private Dictionary<string, MonsterData> _resolvedData = new Dictionary<string, MonsterData>();

    public MonsterData GetMonsterData(string id) {
        if (_resolvedData.TryGetValue(id, out MonsterData cached)) {
            return cached;
        }

        MonsterData data = _rawData[id];

        if (!string.IsNullOrEmpty(data.PrototypeId)) {
            MonsterData parent = GetMonsterData(data.PrototypeId).Clone();
            ApplyOverride(parent, data);
            data = parent;
        }

        _resolvedData[id] = data;
        return data;
    }

    private void ApplyOverride(MonsterData target, MonsterData overrideData) {
        if (overrideData.Health > 0) target.Health = overrideData.Health;
        if (overrideData.Attack > 0) target.Attack = overrideData.Attack;
        if (!string.IsNullOrEmpty(overrideData.Model)) target.Model = overrideData.Model;
        if (overrideData.Drops.Count > 0) target.Drops = new List<string>(overrideData.Drops);
        if (!string.IsNullOrEmpty(overrideData.Skill)) target.Skill = overrideData.Skill;
    }
}
```

这里的 `orc` 就是数据原型，`orc_warrior` 和 `orc_shaman` 只写和默认值不同的字段。相比直接在代码里写继承类，这种方式更适合给策划或关卡编辑器使用，也更方便热更新和内容扩展。

---

## 五、单例模式

### 简介

单例模式的目标是 **保证一个类只有一个实例，并提供访问这个实例的全局入口**。典型例子是文件系统、日志系统、音频系统这类看起来“全局只有一个就够了”的对象。

在[原网页教学](https://gpp.tkchu.me/singleton.html)中，作者对单例模式的态度比较谨慎，甚至可以说这一章主要是在讲“如何避免滥用单例”。单例确实能解决两个问题：限制实例数量，以及让代码很容易拿到这个实例。但这两个问题不一定总是要绑定在一起。很多时候我们只是想要方便访问，却无意间把类也限制成了只能有一个实例。

单例最大的问题是它本质上仍然是 **全局状态**。任何地方都可以访问它，也就意味着任何地方都可能修改它。代码会变得更难理解、更容易产生隐藏耦合，也更不利于测试和多线程。比如物理系统里直接调用 `AudioManager.Instance.Play()`，短期看很方便，长期看就把物理模块和音频模块绑在了一起。

惰性初始化也是游戏里需要注意的点。单例常常在第一次访问时创建自己，但游戏系统初始化可能涉及加载资源、分配内存、创建设备对象等耗时操作。如果第一次访问发生在战斗或过场中，就可能造成卡顿。因此游戏里更常见的做法是在启动流程中明确初始化系统，而不是让单例在不可控的时间点偷偷初始化。

### 脚本示例

1. 典型单例写法

```cs
public class FileSystem {
    private static FileSystem _instance;

    public static FileSystem Instance {
        get {
            if (_instance == null) {
                _instance = new FileSystem();
            }

            return _instance;
        }
    }

    private FileSystem() {
    }

    public string ReadFile(string path) {
        // 读取文件
        return "";
    }

    public void WriteFile(string path, string contents) {
        // 写入文件
    }
}
```

这种写法通过私有构造函数避免外部 `new FileSystem()`，再通过 `Instance` 提供全局访问点。它简单直接，但也把“唯一实例”和“全局访问”强行绑在了一起。

2. 线程安全的 C# 写法

```cs
public sealed class AudioSystem {
    private static readonly Lazy<AudioSystem> _instance = new Lazy<AudioSystem>(() => new AudioSystem());

    public static AudioSystem Instance => _instance.Value;

    private AudioSystem() {
    }

    public void Play(string soundName) {
        // 播放音效
    }
}
```

`Lazy<T>` 可以保证实例只在第一次访问时创建，并且默认是线程安全的。不过这只解决了“创建过程”的线程安全，不代表 `AudioSystem` 里面所有方法都自动线程安全。

3. 只限制实例数量，不提供全局访问

```cs
public class FileSystem {
    private static bool _created;

    public FileSystem() {
        if (_created) {
            throw new InvalidOperationException("FileSystem can only have one instance.");
        }

        _created = true;
    }

    public void Dispose() {
        _created = false;
    }
}
```

如果真正需要的是“只能创建一个文件系统”，可以只检查实例数量，而不提供 `FileSystem.Instance`。这样创建和持有它的权力仍然可以留在启动流程、`Game`、`World` 或依赖注入容器中。

4. 通过参数传入依赖

```cs
public class LevelLoader {
    private readonly FileSystem _fileSystem;

    public LevelLoader(FileSystem fileSystem) {
        _fileSystem = fileSystem;
    }

    public string LoadLevel(string path) {
        return _fileSystem.ReadFile(path);
    }
}
```

这种方式看起来比 `FileSystem.Instance.ReadFile(path)` 麻烦一点，但依赖关系是明确的。测试时也可以传入假的 `FileSystem`，而不是被全局单例卡住。

5. 从已有上下文获取服务

```cs
public class Game {
    public FileSystem FileSystem { get; }
    public AudioSystem AudioSystem { get; }
    public LogSystem LogSystem { get; }

    public Game(FileSystem fileSystem, AudioSystem audioSystem, LogSystem logSystem) {
        FileSystem = fileSystem;
        AudioSystem = audioSystem;
        LogSystem = logSystem;
    }
}

public class Explosion {
    public void PlayEffect(Game game) {
        game.AudioSystem.Play("explosion");
        game.LogSystem.Write("Explosion played.");
    }
}
```

如果项目里已经有 `Game`、`World`、`SceneContext` 这种天然上下文，可以让它持有各个系统，减少到处散落的单例。这样至少只有一个入口是全局的，具体系统仍然是普通对象。

总的来说，单例可以用，但要先问清楚自己到底需要什么：是“只能有一个实例”，还是“方便访问”，还是“跨系统共享服务”。很多时候，静态类、启动时显式初始化、依赖注入、上下文对象或服务定位器会比直接写单例更清晰。

---

## 六、状态模式

### 简介

状态模式主要用于 **让对象在不同内部状态下表现出不同的行为**。它常和有限状态机一起使用：对象同时只处于一个状态，输入或事件到来时，根据当前状态决定是否切换到另一个状态。

在[原网页教学](https://gpp.tkchu.me/state.html)横版2D动作游戏示例中，最开始只处理跳跃时，一个 `isJumping` 布尔值似乎够用；之后加入下蹲、跳斩、蓄力、落地等行为，就会出现一堆互相牵制的布尔字段。很多组合其实是非法的，比如角色不应该同时处于“站立”和“跳跃”。这时把状态收拢成一个明确的 `State`，就比散落的布尔标记可靠。

状态机的核心是三个东西：一组状态、当前状态、输入触发的状态转移。对于简单逻辑，`enum + switch` 就已经足够；当每个状态有自己的数据和更新逻辑时，可以进一步使用 GoF 状态模式，把每个状态写成独立类，让主对象把输入和更新委托给当前状态。

状态模式的好处是把同一状态相关的代码和数据放在一起。例如“下蹲蓄力”的 `chargeTime` 只属于下蹲状态，就不应该长期挂在角色本体上。代价是类数量会增加，状态切换也可能带来对象分配。如果状态没有自己的字段，可以用静态状态对象复用；如果状态有实例数据，就要为每个角色创建自己的状态实例。

### 脚本示例

1. 输入类型

```cs
public enum InputType {
    PressJump,
    PressDown,
    ReleaseDown,
    Land
}
```

2. 简单 enum 状态机

```cs
public enum HeroineStateType {
    Standing,
    Jumping,
    Ducking,
    Diving
}

public class Heroine {
    private HeroineStateType _state = HeroineStateType.Standing;
    private int _chargeTime;

    public void HandleInput(InputType input) {
        switch (_state) {
            case HeroineStateType.Standing:
                if (input == InputType.PressJump) {
                    _state = HeroineStateType.Jumping;
                    Jump();
                    SetGraphics("jump");
                } else if (input == InputType.PressDown) {
                    _state = HeroineStateType.Ducking;
                    _chargeTime = 0;
                    SetGraphics("duck");
                }
                break;

            case HeroineStateType.Jumping:
                if (input == InputType.PressDown) {
                    _state = HeroineStateType.Diving;
                    SetGraphics("dive");
                } else if (input == InputType.Land) {
                    _state = HeroineStateType.Standing;
                    SetGraphics("stand");
                }
                break;

            case HeroineStateType.Ducking:
                if (input == InputType.ReleaseDown) {
                    _state = HeroineStateType.Standing;
                    SetGraphics("stand");
                }
                break;
        }
    }

    public void Update() {
        if (_state == HeroineStateType.Ducking) {
            _chargeTime++;

            if (_chargeTime > 60) {
                SuperBomb();
            }
        }
    }

    private void Jump() {}
    private void SetGraphics(string imageName) {}
    private void SuperBomb() {}
}
```

这种写法比多个布尔值安全，因为角色永远只会处于一个枚举状态。不过随着状态自己的数据和逻辑变多，`Heroine` 还是会越来越胖。

3. 状态接口

```cs
public abstract class HeroineState {
    public virtual void Enter(Heroine heroine) {}
    public virtual void Exit(Heroine heroine) {}
    public virtual HeroineState HandleInput(Heroine heroine, InputType input) {
        return null;
    }
    public virtual void Update(Heroine heroine) {}
}
```

`HandleInput()` 返回新的状态对象；如果返回 `null`，表示继续停留在当前状态。`Enter()` 用于入口行为，例如切换贴图；`Exit()` 用于退出行为，例如清理特效或取消计时。

4. Heroine 委托给当前状态

```cs
public class Heroine {
    private HeroineState _state;

    public Heroine() {
        ChangeState(new StandingState());
    }

    public void HandleInput(InputType input) {
        HeroineState nextState = _state.HandleInput(this, input);

        if (nextState != null) {
            ChangeState(nextState);
        }
    }

    public void Update() {
        _state.Update(this);
    }

    public void ChangeState(HeroineState nextState) {
        if (_state != null) {
            _state.Exit(this);
        }

        _state = nextState;
        _state.Enter(this);
    }

    public void Jump() {}
    public void SetGraphics(string imageName) {}
    public void SuperBomb() {}
}
```

主对象不再关心每个状态如何响应输入，只把输入交给当前状态。切换状态时统一调用退出和进入逻辑，避免贴图、音效、计时器等初始化代码散落在各个转移分支里。

5. StandingState 站立状态

```cs
public class StandingState : HeroineState {
    public override void Enter(Heroine heroine) {
        heroine.SetGraphics("stand");
    }

    public override HeroineState HandleInput(Heroine heroine, InputType input) {
        if (input == InputType.PressJump) {
            heroine.Jump();
            return new JumpingState();
        }

        if (input == InputType.PressDown) {
            return new DuckingState();
        }

        return null;
    }
}
```

6. DuckingState 下蹲状态

```cs
public class DuckingState : HeroineState {
    private int _chargeTime;

    public override void Enter(Heroine heroine) {
        _chargeTime = 0;
        heroine.SetGraphics("duck");
    }

    public override HeroineState HandleInput(Heroine heroine, InputType input) {
        if (input == InputType.ReleaseDown) {
            return new StandingState();
        }

        return null;
    }

    public override void Update(Heroine heroine) {
        _chargeTime++;

        if (_chargeTime > 60) {
            heroine.SuperBomb();
        }
    }
}
```

这里的 `_chargeTime` 只存在于 `DuckingState` 中，角色离开下蹲状态后，这个状态数据也随之结束。状态对象把“下蹲时如何进入、如何响应输入、每帧如何更新”都收在了一处。

7. 静态状态对象

```cs
public static class HeroineStates {
    public static readonly HeroineState Standing = new StandingState();
    public static readonly HeroineState Jumping = new JumpingState();
    public static readonly HeroineState Diving = new DivingState();
}
```

如果某些状态没有实例字段，可以把它们做成静态共享对象，避免频繁 `new`。这其实就是享元模式的思路。需要注意的是，像 `DuckingState` 这种有 `_chargeTime` 的状态不能被多个角色共享，否则多个角色会共用同一个蓄力时间。

8. 并发状态机

```cs
public class Heroine {
    private HeroineState _movementState;
    private HeroineState _equipmentState;

    public void HandleInput(InputType input) {
        HandleMovementInput(input);
        HandleEquipmentInput(input);
    }

    private void HandleMovementInput(InputType input) {
        HeroineState nextState = _movementState.HandleInput(this, input);
        if (nextState != null) _movementState = nextState;
    }

    private void HandleEquipmentInput(InputType input) {
        HeroineState nextState = _equipmentState.HandleInput(this, input);
        if (nextState != null) _equipmentState = nextState;
    }
}
```

当角色同时有“移动状态”和“装备状态”时，不要把它们硬塞进同一个状态机，否则会出现 `站立持枪`、`跳跃持枪`、`下蹲持枪` 这种组合爆炸。拆成两个状态机后，状态数量从 `n * m` 降到 `n + m`。

原文最后还提到了分层状态机和下推自动机。分层状态机适合复用一组状态的公共行为，例如站立、行走、奔跑都属于“在地面上”，可以共享跳跃和下蹲逻辑；下推自动机适合临时状态，例如角色开火时压入 `FiringState`，动画结束后弹出它，自动回到开火前的状态。
