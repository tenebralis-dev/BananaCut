'use client';

import React, { useState } from 'react';
import { useEditor } from '@/store/useEditorStore';
import { sortBlocks, computeGridBlocks } from '@/utils/cropUtils';
import type { CropBlock } from '@/types/types';

/**
 * 右侧名称面板
 * - JSON 文本输入框 + 解析
 * - 名称列表（按排序展示）
 * - 单条名称可点击编辑
 */
export default function NamePanel() {
    const { state, dispatch } = useEditor();
    const { namePool, cropBlocks, splitLines, editMode, imageMeta, sortOrder } = state;

    const [jsonInput, setJsonInput] = useState('');
    const [parseError, setParseError] = useState('');
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState('');

    // 获取当前实际使用的区块列表
    const getActiveBlocks = (): CropBlock[] => {
        if (editMode === 'grid' && imageMeta) {
            const blocks = computeGridBlocks(splitLines, imageMeta.naturalWidth, imageMeta.naturalHeight);
            // 合并 cropBlocks 中已应用的名称
            if (cropBlocks.length === blocks.length) {
                return blocks.map((b, i) => ({ ...b, name: cropBlocks[i]?.name ?? b.name }));
            }
            return blocks;
        }
        return cropBlocks;
    };

    const activeBlocks = getActiveBlocks();
    const sortedBlocks = sortBlocks(activeBlocks, sortOrder);

    /** 解析 JSON 输入 */
    const handleParseJson = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (!Array.isArray(parsed)) {
                setParseError('请输入 JSON 数组格式，如 ["微笑", "大哭"]');
                return;
            }
            const names = parsed.map((item: unknown) => String(item));
            dispatch({ type: 'SET_NAME_POOL', payload: names });
            setParseError('');
        } catch {
            setParseError('JSON 解析失败，请检查格式');
        }
    };

    /** 开始编辑名称列表中的某条 */
    const startEditPoolItem = (index: number) => {
        setEditingIdx(index);
        setEditingValue(namePool[index] || '');
    };

    /** 提交名称编辑 */
    const commitEditPoolItem = () => {
        if (editingIdx !== null) {
            const newPool = [...namePool];
            newPool[editingIdx] = editingValue;
            dispatch({ type: 'SET_NAME_POOL', payload: newPool });
            setEditingIdx(null);
        }
    };

    return (
        <div className="panel">
            {/* ===== JSON 输入区 ===== */}
            <div className="panel-section">
                <div className="panel-section-title">JSON 批量命名</div>
                <textarea
                    className="form-textarea"
                    placeholder={'粘贴 JSON 数组\n例: ["微笑", "大哭", "OK"]'}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                />
                {parseError && (
                    <div style={{ color: 'var(--color-accent)', fontSize: 11, marginTop: 4 }}>
                        {parseError}
                    </div>
                )}
                <button
                    className="btn btn-sm"
                    style={{ width: '100%', marginTop: 8 }}
                    onClick={handleParseJson}
                >
                    解析 JSON
                </button>
            </div>

            <div className="divider" />

            {/* ===== 名称池列表 ===== */}
            <div className="panel-section">
                <div className="panel-section-title">
                    名称池 ({namePool.length} 个)
                    {sortedBlocks.length > 0 && ` → ${sortedBlocks.length} 个区块`}
                </div>
                <ul className="name-list">
                    {namePool.length === 0 && (
                        <li style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 0' }}>
                            暂无名称，请在上方输入 JSON 数组
                        </li>
                    )}
                    {namePool.map((name, idx) => {
                        const assigned = idx < sortedBlocks.length;
                        return (
                            <li
                                key={idx}
                                className="name-list-item"
                                onClick={() => startEditPoolItem(idx)}
                            >
                                <span className="index">{idx + 1}</span>
                                {editingIdx === idx ? (
                                    <input
                                        className="form-input"
                                        style={{ fontSize: 12, padding: '2px 4px' }}
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        onBlur={commitEditPoolItem}
                                        onKeyDown={(e) => e.key === 'Enter' && commitEditPoolItem()}
                                        autoFocus
                                    />
                                ) : (
                                    <span className={`name ${!name ? 'empty' : ''}`}>
                                        {name || '(空)'}
                                    </span>
                                )}
                                <span className={`status ${assigned ? '' : 'unassigned'}`} title={assigned ? '已分配' : '未分配'} />
                            </li>
                        );
                    })}
                </ul>
            </div>

            <div className="divider" />

            {/* ===== 区块列表（预览） ===== */}
            <div className="panel-section">
                <div className="panel-section-title">当前区块 ({sortedBlocks.length})</div>
                <ul className="name-list">
                    {sortedBlocks.length === 0 && (
                        <li style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 0' }}>
                            暂无区块，请先设置网格或拉框
                        </li>
                    )}
                    {sortedBlocks.map((block, idx) => (
                        <li key={block.id || idx} className="name-list-item">
                            <span className="index">{idx + 1}</span>
                            <span className={`name ${!block.name ? 'empty' : ''}`}>
                                {block.name || '(未命名)'}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                                {block.width}×{block.height}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
