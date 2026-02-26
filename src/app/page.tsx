'use client';

import React, { useEffect, useCallback } from 'react';
import { EditorProvider, useEditor, useEditorActions } from '@/store/useEditorStore';
import ImageUploader from '@/components/ImageUploader';
import ImageViewer from '@/components/ImageViewer';
import ControlPanel from '@/components/ControlPanel';
import NamePanel from '@/components/NamePanel';
import PreviewModal from '@/components/PreviewModal';
import ExportProgress from '@/components/ExportProgress';

/** 主编辑器内容（需要 EditorProvider 上下文） */
function EditorContent() {
  const { state } = useEditor();
  const { undo, redo } = useEditorActions();

  const hasImage = !!state.imageMeta;

  // Ctrl+Z / Ctrl+Y 快捷键
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    },
    [undo, redo]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="app-layout">
      {/* ===== 顶部导航栏 ===== */}
      <header className="app-header">
        <h1>
          <span>🍌</span> BananaCut
        </h1>
        <div className="header-actions">
          <button className="btn btn-sm" onClick={undo} title="撤销 (Ctrl+Z)">
            ↩ 撤销
          </button>
          <button className="btn btn-sm" onClick={redo} title="重做 (Ctrl+Y)">
            ↪ 重做
          </button>
        </div>
      </header>

      {/* ===== 左侧控制面板 ===== */}
      <ControlPanel />

      {/* ===== 中央画布区域 ===== */}
      {hasImage ? <ImageViewer /> : <ImageUploader />}

      {/* ===== 右侧名称面板 ===== */}
      <NamePanel />

      {/* ===== 浮层 ===== */}
      <PreviewModal />
      <ExportProgress />
    </div>
  );
}

/** 页面入口 */
export default function Home() {
  return (
    <EditorProvider>
      <EditorContent />
    </EditorProvider>
  );
}
