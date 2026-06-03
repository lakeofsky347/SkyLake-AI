# AI Gateway MVP

面向低技术背景用户的多模型 API 中转站与 Web 聊天平台。

本仓库当前处于 **MVP 收口阶段**：核心目标不是复刻上游 API 网关，而是在保留多模型接入、渠道管理、计费统计和用户管理能力的基础上，补齐面向终端用户的对话入口、附件能力与后续订阅制运营基础。

> 当前分支：`MVP`
>
> 推荐部署方式：Docker Compose 自构建镜像。

---

## 项目定位

本项目用于构建一个可私有化部署的 AI 服务中转平台，主要包含两类入口：

1. **对话平台**：面向普通用户，用户在创建对话或发送消息时选择模型，平台负责调用上游模型并统一记录用量。
2. **API 控制台**：面向具备一定技术背景的用户，提供令牌、渠道、模型、额度和日志管理能力。

MVP 阶段优先保证以下闭环：

```text
用户登录 -> 创建对话 -> 选择模型 -> 发送消息 -> 记录用量 -> 后台可管理
```

---

## 当前能力

### 对话平台

- 会话创建与会话列表
- 会话消息发送、重新生成与历史记录
- 本地图片附件上传与管理
- 模型选择入口
- 与后台渠道、模型、计费逻辑联动

### API 中转能力

- 多上游渠道接入
- OpenAI 兼容接口转发
- 用户令牌管理
- 模型权限管理
- 用量日志与统计
- 额度、分组与倍率配置

### 管理能力

- 用户管理
- 渠道管理
- 模型管理
- 系统设置
- 日志审计
- 基础计费配置

---

## 技术栈

| 模块 | 技术 |
|---|---|
| 后端 | Go |
| 前端 | React / TypeScript |
| 数据库 | PostgreSQL |
| 缓存 | Redis |
| 部署 | Docker / Docker Compose |
| 反向代理 | Caddy / Nginx，可选 |

---

## 快速部署

### 1. 克隆 MVP 分支

```bash
git clone -b MVP https://github.com/lakeofsky347/newapi_fork.git ai-gateway-mvp
cd ai-gateway-mvp
```

### 2. 创建环境变量文件

```bash
cp .env.example .env
nano .env
```

至少修改以下配置：

```env
POSTGRES_PASSWORD=请改成强密码
REDIS_PASSWORD=请改成强密码
SESSION_SECRET=请改成至少32位随机字符串
FRONTEND_BASE_URL=http://localhost:3000
TRUSTED_REDIRECT_DOMAINS=localhost,127.0.0.1
```

生成随机密钥：

```bash
openssl rand -hex 32
```

### 3. 构建并启动

```bash
docker compose up -d --build
```

查看状态：

```bash
docker compose ps
docker compose logs -f app
```

本地或服务器测试：

```text
http://服务器公网IP:3000
```

正式上线时建议使用 Caddy 或 Nginx 反向代理到容器内的 `3000` 端口，并绑定域名与 HTTPS。

---

## 首次启动后的必要操作

首次启动并初始化数据库后，请立即完成：

1. 登录后台。
2. 修改默认管理员密码。
3. 关闭不需要的公开注册入口。
4. 配置上游模型渠道。
5. 配置模型倍率、分组与用户额度。
6. 创建测试用户并验证对话、API、日志和计费链路。

---

## 生产部署建议

MVP 阶段推荐单机部署：

```text
VPS
├── Docker Compose
├── app：AI Gateway MVP
├── postgres：业务数据库
├── redis：缓存
└── caddy / nginx：HTTPS 与反向代理
```

建议服务器规格：

| 项目 | 建议 |
|---|---|
| CPU | 2 核起步，4 核以上更稳 |
| 内存 | 4 GB 起步，8 GB 更稳 |
| 硬盘 | 40 GB 起步，建议挂载独立数据盘 |
| 系统 | Ubuntu 22.04 / 24.04 LTS |

---

## 安全注意事项

不要在生产环境使用默认密码。至少需要设置：

```env
POSTGRES_PASSWORD=强密码
REDIS_PASSWORD=强密码
SESSION_SECRET=随机长密钥
```

同时建议：

- 数据库和 Redis 不暴露到公网。
- 仅开放 `22`、`80`、`443`。
- 使用 HTTPS。
- 定期备份 PostgreSQL 数据。
- 保留系统日志和调用日志。
- 上线前检查支付、订阅、退款和用户协议等运营规则。

---

## 合规与许可证

本仓库为基于 AGPLv3 许可代码的二次开发版本，仍遵循 GNU Affero General Public License v3.0。公开部署、分发或提供网络服务时，应遵守 AGPLv3 的源代码提供义务和相关版权声明要求。

本项目仅应在合法授权场景下使用。运营者需要自行确保：

- 已合法取得上游模型服务、API Key 或接口权限；
- 遵守上游服务条款；
- 遵守所在司法辖区关于生成式人工智能服务、数据安全、隐私保护、支付、税务和消费者权益保护等要求；
- 不将本项目用于绕过访问控制、滥用模型服务或其他违法用途。

---

## 当前开发重点

- [ ] 完成 MVP 分支生产部署验证
- [ ] 整理前端品牌与默认文案
- [ ] 将用户侧输出策略统一为非流式最终输出
- [ ] 完善订阅制、预储值和按次卡计费设计
- [ ] 补充生产环境备份与回滚文档
- [ ] 补充用户协议、隐私政策与合规说明

---

## 维护说明

当前仓库以 `MVP` 分支为上线验证分支。生产部署前，请优先确认：

```bash
git branch --show-current
git status
docker compose config
docker compose up -d --build
```

如需正式商用，请在完成安全、合规、备份、监控、支付与用户协议后再开放给外部用户。
