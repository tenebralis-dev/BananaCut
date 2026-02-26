'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { EditorProvider, useEditor, useEditorActions } from '@/store/useEditorStore';
import ImageUploader from '@/components/ImageUploader';
import ImageViewer from '@/components/ImageViewer';
import ControlPanel from '@/components/ControlPanel';
import NamePanel from '@/components/NamePanel';
import PreviewModal from '@/components/PreviewModal';
import ExportProgress from '@/components/ExportProgress';
import ChangeImageModal from '@/components/ChangeImageModal';

/** 主编辑器内容（需要 EditorProvider 上下文） */
function EditorContent() {
  const { state, dispatch } = useEditor();
  const { undo, redo } = useEditorActions();

  const hasImage = !!state.imageMeta;

  // ===== 更换图片相关状态 =====
  const [showChangeModal, setShowChangeModal] = useState(false);
  const changeInputRef = useRef<HTMLInputElement>(null);
  const keepNamesRef = useRef(false);

  /** 确认更换 → 记录 keepNames，打开文件选择器 */
  const handleConfirmChange = (keepNames: boolean) => {
    keepNamesRef.current = keepNames;
    setShowChangeModal(false);
    // 重置 input value 以允许选择同一文件
    if (changeInputRef.current) {
      changeInputRef.current.value = '';
    }
    changeInputRef.current?.click();
  };

  /** 文件选择后 → 读取图片并 dispatch */
  const handleChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        dispatch({
          type: 'SET_IMAGE_KEEP_NAMES',
          payload: {
            meta: {
              src,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
            },
            keepNames: keepNamesRef.current,
          },
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

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
          {hasImage && (
            <button
              className="btn btn-sm"
              onClick={() => setShowChangeModal(true)}
              title="更换当前图片"
            >
              🔄 更换图片
            </button>
          )}
        </div>
      </header>

      {/* 更换图片：隐藏 file input */}
      <input
        ref={changeInputRef}
        type="file"
        accept="image/*"
        onChange={handleChangeFile}
        style={{ display: 'none' }}
      />

      {/* ===== 左侧控制面板 ===== */}
      <ControlPanel />

      {/* ===== 中央画布区域 ===== */}
      {hasImage ? <ImageViewer /> : <ImageUploader />}

      {/* ===== 右侧名称面板 ===== */}
      <NamePanel />

      {/* ===== 浮层 ===== */}
      <PreviewModal />
      <ExportProgress />
      {showChangeModal && (
        <ChangeImageModal
          onConfirm={handleConfirmChange}
          onCancel={() => setShowChangeModal(false)}
        />
      )}
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
