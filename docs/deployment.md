# 部署指南

本文档介绍如何部署和运维 `perler-beads` 项目，包括本地开发、API 服务部署和工作流集成。

---

## 目录

- [环境要求](#环境要求)
- [本地开发](#本地开发)
- [CLI 工具](#cli-工具)
- [API 服务](#api-服务)
- [Docker 部署](#docker-部署)
- [工作流集成](#工作流集成)
- [环境变量](#环境变量)
- [故障排查](#故障排查)

---

## 环境要求

| 项目 | 版本要求 |
|------|----------|
| Node.js | >= 18.17 |
| npm | >= 9 |

**系统依赖**：`canvas` 包需要以下系统库：

```bash
# Ubuntu / Debian
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# macOS
brew install pkg-config cairo pango libjpeg libgif librsvg
```

---

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 Web 网站

```bash
npm run dev
# 浏览器打开 http://localhost:3000
```

### 3. 启动 API 服务（独立）

```bash
npm run api
# 服务地址：http://localhost:3002
```

### 4. 启动 CLI 工具

```bash
npm run cli -- generate <image> [options]
```

详细参数见 [CLI & API 使用指南](./cli-api-guide.md)。

---

## CLI 工具

CLI 适合在脚本或流水线中批量处理图片，无需启动服务。

```bash
# 基础用法
npm run cli -- generate input.jpg -w 58 -c COCO -t 20

# 批量处理（Shell 循环）
for img in ./images/*.jpg; do
  npm run cli -- generate "$img" -w 58 -c COCO -o ./output/
done
```

详细参数见 [CLI & API 使用指南](./cli-api-guide.md)。

---

## API 服务

API 服务提供 HTTP 接口，适合与 Web 服务或外部工作流集成。

### 开发环境

```bash
npm run api
# 默认端口：3002
```

### 生产环境

建议使用 PM2 或 Docker 部署：

```bash
# 使用 tsx 直接运行
PORT=3002 node --import tsx src/api/server.ts

# 或使用 PM2
pm2 start --name perler-api -- node --import tsx src/api/server.ts
pm2 save
pm2 startup
```

### 健康检查

```bash
curl http://localhost:3002/health
# {"status":"ok"}
```

### 生成图纸

```bash
curl -X POST http://localhost:3002/generate \
  -H 'Content-Type: application/json' \
  -d '{"imageUrl":"https://example.com/photo.jpg","width":58,"palette":"COCO"}'
```

详细 API 文档见 [CLI & API 使用指南](./cli-api-guide.md)。

---

## Docker 部署

### Dockerfile

```dockerfile
FROM node:20-slim

# 安装 canvas 系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3002

CMD ["node", "--import", "tsx", "src/api/server.ts"]
```

### 构建与运行

```bash
# 构建镜像
docker build -t perler-beads-api .

# 运行容器
docker run -d -p 3002:3002 \
  -e PORT=3002 \
  --name perler-api \
  perler-beads-api
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3002:3002"
    environment:
      - PORT=3002
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 工作流集成

### Python 集成示例

```python
import requests
import base64
import os

def generate_pattern(image_path: str, width: int = 58,
                    palette: str = "COCO", threshold: int = 20):
    """生成拼豆图纸"""
    with open(image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    resp = requests.post(
        "http://localhost:3002/generate",
        json={
            "image": img_b64,
            "width": width,
            "palette": palette,
            "mergeThreshold": threshold,
            "removeBackground": True,
        },
        timeout=60
    )

    data = resp.json()["data"]

    # 保存预览图
    preview_b64 = data["preview"].split(",")[1]
    with open(f"{image_path}.preview.png", "wb") as f:
        f.write(base64.b64decode(preview_b64))

    # 保存统计图
    if data.get("stats"):
        stats_b64 = data["stats"].split(",")[1]
        with open(f"{image_path}.stats.png", "wb") as f:
            f.write(base64.b64decode(stats_b64))

    print(f"总颗数: {data['totalCount']}")
    print(f"颜色数: {len(data['colorCounts'])}")

    return data

# 批量处理
for img in os.listdir("./images"):
    if img.endswith(('.jpg', '.png')):
        generate_pattern(f"./images/{img}")
```

### Shell 脚本集成

```bash
#!/bin/bash
# batch-generate.sh

API_URL="${API_URL:-http://localhost:3002}"
WIDTH="${WIDTH:-58}"
PALETTE="${PALETTE:-COCO}"
THRESHOLD="${THRESHOLD:-20}"

for img in "$@"; do
    echo "处理: $img"

    RESPONSE=$(curl -s -X POST "$API_URL/generate" \
        -H 'Content-Type: application/json' \
        -d "{
            \"imageUrl\": \"file://$img\",
            \"width\": $WIDTH,
            \"palette\": \"$PALETTE\",
            \"mergeThreshold\": $THRESHOLD
        }")

    # 提取预览图并保存
    echo "$RESPONSE" | jq -r '.data.preview' | \
        sed 's/data:image\/png;base64,//' | \
        base64 -d > "${img}.preview.png"

    echo "完成: ${img}.preview.png"
done
```

### GitHub Actions 工作流

```yaml
name: Generate Perler Bead Patterns

on:
  workflow_dispatch:
    inputs:
      image_url:
        description: 'Image URL'
        required: true
        type: string

jobs:
  generate:
    runs-on: ubuntu-latest
    container: node:20-slim

    steps:
      - name: Install canvas dependencies
        run: |
          apt-get update && apt-get install -y \
            build-essential libcairo2-dev libpango1.0-dev \
            libjpeg-dev libgif-dev librsvg2-dev

      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Generate pattern
        run: |
          npm run cli -- generate "${{ github.event.inputs.image_url }}" \
            -w 58 -c COCO -t 20 --remove-bg -o ./output/

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: perler-patterns
          path: output/
```

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3002` | API 服务监听端口 |
| `API_TIMEOUT` | `60000` | 请求超时（毫秒） |
| `API_MAX_SIZE` | `10` | 最大请求体大小（MB） |

---

## 故障排查

### canvas 构建失败

确保系统依赖已安装：
```bash
# Ubuntu/Debian
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# 重新安装 npm 依赖
rm -rf node_modules package-lock.json
npm install
```

### API 请求超时

大图处理可能耗时较长，增加超时时间：
```bash
API_TIMEOUT=120000 npm run api
```

### 内存不足

`canvas` 处理大图时内存消耗较高，建议：
- 限制单次请求的图片尺寸
- 使用 `--width` 参数控制输出精度（不需要过高的精度）
- 增加 Node.js 内存限制：
  ```bash
  NODE_OPTIONS="--max-old-space-size=4096" npm run api
  ```
