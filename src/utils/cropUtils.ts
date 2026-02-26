/**
 * 裁剪工具函数
 * 处理网格区块计算、排序、命名映射、文件名生成
 */

import type { SplitLines, CropBlock, SortOrder, NamingFormat } from '@/types/types';

/** 生成唯一 ID */
export function generateId(): string {
    return `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 从分割线计算网格区块
 * 在 x 轴方向：以 [0, ...splitLines.x, imageWidth] 为边界
 * 在 y 轴方向：以 [0, ...splitLines.y, imageHeight] 为边界
 * 两两配对生成矩形区块
 */
export function computeGridBlocks(
    lines: SplitLines,
    imgW: number,
    imgH: number
): CropBlock[] {
    // 构建边界数组（包含图片边缘）
    const xBounds = [0, ...lines.x.sort((a, b) => a - b), imgW];
    const yBounds = [0, ...lines.y.sort((a, b) => a - b), imgH];

    const blocks: CropBlock[] = [];

    for (let row = 0; row < yBounds.length - 1; row++) {
        for (let col = 0; col < xBounds.length - 1; col++) {
            const x = xBounds[col];
            const y = yBounds[row];
            const width = xBounds[col + 1] - x;
            const height = yBounds[row + 1] - y;

            // 忽略面积太小的区块（< 5px 的边）
            if (width < 5 || height < 5) continue;

            blocks.push({
                id: generateId(),
                x,
                y,
                width,
                height,
                name: null,
            });
        }
    }

    return blocks;
}

/**
 * 按指定排序方式排序区块
 * row-first（行优先）：先按 y 排，再按 x 排（阅读顺序）
 * col-first（列优先）：先按 x 排，再按 y 排
 *
 * 对于自由框模式，使用容差阈值（行高的 30%）将相近 y 坐标视为同一行
 */
export function sortBlocks(blocks: CropBlock[], order: SortOrder): CropBlock[] {
    const sorted = [...blocks];

    if (sorted.length === 0) return sorted;

    // 计算容差：取平均高度的 30% 作为"同行"判定阈值
    const avgHeight = sorted.reduce((sum, b) => sum + b.height, 0) / sorted.length;
    const tolerance = avgHeight * 0.3;

    if (order === 'row-first') {
        sorted.sort((a, b) => {
            // 如果 y 坐标差值在容差内，视为同一行
            if (Math.abs(a.y - b.y) <= tolerance) {
                return a.x - b.x; // 同行按 x 从左到右
            }
            return a.y - b.y; // 不同行按 y 从上到下
        });
    } else {
        sorted.sort((a, b) => {
            const avgWidth = sorted.reduce((sum, bl) => sum + bl.width, 0) / sorted.length;
            const tolX = avgWidth * 0.3;
            if (Math.abs(a.x - b.x) <= tolX) {
                return a.y - b.y; // 同列按 y 从上到下
            }
            return a.x - b.x; // 不同列按 x 从左到右
        });
    }

    return sorted;
}

/**
 * 将名称池映射到排序后的区块
 * 按排序顺序依次分配名称
 */
export function applyNames(
    blocks: CropBlock[],
    names: string[],
    order: SortOrder
): CropBlock[] {
    const sorted = sortBlocks(blocks, order);
    return sorted.map((block, index) => ({
        ...block,
        name: index < names.length ? names[index] : block.name,
    }));
}

/**
 * 计算区块在网格中的行列位置（从 1 开始）
 * 基于 y/x 坐标排序后的序号推算
 */
export function getBlockPosition(
    block: CropBlock,
    allBlocks: CropBlock[],
    order: SortOrder
): { row: number; col: number } {
    const sorted = sortBlocks(allBlocks, order);
    const index = sorted.findIndex((b) => b.id === block.id);

    if (index === -1) return { row: 1, col: 1 };

    // 计算行列：先对所有区块按 y 分组
    const avgHeight = sorted.reduce((sum, b) => sum + b.height, 0) / sorted.length;
    const tolerance = avgHeight * 0.3;

    const rows: CropBlock[][] = [];
    let currentRow: CropBlock[] = [];
    let lastY = -Infinity;

    // 先按 y 排序分行
    const byY = [...sorted].sort((a, b) => a.y - b.y);
    for (const b of byY) {
        if (currentRow.length === 0 || Math.abs(b.y - lastY) <= tolerance) {
            currentRow.push(b);
        } else {
            rows.push(currentRow);
            currentRow = [b];
        }
        lastY = b.y;
    }
    if (currentRow.length > 0) rows.push(currentRow);

    // 每行内按 x 排序
    for (const row of rows) {
        row.sort((a, b) => a.x - b.x);
    }

    // 找到目标区块的行列
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
            if (rows[r][c].id === block.id) {
                return { row: r + 1, col: c + 1 };
            }
        }
    }

    return { row: 1, col: 1 };
}

/**
 * 生成导出文件名
 * 支持 4 种命名格式，处理重名和空名
 */
export function generateFileName(
    block: CropBlock,
    row: number,
    col: number,
    format: NamingFormat,
    usedNames: Map<string, number>
): string {
    const posStr = `${row}_${col}`;
    const name = block.name?.trim() || '';

    let baseName: string;
    switch (format) {
        case 'name':
            baseName = name || `image_${posStr}`;
            break;
        case 'pos':
            baseName = posStr;
            break;
        case 'name_pos':
            baseName = name ? `${name}_${posStr}` : `image_${posStr}`;
            break;
        case 'pos_name':
            baseName = name ? `${posStr}_${name}` : `${posStr}_image`;
            break;
        default:
            baseName = name || `image_${posStr}`;
    }

    // 处理重名：追加数字后缀
    const count = usedNames.get(baseName) || 0;
    if (count > 0) {
        usedNames.set(baseName, count + 1);
        return `${baseName}_${count + 1}.png`;
    } else {
        usedNames.set(baseName, 1);
        return `${baseName}.png`;
    }
}
