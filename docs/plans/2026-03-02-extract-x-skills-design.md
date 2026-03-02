# 设计：拆分 X 技能到 yuchen-skills 仓库

日期：2026-03-02

## 背景

`wqq-wechat-skills` 目前包含四个技能：
- `wqq-wechat-article` — 微信公众号教程文章生成
- `wqq-image-gen` — AI 图片生成后端
- `wqq-x-bookmarks` — 导出 X 书签为 Markdown
- `wqq-x-to-md` — 将 X/Twitter 链接转为本地 Markdown

其中 X 相关技能（`wqq-x-bookmarks`、`wqq-x-to-md`）及其共享运行时（`shared/x-runtime/`）服务于媒体平台搜索场景，与微信公众号文章工作流是完全不同的领域。拆分后提升内聚性。

## 目标

创建新仓库 `~/Code/Personal/yuchen-skills`，包含 X 平台相关技能；清理 `wqq-wechat-skills` 使其仅保留微信相关技能。

## 方法

**文件拷贝，不保留 git 历史。** 新仓库 `git init` 后全新开始。

**执行策略：先建后清。** 新仓库搭建并验证通过后，再从旧仓库删除文件。

## 关键决策

| 决策 | 选择 |
|------|------|
| 技能目录命名 | 去掉 `wqq-` 前缀：`x-bookmarks`、`x-to-md` |
| `output.ts` 跨技能依赖 | 从 `x-bookmarks/scripts/` 移到 `shared/x-runtime/output.ts` |
| x-to-md 对 wqq-wechat-article 的 Next Step 引用 | 删除 |
| Git 历史 | 不保留，全新仓库 |
| 共享工具（retry、arg-parser、wqq-skills-env） | 复制到新仓库 |

## 新仓库结构：yuchen-skills

```
~/Code/Personal/yuchen-skills/
├── .claude-plugin/
│   └── marketplace.json        # 注册 x-bookmarks 和 x-to-md
├── .gitignore
├── CLAUDE.md                   # 仓库说明（中文）
├── package.json                # name: yuchen-skills
├── tsconfig.json
├── bun.lock
└── skills/
    ├── shared/
    │   ├── retry.ts
    │   ├── retry.test.ts
    │   ├── arg-parser.ts
    │   ├── arg-parser.test.ts
    │   ├── wqq-skills-env.ts
    │   └── x-runtime/
    │       ├── (现有 15 个源文件 + 8 个测试文件)
    │       ├── output.ts       # ← 从 x-bookmarks/scripts/ 移入
    │       └── output.test.ts  # ← 从 x-bookmarks/scripts/ 移入
    ├── x-bookmarks/            # ← 原 wqq-x-bookmarks
    │   ├── SKILL.md
    │   ├── README.md
    │   └── scripts/
    │       ├── main.ts
    │       └── ...（output.ts 已移走，其余不变）
    └── x-to-md/                # ← 原 wqq-x-to-md
        ├── SKILL.md            # 删除 Next Step 引用
        └── scripts/
            ├── main.ts
            ├── summarize.ts
            └── types.ts
```

### Import 路径变化

新仓库中需要更新的 import：

1. **目录重命名导致的路径变化**：
   - `x-bookmarks` 和 `x-to-md` 内部引用 `../../shared/` 的路径不变（相对位置一样）

2. **output.ts 移动导致的路径变化**：
   - `x-bookmarks/scripts/main.ts` 等文件中 `./output` → `../../shared/x-runtime/output`
   - `x-to-md/scripts/main.ts` 中 `../../wqq-x-bookmarks/scripts/output` → `../../shared/x-runtime/output`

## 旧仓库清理：wqq-wechat-skills

### 删除的文件

- `skills/wqq-x-bookmarks/` — 整个目录
- `skills/wqq-x-to-md/` — 整个目录
- `skills/shared/x-runtime/` — 整个目录

### 需要更新的文件

| 文件 | 修改内容 |
|------|----------|
| `CLAUDE.md` | 移除 X 相关段落和项目结构中的 x-runtime |
| `README.md` | 移除 X 技能说明 |
| `scripts/smoke-test.sh` | 删除 X 技能的 smoke test（原第 7-9 项） |
| `.gitignore` | 移除 `wqq-x-bookmarks-output/` |
| `skills/shared/wqq-skills-env.ts` | 移除 `getXOutputBaseDir()` 函数 |

### 清理后结构

```
skills/
  shared/
    retry.ts
    arg-parser.ts
    wqq-skills-env.ts   # 移除 getXOutputBaseDir()
  wqq-image-gen/
  wqq-wechat-article/
```

## 执行顺序

### 阶段一：搭建 yuchen-skills

1. `git init` 新仓库
2. 拷贝 `shared/`、`wqq-x-bookmarks/`、`wqq-x-to-md/`
3. 重命名技能目录（去掉 `wqq-` 前缀）
4. 将 `output.ts` + `output.test.ts` 从 `x-bookmarks/scripts/` 移到 `shared/x-runtime/`
5. 更新所有受影响的 import 路径
6. 创建配置文件：`package.json`、`tsconfig.json`、`CLAUDE.md`、`.gitignore`、`marketplace.json`
7. `bun install`
8. 验证：`bun run typecheck` + `bun run test`
9. 初始提交

### 阶段二：清理 wqq-wechat-skills

10. 删除 X 相关文件和目录
11. 更新 `CLAUDE.md`、`README.md`、`smoke-test.sh`、`.gitignore`、`wqq-skills-env.ts`
12. 验证：`bun run typecheck` + `bun run test`
13. 提交清理

## 验证标准

- `yuchen-skills`：`bun run typecheck` 无错误，`bun run test` 全部通过
- `wqq-wechat-skills`：`bun run typecheck` 无错误，`bun run test` 全部通过
- 两个仓库之间无文件引用
- `marketplace.json` 正确注册各自的技能
