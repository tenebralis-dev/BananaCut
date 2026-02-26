'use client';

import React, { createContext, useContext, useReducer, useCallback, type Dispatch } from 'react';
import type {
    EditorState,
    EditorAction,
    EditorSnapshot,
    SplitLines,
} from '@/types/types';

// ==================== 初始状态 ====================
const MAX_UNDO_STEPS = 50;

export const initialState: EditorState = {
    imageMeta: null,
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    editMode: 'grid',
    splitLines: { x: [], y: [] },
    cropBlocks: [],
    lineDirection: 'horizontal',
    sortOrder: 'row-first',
    aspectRatio: { mode: 'free' },
    namingFormat: 'name',
    squarePadding: { enabled: true, bgMode: 'transparent', bgColor: '#ffffff' },
    namePool: [],
    gridRows: 3,
    gridCols: 3,
    undoStack: [],
    redoStack: [],
    isExporting: false,
    exportProgress: null,
    showPreview: false,
};

// ==================== 快照辅助 ====================

/** 创建当前编辑状态快照（仅保存可撤销的数据） */
function createSnapshot(state: EditorState): EditorSnapshot {
    return {
        splitLines: {
            x: [...state.splitLines.x],
            y: [...state.splitLines.y],
        },
        cropBlocks: state.cropBlocks.map((b) => ({ ...b })),
    };
}

/** 将快照推入撤销栈，清空重做栈 */
function pushSnapshot(state: EditorState): EditorState {
    const snapshot = createSnapshot(state);
    const newStack = [...state.undoStack, snapshot];
    if (newStack.length > MAX_UNDO_STEPS) newStack.shift();
    return { ...state, undoStack: newStack, redoStack: [] };
}

