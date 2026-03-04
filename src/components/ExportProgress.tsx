'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor } from '@/store/useEditorStore';
import { computeGridBlocks, sortBlocks } from '@/utils/cropUtils';
import { exportToZip } from '@/utils/exportUtils';
import type { CropBlock } from '@/types/types';

/**
 * 导出进度条组件
 * isExporting 触发时开始处理
 */
export default function ExportProgress() {
    const { state, dispatch } = useEditor();
    const { isExporting, exportProgress, imageMeta, editMode, splitLines, cropBlocks, namingFormat, sortOrder, squarePadding, resizeSetting } = state;
    const exportingRef = useRef(false);

    useEffect(() => {
        if (!isExporting || !imageMeta || exportingRef.current) return;

        const doExport = async () => {
            exportingRef.current = true;

            // 创建 Image 对象
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.src = imageMeta.src;
            });

            // 获取区块
            let blocks: CropBlock[];
            if (editMode === 'grid') {
                blocks = computeGridBlocks(splitLines, imageMeta.naturalWidth, imageMeta.naturalHeight);
                // 合并已有名称
                if (cropBlocks.length === blocks.length) {
                    blocks = blocks.map((b, i) => ({ ...b, name: cropBlocks[i]?.name ?? b.name }));
                }
            } else {
                blocks = cropBlocks;
            }

            const sorted = sortBlocks(blocks, sortOrder);

            try {
                await exportToZip(img, sorted, namingFormat, sortOrder, squarePadding, (current, total) => {
                    dispatch({ type: 'SET_EXPORT_PROGRESS', payload: { current, total } });
                }, resizeSetting);
            } catch (err) {
                console.error('导出失败:', err);
            } finally {
                dispatch({ type: 'SET_EXPORTING', payload: false });
                dispatch({ type: 'SET_EXPORT_PROGRESS', payload: null });
                exportingRef.current = false;
            }
        };

        doExport();
    }, [isExporting, imageMeta, editMode, splitLines, cropBlocks, namingFormat, sortOrder, squarePadding, resizeSetting, dispatch]);

    if (!isExporting || !exportProgress) return null;

    const pct = Math.round((exportProgress.current / exportProgress.total) * 100);

    return (
        <div className="progress-overlay">
            <div className="progress-card">
                <div style={{ fontSize: 24, marginBottom: 12 }}>📦</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>正在导出...</div>
                <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="progress-text">
                    {exportProgress.current} / {exportProgress.total} ({pct}%)
                </div>
            </div>
        </div>
    );
}
