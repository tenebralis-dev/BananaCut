'use client';

import React, { useCallback, useState, useRef } from 'react';
import { useEditor, useEditorActions } from '@/store/useEditorStore';
import { generateId } from '@/utils/cropUtils';
import type { CropBlock } from '@/types/types';

/**
 * 自由拉框叠加层
 * - 渲染已有 cropBlocks
 * - 鼠标拖拽创建新框
 * - Shift 键锁定 1:1 比例
 * - 已有框可移动、resize、删除
 * - 框左上角显示可编辑名称
 */
export default function FreeformOverlay() {
    const { state, dispatch } = useEditor();
    const { pushSnapshot } = useEditorActions();
    const { cropBlocks, imageMeta, aspectRatio } = state;

    // 拉框状态
    const [drawing, setDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
    const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
    const [shiftDown, setShiftDown] = useState(false);

    // 移动/resize 状态
    const [dragState, setDragState] = useState<{
        type: 'move' | 'resize';
        blockId: string;
        startMouseX: number;
        startMouseY: number;
        startBlock: CropBlock;
        handle?: string;
    } | null>(null);

    // 名称编辑状态
    const [editingNameId, setEditingNameId] = useState<string | null>(null);
    const [editingNameValue, setEditingNameValue] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    if (!imageMeta) return null;
    const imgW = imageMeta.naturalWidth;
    const imgH = imageMeta.naturalHeight;

    /** 将鼠标事件坐标换算到原图坐标 */
    const toImageCoords = (e: React.MouseEvent) => {
        const el = containerRef.current;
        if (!el) return { x: 0, y: 0 };
        const rect = el.getBoundingClientRect();
        return {
            x: Math.round(((e.clientX - rect.left) / rect.width) * imgW),
            y: Math.round(((e.clientY - rect.top) / rect.height) * imgH),
        };
    };

    // ---- 拉框创建新区块 ----
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (e.button !== 0) return;
            if (dragState) return; // 正在拖拽已有框时不创建新框

            const coords = toImageCoords(e);
            setDrawing(true);
            setDrawStart(coords);
            setDrawCurrent(coords);
            setShiftDown(e.shiftKey);
        },
        [dragState, imgW, imgH]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            setShiftDown(e.shiftKey);

            if (drawing) {
                setDrawCurrent(toImageCoords(e));
                return;
            }

            if (dragState) {
                const coords = toImageCoords(e);
                const dx = coords.x - dragState.startMouseX;
                const dy = coords.y - dragState.startMouseY;

                if (dragState.type === 'move') {
                    let newX = dragState.startBlock.x + dx;
                    let newY = dragState.startBlock.y + dy;
                    newX = Math.max(0, Math.min(newX, imgW - dragState.startBlock.width));
                    newY = Math.max(0, Math.min(newY, imgH - dragState.startBlock.height));

                    dispatch({
                        type: 'UPDATE_CROP_BLOCK',
                        payload: { id: dragState.blockId, updates: { x: newX, y: newY } },
                    });
                } else if (dragState.type === 'resize') {
                    const sb = dragState.startBlock;
                    let newX = sb.x, newY = sb.y, newW = sb.width, newH = sb.height;

                    switch (dragState.handle) {
                        case 'se':
                            newW = Math.max(10, sb.width + dx);
                            newH = Math.max(10, sb.height + dy);
                            break;
                        case 'sw':
                            newX = Math.min(sb.x + sb.width - 10, sb.x + dx);
                            newW = sb.x + sb.width - newX;
                            newH = Math.max(10, sb.height + dy);
                            break;
                        case 'ne':
                            newW = Math.max(10, sb.width + dx);
                            newY = Math.min(sb.y + sb.height - 10, sb.y + dy);
                            newH = sb.y + sb.height - newY;
                            break;
                        case 'nw':
                            newX = Math.min(sb.x + sb.width - 10, sb.x + dx);
                            newW = sb.x + sb.width - newX;
                            newY = Math.min(sb.y + sb.height - 10, sb.y + dy);
                            newH = sb.y + sb.height - newY;
                            break;
                    }

                    dispatch({
                        type: 'UPDATE_CROP_BLOCK',
                        payload: { id: dragState.blockId, updates: { x: newX, y: newY, width: newW, height: newH } },
                    });
                }
            }
        },
        [drawing, dragState, imgW, imgH, dispatch]
    );

    const handleMouseUp = useCallback(() => {
        if (drawing) {
            setDrawing(false);
            // 计算绘制区域
            let x = Math.min(drawStart.x, drawCurrent.x);
            let y = Math.min(drawStart.y, drawCurrent.y);
            let w = Math.abs(drawCurrent.x - drawStart.x);
            let h = Math.abs(drawCurrent.y - drawStart.y);

            // Shift 或 1:1 模式：锁定正方形
            if (shiftDown || aspectRatio.mode === '1:1') {
                const size = Math.max(w, h);
                w = size;
                h = size;
            } else if (aspectRatio.mode === 'custom' && aspectRatio.customRatio) {
                const ratio = aspectRatio.customRatio.w / aspectRatio.customRatio.h;
                if (w / h > ratio) {
                    w = Math.round(h * ratio);
                } else {
                    h = Math.round(w / ratio);
                }
            }

            // 忽略太小的框（< 10px）
            if (w >= 10 && h >= 10) {
                // 限制在图片范围内
                x = Math.max(0, Math.min(x, imgW - w));
                y = Math.max(0, Math.min(y, imgH - h));

                dispatch({
                    type: 'ADD_CROP_BLOCK',
                    payload: { id: generateId(), x, y, width: w, height: h, name: null },
                });
            }
            return;
        }

        if (dragState) {
            setDragState(null);
        }
    }, [drawing, drawStart, drawCurrent, shiftDown, aspectRatio, dragState, imgW, imgH, dispatch]);

    // ---- 已有框的交互 ----
    const handleBlockMouseDown = (e: React.MouseEvent, block: CropBlock) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        pushSnapshot();
        const coords = toImageCoords(e);
        setDragState({
            type: 'move',
            blockId: block.id,
            startMouseX: coords.x,
            startMouseY: coords.y,
            startBlock: { ...block },
        });
    };

    const handleResizeMouseDown = (e: React.MouseEvent, block: CropBlock, handle: string) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        pushSnapshot();
        const coords = toImageCoords(e);
        setDragState({
            type: 'resize',
            blockId: block.id,
            startMouseX: coords.x,
            startMouseY: coords.y,
            startBlock: { ...block },
            handle,
        });
    };

    const handleDeleteBlock = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        dispatch({ type: 'REMOVE_CROP_BLOCK', payload: id });
    };

    // ---- 名称编辑 ----
    const startEditName = (block: CropBlock) => {
        setEditingNameId(block.id);
        setEditingNameValue(block.name || '');
    };

    const commitEditName = () => {
        if (editingNameId) {
            dispatch({
                type: 'SET_BLOCK_NAME',
                payload: { id: editingNameId, name: editingNameValue || null },
            });
            setEditingNameId(null);
        }
    };

    // ---- 拉框预览的计算 ----
    let previewRect: { x: number; y: number; w: number; h: number } | null = null;
    if (drawing) {
        let x = Math.min(drawStart.x, drawCurrent.x);
        let y = Math.min(drawStart.y, drawCurrent.y);
        let w = Math.abs(drawCurrent.x - drawStart.x);
        let h = Math.abs(drawCurrent.y - drawStart.y);
        if (shiftDown || aspectRatio.mode === '1:1') {
            const size = Math.max(w, h);
            w = size;
            h = size;
        }
        previewRect = { x, y, w, h };
    }

    return (
        <div
            ref={containerRef}
            style={{ position: 'absolute', inset: 0 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* 已有裁剪框 */}
            {cropBlocks.map((block, idx) => (
                <div
                    key={block.id}
                    className="crop-block"
                    style={{
                        left: `${(block.x / imgW) * 100}%`,
                        top: `${(block.y / imgH) * 100}%`,
                        width: `${(block.width / imgW) * 100}%`,
                        height: `${(block.height / imgH) * 100}%`,
                    }}
                    onMouseDown={(e) => handleBlockMouseDown(e, block)}
                >
                    {/* 名称标签 */}
                    <div
                        className="crop-block-name"
                        onClick={(e) => {
                            e.stopPropagation();
                            startEditName(block);
                        }}
                    >
                        {editingNameId === block.id ? (
                            <input
                                className="crop-block-name-input"
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value)}
                                onBlur={commitEditName}
                                onKeyDown={(e) => e.key === 'Enter' && commitEditName()}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            block.name || `#${idx + 1}`
                        )}
                    </div>

                    {/* 删除按钮 */}
                    <button
                        className="crop-block-delete"
                        onClick={(e) => handleDeleteBlock(e, block.id)}
                    >
                        ×
                    </button>

                    {/* Resize handles */}
                    {['nw', 'ne', 'sw', 'se'].map((h) => (
                        <div
                            key={h}
                            className={`resize-handle ${h}`}
                            onMouseDown={(e) => handleResizeMouseDown(e, block, h)}
                        />
                    ))}
                </div>
            ))}

            {/* 拉框预览 */}
            {previewRect && (
                <div
                    className="draw-preview"
                    style={{
                        left: `${(previewRect.x / imgW) * 100}%`,
                        top: `${(previewRect.y / imgH) * 100}%`,
                        width: `${(previewRect.w / imgW) * 100}%`,
                        height: `${(previewRect.h / imgH) * 100}%`,
                    }}
                />
            )}
        </div>
    );
}
