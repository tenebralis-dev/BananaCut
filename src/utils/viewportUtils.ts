/**
 * 视口坐标转换工具
 * 处理显示坐标 ↔ 原图坐标之间的映射
 */

import type { ViewportState } from '@/types/types';

/**
 * 显示坐标 → 原图坐标
 * 用于将鼠标在页面上的位置转换为原图上的像素位置
 */
export function displayToImage(
    displayX: number,
    displayY: number,
    viewport: ViewportState
): { x: number; y: number } {
    return {
        x: (displayX - viewport.offsetX) / viewport.scale,
        y: (displayY - viewport.offsetY) / viewport.scale,
    };
}

/**
 * 原图坐标 → 显示坐标
 * 用于将原图上的位置转换为页面上的像素位置
 */
export function imageToDisplay(
    imageX: number,
    imageY: number,
    viewport: ViewportState
): { x: number; y: number } {
    return {
        x: imageX * viewport.scale + viewport.offsetX,
        y: imageY * viewport.scale + viewport.offsetY,
    };
}

/**
 * 限制缩放范围
 */
export function clampScale(scale: number): number {
    return Math.min(Math.max(scale, 0.1), 5); // 10% ~ 500%
}

/**
 * 以某个锚点为中心进行缩放
 * 常用于鼠标滚轮缩放（以鼠标位置为锚点）
 */
export function zoomAtPoint(
    viewport: ViewportState,
    anchorX: number,  // 锚点在容器内的 x 坐标
    anchorY: number,  // 锚点在容器内的 y 坐标
    newScale: number
): ViewportState {
    const clamped = clampScale(newScale);
    const ratio = clamped / viewport.scale;

    return {
        scale: clamped,
        offsetX: anchorX - (anchorX - viewport.offsetX) * ratio,
        offsetY: anchorY - (anchorY - viewport.offsetY) * ratio,
    };
}

/**
 * 计算图片适配容器的初始缩放和偏移
 * 使图片居中显示在容器内
 */
export function fitToContainer(
    imgW: number,
    imgH: number,
    containerW: number,
    containerH: number,
    padding: number = 40
): ViewportState {
    const availW = containerW - padding * 2;
    const availH = containerH - padding * 2;
    const scale = Math.min(availW / imgW, availH / imgH, 1);

    return {
        scale,
        offsetX: (containerW - imgW * scale) / 2,
        offsetY: (containerH - imgH * scale) / 2,
    };
}
