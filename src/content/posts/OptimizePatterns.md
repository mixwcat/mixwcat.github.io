---
title: 优化模式
date: 2026-05-16
lastMod: 2026-05-16T00:00:00.000Z
summary: 数据局部性、脏标记、对象池等优化模式学习
category: C#
tags: [C#]
---

## 数据局部性

### 简介

数据局部性主要用于 **让 CPU 更容易连续读取马上要处理的数据**。现代 CPU 很快，但从主内存取数据很慢，所以 CPU 会把一整块相邻内存读进缓存。只要后续代码刚好处理这块缓存里的数据，就会很快；如果代码不停追逐指针，在内存里跳来跳去，就会频繁缓存未命中。

在[原网页教学](https://gpp.tkchu.me/data-locality.html)中，作者强调：优化性能时不能只看代码结构，还要看数据结构。面向对象写法经常把实体、组件、资源分散在堆上，然后通过指针或引用连接起来。抽象很好，但在热点循环里，间接访问可能比业务逻辑本身更贵。

数据局部性的核心思路是：**按处理顺序组织数据，让真正要处理的数据在内存中连续排列**。比如每帧更新 AI 时，不要从实体跳到 AI 组件，再跳到下一个实体；可以把所有 AI 组件放进一个连续数组，直接从头遍历到尾。

### 脚本示例

1. 指针追逐式结构

```cs
public class GameEntity {
    public AIComponent AI { get; }
    public PhysicsComponent Physics { get; }
    public RenderComponent Render { get; }
}

public class World {
    private readonly List<GameEntity> _entities = new List<GameEntity>();

    public void Update() {
        for (int i = 0; i < _entities.Count; i++) {
            _entities[i].AI.Update();
        }

        for (int i = 0; i < _entities.Count; i++) {
            _entities[i].Physics.Update();
        }

        for (int i = 0; i < _entities.Count; i++) {
            _entities[i].Render.Draw();
        }
    }
}
```

这种写法结构清晰，但热点循环里要不断从实体跳到组件。如果实体和组件都分散在堆上，CPU 很难预取下一份数据。

2. 按组件类型连续存储

```cs
public class ComponentWorld {
    private readonly List<AIComponent> _aiComponents = new List<AIComponent>();
    private readonly List<PhysicsComponent> _physicsComponents = new List<PhysicsComponent>();
    private readonly List<RenderComponent> _renderComponents = new List<RenderComponent>();

    public void Update() {
        for (int i = 0; i < _aiComponents.Count; i++) {
            _aiComponents[i].Update();
        }

        for (int i = 0; i < _physicsComponents.Count; i++) {
            _physicsComponents[i].Update();
        }

        for (int i = 0; i < _renderComponents.Count; i++) {
            _renderComponents[i].Draw();
        }
    }
}
```

这相当于把“按实体组织”改成“按系统要处理的数据组织”。AI 系统一次只碰 AI 数据，物理系统一次只碰物理数据，缓存利用率会更高。

3. 活跃数据打包到前面

```cs
public class ParticleSystem {
    private readonly Particle[] _particles = new Particle[10000];
    private int _activeCount;

    public void Update() {
        for (int i = 0; i < _activeCount; i++) {
            _particles[i].Update();
        }
    }

    public void Activate(int index) {
        if (index < _activeCount) return;

        Swap(index, _activeCount);
        _particles[_activeCount].Activate();
        _activeCount++;
    }

    public void Deactivate(int index) {
        if (index >= _activeCount) return;

        _activeCount--;
        _particles[index].Deactivate();
        Swap(index, _activeCount);
    }

    private void Swap(int a, int b) {
        Particle temp = _particles[a];
        _particles[a] = _particles[b];
        _particles[b] = temp;
    }
}
```

如果数组里混着大量未激活对象，每次更新都用 `if (particle.IsActive)` 判断，会浪费缓存和分支预测。把活跃对象集中到数组前段后，循环只处理真正有用的数据。

### 注意点

数据局部性属于优化模式，应该优先用在性能热点上。它常常会牺牲继承、接口、对象封装等抽象能力，所以最好先用分析工具确认瓶颈确实来自缓存不命中或内存访问。对多线程场景也要小心，多个线程频繁写同一条缓存线可能造成伪共享。

---

## 脏标记

### 简介

脏标记主要用于 **延迟重新计算派生数据，避免重复工作**。当原始数据变化时，不立刻更新所有依赖它的结果，而是把结果标记为“脏”。等到真正有人需要这个结果时，如果发现标记是脏的，就重新计算并清除标记；如果不脏，就直接复用缓存结果。

在[原网页教学](https://gpp.tkchu.me/dirty-flag.html)中，作者用场景图举例。一个节点有自身变换 `local`，它的世界变换 `world` 需要结合父节点变换计算。如果父节点移动，所有子节点的世界变换都会变化。每次移动都立刻递归更新整棵子树可能很浪费，尤其是节点在一帧内被移动多次，或者移动后还没来得及渲染就被删除。

脏标记的核心是：**原始数据变化频繁，派生数据计算昂贵，且派生数据不一定每次变化后马上被使用**。它能把多次变化合并成一次计算。

### 脚本示例

1. Transform 占位类

```cs
public struct Transform {
    public static Transform Identity => new Transform();

    public Transform Combine(Transform parent) {
        // 实际项目中通常是矩阵或 TRS 变换组合
        return this;
    }
}
```

2. 场景节点保存脏标记

```cs
public class SceneNode {
    private Transform _local = Transform.Identity;
    private Transform _world = Transform.Identity;
    private bool _dirty = true;

    private readonly List<SceneNode> _children = new List<SceneNode>();

    public void SetLocalTransform(Transform local) {
        _local = local;
        _dirty = true;
    }

    public void AddChild(SceneNode child) {
        _children.Add(child);
    }

    public void Render(Transform parentWorld, bool parentDirty) {
        bool dirty = parentDirty || _dirty;

        if (dirty) {
            _world = _local.Combine(parentWorld);
            _dirty = false;
        }

        Draw(_world);

        for (int i = 0; i < _children.Count; i++) {
            _children[i].Render(_world, dirty);
        }
    }

    private void Draw(Transform world) {
        // 使用 world 变换绘制节点
    }
}
```

父节点移动时，不必立刻递归标脏所有子节点。渲染从根节点往下走时，把 `parentDirty` 传下去即可。只要父节点是脏的，子节点即使自己的 `_dirty` 是 `false`，也会重新计算世界变换。

3. 缓存总重量

```cs
public class Inventory {
    private readonly List<Item> _items = new List<Item>();
    private bool _weightDirty = true;
    private float _cachedWeight;

    public void Add(Item item) {
        _items.Add(item);
        _weightDirty = true;
    }

    public void Remove(Item item) {
        _items.Remove(item);
        _weightDirty = true;
    }

    public float GetTotalWeight() {
        if (_weightDirty) {
            _cachedWeight = 0f;

            for (int i = 0; i < _items.Count; i++) {
                _cachedWeight += _items[i].Weight;
            }

            _weightDirty = false;
        }

        return _cachedWeight;
    }
}
```

如果背包频繁增删，但 UI 不是每次都刷新总重量，脏标记可以避免反复求和。反过来，如果每次增删后马上就要读取总重量，直接增量维护 `_cachedWeight` 可能更简单。

### 注意点

脏标记会把计算推迟到读取时，因此第一次读取可能变慢。如果推迟的是存盘、网络同步、资源上传等高成本操作，还要考虑崩溃、断线或卡顿风险。这个模式适合“多次写，少次读”的派生数据，不适合读写几乎同步发生的简单字段。

---

## 对象池

### 简介

对象池主要用于 **复用一批预先分配好的对象，避免运行时频繁创建和销毁**。游戏里粒子、子弹、音效实例、飘字、临时碰撞对象等，经常在短时间内大量出现又消失。如果每次都 `new` 和释放，可能造成内存碎片、GC 压力或不可控的分配耗时。

在[原网页教学](https://gpp.tkchu.me/object-pool.html)中，作者用粒子系统举例：池在初始化时准备固定数量的粒子，每个粒子有“使用中 / 空闲”状态。需要粒子时从池里取一个空闲对象并初始化；粒子生命周期结束后，把它放回池中。

对象池的核心是：**把动态内存管理换成显式生命周期管理**。这能稳定性能，但也把责任交回给程序员：对象归还时必须清理状态，池满时必须有策略。

### 脚本示例

1. 可池化对象接口

```cs
public interface IPoolable {
    bool InUse { get; }
    void ResetForPool();
}
```

2. 粒子对象

```cs
public class Particle : IPoolable {
    private Vector2 _position;
    private Vector2 _velocity;
    private int _framesLeft;

    public bool InUse => _framesLeft > 0;

    public void Init(Vector2 position, Vector2 velocity, int lifetime) {
        _position = position;
        _velocity = velocity;
        _framesLeft = lifetime;
    }

    public void Update() {
        if (!InUse) return;

        _position += _velocity;
        _framesLeft--;

        if (_framesLeft <= 0) {
            ResetForPool();
        }
    }

    public void ResetForPool() {
        _position = Vector2.Zero;
        _velocity = Vector2.Zero;
        _framesLeft = 0;
    }
}
```

3. 简单对象池

```cs
public class ParticlePool {
    private readonly Particle[] _particles;

    public ParticlePool(int size) {
        _particles = new Particle[size];

        for (int i = 0; i < _particles.Length; i++) {
            _particles[i] = new Particle();
        }
    }

    public Particle Create(Vector2 position, Vector2 velocity, int lifetime) {
        for (int i = 0; i < _particles.Length; i++) {
            if (!_particles[i].InUse) {
                _particles[i].Init(position, velocity, lifetime);
                return _particles[i];
            }
        }

        return null;
    }

    public void Update() {
        for (int i = 0; i < _particles.Length; i++) {
            _particles[i].Update();
        }
    }
}
```

这个版本容易理解，但创建对象时需要扫描数组。池很大或接近满时，查找空位可能变慢。

4. 使用空闲栈加速获取

```cs
public class FastParticlePool {
    private readonly Particle[] _particles;
    private readonly Stack<int> _freeIndices = new Stack<int>();

    public FastParticlePool(int size) {
        _particles = new Particle[size];

        for (int i = 0; i < size; i++) {
            _particles[i] = new Particle();
            _freeIndices.Push(i);
        }
    }

    public Particle Create(Vector2 position, Vector2 velocity, int lifetime) {
        if (_freeIndices.Count == 0) {
            return null;
        }

        int index = _freeIndices.Pop();
        Particle particle = _particles[index];
        particle.Init(position, velocity, lifetime);
        return particle;
    }

    public void Release(int index) {
        _particles[index].ResetForPool();
        _freeIndices.Push(index);
    }
}
```

原文里用空闲链表把空闲对象串起来，这里用 `Stack<int>` 表达同一思路：获取空闲对象变成 O(1)，不需要每次扫描整个池。

### 注意点

池太小会取不到对象，池太大又浪费内存。池满时可以选择不创建新对象、覆盖最不重要的旧对象、扩容，或者把关键对象和非关键对象放进不同池中。对象归还池时一定要清理引用和状态，否则容易出现旧数据污染、新对象持有过期资源、对象被重复释放等问题。

---

## 空间分区

### 简介

空间分区主要用于 **根据位置组织对象，让附近查询更快**。很多游戏系统都需要问“某个位置附近有什么对象”：近战攻击、碰撞检测、范围技能、AI 感知、声音衰减、聊天频道等。如果每次都拿所有对象两两比较，复杂度很容易变成 O(n²)。

在[原网页教学](https://gpp.tkchu.me/spatial-partition.html)中，作者用 RTS 单位互相攻击举例。最简单的做法是遍历所有单位对，检查它们是否足够近。但单位数量一多，这种双重循环会失控。空间分区的做法是把世界划分成格子、树或其他空间结构，对象按照位置放进去。查询附近对象时，只看目标所在区域和少量相邻区域。

空间分区的核心是：**用额外内存和维护成本，换取更快的位置查询**。对象越多、附近查询越频繁，收益越明显；对象很少时，直接遍历可能更简单。

### 脚本示例

1. 单位对象

```cs
public class Unit {
    public Vector2 Position { get; private set; }

    private readonly SpatialGrid _grid;

    public Unit(SpatialGrid grid, Vector2 position) {
        _grid = grid;
        Position = position;
        _grid.Add(this);
    }

    public void MoveTo(Vector2 position) {
        Vector2 oldPosition = Position;
        Position = position;
        _grid.Move(this, oldPosition, position);
    }
}
```

对象移动时，必须通知空间结构更新位置。否则对象会留在旧格子里，查询结果就会错误。

2. 固定网格

```cs
public class SpatialGrid {
    private const int CellSize = 20;
    private const int Width = 50;
    private const int Height = 50;

    private readonly List<Unit>[,] _cells = new List<Unit>[Width, Height];

    public SpatialGrid() {
        for (int x = 0; x < Width; x++) {
            for (int y = 0; y < Height; y++) {
                _cells[x, y] = new List<Unit>();
            }
        }
    }

    public void Add(Unit unit) {
        Vector2Int cell = GetCell(unit.Position);
        _cells[cell.X, cell.Y].Add(unit);
    }

    public void Move(Unit unit, Vector2 oldPosition, Vector2 newPosition) {
        Vector2Int oldCell = GetCell(oldPosition);
        Vector2Int newCell = GetCell(newPosition);

        if (oldCell == newCell) {
            return;
        }

        _cells[oldCell.X, oldCell.Y].Remove(unit);
        _cells[newCell.X, newCell.Y].Add(unit);
    }

    private Vector2Int GetCell(Vector2 position) {
        int x = Math.Clamp((int)(position.X / CellSize), 0, Width - 1);
        int y = Math.Clamp((int)(position.Y / CellSize), 0, Height - 1);
        return new Vector2Int(x, y);
    }
}
```

固定网格是最简单的空间分区。它实现容易、移动对象时更新便宜，但如果对象分布非常不均匀，某些格子可能仍然拥挤，空格子也会浪费内存。

3. 查询附近单位

```cs
public List<Unit> QueryNearby(Vector2 position, float radius) {
    List<Unit> result = new List<Unit>();
    Vector2Int center = GetCell(position);
    int cellRadius = (int)Math.Ceiling(radius / CellSize);
    float radiusSquared = radius * radius;

    for (int x = center.X - cellRadius; x <= center.X + cellRadius; x++) {
        for (int y = center.Y - cellRadius; y <= center.Y + cellRadius; y++) {
            if (x < 0 || y < 0 || x >= Width || y >= Height) continue;

            List<Unit> cell = _cells[x, y];

            for (int i = 0; i < cell.Count; i++) {
                Unit unit = cell[i];
                Vector2 offset = unit.Position - position;

                if (offset.LengthSquared() <= radiusSquared) {
                    result.Add(unit);
                }
            }
        }
    }

    return result;
}
```

查询半径小于或接近格子大小时，只需要检查当前格子和周围少数格子。为了避免边界问题，不能只查当前格子；两个单位可能分别在相邻格子里，但距离仍然很近。

4. 处理近战碰撞

```cs
public void HandleMelee(float attackDistance) {
    float distanceSquared = attackDistance * attackDistance;

    for (int x = 0; x < Width; x++) {
        for (int y = 0; y < Height; y++) {
            List<Unit> cell = _cells[x, y];

            for (int i = 0; i < cell.Count; i++) {
                Unit a = cell[i];
                CheckAgainstList(a, cell, i + 1, distanceSquared);

                if (x > 0) CheckAgainstList(a, _cells[x - 1, y], 0, distanceSquared);
                if (y > 0) CheckAgainstList(a, _cells[x, y - 1], 0, distanceSquared);
                if (x > 0 && y > 0) CheckAgainstList(a, _cells[x - 1, y - 1], 0, distanceSquared);
                if (x > 0 && y < Height - 1) CheckAgainstList(a, _cells[x - 1, y + 1], 0, distanceSquared);
            }
        }
    }
}

private void CheckAgainstList(Unit a, List<Unit> others, int startIndex, float distanceSquared) {
    for (int i = startIndex; i < others.Count; i++) {
        Unit b = others[i];
        Vector2 offset = a.Position - b.Position;

        if (offset.LengthSquared() <= distanceSquared) {
            HandleAttack(a, b);
        }
    }
}
```

同一格子内只检查当前单位后面的对象，避免 A-B 和 B-A 重复处理。相邻格子也只检查一半方向，原因同样是避免重复。

### 注意点

格子大小很关键：格子太大，每格对象太多，查询退化；格子太小，需要检查的格子数量和维护成本会上升。固定网格适合分布比较均匀、移动频繁的对象；四叉树、八叉树、BSP、k-d 树等层次结构更适合稀疏或密度变化大的世界，但移动对象时维护成本更高。

优化模式的共同前提是：先确认性能瓶颈，再引入复杂度。数据局部性优化内存访问，脏标记减少重复计算，对象池减少分配和碎片，空间分区减少位置查询范围。它们都不是“更优雅”的抽象，而是明确用代码复杂度、内存或灵活性换稳定帧率。
