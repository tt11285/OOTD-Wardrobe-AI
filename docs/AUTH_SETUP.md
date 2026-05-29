# 登录功能配置指南（Supabase Magic Link）

OOTD 使用 **邮箱 Magic Link（无密码）** 登录。代码已就绪，本文档是一次性的后台配置 + 测试步骤。

> 未登录时 App 以匿名 `demo-user` 模式运行（完全可用），登录是叠加功能。

---

## 1. Supabase 后台配置（约 3 分钟）

项目：`https://fqyatogwykovaxorzazg.supabase.co`
（`.env.local` 里的 `NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY` 已配好，无需改代码。）

### 1.1 打开项目
1. 进 https://supabase.com/dashboard 登录
2. 选 ref 为 `fqyatogwykovaxorzazg` 的项目

### 1.2 确认邮箱登录已开启
1. 左侧 **Authentication**（盾牌图标）
2. **Sign In / Providers**（旧版 **Providers**）→ 打开 **Email**
3. 确认 **Enable Email provider** 为开启
4. **Confirm email** 保持默认即可（不影响 magic link）
5. 改动后点 **Save**

### 1.3 设置回跳地址（关键）
1. **Authentication → URL Configuration**
2. **Site URL** 填 `http://localhost:3000`
3. **Redirect URLs** 点 **Add URL** 加入 `http://localhost:3000`（可再加通配 `http://localhost:3000/**`）
4. **Save**

> 登录代码的回跳地址 = 当前网址。Supabase 只放行白名单内地址，否则报 `redirect not allowed`。
> 部署到线上后，把生产域名（如 `https://your-app.vercel.app`）同样加进 Site URL + Redirect URLs。

---

## 2. 测试登录（约 1 分钟）

前提：`npm run dev` 运行中（`http://localhost:3000`）。

1. 打开 `http://localhost:3000/login`（桌面右上 **Sign in** / 手机底部 **ACCOUNT**）
2. 输入真实邮箱 → **Send magic link**
3. 收信（发件人 Supabase；**没收到先翻垃圾箱**）
4. **用同一浏览器**打开邮件里的链接 → 跳回首页、右上角显示邮箱 = 登录成功
5. 登录后衣橱/搭配按你的账号归属（初始为空，与 demo 数据分开，正常）
6. 登出：`/login` → **Sign out**

---

## 3. 故障排查

| 现象 | 解决 |
|------|------|
| `redirect ... not allowed` | 1.3 没配好——把 `http://localhost:3000` 加进 Redirect URLs 并 Save |
| 收不到邮件 | 免费版邮件限流（每小时几封）且易进垃圾箱；等几分钟、翻垃圾箱；频繁测试会被限流 |
| 点链接跳回但没登录 | 必须**同一浏览器**打开链接；别用手机点电脑发起的链接 |
| 提示 "Auth isn't configured" | `.env.local` 缺 `NEXT_PUBLIC_SUPABASE_*`，补齐后**重启 dev 服务器** |

---

## 4. 技术说明（实现方式）

- 浏览器端用 `@supabase/supabase-js` 客户端，session 存 localStorage，magic link 回跳的 token 自动识别（PKCE，`detectSessionInUrl`）。
- 客户端请求通过 `authedFetch` 附带 access token；API 路由用 `getRequestUserId` 验证 token，按验证后的 `user.id` 归属数据。
- **轻量隔离**：不依赖数据库 RLS。如需生产级隔离，再为各表加 RLS 策略（未来项）。
