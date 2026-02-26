'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useEditor, useEditorActions } from '@/store/useEditorStore';

/**
 * 网格线叠加层
 * - 渲染垂直线 (splitLines.x) 和水平线 (splitLines.y)
 * - 支持拖拽移动线
 * - 双击空白区域添加线（方向由 lineDirection 控制）
 * - 双击线上删除线
 * - 显示网格区块的序号标签
 */
export default function GridOverlay() {
    const { state, dispatch } = useEditor();
    const { pushSnapshot } = useEditorActions();
    const { splitLines, lineDirection, imageMeta } = state;

    // 拖拽状态
    const [dragging, setDragging] = useState<{
        axis: 'x' | 'y';
        index: number;
    } | null>(null);
    const hasMoved = useRef(false);

    if (!imageMeta) return null;

    const imgW = imageMeta.naturalWidth;
    const imgH = imageMeta.naturalHeight;

    // ---- 线的拖拽 ----
    const handleLineMouseDown = (
        e: React.MouseEvent,
        axis: 'x' | 'y',
        index: number
    ) => {
        e.stopPropagation();
        e.preventDefault();
        pushSnapshot(); // 拖拽开始时推快照，用于撤销
        setDragging({ axis, index });
        hasMoved.current = false;
    };

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!dragging) return;
            hasMoved.current = true;

            const container = e.currentTarget as HTMLElement;
            const rect = container.getBoundingClientRect();
            let value: number;

            if (dragging.axis === 'x') {
                // 垂直线：计算在原图中的 x 坐标
                value = Math.round(
                    ((e.clientX - rect.left) / rect.width) * imgW
                );
                value = Math.max(1, Math.min(value, imgW - 1));
            } else {
                // 水平线：计算在原图中的 y 坐标
                value = Math.round(
                    ((e.clientY - rect.top) / rect.height) * imgH
                );
                value = Math.max(1, Math.min(value, imgH - 1));
            }

            dispatch({
                type: 'MOVE_LINE',
                payload: { axis: dragging.axis, index: dragging.index, value },
            });
        },
        [dragging, imgW, imgH, dispatch]
    );

    const handleMouseUp = useCallback(() => {
        setDragging(null);
    }, []);

    // ---- 双击事件 ----
    const handleDoubleClick = useCallback(
        (e: React.MouseEvent) => {
            const container = e.currentTarget as HTMLElement;
            const rect = container.getBoundingClientRect();

            if (lineDirection === 'horizontal') {
                // 添加水平线
                const y = Math.round(
                    ((e.clientY - rect.top) / rect.height) * imgH
                );
                dispatch({ type: 'ADD_LINE', payload: { axis: 'y', value: y } });
            } else {
                // 添加垂直线
                const x = Math.round(
                    ((e.clientX - rect.left) / rect.width) * imgW
                );
                dispatch({ type: 'ADD_LINE', payload: { axis: 'x', value: x } });
            }
        },
        [lineDirection, imgW, imgH, dispatch]
    );

    // ---- 双击线：删除 ----
    const handleLineDoubleClick = (
        e: React.MouseEvent,
        axis: 'x' | 'y',
        index: number
    ) => {
        e.stopPropagation();
        dispatch({ type: 'REMOVE_LINE', payload: { axis, index } });
    };

    // ---- 计算网格区块用于显示序号 ----
    const xBounds = [0, ...splitLines.x.slice().sort((a, b) => a - b), imgW];
    const yBounds = [0, ...splitLines.y.slice().sort((a, b) => a - b), imgH];
    let blockIndex = 0;

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: dragging ? 'auto' : undefined,
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
        >
            {/* 垂直线 (x 轴) */}
            {splitLines.x
                .slice()
                .sort((a, b) => a - b)
                .map((x, i) => (
                    <div
                        key={`x-${i}`}
                        className={`grid-line grid-line-x ${dragging?.axis === 'x' && dragging.index === i ? 'active' : ''
                            }`}
                        style={{ left: `${(x / imgW) * 100}%` }}
                        onMouseDown={(e) => handleLineMouseDown(e, 'x', i)}
                        onDoubleClick={(e) => handleLineDoubleClick(e, 'x', i)}
                    />
                ))}

            {/* 水平线 (y 轴) */}
            {splitLines.y
                .slice()
                .sort((a, b) => a - b)
                .map((y, i) => (
                    <div
                        key={`y-${i}`}
                        className={`grid-line grid-line-y ${dragging?.axis === 'y' && dragging.index === i ? 'active' : ''
                            }`}
                        style={{ top: `${(y / imgH) * 100}%` }}
                        onMouseDown={(e) => handleLineMouseDown(e, 'y', i)}
                        onDoubleClick={(e) => handleLineDoubleClick(e, 'y', i)}
                    />
                ))}

            {/* 网格区块序号标签 */}
            {yBounds.slice(0, -1).map((y0, ri) =>
                xBounds.slice(0, -1).map((x0, ci) => {
                    const w = xBounds[ci + 1] - x0;
                    const h = yBounds[ri + 1] - y0;
                    if (w < 5 || h < 5) return null;
                    blockIndex++;
                    return (
                        <div
                            key={`label-${ri}-${ci}`}
                            className="grid-block-label"
                            style={{
                                left: `${(x0 / imgW) * 100}%`,
                                top: `${(y0 / imgH) * 100}%`,
                                width: `${(w / imgW) * 100}%`,
                                height: `${(h / imgH) * 100}%`,
                            }}
                        >
                            {blockIndex}
                        </div>
                    );
                })
            )}
        </div>
    );
}
