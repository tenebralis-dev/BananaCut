'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditor } from '@/store/useEditorStore';
import { computeGridBlocks, sortBlocks, generateFileName, getBlockPosition } from '@/utils/cropUtils';
import { generatePreviewDataUrl } from '@/utils/exportUtils';
import type { CropBlock, NamingFormat, SortOrder } from '@/types/types';

/**
 * 导出前预览 Modal
 * 展示所有待导出图块的缩略图 + 文件名
 */
export default function PreviewModal() {
    const { state, dispatch } = useEditor();
    const { showPreview, imageMeta, editMode, splitLines, cropBlocks, sortOrder, namingFormat, namePool, squarePadding } = state;

    const [previews, setPreviews] = useState<Array<{ dataUrl: string; fileName: string }>>([]);
    const [loading, setLoading] = useState(false);
    const imgRef = useRef<HTMLImageElement | null>(null);

    // 获取当前区块
    const getBlocks = (): CropBlock[] => {
        if (editMode === 'grid' && imageMeta) {
            const blocks = computeGridBlocks(splitLines, imageMeta.naturalWidth, imageMeta.naturalHeight);
            // 如果有 cropBlocks 中的网格名称，合并过来
            if (cropBlocks.length === blocks.length) {
                return blocks.map((b, i) => ({ ...b, name: cropBlocks[i]?.name ?? b.name }));
            }
            return blocks;
        }
        return cropBlocks;
    };

    useEffect(() => {
        if (!showPreview || !imageMeta) return;

        const loadPreviews = async () => {
            setLoading(true);

            // 创建 Image 对象
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.src = imageMeta.src;
            });
            imgRef.current = img;

            const blocks = getBlocks();
            const sorted = sortBlocks(blocks, sortOrder);
            const usedNames = new Map<string, number>();
            const results: Array<{ dataUrl: string; fileName: string }> = [];

            for (const block of sorted) {
                const { row, col } = getBlockPosition(block, blocks, sortOrder);
                const fileName = generateFileName(block, row, col, namingFormat, usedNames);
                const dataUrl = await generatePreviewDataUrl(img, block, squarePadding);
                results.push({ dataUrl, fileName });
            }

            setPreviews(results);
            setLoading(false);
        };

        loadPreviews();
    }, [showPreview, imageMeta, editMode, splitLines, cropBlocks, sortOrder, namingFormat, squarePadding]);

    if (!showPreview) return null;

    return (
        <div className="modal-overlay" onClick={() => dispatch({ type: 'SET_SHOW_PREVIEW', payload: false })}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '70vw' }}>
                <div className="modal-header">
                    <h2>📋 导出预览 ({previews.length} 张)</h2>
                    <button
                        className="btn btn-sm"
                        onClick={() => dispatch({ type: 'SET_SHOW_PREVIEW', payload: false })}
                    >
                        ✕ 关闭
                    </button>
                </div>
                <div className="modal-body">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                            正在生成预览...
                        </div>
                    ) : (
                        <div className="preview-grid">
                            {previews.map((item, idx) => (
                                <div key={idx} className="preview-item">
                                    <img src={item.dataUrl} alt={item.fileName} />
                                    <span className="name">{item.fileName}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button
                        className="btn"
                        onClick={() => dispatch({ type: 'SET_SHOW_PREVIEW', payload: false })}
                    >
                        关闭
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            dispatch({ type: 'SET_SHOW_PREVIEW', payload: false });
                            dispatch({ type: 'SET_EXPORTING', payload: true });
                        }}
                    >
                        📦 确认导出
                    </button>
                </div>
            </div>
        </div>
    );
}
