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
                
                // 创建预览容器
                const previewWidget = this.addCustomWidget(
                    ComfyWidgets.CANVAS(this, "preview", {})
                );
                
                previewWidget.name = "3d_preview";
                previewWidget.canvas = document.createElement("canvas");
                previewWidget.canvas.style.width = "100%";
                previewWidget.canvas.style.height = "400px";
                
                // 存储引用
                this.previewWidget = previewWidget;
                this.previewCanvas = previewWidget.canvas;
                
                return result;
            };
            
            // 处理执行结果
            const onExecuted = nodeType.prototype.onExecuted;
            
            nodeType.prototype.onExecuted = function (message) {
                onExecuted?.apply(this, arguments);
                
                if (message && message.images) {
                    // 渲染3D预览
                    this.render3DPreview(
                        message.images,
                        message.preview_mode || "carousel",
                        message.rotation_speed || 1.0,
                        message.auto_rotate !== false
                    );
                }
            };
            
            // 3D渲染方法
            nodeType.prototype.render3DPreview = function (images, mode, speed, autoRotate) {
                // 如果没有Three.js，动态加载
                if (typeof THREE === 'undefined') {
                    this.loadThreeJS().then(() => {
                        this.initThreeScene(images, mode, speed, autoRotate);
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
                
                images.forEach((imageData, index) => {
                    textureLoader.load(imageData, (texture) => {
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
                
                // 保存引用
                this.threeRenderer = renderer;
                this.threeScene = scene;
                this.threeCamera = camera;
                this.threeGroup = group;
            };
        }
    }
});
