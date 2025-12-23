# 囤囤小兄许 （Hidey-hole）

囤囤小兄许（Hidey-hole） 是一个基于 Next.js 16 和 Supabase 构建的个人角色卡管理与聊天系统。它专为管理SillyTavern的角色卡而设计，并提供了一个现代化的 Web 界面来浏览、编辑、分析和与角色互动。

## ✨ 核心特性

*   **角色卡管理**:
    *   支持上传 PNG (v2/v3) 和 JSON 格式的角色卡。
    *   自动解析元数据（名称、描述、性格、First Message 等）。
    *   支持批量管理（移动分类、批量下载 ZIP、删除）。
    *   回收站机制，防止误删。
    *   版本控制：每次更新角色卡都会自动保存历史版本，支持回滚。
*   **智能分析**:
    *   集成 AI 自动分析角色卡，生成摘要和标签。
    *   支持自动打标和分类。
*   **聊天记录备份**:
    *   支持备份聊天记录，支持以一个美观的排版查看聊天记录。
    *   **正则脚本 (Regex Scripts)**: 支持自定义正则替换规则，优化聊天记录排版（支持 Markdown、HTML 渲染）。
*   **性能优化**:
    *   **PWA 支持**: 可作为桌面/手机应用安装。
    *   **边缘缓存**: 使用 Vercel Edge 和 Service Worker 进行激进的图片和资源缓存。
    *   **代理模式**: 内置图片代理，加速 R2/S3 资源加载。
*   **现代化 UI**:
    *   基于 Shadcn UI 和 Tailwind CSS v4。
    *   支持深色/浅色模式。
    *   响应式设计，（应该是）完美适配移动端。

## 🛠️ 技术栈

*   **前端框架**: [Next.js 16 (App Router)](https://nextjs.org/)
*   **语言**: TypeScript
*   **数据库**: [Supabase (PostgreSQL)](https://supabase.com/)
*   **ORM**: [Prisma](https://www.prisma.io/) (用于 Schema 管理) + [Postgres.js](https://github.com/porsager/postgres) (用于部署脚本)
*   **存储**: AWS S3 兼容存储 (Cloudflare R2)
*   **样式**: [Tailwind CSS v4](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
*   **图标**: Lucide React
*   **PWA**: next-pwa


## 📂 项目结构

```
.
├── app/                 # Next.js App Router 页面与 API
│   ├── (main)/          # 主应用布局 (Sidebar, Navbar)
│   ├── api/             # 后端 API 路由
│   ├── login/           # 登录页
│   └── viewer/          # 聊天记录查看器
├── components/          # React 组件
│   ├── cards/           # 角色卡相关组件 (列表, 详情, 编辑器)
│   ├── ui/              # Shadcn UI 基础组件
│   └── ...
├── lib/                 # 工具库
│   ├── s3.ts            # S3 存储客户端封装
│   ├── supabase.ts      # Supabase 客户端封装
│   └── png-parser.ts    # PNG Metadata 解析核心逻辑
├── prisma/              # Prisma 数据库定义
├── public/              # 静态资源 & PWA Service Worker
├── scripts/             # 部署与维护脚本
└── sql/                 # 数据库安全策略 SQL
```

## 📦 部署指南 (Vercel)

1.  Fork 本仓库。
2.  在 Vercel 中导入项目。
3.  **配置环境变量**: 将 `.env` 中的所有变量添加到 Vercel 的 Environment Variables 中。

一共需要6个环境变量

```
# 这是用来同步数据库结构的，Vercel 部署必须使用 Supabase 的 "Session pooler" (端口 5432)
DATABASE_URL=postgresql://postgres.your-ref:password@aws-0-region.pooler.supabase.com:6543/postgres

# 这是你的 Supabase 项目的 URL、Anon Key和 Service Role Key
NEXT_PUBLIC_SUPABASE_URL=Your-Supabase-URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=Your-Supabase-Anon-Key
SUPABASE_SERVICE_ROLE_KEY=Your-Supabase-Service-Role-Key

# 登录账号和密码
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password
```

4.  部署！

## 🛡️ 安全性说明

*   **鉴权**: 目前使用简单的基于 Cookie 的用户名/密码认证（适合个人使用）。
*   **RLS**: 数据库层启用了 Row Level Security，但为了方便开发，目前策略较为宽松（允许 Service Role 完全访问，公开读取）。生产环境建议根据需求收紧策略。

## 📄 许可证

个人使用，请勿用于商业用途。
