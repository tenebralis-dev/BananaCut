'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditor } from '@/store/useEditorStore';
import { fitToContainer, zoomAtPoint, clampScale } from '@/utils/viewportUtils';
import GridOverlay from './GridOverlay';
import FreeformOverlay from './FreeformOverlay';

/**
 * 图片查看器
 * - 显示原图 <img>
 * - 根据 editMode 条件渲染 GridOverlay 或 FreeformOverlay
 * - 支持滚轮缩放、中键/空格+拖拽平移
 */
export default function ImageViewer() {
    const { state, dispatch } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [spaceDown, setSpaceDown] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    const { imageMeta, viewport, editMode } = state;

    // 初始化：图片加载后适配容器
    useEffect(() => {
        if (!imageMeta || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const vp = fitToContainer(
            imageMeta.naturalWidth,
            imageMeta.naturalHeight,
            rect.width,
            rect.height
        );
        dispatch({ type: 'SET_VIEWPORT', payload: vp });
    }, [imageMeta, dispatch]);

    // 监听窗口 resize
    useEffect(() => {
        const handleResize = () => {
            if (!imageMeta || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const vp = fitToContainer(
                imageMeta.naturalWidth,
                imageMeta.naturalHeight,
                rect.width,
                rect.height
            );
            dispatch({ type: 'SET_VIEWPORT', payload: vp });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [imageMeta, dispatch]);

    // 监听空格键（平移模式）
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                setSpaceDown(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') setSpaceDown(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // 滚轮缩放
    const handleWheel = useCallback(
        (e: React.WheelEvent) => {
            e.preventDefault();
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = clampScale(viewport.scale * delta);

            const newVp = zoomAtPoint(viewport, mouseX, mouseY, newScale);
            dispatch({ type: 'SET_VIEWPORT', payload: newVp });
        },
        [viewport, dispatch]
    );

    // 平移：中键拖拽或空格+左键拖拽
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (e.button === 1 || (e.button === 0 && spaceDown)) {
                e.preventDefault();
                setIsPanning(true);
                setPanStart({ x: e.clientX - viewport.offsetX, y: e.clientY - viewport.offsetY });
            }
        },
        [spaceDown, viewport]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!isPanning) return;
            dispatch({
                type: 'SET_VIEWPORT',
                payload: {
                    offsetX: e.clientX - panStart.x,
                    offsetY: e.clientY - panStart.y,
                },
            });
        },
        [isPanning, panStart, dispatch]
    );

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    if (!imageMeta) return null;

    const cursorStyle = spaceDown || isPanning ? 'grabbing' : undefined;

    return (
        <div
            ref={containerRef}
            className="canvas-container"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: cursorStyle }}
        >
            <div
                className="canvas-inner"
                style={{
                    transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.scale})`,
                    width: imageMeta.naturalWidth,
                    height: imageMeta.naturalHeight,
                }}
            >
                {/* 原图 */}
                <img
                    ref={imgRef}
                    className="canvas-image"
                    src={imageMeta.src}
                    alt="原图"
                    width={imageMeta.naturalWidth}
                    height={imageMeta.naturalHeight}
                    draggable={false}
                />

                {/* 根据编辑模式渲染叠加层 */}
                {editMode === 'grid' && <GridOverlay />}
                {editMode === 'freeform' && <FreeformOverlay />}
            </div>

            {/* 图片尺寸信息 */}
            <div className="image-info" style={{ position: 'absolute', bottom: 8, right: 12 }}>
                {imageMeta.naturalWidth} × {imageMeta.naturalHeight} px | {Math.round(viewport.scale * 100)}%
            </div>
        </div>
    );
}
