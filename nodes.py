"""
Multi-View to 3D Preview Nodes
"""

import torch
import numpy as np
from PIL import Image
import io
import base64
import json
import os
import folder_paths


class MultiViewImageInput:
    """多视角图片输入节点"""
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "image_1": ("IMAGE",),
                "image_2": ("IMAGE",),
                "image_3": ("IMAGE",),
                "image_4": ("IMAGE",),
                "image_5": ("IMAGE",),
                "image_6": ("IMAGE",),
                "image_7": ("IMAGE",),
                "image_8": ("IMAGE",),
            }
        }
    
    RETURN_TYPES = ("MULTI_VIEW_IMAGES",)
    RETURN_NAMES = ("multi_view_images",)
    FUNCTION = "process_images"
    CATEGORY = "image/3D"
    
    def process_images(self, **kwargs):
        """处理多个输入图片"""
        images = []
        for i in range(1, 9):
            key = f"image_{i}"
            if key in kwargs and kwargs[key] is not None:
                images.append(kwargs[key])
        
        if len(images) == 0:
            raise ValueError("至少需要一张图片")
        
        return ({"images": images},)


class MultiView3DPreview:
    """3D全景预览节点"""
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "multi_view_images": ("MULTI_VIEW_IMAGES",),
                "preview_mode": (["carousel", "sphere", "cube"],),
                "rotation_speed": ("FLOAT", {
                    "default": 1.0,
                    "min": 0.1,
                    "max": 5.0,
                    "step": 0.1
                }),
                "auto_rotate": ("BOOLEAN", {"default": True}),
            }
        }
    
    RETURN_TYPES = ()
    OUTPUT_NODE = True
    FUNCTION = "preview_3d"
    CATEGORY = "image/3D"
    
    def preview_3d(self, multi_view_images, preview_mode, rotation_speed, auto_rotate):
        """生成3D预览"""
        images = multi_view_images["images"]
        
        # 转换图片为base64
        image_data_list = []
        for img_tensor in images:
            # ComfyUI的图片格式是 [batch, height, width, channels]
            # 取第一个batch
            img_np = img_tensor[0].cpu().numpy()
            
            # 转换为0-255范围
            img_np = (img_np * 255).astype(np.uint8)
            
            # 转换为PIL Image
            pil_img = Image.fromarray(img_np)
            
            # 转换为base64
            buffered = io.BytesIO()
            pil_img.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
            image_data_list.append(f"data:image/png;base64,{img_base64}")
        
        # 返回预览数据
        return {
            "ui": {
                "images": image_data_list,
                "preview_mode": preview_mode,
                "rotation_speed": rotation_speed,
                "auto_rotate": auto_rotate,
            }
        }


class TextListMerge:
    """文本列表合并节点"""
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "list_1": ("STRING", {"forceInput": True}),
                "list_2": ("STRING", {"forceInput": True}),
                "list_3": ("STRING", {"forceInput": True}),
                "list_4": ("STRING", {"forceInput": True}),
                "list_5": ("STRING", {"forceInput": True}),
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("merged_list",)
    FUNCTION = "merge_lists"
    CATEGORY = "utils/text"
    
    def merge_lists(self, **kwargs):
        """合并多个文本列表"""
        result = []
        
        # 遍历所有输入的列表
        for i in range(1, 6):
            key = f"list_{i}"
            if key in kwargs and kwargs[key] is not None:
                list_data = kwargs[key]
                
                # 如果输入是字符串,尝试解析为列表
                if isinstance(list_data, str):
                    # 尝试解析 JSON 格式
                    try:
                        parsed = json.loads(list_data)
                        if isinstance(parsed, list):
                            result.extend(parsed)
                        else:
                            result.append(str(parsed))
                    except json.JSONDecodeError:
                        # 如果不是JSON,按逗号分割
                        if ',' in list_data:
                            items = [item.strip() for item in list_data.split(',')]
                            result.extend(items)
                        else:
                            result.append(list_data)
                elif isinstance(list_data, list):
                    result.extend(list_data)
                else:
                    result.append(str(list_data))
        
        # 返回JSON格式的字符串
        return (json.dumps(result, ensure_ascii=False),)


class TextListCreate:
    """创建文本列表节点"""
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "text_1": ("STRING", {"default": "", "multiline": False}),
                "text_2": ("STRING", {"default": "", "multiline": False}),
                "text_3": ("STRING", {"default": "", "multiline": False}),
                "text_4": ("STRING", {"default": "", "multiline": False}),
                "text_5": ("STRING", {"default": "", "multiline": False}),
                "text_6": ("STRING", {"default": "", "multiline": False}),
                "text_7": ("STRING", {"default": "", "multiline": False}),
                "text_8": ("STRING", {"default": "", "multiline": False}),
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text_list",)
    FUNCTION = "create_list"
    CATEGORY = "utils/text"
    
    def create_list(self, **kwargs):
        """创建文本列表"""
        result = []
        
        for i in range(1, 9):
            key = f"text_{i}"
            if key in kwargs and kwargs[key] is not None and kwargs[key].strip() != "":
                result.append(kwargs[key].strip())
        
        # 返回JSON格式的字符串
        return (json.dumps(result, ensure_ascii=False),)