// ==================== Reducer ====================

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
    switch (action.type) {
        // ---------- 图片 ----------
        case 'SET_IMAGE':
            return {
                ...initialState,
                imageMeta: action.payload,
            };

        // ---------- 视口 ----------
        case 'SET_VIEWPORT':
            return {
                ...state,
                viewport: { ...state.viewport, ...action.payload },
            };

        // ---------- 编辑模式（切换时保留数据，只切换显示） ----------
        case 'SET_EDIT_MODE':
            return { ...state, editMode: action.payload };

        // ---------- 网格：按行列数生成等分线 ----------
        case 'SET_GRID': {
            if (!state.imageMeta) return state;
            const { rows, cols } = action.payload;
            const w = state.imageMeta.naturalWidth;
            const h = state.imageMeta.naturalHeight;
            const xLines: number[] = [];
            const yLines: number[] = [];
            for (let i = 1; i < cols; i++) xLines.push(Math.round((w * i) / cols));
            for (let i = 1; i < rows; i++) yLines.push(Math.round((h * i) / rows));
            const newState = pushSnapshot(state);
            return {
                ...newState,
                splitLines: { x: xLines, y: yLines },
                gridRows: rows,
                gridCols: cols,
            };
        }

        // ---------- 网格行列数（仅 UI 记录） ----------
        case 'SET_GRID_SIZE':
            return { ...state, gridRows: action.payload.rows, gridCols: action.payload.cols };

        // ---------- 移动线 ----------
        case 'MOVE_LINE': {
            const { axis, index, value } = action.payload;
            const lines = { ...state.splitLines };
            const arr = [...lines[axis]];
            arr[index] = value;
            lines[axis] = arr;
            return { ...state, splitLines: lines };
        }

        // ---------- 添加线（先推快照） ----------
        case 'ADD_LINE': {
            const newState = pushSnapshot(state);
            const { axis, value } = action.payload;
            const lines = { ...newState.splitLines };
            lines[axis] = [...lines[axis], value].sort((a, b) => a - b);
            return { ...newState, splitLines: lines };
        }

        // ---------- 删除线 ----------
        case 'REMOVE_LINE': {
            const newState = pushSnapshot(state);
            const { axis, index } = action.payload;
            const lines = { ...newState.splitLines };
            lines[axis] = lines[axis].filter((_, i) => i !== index);
            return { ...newState, splitLines: lines };
        }

        // ---------- 直接设置分割线 ----------
        case 'SET_SPLIT_LINES':
            return { ...state, splitLines: action.payload };

        // ---------- 自由框操作 ----------
        case 'ADD_CROP_BLOCK': {
            const newState = pushSnapshot(state);
            return { ...newState, cropBlocks: [...newState.cropBlocks, action.payload] };
        }

        case 'UPDATE_CROP_BLOCK':
            return {
                ...state,
                cropBlocks: state.cropBlocks.map((b) =>
                    b.id === action.payload.id ? { ...b, ...action.payload.updates } : b
                ),
            };

        case 'REMOVE_CROP_BLOCK': {
            const newState = pushSnapshot(state);
            return {
                ...newState,
                cropBlocks: newState.cropBlocks.filter((b) => b.id !== action.payload),
            };
        }

        case 'SET_CROP_BLOCKS':
            return { ...state, cropBlocks: action.payload };

        // ---------- 命名 ----------
        case 'SET_NAME_POOL':
            return { ...state, namePool: action.payload };

        case 'SET_BLOCK_NAME':
            return {
                ...state,
                cropBlocks: state.cropBlocks.map((b) =>
                    b.id === action.payload.id ? { ...b, name: action.payload.name } : b
                ),
            };

        // ---------- 控制面板设置 ----------
        case 'SET_LINE_DIRECTION':
            return { ...state, lineDirection: action.payload };

        case 'SET_SORT_ORDER':
            return { ...state, sortOrder: action.payload };

        case 'SET_ASPECT_RATIO':
            return { ...state, aspectRatio: action.payload };

        case 'SET_NAMING_FORMAT':
            return { ...state, namingFormat: action.payload };

        case 'SET_SQUARE_PADDING':
            return { ...state, squarePadding: { ...state.squarePadding, ...action.payload } };

        // ---------- 导出状态 ----------
        case 'SET_EXPORTING':
            return { ...state, isExporting: action.payload };

        case 'SET_EXPORT_PROGRESS':
            return { ...state, exportProgress: action.payload };

        case 'SET_SHOW_PREVIEW':
            return { ...state, showPreview: action.payload };

        // ---------- 撤销/重做 ----------
        case 'UNDO': {
            if (state.undoStack.length === 0) return state;
            const currentSnapshot = createSnapshot(state);
            const prevSnapshot = state.undoStack[state.undoStack.length - 1];
            return {
                ...state,
                splitLines: prevSnapshot.splitLines,
                cropBlocks: prevSnapshot.cropBlocks,
                undoStack: state.undoStack.slice(0, -1),
                redoStack: [...state.redoStack, currentSnapshot],
            };
        }

        case 'REDO': {
            if (state.redoStack.length === 0) return state;
            const currentSnapshot = createSnapshot(state);
            const nextSnapshot = state.redoStack[state.redoStack.length - 1];
            return {
                ...state,
                splitLines: nextSnapshot.splitLines,
                cropBlocks: nextSnapshot.cropBlocks,
                undoStack: [...state.undoStack, currentSnapshot],
                redoStack: state.redoStack.slice(0, -1),
            };
        }

        // ---------- 手动推快照（用于拖拽开始时） ----------
        case 'PUSH_SNAPSHOT':
            return pushSnapshot(state);

        default:
            return state;
    }
}

// ==================== Context ====================

interface EditorContextValue {
    state: EditorState;
    dispatch: Dispatch<EditorAction>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

/** 编辑器 Context Provider */
export function EditorProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(editorReducer, initialState);
    return (
        <EditorContext.Provider value={{ state, dispatch }
        }>
            {children}
        </EditorContext.Provider>
    );
}

/** 获取编辑器上下文 hook */
export function useEditor() {
    const ctx = useContext(EditorContext);
    if (!ctx) throw new Error('useEditor 必须在 EditorProvider 内使用');
    return ctx;
}

/** 快捷 hook：获取 dispatch 并自动绑定 action 创建器 */
export function useEditorActions() {
    const { dispatch } = useEditor();

    return {
        dispatch,
        undo: useCallback(() => dispatch({ type: 'UNDO' }), [dispatch]),
        redo: useCallback(() => dispatch({ type: 'REDO' }), [dispatch]),
        pushSnapshot: useCallback(() => dispatch({ type: 'PUSH_SNAPSHOT' }), [dispatch]),
    };
}
