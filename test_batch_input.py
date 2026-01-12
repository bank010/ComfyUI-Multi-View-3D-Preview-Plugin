"""
测试批量图片输入功能
"""

import torch
import numpy as np


class MultiViewImageBatch:
    """多视角图片批量输入节点（接受图片列表）"""
    
    def process_batch(self, images):
        """处理批量图片输入"""
        # images 的形状是 [batch, height, width, channels]
        batch_size = images.shape[0]
        
        if batch_size == 0:
            raise ValueError("图片列表不能为空")
        
        # 将批量图片拆分为单独的图片
        image_list = []
        for i in range(batch_size):
            # 保持维度，每个图片仍然是 [1, height, width, channels]
            img = images[i:i+1]
            image_list.append(img)
        
        return ({"images": image_list},)


def test_batch_input():
    """测试批量输入功能"""
    
    print("=" * 60)
    print("测试多视角图片批量输入功能")
    print("=" * 60)
    
    # 创建测试数据：5张 512x512 的 RGB 图片
    batch_size = 5
    height = 512
    width = 512
    channels = 3
    
    # 创建批量图片 tensor
    images = torch.rand(batch_size, height, width, channels)
    
    print(f"\n1. 创建测试图片批量")
    print(f"   形状: {images.shape}")
    print(f"   批量大小: {batch_size}")
    print(f"   图片尺寸: {height}x{width}")
    print(f"   通道数: {channels}")
    
    # 测试批量输入节点
    print("\n2. 处理批量输入")
    processor = MultiViewImageBatch()
    result = processor.process_batch(images)
    
    multi_view_images = result[0]
    image_list = multi_view_images["images"]
    
    print(f"   输出图片列表长度: {len(image_list)}")
    
    # 验证每张图片
    print("\n3. 验证每张图片")
    for i, img in enumerate(image_list):
        print(f"   图片 {i+1}: 形状 {img.shape}")
        assert img.shape == (1, height, width, channels), f"图片 {i+1} 形状不正确"
    
    print("\n4. 测试不同批量大小")
    test_sizes = [1, 3, 6, 8]
    for size in test_sizes:
        test_images = torch.rand(size, height, width, channels)
        result = processor.process_batch(test_images)
        image_list = result[0]["images"]
        print(f"   批量大小 {size}: 输出 {len(image_list)} 张图片 ✓")
        assert len(image_list) == size, f"批量大小 {size} 处理失败"
    
    print("\n" + "=" * 60)
    print("✅ 所有测试通过!")
    print("=" * 60)


def test_comparison():
    """对比旧的输入方式和新的批量输入方式"""
    
    print("\n\n" + "=" * 60)
    print("对比：单个输入 vs 批量输入")
    print("=" * 60)
    
    batch_size = 6
    height = 512
    width = 512
    channels = 3
    
    print("\n【旧方式】单个图片输入:")
    print("  - 需要连接 6 个独立的图片输入")
    print("  - image_1, image_2, image_3, image_4, image_5, image_6")
    print("  - 节点连线复杂")
    
    print("\n【新方式】批量图片输入:")
    print("  - 只需要一个图片批量输入")
    print("  - images (包含 6 张图片)")
    print("  - 节点连线简洁")
    
    # 创建批量图片
    images_batch = torch.rand(batch_size, height, width, channels)
    
    print(f"\n示例数据:")
    print(f"  批量形状: {images_batch.shape}")
    print(f"  = {batch_size} 张 {height}x{width}x{channels} 的图片")
    
    # 处理
    processor = MultiViewImageBatch()
    result = processor.process_batch(images_batch)
    
    print(f"\n处理结果:")
    print(f"  输出图片列表: {len(result[0]['images'])} 张")
    print(f"  每张图片形状: {result[0]['images'][0].shape}")
    
    print("\n✅ 新方式更简洁高效!")


if __name__ == "__main__":
    test_batch_input()
    test_comparison()
    
    print("\n\n" + "=" * 60)
    print("🎉 批量输入功能测试完成!")
    print("=" * 60)
    print("\n使用说明:")
    print("1. 如果你的图片已经是列表格式（batch），使用 '多视角图片批量输入' 节点")
    print("2. 如果你有多个单独的图片，使用 '多视角图片输入（单个）' 节点")
    print("\n示例工作流:")
    print("  [图片批量] → [多视角图片批量输入] → [3D预览]")
    print("  更简洁！只需一根连线！")