class TextListDisplay:
    """显示文本列表节点"""
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text_list": ("STRING", {"forceInput": True}),
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text_list",)
    OUTPUT_NODE = True
    FUNCTION = "display_list"
    CATEGORY = "utils/text"
    
    def display_list(self, text_list):
        """显示文本列表"""
        try:
            parsed = json.loads(text_list)
            if isinstance(parsed, list):
                display_text = "\n".join([f"{i+1}. {item}" for i, item in enumerate(parsed)])
            else:
                display_text = str(parsed)
        except json.JSONDecodeError:
            display_text = text_list
        
        return {
            "ui": {
                "text": [display_text],
                "list": text_list,
            },
            "result": (text_list,)
        }


class SaveMultiView3D:
    """保存3D预览为HTML文件"""
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "multi_view_images": ("MULTI_VIEW_IMAGES",),
                "preview_mode": (["carousel", "sphere", "cube"],),
                "rotation_speed": ("FLOAT", {
                    "default": 1.0,
                    "min": 0.1,
                    "max": 5.0,
                    "step": 0.1
                }),
                "auto_rotate": ("BOOLEAN", {"default": True}),
                "filename": ("STRING", {"default": "3d_preview.html"}),
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("file_path",)
    OUTPUT_NODE = True
    FUNCTION = "save_html"
    CATEGORY = "image/3D"
    
    def save_html(self, multi_view_images, preview_mode, rotation_speed, auto_rotate, filename):
        """保存为独立的HTML文件"""
        images = multi_view_images["images"]
        
        # 确保输出目录存在
        output_dir = folder_paths.get_output_directory()
        
        # 保存图片文件
        image_paths = []
        for idx, img_tensor in enumerate(images):
            img_np = img_tensor[0].cpu().numpy()
            img_np = (img_np * 255).astype(np.uint8)
            pil_img = Image.fromarray(img_np)
            
            img_filename = f"view_{idx}.png"
            img_path = os.path.join(output_dir, img_filename)
            pil_img.save(img_path)
            image_paths.append(img_filename)
        
        # 生成HTML内容
        html_content = self._generate_html(image_paths, preview_mode, rotation_speed, auto_rotate)
        
        # 保存HTML文件
        if not filename.endswith('.html'):
            filename += '.html'
        html_path = os.path.join(output_dir, filename)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return (html_path,)
    
    def _generate_html(self, image_paths, preview_mode, rotation_speed, auto_rotate):
        """生成HTML内容"""
        images_json = json.dumps(image_paths)
        
        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Multi-View Preview</title>
    <style>
        body {{
            margin: 0;
            overflow: hidden;
            font-family: Arial, sans-serif;
            background: #000;
        }}
        #container {{
            width: 100vw;
            height: 100vh;
        }}
        #controls {{
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 100;
        }}
        button {{
            background: #4CAF50;
            color: white;
            border: none;
            padding: 8px 16px;
            margin: 5px;
            border-radius: 4px;
            cursor: pointer;
        }}
        button:hover {{
            background: #45a049;
        }}
    </style>
