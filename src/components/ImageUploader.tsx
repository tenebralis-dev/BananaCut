'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useEditor } from '@/store/useEditorStore';

/**
 * 图片上传组件
 * 支持点击上传和拖拽上传
 */
export default function ImageUploader() {
    const { dispatch } = useEditor();
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    /** 处理文件读取 */
    const handleFile = useCallback(
        (file: File) => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const src = e.target?.result as string;
                // 创建临时 Image 获取原始尺寸
                const img = new Image();
                img.onload = () => {
                    dispatch({
                        type: 'SET_IMAGE',
                        payload: {
                            src,
                            naturalWidth: img.naturalWidth,
                            naturalHeight: img.naturalHeight,
                        },
                    });
                };
                img.src = src;
            };
            reader.readAsDataURL(file);
        },
        [dispatch]
    );

    /** 点击上传 */
    const handleClick = () => inputRef.current?.click();

    /** 文件选择事件 */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    /** 拖拽事件 */
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    return (
        <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="upload-zone-inner">
                <div className="upload-icon">🖼️</div>
                <div className="upload-text">点击或拖拽图片到此处</div>
                <div className="upload-hint">支持 PNG / JPG / WebP，单张 ≤ 20MB</div>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleChange}
                style={{ display: 'none' }}
            />
        </div>
    );
}
