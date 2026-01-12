/**
 * ComfyUI Multi-View 3D Preview Extension
 * 在ComfyUI界面中直接预览3D效果
 */

import { app } from "../../scripts/app.js";

// 注册扩展
app.registerExtension({
    name: "Comfy.MultiView3DPreview",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "MultiView3DPreview") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function () {
                const result = onNodeCreated?.apply(this, arguments);
                
                // 创建一个隐藏的widget来存储数据
                const widget = this.addWidget("button", "3D_preview_widget", null, () => {});
                widget.serialize = false;
                
                // 存储引用
                this.preview3DWidget = widget;
                
                // 增加节点高度以容纳3D预览
                this.setSize([Math.max(400, this.size[0]), this.size[1] + 450]);
                
                return result;
            };
            
            // 自定义绘制
            const onDrawForeground = nodeType.prototype.onDrawForeground;
            nodeType.prototype.onDrawForeground = function(ctx) {
                if (onDrawForeground) {
                    onDrawForeground.apply(this, arguments);
                }
                
                // 如果有3D容器，确保它在正确位置
                if (this.preview3DContainer && this.preview3DContainer.parentElement) {
                    const rect = this.getBounding();
                    const container = this.preview3DContainer;
                    
                    // 更新容器位置
                    container.style.left = rect[0] + "px";
                    container.style.top = (rect[1] + 80) + "px";
                    container.style.width = (rect[2] - 20) + "px";
                }
            };
            
            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                if (onExecuted) {
                    onExecuted.apply(this, arguments);
                }
                
                if (message && message.images) {
                    const previewMode = message.preview_mode ? message.preview_mode[0] : "carousel";
                    const rotationSpeed = message.rotation_speed ? message.rotation_speed[0] : 1.0;
                    const autoRotate = message.auto_rotate ? message.auto_rotate[0] : true;
                    
                    this.render3DPreview(message.images, previewMode, rotationSpeed, autoRotate);
                }
            };
            
            nodeType.prototype.render3DPreview = function (images, mode, speed, autoRotate) {
                console.log("Starting 3D preview with", images.length, "images");
                
                // 如果没有Three.js，动态加载
                if (typeof THREE === 'undefined') {
                    console.log("Loading Three.js...");
                    this.loadThreeJS().then(() => {
                        console.log("Three.js loaded successfully");
                        this.createPreviewContainer(images, mode, speed, autoRotate);
                    }).catch((error) => {
                        console.error("Failed to load Three.js:", error);
                    });
                } else {
                    console.log("Three.js already loaded");
                    this.createPreviewContainer(images, mode, speed, autoRotate);
                }
            };
            
            nodeType.prototype.loadThreeJS = function () {
                return new Promise((resolve, reject) => {
                    if (document.querySelector('script[src*="three.min.js"]')) {
                        resolve();
                        return;
                    }
                    
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            };
            
            nodeType.prototype.createPreviewContainer = function(images, mode, speed, autoRotate) {
                const self = this;
                
                // 移除旧容器
                if (this.preview3DContainer) {
                    this.preview3DContainer.remove();
                }
                
                // 创建新容器
                const container = document.createElement("div");
                container.className = "multiview-3d-container";
                container.style.position = "fixed";
                container.style.width = "380px";
                container.style.height = "400px";
                container.style.backgroundColor = "#1a1a1a";
                container.style.borderRadius = "8px";
                container.style.overflow = "hidden";
                container.style.zIndex = "100";
                container.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
                
                // 创建 canvas
                const canvas = document.createElement("canvas");
                canvas.width = 380;
                canvas.height = 400;
                canvas.style.display = "block";
                container.appendChild(canvas);
                
                // 创建状态提示
                const hint = document.createElement("div");
                hint.innerHTML = "⏳ 初始化3D场景...";
                hint.style.position = "absolute";
                hint.style.top = "10px";
                hint.style.left = "10px";
                hint.style.color = "white";
                hint.style.backgroundColor = "rgba(0,0,0,0.7)";
                hint.style.padding = "8px 12px";
                hint.style.borderRadius = "4px";
                hint.style.fontSize = "12px";
                hint.style.zIndex = "10";
                hint.style.cursor = "pointer";
                container.appendChild(hint);
                
                // 添加到body
                document.body.appendChild(container);
                
                // 保存引用
                this.preview3DContainer = container;
                this.preview3DCanvas = canvas;
                this.preview3DHint = hint;
                
                // 初始化3D场景
                this.initThreeScene(canvas, hint, images, mode, speed, autoRotate);
                
                // 更新位置
                const rect = this.getBounding();
                container.style.left = rect[0] + "px";
                container.style.top = (rect[1] + 80) + "px";
            };
            
            nodeType.prototype.initThreeScene = function (canvas, hint, images, mode, speed, autoRotate) {
                const self = this;
                
                console.log("Initializing Three.js scene...");
                
                // 创建场景
                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0x1a1a1a);
                
                // 创建相机
                const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
                camera.position.z = 5;
                
                // 创建渲染器
                const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
                renderer.setSize(canvas.width, canvas.height);
                
                // 创建组
                const group = new THREE.Group();
                scene.add(group);
                
                // 添加光源
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
                scene.add(ambientLight);
                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
                directionalLight.position.set(10, 10, 10);
                scene.add(directionalLight);
                
                // 转换图片URL
                const getImageUrl = (imageData) => {
                    if (typeof imageData === 'string') return imageData;
                    if (typeof imageData === 'object' && imageData.filename) {
                        const params = new URLSearchParams({
                            filename: imageData.filename,
                            subfolder: imageData.subfolder || '',
                            type: imageData.type || 'temp'
                        });
                        return `/view?${params.toString()}`;
                    }
                    return imageData;
                };
                
                // 加载图片
                const textureLoader = new THREE.TextureLoader();
                const imageCount = images.length;
                let loadedCount = 0;
                
                hint.innerHTML = `⏳ 加载图片 0/${imageCount}...`;
                
                images.forEach((imageData, index) => {
                    const imageUrl = getImageUrl(imageData);
                    console.log(`Loading image ${index}:`, imageUrl);
                    
                    textureLoader.load(imageUrl, (texture) => {
                        loadedCount++;
                        hint.innerHTML = `⏳ 加载图片 ${loadedCount}/${imageCount}...`;
                        
                        const geometry = new THREE.PlaneGeometry(2, 2);
                        const material = new THREE.MeshBasicMaterial({
                            map: texture,
                            side: THREE.DoubleSide
                        });
                        const plane = new THREE.Mesh(geometry, material);
                        
                        // 设置位置
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
                        
                        // 所有图片加载完成
                        if (loadedCount === imageCount) {
                            const modeText = {'carousel': '环形', 'sphere': '球形', 'cube': '立方体'}[mode] || mode;
                            hint.innerHTML = `✅ ${modeText} | 🖱️ 拖拽 | ${autoRotate ? '🔄 旋转中' : '⏸️ 暂停'}`;
                            hint.style.backgroundColor = "rgba(0,128,0,0.7)";
                            console.log("All images loaded successfully");
                        }
                    }, undefined, (error) => {
                        console.error(`Failed to load image ${index}:`, error);
                        loadedCount++;
                        hint.innerHTML = `⚠️ 加载图片 ${loadedCount}/${imageCount} (有错误)`;
                    });
                });
                
                // 鼠标控制
                let isDragging = false;
                let previousMousePosition = { x: 0, y: 0 };
                
                canvas.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    e.preventDefault();
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
                    previousMousePosition = { x: e.offsetX, y: e.offsetY };
                });
                
                canvas.addEventListener('mouseup', () => {
                    isDragging = false;
                });
                
                canvas.addEventListener('mouseleave', () => {
                    isDragging = false;
                });
                
                // 点击切换旋转
                let isRotating = autoRotate;
                hint.onclick = () => {
                    isRotating = !isRotating;
                    const modeText = {'carousel': '环形', 'sphere': '球形', 'cube': '立方体'}[mode] || mode;
                    hint.innerHTML = `✅ ${modeText} | 🖱️ 拖拽 | ${isRotating ? '🔄 旋转中' : '⏸️ 暂停'}`;
                };
                
                // 动画循环
                const animate = () => {
                    requestAnimationFrame(animate);
                    if (isRotating) {
                        group.rotation.y += 0.005 * speed;
                    }
                    renderer.render(scene, camera);
                };
                
                animate();
                console.log("Animation started");
            };
            
            // 清理
            const onRemoved = nodeType.prototype.onRemoved;
            nodeType.prototype.onRemoved = function() {
                if (this.preview3DContainer) {
                    this.preview3DContainer.remove();
                }
                if (onRemoved) {
                    onRemoved.apply(this, arguments);
                }
            };
        }
    }
});
