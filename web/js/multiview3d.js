/**
 * ComfyUI Multi-View 3D Preview Extension
 * 在ComfyUI界面中直接预览3D效果
 */

import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

// 注册扩展
app.registerExtension({
    name: "Comfy.MultiView3DPreview",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "MultiView3DPreview") {
            // 添加3D预览小部件
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function () {
                const result = onNodeCreated?.apply(this, arguments);
                
                // 创建容器 div
                const container = document.createElement("div");
                container.style.width = "100%";
                container.style.minHeight = "400px";
                container.style.backgroundColor = "#1a1a1a";
                container.style.borderRadius = "8px";
                container.style.overflow = "hidden";
                container.style.position = "relative";
                
                // 创建 canvas
                const canvas = document.createElement("canvas");
                canvas.style.width = "100%";
                canvas.style.height = "400px";
                canvas.style.display = "block";
                container.appendChild(canvas);
                
                // 创建控制提示
                const hint = document.createElement("div");
                hint.innerHTML = "🖱️ 拖拽旋转 | 🔄 自动旋转中...";
                hint.style.position = "absolute";
                hint.style.top = "10px";
                hint.style.left = "10px";
                hint.style.color = "white";
                hint.style.backgroundColor = "rgba(0,0,0,0.6)";
                hint.style.padding = "8px 12px";
                hint.style.borderRadius = "4px";
                hint.style.fontSize = "12px";
                hint.style.fontFamily = "monospace";
                hint.style.zIndex = "10";
                container.appendChild(hint);
                
                // 添加到节点
                const widget = this.addDOMWidget("3d_preview", "customtext", container, {
                    serialize: false,
                    hideOnZoom: false
                });
                
                widget.computeSize = function(width) {
                    return [width, 420];
                };
                
                // 存储引用
                this.previewContainer = container;
                this.previewCanvas = canvas;
                this.previewHint = hint;
                this.previewWidget = widget;
                
                // 设置节点大小
                this.setSize([400, 500]);
                
                return result;
            };
            
            // 处理执行结果
            const onExecuted = nodeType.prototype.onExecuted;
            
            nodeType.prototype.onExecuted = function (message) {
                onExecuted?.apply(this, arguments);
                
                if (message && message.images) {
                    // 提取参数（从数组中取第一个值）
                    const previewMode = message.preview_mode ? message.preview_mode[0] : "carousel";
                    const rotationSpeed = message.rotation_speed ? message.rotation_speed[0] : 1.0;
                    const autoRotate = message.auto_rotate ? message.auto_rotate[0] : true;
                    
                    // 渲染3D预览
                    this.render3DPreview(
                        message.images,
                        previewMode,
                        rotationSpeed,
                        autoRotate
                    );
                }
            };
            
            // 3D渲染方法
            nodeType.prototype.render3DPreview = function (images, mode, speed, autoRotate) {
                // 显示加载提示
                if (this.previewHint) {
                    this.previewHint.innerHTML = "⏳ 加载 3D 场景...";
                }
                
                // 如果没有Three.js，动态加载
                if (typeof THREE === 'undefined') {
                    if (this.previewHint) {
                        this.previewHint.innerHTML = "📦 加载 Three.js 库...";
                    }
                    this.loadThreeJS().then(() => {
                        this.initThreeScene(images, mode, speed, autoRotate);
                    }).catch((error) => {
                        console.error("Failed to load Three.js:", error);
                        if (this.previewHint) {
                            this.previewHint.innerHTML = "❌ 加载失败";
                            this.previewHint.style.backgroundColor = "rgba(255,0,0,0.6)";
                        }
                    });
                } else {
                    this.initThreeScene(images, mode, speed, autoRotate);
                }
            };
            
            // 加载Three.js
            nodeType.prototype.loadThreeJS = function () {
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            };
            
            // 初始化Three.js场景
            nodeType.prototype.initThreeScene = function (images, mode, speed, autoRotate) {
                const self = this;
                const canvas = this.previewCanvas;
                
                // 清理旧场景
                if (this.threeRenderer) {
                    this.threeRenderer.dispose();
                }
                
                // 创建场景
                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0x1a1a1a);
                
                // 创建相机
                const camera = new THREE.PerspectiveCamera(
                    75,
                    canvas.clientWidth / canvas.clientHeight,
                    0.1,
                    1000
                );
                camera.position.z = 5;
                
                // 创建渲染器
                const renderer = new THREE.WebGLRenderer({ 
                    canvas: canvas,
                    antialias: true 
                });
                renderer.setSize(canvas.clientWidth, canvas.clientHeight);
                
                // 创建组
                const group = new THREE.Group();
                scene.add(group);
                
                // 添加光源
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
                scene.add(ambientLight);
                
                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
                directionalLight.position.set(10, 10, 10);
                scene.add(directionalLight);
                
                // 加载图片纹理
                const textureLoader = new THREE.TextureLoader();
                const imageCount = images.length;
                let loadedCount = 0;
                
                // 转换图片数据为 URL
                const getImageUrl = (imageData) => {
                    // 如果是 base64 数据
                    if (typeof imageData === 'string' && imageData.startsWith('data:')) {
                        return imageData;
                    }
                    // 如果是文件路径对象
                    if (typeof imageData === 'object' && imageData.filename) {
                        const params = new URLSearchParams({
                            filename: imageData.filename,
                            subfolder: imageData.subfolder || '',
                            type: imageData.type || 'temp'
                        });
                        return `/view?${params.toString()}`;
                    }
                    // 否则直接返回
                    return imageData;
                };
                
                // 更新加载状态
                const updateLoadingStatus = () => {
                    if (self.previewHint) {
                        self.previewHint.innerHTML = `⏳ 加载图片 ${loadedCount}/${imageCount}...`;
                    }
                };
                
                updateLoadingStatus();
                
                images.forEach((imageData, index) => {
                    const imageUrl = getImageUrl(imageData);
                    textureLoader.load(imageUrl, (texture) => {
                        loadedCount++;
                        updateLoadingStatus();
                        
                        const geometry = new THREE.PlaneGeometry(2, 2);
                        const material = new THREE.MeshBasicMaterial({
                            map: texture,
                            side: THREE.DoubleSide
                        });
                        const plane = new THREE.Mesh(geometry, material);
                        
                        // 根据模式设置位置
                        if (mode === 'carousel') {
                            const radius = 3;
                            const angle = (index / imageCount) * Math.PI * 2;
                            plane.position.x = Math.cos(angle) * radius;
                            plane.position.z = Math.sin(angle) * radius;
                            plane.rotation.y = -angle;
                        } else if (mode === 'sphere') {
                            const radius = 3;
                            const phi = Math.acos(-1 + (2 * index) / imageCount);
                            const theta = Math.sqrt(imageCount * Math.PI) * phi;
                            
                            plane.position.x = radius * Math.cos(theta) * Math.sin(phi);
                            plane.position.y = radius * Math.sin(theta) * Math.sin(phi);
                            plane.position.z = radius * Math.cos(phi);
                            plane.lookAt(0, 0, 0);
                        } else if (mode === 'cube') {
                            const positions = [
                                { x: 0, y: 0, z: 2, rx: 0, ry: 0 },
                                { x: 0, y: 0, z: -2, rx: 0, ry: Math.PI },
                                { x: -2, y: 0, z: 0, rx: 0, ry: -Math.PI/2 },
                                { x: 2, y: 0, z: 0, rx: 0, ry: Math.PI/2 },
                                { x: 0, y: 2, z: 0, rx: -Math.PI/2, ry: 0 },
                                { x: 0, y: -2, z: 0, rx: Math.PI/2, ry: 0 }
                            ];
                            
                            if (index < positions.length) {
                                const pos = positions[index];
                                plane.position.set(pos.x, pos.y, pos.z);
                                plane.rotation.set(pos.rx, pos.ry, 0);
                            }
                        }
                        
                        group.add(plane);
                        
                        // 所有图片加载完成后更新提示
                        if (loadedCount === imageCount) {
                            const modeText = {
                                'carousel': '环形',
                                'sphere': '球形',
                                'cube': '立方体'
                            }[mode] || mode;
                            if (self.previewHint) {
                                self.previewHint.innerHTML = `✅ ${modeText} | 🖱️ 拖拽旋转 | ${autoRotate ? '🔄 自动旋转 (点击暂停)' : '⏸️ 已暂停 (点击旋转)'}`;
                                self.previewHint.style.backgroundColor = "rgba(0,128,0,0.7)";
                            }
                        }
                    }, undefined, (error) => {
                        console.error(`Failed to load image ${index}:`, error);
                        loadedCount++;
                        updateLoadingStatus();
                    });
                });
                
                // 鼠标控制
                let isDragging = false;
                let previousMousePosition = { x: 0, y: 0 };
                
                canvas.addEventListener('mousedown', (e) => {
                    isDragging = true;
                });
                
                canvas.addEventListener('mousemove', (e) => {
                    if (isDragging) {
                        const deltaMove = {
                            x: e.offsetX - previousMousePosition.x,
                            y: e.offsetY - previousMousePosition.y
                        };
                        
                        group.rotation.y += deltaMove.x * 0.01;
                        group.rotation.x += deltaMove.y * 0.01;
                    }
                    
                    previousMousePosition = {
                        x: e.offsetX,
                        y: e.offsetY
                    };
                });
                
                canvas.addEventListener('mouseup', () => {
                    isDragging = false;
                });
                
                // 动画循环
                let isRotating = autoRotate;
                
                const animate = () => {
                    requestAnimationFrame(animate);
                    
                    if (isRotating) {
                        group.rotation.y += 0.005 * speed;
                    }
                    
                    renderer.render(scene, camera);
                };
                
                animate();
                
                // 点击提示切换自动旋转
                if (self.previewHint) {
                    self.previewHint.style.cursor = "pointer";
                    self.previewHint.onclick = () => {
                        isRotating = !isRotating;
                        const modeText = {
                            'carousel': '环形',
                            'sphere': '球形',
                            'cube': '立方体'
                        }[mode] || mode;
                        self.previewHint.innerHTML = `✅ ${modeText} | 🖱️ 拖拽旋转 | ${isRotating ? '🔄 自动旋转 (点击暂停)' : '⏸️ 已暂停 (点击旋转)'}`;
                    };
                }
                
                // 保存引用
                this.threeRenderer = renderer;
                this.threeScene = scene;
                this.threeCamera = camera;
                this.threeGroup = group;
            };
        }
    }
});
