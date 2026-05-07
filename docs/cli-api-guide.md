# Perler Beads CLI & API 使用指南

本文档介绍 `perler-beads` 项目新增的 **命令行工具（CLI）** 和 **HTTP 接口（API）**，用于程序化、自动化生成拼豆图纸。

---

## 目录

- [快速开始](#快速开始)
- [CLI 命令行工具](#cli-命令行工具)
  - [generate 子命令](#1-generate-子命令)
  - [参数一览](#2-参数一览)
  - [使用示例](#3-使用示例)
- [HTTP API](#http-api)
  - [端点说明](#端点说明)
  - [请求与响应格式](#请求与响应格式)
  - [使用示例](#使用示例-1)
- [参数说明详解](#参数说明详解)
  - [像素化相关](#像素化相关)
  - [色板相关](#色板相关)
  - [颜色合并相关](#颜色合并相关)
  - [背景移除相关](#背景移除相关)
  - [导出相关](#导出相关)
- [常见问题与解决方法](#常见问题与解决方法)

---

## 快速开始

```bash
# CLI 生成图纸
npm run cli -- generate input.jpg -w 58 -c COCO -t 20

# 启动 API 服务
npm run api
```

---

## CLI 命令行工具

### 1. generate 子命令

```bash
npm run cli -- generate <image> [options]
```

**参数说明：**

| 参数 | 短选项 | 类型 | 默认值 | 说明 |
|------|--------|------|--------|------|
| `<image>` | — | string | **必填** | 输入图片路径（本地文件或 URL） |
| `--output <dir>` | `-o` | string | `.` | 输出目录 |
| `--prefix <name>` | — | string | 输入文件名 | 输出文件名前缀 |
| `--width <n>` | `-w` | int | `50` | 网格横向格子数 |
| `--aspect` | — | flag | false | 保持原始宽高比，高度自动计算 |
| `--mode <mode>` | `-m` | string | `dominant` | 像素化模式：`dominant`（卡通）或 `average`（真实） |
| `--palette <name>` | `-c` | string | `MARD` | 色板：`MARD` / `COCO` / `漫漫` / `盼盼` / `咪小窝` |
| `--colors <hexes>` | — | string | — | 自定义颜色白名单（逗号分隔，不带 #） |
| `--exclude <hexes>` | — | string | — | 排除的颜色列表（逗号分隔，不带 #） |
| `--threshold <n>` | `-t` | int | `30` | 颜色合并阈值（0-100），越小越保留细节 |
| `--remove-bg` | — | flag | false | 开启背景洪水填充移除 |
| `--bg-colors <hexes>` | — | string | — | 背景颜色白名单（逗号分隔，不带 #） |
| `--no-grid` | — | flag | false | 隐藏网格线 |
| `--grid-interval <n>` | `-i` | int | `10` | 粗格线间隔（每 N 格一条） |
| `--no-coords` | — | flag | false | 隐藏 X/Y 坐标轴标注 |
| `--no-numbers` | — | flag | false | 隐藏格子内的色号标注 |
| `--grid-color <hex>` | — | string | `000000` | 粗格线颜色（6位 hex，不带 #） |
| `--no-stats` | — | flag | false | 导出不包含颜色统计区 |
| `--csv` | — | flag | false | 同时导出 CSV 格式（每行图纸一个颜色列表） |
| `--cell-size <n>` | — | int | `0`（自动） | 输出 PNG 每格像素大小，越大图纸越清晰 |

---

### 2. 参数一览

```
perler-cli generate <image> [options]

位置参数:
  image                          输入图片路径（本地文件或 URL）

选项:
  -o, --output <dir>             输出目录 (默认: ".")
  --prefix <name>                 输出文件名前缀
  -w, --width <n>                网格横向格子数 (默认: 50)
  --aspect                        保持原始宽高比
  -m, --mode <mode>              像素化模式: dominant | average (默认: dominant)
  -c, --palette <name>           色板: MARD | COCO | 漫漫 | 盼盼 | 咪小窝 (默认: MARD)
  --colors <hexes>                自定义颜色白名单 (逗号分隔, 不带#)
  --exclude <hexes>               排除的颜色 (逗号分隔, 不带#)
  -t, --threshold <n>            颜色合并阈值 0-100 (默认: 30)
  --remove-bg                     开启背景移除
  --bg-colors <hexes>             背景颜色白名单 (逗号分隔, 不带#)
  --no-grid                       隐藏网格线
  -i, --grid-interval <n>        粗格线间隔 (默认: 10)
  --no-coords                     隐藏坐标轴
  --no-numbers                    隐藏色号标注
  --grid-color <hex>              粗格线颜色 (默认: 000000)
  --no-stats                      导出不包含统计区
  --csv                           同时导出 CSV
  --cell-size <n>                 每格像素大小 (默认: 自动)
  -h, --help                     显示帮助
```

---

### 3. 使用示例

**基础用法：**
```bash
npm run cli -- generate photo.jpg -w 58 -c COCO
```

**指定输出目录：**
```bash
npm run cli -- generate photo.jpg -w 58 -c MARD -o ./output/
```

**保持宽高比（高度自动计算）：**
```bash
npm run cli -- generate photo.jpg -w 116 --aspect -c COCO
```

**卡通风格（dominant，主导色提取，色块清晰）：**
```bash
npm run cli -- generate photo.jpg -w 58 -c COCO -m dominant -t 15
```

**真实风格（average，均值池化，过渡平滑）：**
```bash
npm run cli -- generate photo.jpg -w 58 -c MARD -m average -t 0
```

**开启背景移除（白色/纯色背景自动消除）：**
```bash
npm run cli -- generate photo.jpg -w 58 -c COCO --remove-bg
```

**高分辨率输出（打印用）：**
```bash
npm run cli -- generate photo.jpg -w 58 -c COCO --remove-bg --cell-size 40
```

**导出 CSV 格式：**
```bash
npm run cli -- generate photo.jpg -w 58 -c COCO --csv
```

**排除特定颜色：**
```bash
npm run cli -- generate photo.jpg -w 58 -c COCO --exclude FFFFFF,000000
```

**自定义颜色白名单（只用某些颜色）：**
```bash
npm run cli -- generate photo.jpg -w 58 --colors FFFFFF,000000,FF0000,00FF00
```

**使用网络图片：**
```bash
npm run cli -- generate https://example.com/photo.jpg -w 58 -c COCO
```

---

## HTTP API

### 端点说明

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `POST` | `/generate` | 生成拼豆图纸 |

### 请求与响应格式

**POST /generate**

请求体（JSON）：

```json
{
  "image": "<base64 编码的图片（可选）>",
  "imageUrl": "<图片 URL（可选，与 image 二选一）>",
  "width": 58,
  "aspect": false,
  "mode": "dominant",
  "palette": "COCO",
  "colors": ["#FFFFFF", "#000000"],
  "excludeColors": [],
  "mergeThreshold": 20,
  "removeBackground": true,
  "backgroundColors": ["#FFFFFF"],
  "showGrid": true,
  "gridInterval": 10,
  "showCoordinates": true,
  "showCellNumbers": true,
  "gridLineColor": "#000000",
  "includeStats": true,
  "exportCsv": false
}
```

响应体（JSON）：

```json
{
  "success": true,
  "data": {
    "dimensions": { "N": 58, "M": 58 },
    "palette": "COCO",
    "totalCount": 1461,
    "colorCounts": {
      "#FFFFFF": { "displayKey": "A01", "count": 1925 },
      "#000000": { "displayKey": "B09", "count": 442 }
    },
    "preview": "<data:image/png;base64,......>",
    "stats": "<data:image/png;base64,......>",
    "csv": "B09,B09,B09,...",
    "json": "{...}"
  }
}
```

**所有字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `image` | string | 二选一 | Base64 编码的图片（含 data URI 前缀或纯 base64） |
| `imageUrl` | string | 二选一 | 图片网络 URL |
| `width` | int | 否 | 横向格子数，默认 50 |
| `aspect` | bool | 否 | 保持宽高比，默认 false |
| `mode` | string | 否 | `dominant`（默认）或 `average` |
| `palette` | string | 否 | 色板，默认 `MARD` |
| `colors` | string[] | 否 | 自定义颜色白名单（hex 值） |
| `excludeColors` | string[] | 否 | 排除的颜色（hex 值） |
| `mergeThreshold` | int | 否 | 颜色合并阈值 0-100，默认 30 |
| `removeBackground` | bool | 否 | 是否移除背景，默认 false |
| `backgroundColors` | string[] | 否 | 背景颜色白名单（hex 值） |
| `showGrid` | bool | 否 | 是否显示网格线，默认 true |
| `gridInterval` | int | 否 | 粗格线间隔，默认 10 |
| `showCoordinates` | bool | 否 | 是否显示坐标轴，默认 true |
| `showCellNumbers` | bool | 否 | 是否显示色号，默认 true |
| `gridLineColor` | string | 否 | 粗格线颜色，默认 `#000000` |
| `includeStats` | bool | 否 | 是否包含统计区，默认 true |
| `exportCsv` | bool | 否 | 是否导出 CSV，默认 false |

### 使用示例

**健康检查：**
```bash
curl http://localhost:3002/health
# {"status":"ok"}
```

**用 Base64 图片生成（适用于工作流集成）：**
```bash
BASE64=$(base64 -i photo.jpg | tr -d '\n')
curl -X POST http://localhost:3002/generate \
  -H 'Content-Type: application/json' \
  -d "{\"image\":\"$BASE64\",\"width\":58,\"palette\":\"COCO\",\"mergeThreshold\":20,\"removeBackground\":true}"
```

**用图片 URL 生成：**
```bash
curl -X POST http://localhost:3002/generate \
  -H 'Content-Type: application/json' \
  -d '{"imageUrl":"https://example.com/photo.jpg","width":58,"palette":"MARD","removeBackground":true}'
```

**完整参数示例（Python）：**
```python
import requests
import base64

with open("photo.jpg", "rb") as f:
    img_b64 = base64.b64encode(f.read()).decode()

resp = requests.post("http://localhost:3002/generate", json={
    "image": img_b64,
    "width": 58,
    "palette": "COCO",
    "mode": "dominant",
    "mergeThreshold": 20,
    "removeBackground": True,
    "showGrid": True,
    "includeStats": True,
    "exportCsv": True,
})

data = resp.json()["data"]
print(f"总颗数: {data['totalCount']}")
print(f"颜色数: {len(data['colorCounts'])}")

# 保存预览图
import re
b64 = data["preview"].split(",")[1]
with open("output.png", "wb") as f:
    f.write(base64.b64decode(b64))
```

---

## 参数说明详解

### 像素化相关

#### `--width` / `-w`
横向格子数，决定图纸精度。数值越大，图纸越精细，但颜色数量也会增加。

- 29×29 = 标准小板（1 块）
- 58×58 = 2×2 拼接（4 块）
- 87×87 = 3×3 拼接（9 块）
- 116×116 = 4×4 拼接（16 块）

#### `--aspect`
默认关闭（输出正方形 `width×width`）。开启后保持原图宽高比，高度自动计算。

#### `--mode`
| 模式 | 说明 | 适用场景 |
|------|------|---------|
| `dominant`（默认） | 主导色提取，取区域内出现最多的颜色，色块纯净 | **推荐** 卡通、动漫、表情包 |
| `average` | 均值池化，取区域颜色平均值，过渡平滑 | 照片、风景 |

### 色板相关

#### `--palette` / `-c`

| 色板 | 色数 | 说明 |
|------|------|------|
| `MARD` | 168 | 推荐，色数最多 |
| `COCO` | 144 | 常用 |
| `漫漫` | 96 | 中等色数 |
| `盼盼` | 72 | 较少 |
| `咪小窝` | 48 | 最少，适合简化图 |

#### `--colors`
自定义颜色白名单，只使用指定的颜色（hex 值，不带 #）。例如：`--colors FFFFFF,000000,FF0000`

#### `--exclude`
排除指定颜色（hex 值），被排除的颜色会自动重映射到最接近的可用颜色。

### 颜色合并相关

#### `--threshold` / `-t`

控制相邻相似颜色的合并强度（0-100）：

| 值 | 效果 |
|----|------|
| 0 | 不合并，保留所有细节和杂色 |
| 10-20 | 轻度合并，去除明显杂色，保留细节 |
| 20-40 | 中度合并（默认），色块干净 |
| 50+ | 强力合并，颜色数量大幅减少 |

### 背景移除相关

#### `--remove-bg`
开启后，自动从边界开始洪水填充，将与边界连通且属于背景色的格子标记为外部（不计入统计，不参与绘图）。

#### `--bg-colors`
显式指定哪些颜色属于背景（白名单）。如果不指定，则自动检测边界最常见的颜色作为背景色。

### 导出相关

#### `--cell-size`
每个格子的像素大小，影响输出 PNG 的清晰度：

| 值 | 58×58 输出尺寸 | 适用场景 |
|----|----------------|---------|
| 10（默认自动） | ~600px | 屏幕查看 |
| 20 | ~1160px | 屏幕查看（推荐） |
| 40 | ~2320px | 细节查看 |
| 80 | ~4640px | 打印（推荐） |

#### `--no-coords` / `--no-numbers` / `--no-grid`
隐藏坐标轴 / 隐藏格子内色号 / 隐藏网格线。按需使用，打印时可关闭以减少干扰。

#### `--csv`
导出 CSV 文件，每行代表图纸的一行，值为每个格子的 hex 颜色值，便于程序读取或二次处理。

---

## 常见问题与解决方法

### 1. 精度太小，效果不好

**问题**：生成的图纸模糊，细节丢失。

**原因**：格子数（`--width`）不够，复杂图片需要更多格子才能保留细节。

**解决**：
```bash
# 增加格子数
npm run cli -- generate photo.jpg -w 116 -c COCO --aspect

# 配合 threshold 0 保留最大细节
npm run cli -- generate photo.jpg -w 100 -c MARD -t 0 --remove-bg
```

> 提示：拼豆本身就是像素格工艺，精度越高质量越好。建议至少 58×58 以上，复杂图用 100+。

---

### 2. 颜色数量太多，采购麻烦

**问题**：用了四五十种颜色，买起来太麻烦。

**解决**：
```bash
# 提高合并阈值，减少颜色数量
npm run cli -- generate photo.jpg -w 58 -c COCO -t 50

# 或者换成色数更少的色板
npm run cli -- generate photo.jpg -w 58 -c 漫漫 -t 30

# 如果原图本身颜色简单，效果会更好
```

---

### 3. 背景不是纯色，移除效果差

**问题**：`--remove-bg` 效果不明显，背景残留。

**原因**：背景不是单一颜色，洪水填充算法按颜色匹配，白边、阴影会被识别为前景。

**解决**：
```bash
# 手动指定背景颜色（可指定多个）
npm run cli -- generate photo.jpg -w 58 -c COCO \
  --remove-bg --bg-colors FFFFFF,CCCCCC,EEEEEE

# 或者先对图片做预处理（PS/绘图工具）：
# 1. 扣图去背景，导出 PNG
# 2. 确保背景为纯白 #FFFFFF
# 3. 再用 --remove-bg 移除
```

---

### 4. 白色背景被分成多种白色

**问题**：白色背景被识别成 A01、M09、L14 等多种白色。

**原因**：图片压缩/缩放导致白色区域出现色差，被视为不同颜色。

**解决**：
```bash
# 开启背景移除，自动消除白色背景
npm run cli -- generate photo.jpg -w 58 -c COCO --remove-bg

# 配合白色背景颜色白名单效果更好
npm run cli -- generate photo.jpg -w 58 -c COCO \
  --remove-bg --bg-colors FFFFFF
```

---

### 5. 细小杂色很多（噪点）

**问题**：图纸里有零星的一两颗杂色，看起来不干净。

**原因**：图片压缩噪点、阴影被识别为独立颜色。

**解决**：
```bash
# 适当提高合并阈值
npm run cli -- generate photo.jpg -w 58 -c COCO -t 20

# 如果噪点顽固，可以先预处理图片降噪
```

---

### 6. 色块边界有灰色毛边

**问题**：颜色交替的地方出现了灰色条纹。

**原因**：使用了 `average` 模式，均值池化在色块边界混合颜色。

**解决**：
```bash
# 改用 dominant 模式（默认），主导色提取避免毛边
npm run cli -- generate photo.jpg -w 58 -c COCO -m dominant
```

---

### 7. 想用图片 URL 作为输入

**问题**：图片在网络上，不方便下载到本地。

**解决**：CLI 和 API 都支持 URL 直接输入：
```bash
# CLI
npm run cli -- generate https://example.com/photo.jpg -w 58 -c COCO

# API
curl -X POST http://localhost:3002/generate \
  -d '{"imageUrl":"https://example.com/photo.jpg","width":58}'
```

---

### 8. 想在代码里集成调用

**问题**：需要在自己的程序/工作流里调用生成。

**解决**：用 HTTP API 集成：

```python
import requests, base64, json

def generate_pattern(image_path: str, width: int = 58,
                    palette: str = "COCO", threshold: int = 20,
                    remove_bg: bool = True):
    with open(image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    resp = requests.post("http://localhost:3002/generate", json={
        "image": img_b64,
        "width": width,
        "palette": palette,
        "mergeThreshold": threshold,
        "removeBackground": remove_bg,
    })

    data = resp.json()["data"]
    return data["dimensions"], data["totalCount"], data["colorCounts"]
```

---

### 9. 导入 CSV 后透明背景变白色

**问题**：导出 CSV 再导入，透明背景变成了白色（T01/T1）。

**原因**：CSV 格式不支持透明通道，`TRANSPARENT` 标记在导入时被映射为白色。

**解决**：这是原项目已知问题（[Issue #13](https://github.com/Zippland/perler-beads/issues/13)）。目前建议导出 PNG 图纸保留透明信息，CSV 仅用于程序化处理颜色数据。

---

### 10. 输出 PNG 太糊，放大看不清

**问题**：预览图放大后格子模糊，看不清色号。

**解决**：增大 `--cell-size` 参数：
```bash
# 推荐值：20-40
npm run cli -- generate photo.jpg -w 58 -c COCO --cell-size 40

# 打印用建议 80
npm run cli -- generate photo.jpg -w 58 -c COCO --cell-size 80 --no-coords
```

---

### 11. 什么样的图片效果最好？

根据算法原理，以下图片效果最佳：

| 效果好的图 | 效果差的图 |
|-----------|-----------|
| 卡通/动漫人物 | 人像/风景照片 |
| emoji / 表情包 | 渐变/柔和过渡 |
| 扁平插画风格 | 噪点多的压缩图 |
| 轮廓清晰、边界锐利 | 大量阴影/光影 |
| 背景纯色（白/单色） | 复杂纹理/背景杂物 |
| 颜色种类少（10-30 种） | 色彩丰富的高精度图 |

> **技巧**：如果只有照片素材，可以先用图像编辑工具（如 PS、Photopea）将其转换为扁平插画风格，再用本工具生成图纸，效果会大幅提升。
