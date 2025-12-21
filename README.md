现在项目还无法部署（数据库脚本没搞好，部署了也会报错，无法使用）

项目所需前置条件：
- 部署于Vercel
- 数据库使用supabase（必须）
- 存储使用Cloudflare R2（必须）
- 域名（用来配置R2的自定义域名，以及Vercel的自定义域名，Vercel不配置自定义域名的话，中国大陆境内的访问速度会很慢）



**环境变量：**

```
NEXT_PUBLIC_SUPABASE_URL=Your-Supabase-URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=Your-Supabase-Anon-Key
SUPABASE_SERVICE_ROLE_KEY=Your-Supabase-Service-Role-Key

# Auth (必需 - 管理员单用户认证)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password
```
---

## 还在开发中，目前无法使用，存档备份