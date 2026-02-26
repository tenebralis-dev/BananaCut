'use client';

import React, { useState } from 'react';

interface ChangeImageModalProps {
    onConfirm: (keepNames: boolean) => void;
    onCancel: () => void;
}

/**
 * 更换图片确认对话框
 * - 提示用户编辑数据将被清空
 * - 复选框让用户选择是否保留名称池
 */
export default function ChangeImageModal({ onConfirm, onCancel }: ChangeImageModalProps) {
    const [keepNames, setKeepNames] = useState(false);

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div
                className="modal-content confirm-dialog"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2>🔄 更换图片</h2>
                </div>
                <div className="modal-body">
                    <p className="confirm-message">
                        更换图片将清空当前所有编辑内容（网格线、裁剪框、命名等），是否继续？
                    </p>
                    <label className="confirm-checkbox">
                        <input
                            type="checkbox"
                            checked={keepNames}
                            onChange={(e) => setKeepNames(e.target.checked)}
                        />
                        <span>保留当前名称池</span>
                    </label>
                </div>
                <div className="modal-footer">
                    <button className="btn" onClick={onCancel}>
                        取消
                    </button>
                    <button className="btn btn-primary" onClick={() => onConfirm(keepNames)}>
                        确认更换
                    </button>
                </div>
            </div>
        </div>
    );
}