</head>
<body>
    <div id="container"></div>
    <div id="controls">
        <h3>3D 预览控制</h3>
        <p>使用鼠标拖拽旋转视图</p>
        <button id="toggleRotation">{'暂停旋转' if auto_rotate else '开始旋转'}</button>
        <button id="resetView">重置视角</button>
    </div>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script>
        const imagePaths = {images_json};
        const previewMode = "{preview_mode}";
        const rotationSpeed = {rotation_speed};
        let autoRotate = {str(auto_rotate).lower()};
        
        let scene, camera, renderer, group;
        let isRotating = autoRotate;
        
        init();
        animate();
        
        function init() {{
            // 创建场景
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1a1a1a);
            
            // 创建相机
            camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );
            camera.position.z = 5;
            
            // 创建渲染器
            renderer = new THREE.WebGLRenderer({{ antialias: true }});
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.getElementById('container').appendChild(renderer.domElement);
            
            // 创建组
            group = new THREE.Group();
            scene.add(group);
            
            // 添加光源
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
            directionalLight.position.set(10, 10, 10);
            scene.add(directionalLight);
            
            // 加载图片并创建3D对象
            loadImages();
            
            // 鼠标控制
            let isDragging = false;
            let previousMousePosition = {{ x: 0, y: 0 }};
            
            renderer.domElement.addEventListener('mousedown', (e) => {{
                isDragging = true;
            }});
            
            renderer.domElement.addEventListener('mousemove', (e) => {{
                if (isDragging) {{
                    const deltaMove = {{
                        x: e.offsetX - previousMousePosition.x,
                        y: e.offsetY - previousMousePosition.y
                    }};
                    
                    group.rotation.y += deltaMove.x * 0.01;
                    group.rotation.x += deltaMove.y * 0.01;
                }}
                
                previousMousePosition = {{
                    x: e.offsetX,
                    y: e.offsetY
                }};
            }});
            
            renderer.domElement.addEventListener('mouseup', () => {{
                isDragging = false;
            }});
            
            // 控制按钮
            document.getElementById('toggleRotation').addEventListener('click', () => {{
                isRotating = !isRotating;
                document.getElementById('toggleRotation').textContent = 
                    isRotating ? '暂停旋转' : '开始旋转';
            }});
            
            document.getElementById('resetView').addEventListener('click', () => {{
                group.rotation.set(0, 0, 0);
                camera.position.set(0, 0, 5);
            }});
            
            // 窗口大小调整
            window.addEventListener('resize', () => {{
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            }});
        }}
        
        function loadImages() {{
            const textureLoader = new THREE.TextureLoader();
            const imageCount = imagePaths.length;
            
            if (previewMode === 'carousel') {{
                // 环形排列
                const radius = 3;
                imagePaths.forEach((path, index) => {{
                    textureLoader.load(path, (texture) => {{
                        const geometry = new THREE.PlaneGeometry(2, 2);
                        const material = new THREE.MeshBasicMaterial({{
                            map: texture,
                            side: THREE.DoubleSide
                        }});
                        const plane = new THREE.Mesh(geometry, material);
                        
                        const angle = (index / imageCount) * Math.PI * 2;
                        plane.position.x = Math.cos(angle) * radius;
                        plane.position.z = Math.sin(angle) * radius;
                        plane.rotation.y = -angle;
                        
                        group.add(plane);
                    }});
                }});
            }} else if (previewMode === 'sphere') {{
                // 球形排列
                const radius = 3;
                imagePaths.forEach((path, index) => {{
                    textureLoader.load(path, (texture) => {{
                        const geometry = new THREE.PlaneGeometry(1.5, 1.5);
                        const material = new THREE.MeshBasicMaterial({{
                            map: texture,
                            side: THREE.DoubleSide
                        }});
                        const plane = new THREE.Mesh(geometry, material);
                        
                        // 球面坐标
                        const phi = Math.acos(-1 + (2 * index) / imageCount);
                        const theta = Math.sqrt(imageCount * Math.PI) * phi;
                        
                        plane.position.x = radius * Math.cos(theta) * Math.sin(phi);
                        plane.position.y = radius * Math.sin(theta) * Math.sin(phi);
                        plane.position.z = radius * Math.cos(phi);
                        
                        plane.lookAt(0, 0, 0);
                        
                        group.add(plane);
                    }});
                }});
            }} else if (previewMode === 'cube') {{
                // 立方体排列
                const positions = [
                    {{ x: 0, y: 0, z: 2, rx: 0, ry: 0 }},      // 前
                    {{ x: 0, y: 0, z: -2, rx: 0, ry: Math.PI }}, // 后
                    {{ x: -2, y: 0, z: 0, rx: 0, ry: -Math.PI/2 }}, // 左
                    {{ x: 2, y: 0, z: 0, rx: 0, ry: Math.PI/2 }},  // 右
                    {{ x: 0, y: 2, z: 0, rx: -Math.PI/2, ry: 0 }}, // 上
                    {{ x: 0, y: -2, z: 0, rx: Math.PI/2, ry: 0 }}  // 下
                ];
                
                imagePaths.forEach((path, index) => {{
                    if (index >= positions.length) return;
                    
                    textureLoader.load(path, (texture) => {{
                        const geometry = new THREE.PlaneGeometry(2, 2);
                        const material = new THREE.MeshBasicMaterial({{
                            map: texture,
                            side: THREE.DoubleSide
                        }});
                        const plane = new THREE.Mesh(geometry, material);
                        
                        const pos = positions[index];
                        plane.position.set(pos.x, pos.y, pos.z);
                        plane.rotation.set(pos.rx, pos.ry, 0);
                        
                        group.add(plane);
                    }});
                }});
            }}
        }}
        
        function animate() {{
            requestAnimationFrame(animate);
            
            if (isRotating) {{
                group.rotation.y += 0.005 * rotationSpeed;
            }}
            
            renderer.render(scene, camera);
        }}
    </script>
</body>
</html>"""
        return html


# 注册节点
NODE_CLASS_MAPPINGS = {
    "MultiViewImageInput": MultiViewImageInput,
    "MultiView3DPreview": MultiView3DPreview,
    "SaveMultiView3D": SaveMultiView3D,
    "TextListMerge": TextListMerge,
    "TextListCreate": TextListCreate,
    "TextListDisplay": TextListDisplay,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "MultiViewImageInput": "多视角图片输入",
    "MultiView3DPreview": "3D预览",
    "SaveMultiView3D": "保存3D预览HTML",
    "TextListMerge": "文本列表合并",
    "TextListCreate": "创建文本列表",
    "TextListDisplay": "显示文本列表",
}
