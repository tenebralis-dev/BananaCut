/**
 * 导出工具函数
 * 离屏 Canvas 切图、可选补全正方形、ZIP 打包
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { CropBlock, NamingFormat, SortOrder, SquarePadding } from '@/types/types';
import { sortBlocks, getBlockPosition, generateFileName } from './cropUtils';

/**
 * 离屏 Canvas 切图，可选补全正方形
 *
 * - enabled=true:  取 max(w,h) 为 targetSize，居中绘制
 * - enabled=false: 保持原始 w×h
 * - bgMode='color': 先填充 bgColor 再绘制图片
 * - bgMode='transparent': 默认透明背景
 */
export async function cropAndSquare(
    image: HTMLImageElement,
    block: CropBlock,
    padding: SquarePadding = { enabled: true, bgMode: 'transparent', bgColor: '#ffffff' }
): Promise<Blob> {
    let canvasW: number;
    let canvasH: number;
    let dx: number;
    let dy: number;

    if (padding.enabled) {
        const targetSize = Math.max(block.width, block.height);
        canvasW = targetSize;
        canvasH = targetSize;
        dx = Math.round((targetSize - block.width) / 2);
        dy = Math.round((targetSize - block.height) / 2);
    } else {
        canvasW = block.width;
        canvasH = block.height;
        dx = 0;
        dy = 0;
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建 Canvas 2D 上下文');

    // 纯色背景填充
    if (padding.enabled && padding.bgMode === 'color') {
        ctx.fillStyle = padding.bgColor;
        ctx.fillRect(0, 0, canvasW, canvasH);
    }

    // 从原图裁剪并绘制
    ctx.drawImage(
        image,
        block.x, block.y, block.width, block.height,
        dx, dy, block.width, block.height
    );

    // 转换为 Blob
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob 失败'));
            },
            'image/png'
        );
    });
}

/**
 * 批量导出为 ZIP
 */
export async function exportToZip(
    image: HTMLImageElement,
    blocks: CropBlock[],
    format: NamingFormat,
    sortOrder: SortOrder,
    padding: SquarePadding,
    onProgress: (current: number, total: number) => void
): Promise<void> {
    const zip = new JSZip();
    const sorted = sortBlocks(blocks, sortOrder);
    const total = sorted.length;
    const usedNames = new Map<string, number>();

    for (let i = 0; i < sorted.length; i++) {
        const block = sorted[i];
        const { row, col } = getBlockPosition(block, blocks, sortOrder);
        const fileName = generateFileName(block, row, col, format, usedNames);

        const blob = await cropAndSquare(image, block, padding);
        zip.file(fileName, blob);

        onProgress(i + 1, total);

        if (i % 5 === 0) {
            await new Promise((r) => setTimeout(r, 0));
        }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, 'sprites_export.zip');
}

/**
 * 生成单个区块的预览图（用于预览 Modal）
 * 返回 data:URL
 */
export async function generatePreviewDataUrl(
    image: HTMLImageElement,
    block: CropBlock,
    padding: SquarePadding = { enabled: true, bgMode: 'transparent', bgColor: '#ffffff' }
): Promise<string> {
    let canvasW: number;
    let canvasH: number;
    let dx: number;
    let dy: number;

    if (padding.enabled) {
        const targetSize = Math.max(block.width, block.height);
        canvasW = targetSize;
        canvasH = targetSize;
        dx = Math.round((targetSize - block.width) / 2);
        dy = Math.round((targetSize - block.height) / 2);
    } else {
        canvasW = block.width;
        canvasH = block.height;
        dx = 0;
        dy = 0;
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建 Canvas 2D 上下文');

    if (padding.enabled && padding.bgMode === 'color') {
        ctx.fillStyle = padding.bgColor;
        ctx.fillRect(0, 0, canvasW, canvasH);
    }

    ctx.drawImage(
        image,
        block.x, block.y, block.width, block.height,
        dx, dy, block.width, block.height
    );

    return canvas.toDataURL('image/png');
}
