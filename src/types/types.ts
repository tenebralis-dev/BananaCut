/**
 * BananaCut 核心类型定义
 * 所有坐标均基于原图像素坐标系
 */

/** 编辑模式：网格切割 或 自由拉框 */
export type EditMode = 'grid' | 'freeform';

/** 图片元信息 */
export interface ImageMeta {
  src: string;           // data:URL 或 blob:URL
  naturalWidth: number;  // 原始宽度
  naturalHeight: number; // 原始高度
}

/** 视口状态（缩放 + 平移），用于画布交互 */
export interface ViewportState {
  scale: number;   // 缩放比例 (1 = 100%)
  offsetX: number; // 水平平移偏移量 (px)
  offsetY: number; // 垂直平移偏移量 (px)
}

/** 分割线集合（原图坐标） */
export interface SplitLines {
  x: number[]; // 垂直分割线的 x 坐标数组
  y: number[]; // 水平分割线的 y 坐标数组
}

/** 裁剪区块（原图坐标） */
export interface CropBlock {
  id: string;
  x: number;           // 左上角 x
  y: number;           // 左上角 y
  width: number;       // 宽度
  height: number;      // 高度
  name: string | null; // 用户指定的名称
}

/** 排序方式 */
export type SortOrder = 'row-first' | 'col-first';

/** 加线方向（网格模式下双击添加线时使用） */
export type LineDirection = 'horizontal' | 'vertical';

/** 正方形补全背景设置 */
export interface SquarePadding {
  enabled: boolean;           // 是否补全为正方形
  bgMode: 'transparent' | 'color';  // 背景模式
  bgColor: string;            // 纯色填充时的颜色值（hex），默认 '#ffffff'
}

/** 自由框比例设置 */
export interface AspectRatioSetting {
  mode: 'free' | '1:1' | 'custom';
  customRatio?: { w: number; h: number };
}

/**
 * 导出命名格式
 * - name:     "微笑.png"
 * - pos:      "1_1.png"         (行_列)
 * - name_pos: "微笑_1_1.png"
 * - pos_name: "1_1_微笑.png"
 */
export type NamingFormat = 'name' | 'pos' | 'name_pos' | 'pos_name';

/** 撤销/重做用的编辑器状态快照 */
export interface EditorSnapshot {
  splitLines: SplitLines;
  cropBlocks: CropBlock[];
}

/** 编辑器完整状态 */
export interface EditorState {
  // 图片
  imageMeta: ImageMeta | null;
  // 视口
  viewport: ViewportState;
  // 编辑模式
  editMode: EditMode;
  // 网格线（两种模式都保留，切换时不清空）
  splitLines: SplitLines;
  // 自由框区块
  cropBlocks: CropBlock[];
  // 控制面板设置
  lineDirection: LineDirection;
  sortOrder: SortOrder;
  aspectRatio: AspectRatioSetting;
  namingFormat: NamingFormat;
  squarePadding: SquarePadding;
  // 名称池（JSON 解析后的数组）
  namePool: string[];
  // 网格行列数（用于 UI 显示）
  gridRows: number;
  gridCols: number;
  // 撤销/重做栈
  undoStack: EditorSnapshot[];
  redoStack: EditorSnapshot[];
  // 导出状态
  isExporting: boolean;
  exportProgress: { current: number; total: number } | null;
  // 预览弹窗
  showPreview: boolean;
}

/** 所有 Action 类型 */
export type EditorAction =
  | { type: 'SET_IMAGE'; payload: ImageMeta }
  | { type: 'SET_IMAGE_KEEP_NAMES'; payload: { meta: ImageMeta; keepNames: boolean } }
  | { type: 'SET_VIEWPORT'; payload: Partial<ViewportState> }
  | { type: 'SET_EDIT_MODE'; payload: EditMode }
  | { type: 'SET_GRID'; payload: { rows: number; cols: number } }
  | { type: 'MOVE_LINE'; payload: { axis: 'x' | 'y'; index: number; value: number } }
  | { type: 'ADD_LINE'; payload: { axis: 'x' | 'y'; value: number } }
  | { type: 'REMOVE_LINE'; payload: { axis: 'x' | 'y'; index: number } }
  | { type: 'SET_SPLIT_LINES'; payload: SplitLines }
  | { type: 'ADD_CROP_BLOCK'; payload: CropBlock }
  | { type: 'UPDATE_CROP_BLOCK'; payload: { id: string; updates: Partial<CropBlock> } }
  | { type: 'REMOVE_CROP_BLOCK'; payload: string }
  | { type: 'SET_CROP_BLOCKS'; payload: CropBlock[] }
  | { type: 'SET_LINE_DIRECTION'; payload: LineDirection }
  | { type: 'SET_SORT_ORDER'; payload: SortOrder }
  | { type: 'SET_ASPECT_RATIO'; payload: AspectRatioSetting }
  | { type: 'SET_NAMING_FORMAT'; payload: NamingFormat }
  | { type: 'SET_SQUARE_PADDING'; payload: Partial<SquarePadding> }
  | { type: 'SET_NAME_POOL'; payload: string[] }
  | { type: 'SET_BLOCK_NAME'; payload: { id: string; name: string | null } }
  | { type: 'SET_GRID_SIZE'; payload: { rows: number; cols: number } }
  | { type: 'SET_EXPORTING'; payload: boolean }
  | { type: 'SET_EXPORT_PROGRESS'; payload: { current: number; total: number } | null }
  | { type: 'SET_SHOW_PREVIEW'; payload: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_SNAPSHOT' };
