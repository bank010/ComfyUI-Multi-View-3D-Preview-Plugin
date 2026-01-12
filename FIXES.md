# 重要修复说明

## 🐛 修复：HTTP 请求行过长错误

### 问题描述
```
aiohttp.http_exceptions.LineTooLong: 400, message:
Got more than 8190 bytes (8328) when reading Status line is too long.
```

### 原因分析
之前的 `MultiView3DPreview` 节点在 UI 中返回了大量的 base64 编码图片数据，导致：
1. HTTP 请求行超过 8190 字节限制
2. 内存占用过高
3. 网络传输效率低

### 解决方案

#### 1. 修改了图片存储方式
**之前：** 将图片转换为 base64 字符串直接返回
```python
# ❌ 错误方式
img_base64 = base64.b64encode(img_data).decode('utf-8')
return {"ui": {"images": [f"data:image/png;base64,{img_base64}"]}}
```

**现在：** 保存图片到临时文件，返回文件路径
```python
# ✅ 正确方式
pil_img.save(filepath, format="PNG")
return {"ui": {"images": [{"filename": "view_01.png", "subfolder": "multiview_xxx", "type": "temp"}]}}
```

#### 2. 新增简化预览节点
新增了 `MultiViewImagePreview` 节点，用于快速预览多张图片：
- 使用 ComfyUI 标准图片预览格式
- 不需要前端扩展即可使用
- 轻量级，只显示图片

## 📦 节点使用指南

### 场景 1: 快速查看图片（推荐）

```
[图片列表] → [多视角图片批量输入] → [多视角图片预览 🖼️]
```

**特点：**
- ✅ 直接显示所有图片
- ✅ 使用 ComfyUI 原生预览
- ✅ 轻量级，无额外开销
- ✅ 适合调试和检查图片

### 场景 2: 3D 交互预览（需要前端扩展）

```
[图片列表] → [多视角图片批量输入] → [3D预览 🎬]
```

**特点：**
- 🎨 交互式 3D 查看器
- 🖱️ 鼠标控制旋转
- 🎭 三种预览模式
- ⚠️ 需要前端 JavaScript 支持

### 场景 3: 导出 HTML 文件

```
[图片列表] → [多视角图片批量输入] → [保存3D预览HTML 💾]
```

**特点：**
- 💾 生成独立 HTML 文件
- 🌐 可在任何浏览器打开
- 📤 方便分享
- ✅ 完全独立运行

## 🔧 技术细节

### 临时文件管理

图片保存在 ComfyUI 的临时目录：
```
ComfyUI/temp/multiview_{session_id}/view_00.png
                                    /view_01.png
                                    /view_02.png
                                    ...
```

- 每次执行使用唯一的 session_id
- 文件会在 ComfyUI 重启或清理时自动删除
- 不占用永久存储空间

### 返回格式

符合 ComfyUI 标准的图片返回格式：
```python
{
    "ui": {
        "images": [
            {
                "filename": "view_00.png",
                "subfolder": "multiview_abc123",
                "type": "temp"
            },
            # ... 更多图片
        ]
    }
}
```

这个格式可以直接被 ComfyUI 的前端识别和显示。

## 📊 性能对比

| 方式 | 数据大小 | HTTP 传输 | 内存占用 | 加载速度 |
|------|---------|-----------|---------|---------|
| Base64 (旧) | ~1.3x 原始 | 慢 | 高 | 慢 |
| 文件路径 (新) | ~100 bytes | 快 | 低 | 快 |

**示例：** 6 张 512x512 的 PNG 图片
- Base64 方式: ~12 MB 数据传输
- 文件路径方式: ~600 bytes 数据传输

## ⚠️ 已知限制

### 3D 预览节点的限制

目前 `MultiView3DPreview` 节点返回的是文件路径，而不是可直接渲染的图片数据。这意味着：

1. **在 ComfyUI 界面中**：
   - ❌ 不能直接看到 3D 交互界面
   - ✅ 可以看到图片列表
   - 💡 建议使用 `MultiViewImagePreview` 节点预览

2. **前端扩展功能**：
   - 需要额外的 JavaScript 代码来读取文件
   - 需要实现 Three.js 3D 渲染
   - 当前版本可能无法正常工作

3. **推荐工作流**：
   ```
   [图片列表] → [多视角图片批量输入] ─┬→ [多视角图片预览] (查看图片)
                                      └→ [保存3D预览HTML] (生成3D文件)
   ```

## 🎯 推荐使用方式

### 开发/调试阶段
使用 **多视角图片预览** 节点快速查看所有图片：
```
[输入] → [预览] ✓ 简单直接
```

### 最终输出阶段  
使用 **保存3D预览HTML** 节点生成交互式文件：
```
[输入] → [保存HTML] → 在浏览器中打开 ✓ 完整功能
```

## 🔮 未来改进

可能的改进方向：
1. 完善前端 Three.js 集成，支持界面内 3D 预览
2. 添加更多 3D 布局模式
3. 支持视频导出
4. 添加动画效果

## 📝 更新历史

### v1.2.0 (2026-01-12)
- 🐛 修复 HTTP 请求行过长错误
- ✨ 新增 MultiViewImagePreview 节点
- 🔧 改用文件路径而非 base64 传输
- 📚 更新文档和使用说明

### v1.1.0 (2026-01-12)
- ✨ 新增批量图片输入功能

### v1.0.0 (2026-01-12)
- 🎉 初始版本发布

---

如有问题，请查看主 [README.md](README.md) 或提交 Issue。
