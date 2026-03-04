'use client';

import React from 'react';
import { useEditor } from '@/store/useEditorStore';
import { clampScale } from '@/utils/viewportUtils';
import { computeGridBlocks, applyNames, sortBlocks } from '@/utils/cropUtils';

/**
 * 左侧控制面板
 * 包含：模式切换、网格设置、加线方向、比例设置、缩放控制、排序、导出设置
 */
export default function ControlPanel() {
    const { state, dispatch } = useEditor();
    const {
        editMode,
        gridRows,
        gridCols,
        lineDirection,
        viewport,
        aspectRatio,
        sortOrder,
        namingFormat,
        squarePadding,
        resizeSetting,
        imageMeta,
        splitLines,
        cropBlocks,
        namePool,
    } = state;

    const hasImage = !!imageMeta;

    // ---- 生成网格 ----
    const handleGenerateGrid = () => {
        if (!imageMeta) return;
        dispatch({ type: 'SET_GRID', payload: { rows: gridRows, cols: gridCols } });
    };

    // ---- 应用名称到区块 ----
    const handleApplyNames = () => {
        if (!imageMeta) return;

        if (editMode === 'grid') {
            // 网格模式：从 splitLines 计算区块再映射名称
            const blocks = computeGridBlocks(splitLines, imageMeta.naturalWidth, imageMeta.naturalHeight);
            const named = applyNames(blocks, namePool, sortOrder);
            // 网格模式不使用 cropBlocks，名称映射结果直接存入 cropBlocks（导出时使用）
            dispatch({ type: 'SET_CROP_BLOCKS', payload: named });
        } else {
            // 自由框模式：直接映射
            const named = applyNames(cropBlocks, namePool, sortOrder);
            dispatch({ type: 'SET_CROP_BLOCKS', payload: named });
        }
    };

    // ---- 获取当前区块数量 ----
    const getBlockCount = () => {
        if (editMode === 'grid' && imageMeta) {
            const blocks = computeGridBlocks(splitLines, imageMeta.naturalWidth, imageMeta.naturalHeight);
            return blocks.length;
        }
        return cropBlocks.length;
    };

    // ---- resize 预设 ----
    const RESIZE_PRESETS = [256, 512, 800, 1024];

    return (
        <div className="panel">
            {/* ===== 模式切换 ===== */}
            <div className="panel-section">
                <div className="panel-section-title">编辑模式</div>
                <div className="btn-group">
                    <button
                        className={`btn ${editMode === 'grid' ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_EDIT_MODE', payload: 'grid' })}
                        disabled={!hasImage}
                    >
                        🔲 网格
                    </button>
                    <button
                        className={`btn ${editMode === 'freeform' ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_EDIT_MODE', payload: 'freeform' })}
                        disabled={!hasImage}
                    >
                        ✂️ 自由框
                    </button>
                </div>
            </div>

            {/* ===== 网格设置（仅 Grid 模式） ===== */}
            {editMode === 'grid' && (
                <div className="panel-section">
                    <div className="panel-section-title">网格设置</div>
                    <div className="form-row">
                        <span className="form-label">行</span>
                        <input
                            type="number"
                            className="form-input form-input-number"
                            value={gridRows}
                            min={1}
                            max={50}
                            onChange={(e) =>
                                dispatch({
                                    type: 'SET_GRID_SIZE',
                                    payload: { rows: Math.max(1, parseInt(e.target.value) || 1), cols: gridCols },
                                })
                            }
                            disabled={!hasImage}
                        />
                        <span className="form-label">列</span>
                        <input
                            type="number"
                            className="form-input form-input-number"
                            value={gridCols}
                            min={1}
                            max={50}
                            onChange={(e) =>
                                dispatch({
                                    type: 'SET_GRID_SIZE',
                                    payload: { rows: gridRows, cols: Math.max(1, parseInt(e.target.value) || 1) },
                                })
                            }
                            disabled={!hasImage}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={handleGenerateGrid}
                        disabled={!hasImage}
                    >
                        生成网格
                    </button>

                    <div className="divider" />

                    {/* 加线方向 */}
                    <div className="panel-section-title">双击加线方向</div>
                    <div className="btn-group">
                        <button
                            className={`btn ${lineDirection === 'horizontal' ? 'active' : ''}`}
                            onClick={() => dispatch({ type: 'SET_LINE_DIRECTION', payload: 'horizontal' })}
                        >
                            ─ 横线
                        </button>
                        <button
                            className={`btn ${lineDirection === 'vertical' ? 'active' : ''}`}
                            onClick={() => dispatch({ type: 'SET_LINE_DIRECTION', payload: 'vertical' })}
                        >
                            │ 竖线
                        </button>
                    </div>
                </div>
            )}

            {/* ===== 比例设置（仅 Freeform 模式） ===== */}
            {editMode === 'freeform' && (
                <div className="panel-section">
                    <div className="panel-section-title">拉框比例</div>
                    <div className="btn-group">
                        <button
                            className={`btn ${aspectRatio.mode === 'free' ? 'active' : ''}`}
                            onClick={() => dispatch({ type: 'SET_ASPECT_RATIO', payload: { mode: 'free' } })}
                        >
                            自由
                        </button>
                        <button
                            className={`btn ${aspectRatio.mode === '1:1' ? 'active' : ''}`}
                            onClick={() => dispatch({ type: 'SET_ASPECT_RATIO', payload: { mode: '1:1' } })}
                        >
                            1:1
                        </button>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>
                        💡 按住 Shift 拖拽可临时锁定 1:1
                    </div>
                </div>
            )}

            <div className="divider" />

            {/* ===== 缩放控制 ===== */}
            <div className="panel-section">
                <div className="panel-section-title">缩放</div>
                <div className="form-row">
                    <input
                        type="range"
                        className="zoom-slider"
                        min={10}
                        max={500}
                        value={Math.round(viewport.scale * 100)}
                        onChange={(e) =>
                            dispatch({
                                type: 'SET_VIEWPORT',
                                payload: { scale: clampScale(parseInt(e.target.value) / 100) },
                            })
                        }
                        disabled={!hasImage}
                    />
                    <span className="zoom-value">{Math.round(viewport.scale * 100)}%</span>
                </div>
                <button
                    className="btn btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => {
                        if (!imageMeta) return;
                        // 重置为适配视口
                        dispatch({
                            type: 'SET_VIEWPORT',
                            payload: { scale: 1, offsetX: 0, offsetY: 0 },
                        });
                    }}
                    disabled={!hasImage}
                >
                    重置视图
                </button>
            </div>

            <div className="divider" />

            {/* ===== 排序与命名 ===== */}
            <div className="panel-section">
                <div className="panel-section-title">排序方式</div>
                <div className="btn-group">
                    <button
                        className={`btn ${sortOrder === 'row-first' ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_SORT_ORDER', payload: 'row-first' })}
                    >
                        行优先
                    </button>
                    <button
                        className={`btn ${sortOrder === 'col-first' ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_SORT_ORDER', payload: 'col-first' })}
                    >
                        列优先
                    </button>
                </div>
            </div>

            <div className="divider" />

            {/* ===== 导出设置 ===== */}
            <div className="panel-section">
                <div className="panel-section-title">导出命名格式</div>
                <select
                    className="form-select"
                    value={namingFormat}
                    onChange={(e) =>
                        dispatch({ type: 'SET_NAMING_FORMAT', payload: e.target.value as any })
                    }
                >
                    <option value="name">名称.png (微笑.png)</option>
                    <option value="pos">行_列.png (1_1.png)</option>
                    <option value="name_pos">名称_行_列.png (微笑_1_1.png)</option>
                    <option value="pos_name">行_列_名称.png (1_1_微笑.png)</option>
                </select>
            </div>

            {/* ===== 正方形补全设置 ===== */}
            <div className="panel-section">
                <div className="panel-section-title">正方形补全</div>
                <div className="btn-group">
                    <button
                        className={`btn ${squarePadding.enabled ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_SQUARE_PADDING', payload: { enabled: true } })}
                    >
                        ✅ 补全
                    </button>
                    <button
                        className={`btn ${!squarePadding.enabled ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_SQUARE_PADDING', payload: { enabled: false } })}
                    >
                        ❌ 不补全
                    </button>
                </div>
                {squarePadding.enabled && (
                    <>
                        <div style={{ marginTop: 8 }}>
                            <div className="panel-section-title" style={{ marginBottom: 4 }}>背景填充</div>
                            <div className="btn-group">
                                <button
                                    className={`btn ${squarePadding.bgMode === 'transparent' ? 'active' : ''}`}
                                    onClick={() => dispatch({ type: 'SET_SQUARE_PADDING', payload: { bgMode: 'transparent' } })}
                                >
                                    🔲 透明
                                </button>
                                <button
                                    className={`btn ${squarePadding.bgMode === 'color' ? 'active' : ''}`}
                                    onClick={() => dispatch({ type: 'SET_SQUARE_PADDING', payload: { bgMode: 'color' } })}
                                >
                                    🎨 纯色
                                </button>
                            </div>
                        </div>
                        {squarePadding.bgMode === 'color' && (
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="form-label">颜色</span>
                                <input
                                    type="color"
                                    value={squarePadding.bgColor}
                                    onChange={(e) => dispatch({ type: 'SET_SQUARE_PADDING', payload: { bgColor: e.target.value } })}
                                    style={{ width: 36, height: 28, padding: 0, border: '1px solid var(--color-border)', borderRadius: 4, cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{squarePadding.bgColor}</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ===== 输出尺寸设置 ===== */}
            <div className="panel-section">
                <div className="panel-section-title">输出尺寸</div>
                <div className="btn-group">
                    <button
                        className={`btn ${resizeSetting.enabled ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_RESIZE_SETTING', payload: { enabled: true } })}
                    >
                        📐 统一尺寸
                    </button>
                    <button
                        className={`btn ${!resizeSetting.enabled ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_RESIZE_SETTING', payload: { enabled: false } })}
                    >
                        📏 原始尺寸
                    </button>
                </div>
                {resizeSetting.enabled && (
                    <>
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="form-label">边长</span>
                            <input
                                type="number"
                                className="form-input form-input-number"
                                value={resizeSetting.size}
                                min={16}
                                max={4096}
                                onChange={(e) => {
                                    const val = Math.max(16, Math.min(4096, parseInt(e.target.value) || 16));
                                    dispatch({ type: 'SET_RESIZE_SETTING', payload: { size: val } });
                                }}
                            />
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>px</span>
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>快捷预设</div>
                            <div className="btn-group">
                                {RESIZE_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        className={`btn btn-sm ${resizeSetting.size === preset ? 'active' : ''}`}
                                        onClick={() => dispatch({ type: 'SET_RESIZE_SETTING', payload: { size: preset } })}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                            输出 {resizeSetting.size}×{resizeSetting.size} px
                        </div>
                    </>
                )}
            </div>

            {/* ===== 操作按钮 ===== */}
            <div className="panel-section">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                        className="btn"
                        onClick={handleApplyNames}
                        disabled={!hasImage || namePool.length === 0}
                    >
                        📝 应用名称
                    </button>
                    <button
                        className="btn"
                        onClick={() => dispatch({ type: 'SET_SHOW_PREVIEW', payload: true })}
                        disabled={!hasImage || getBlockCount() === 0}
                    >
                        👁️ 预览
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => dispatch({ type: 'SET_EXPORTING', payload: true })}
                        disabled={!hasImage || getBlockCount() === 0}
                    >
                        📦 批量导出
                    </button>
                </div>
            </div>

            {/* ===== 统计信息 ===== */}
            {hasImage && (
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                    当前区块数: {getBlockCount()} | 名称池: {namePool.length} 个
                </div>
            )}
        </div>
    );
}
