import type { PresentationData } from '../model/Presentation';
import type { SlideNode } from '../model/Slide';
import type { BaseNodeData, NodeType, Position, Size } from '../model/nodes/BaseNode';
import type { GroupNodeData } from '../model/nodes/GroupNode';
import type { ShapeNodeData, TextBody } from '../model/nodes/ShapeNode';
import type { TableCell, TableNodeData } from '../model/nodes/TableNode';
import { parseGroupNode } from '../model/nodes/GroupNode';
import { parsePicNode } from '../model/nodes/PicNode';
import { parseShapeNode } from '../model/nodes/ShapeNode';
import { parseTableNode } from '../model/nodes/TableNode';
import type { SafeXmlNode } from '../parser/XmlParser';

export type SearchTextKind = 'shape' | 'table-cell';

export interface TextBounds extends Position, Size {}

export interface TextIndexOptions {
  includeShapes?: boolean;
  includeTables?: boolean;
  includeGroups?: boolean;
}

export interface TextIndexEntry {
  slideIndex: number;
  nodeId: string;
  nodePath: string;
  nodeType: NodeType;
  textKind: SearchTextKind;
  text: string;
  bounds: TextBounds;
  paragraphIndex?: number;
  rowIndex?: number;
  cellIndex?: number;
}

export interface TextSearchOptions {
  matchCase?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
  snippetRadius?: number;
}

export interface TextSearchResult extends TextIndexEntry {
  matchStart: number;
  matchEnd: number;
  snippet: string;
}

const DEFAULT_INDEX_OPTIONS: Required<TextIndexOptions> = {
  includeShapes: true,
  includeTables: true,
  includeGroups: true,
};

interface CoordinateTransform {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
}

const IDENTITY_TRANSFORM: CoordinateTransform = {
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
};

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getTextBodyText = (textBody: TextBody | undefined): string => {
  if (!textBody) return '';
  return textBody.paragraphs.map((p) => p.runs.map((r) => r.text).join('')).join('\n');
};

const getCellText = (cell: TableCell): string => getTextBodyText(cell.textBody);

const toBounds = (
  node: BaseNodeData,
  transform: CoordinateTransform = IDENTITY_TRANSFORM,
): TextBounds => ({
  x: transform.offsetX + node.position.x * transform.scaleX,
  y: transform.offsetY + node.position.y * transform.scaleY,
  w: node.size.w * transform.scaleX,
  h: node.size.h * transform.scaleY,
});

const shouldAddText = (text: string): boolean => text.trim().length > 0;

const isAsciiWordChar = (char: string | undefined): boolean =>
  char !== undefined && /[A-Za-z0-9_]/.test(char);

const isWholeWordMatch = (text: string, start: number, end: number): boolean =>
  !isAsciiWordChar(text[start - 1]) && !isAsciiWordChar(text[end]);

const rotationSwapsAxes = (rotation: number): boolean => {
  const normalized = ((rotation % 360) + 360) % 360;
  return Math.abs(normalized - 90) < 0.0001 || Math.abs(normalized - 270) < 0.0001;
};

const createSnippet = (text: string, start: number, end: number, radius: number): string => {
  const from = Math.max(0, start - radius);
  const to = Math.min(text.length, end + radius);
  const prefix = from > 0 ? '...' : '';
  const suffix = to < text.length ? '...' : '';
  return `${prefix}${text.slice(from, to)}${suffix}`;
};

const isPlaceholderNode = (node: SafeXmlNode): boolean => {
  for (const wrapper of ['nvSpPr', 'nvPicPr', 'nvGrpSpPr', 'nvGraphicFramePr', 'nvCxnSpPr']) {
    const nv = node.child(wrapper);
    if (nv.exists() && nv.child('nvPr').child('ph').exists()) return true;
  }
  return false;
};

const parseGroupChild = (
  childXml: SafeXmlNode,
  skipPlaceholders = false,
): BaseNodeData | undefined => {
  if (skipPlaceholders && isPlaceholderNode(childXml)) return undefined;

  switch (childXml.localName) {
    case 'sp':
    case 'cxnSp':
      return parseShapeNode(childXml);
    case 'pic':
      return parsePicNode(childXml);
    case 'grpSp':
      return parseGroupNode(childXml);
    case 'graphicFrame': {
      const graphic = childXml.child('graphic');
      const graphicData = graphic.child('graphicData');
      if (graphicData.child('tbl').exists()) return parseTableNode(childXml);
      return undefined;
    }
    default:
      return undefined;
  }
};

const getGroupChildTransform = (
  group: GroupNodeData,
  child: BaseNodeData,
  parentTransform: CoordinateTransform,
): CoordinateTransform => {
  if (group.childExtent.w <= 0 || group.childExtent.h <= 0) {
    return {
      offsetX: parentTransform.offsetX + group.position.x * parentTransform.scaleX,
      offsetY: parentTransform.offsetY + group.position.y * parentTransform.scaleY,
      scaleX: parentTransform.scaleX,
      scaleY: parentTransform.scaleY,
    };
  }

  const scaleX = group.childExtent.w > 0 ? group.size.w / group.childExtent.w : 1;
  const scaleY = group.childExtent.h > 0 ? group.size.h / group.childExtent.h : 1;
  if (rotationSwapsAxes(child.rotation)) {
    const rotatedBBoxX = child.position.x + (child.size.w - child.size.h) / 2;
    const rotatedBBoxY = child.position.y + (child.size.h - child.size.w) / 2;
    const nextSize = {
      w: child.size.w * scaleY,
      h: child.size.h * scaleX,
    };
    const nextPosition = {
      x: (rotatedBBoxX - group.childOffset.x) * scaleX - (nextSize.w - nextSize.h) / 2,
      y: (rotatedBBoxY - group.childOffset.y) * scaleY - (nextSize.h - nextSize.w) / 2,
    };
    const childScaleX = parentTransform.scaleX * scaleY;
    const childScaleY = parentTransform.scaleY * scaleX;
    return {
      offsetX:
        parentTransform.offsetX +
        (group.position.x + nextPosition.x) * parentTransform.scaleX -
        child.position.x * childScaleX,
      offsetY:
        parentTransform.offsetY +
        (group.position.y + nextPosition.y) * parentTransform.scaleY -
        child.position.y * childScaleY,
      scaleX: childScaleX,
      scaleY: childScaleY,
    };
  }

  return {
    offsetX:
      parentTransform.offsetX +
      (group.position.x - group.childOffset.x * scaleX) * parentTransform.scaleX,
    offsetY:
      parentTransform.offsetY +
      (group.position.y - group.childOffset.y * scaleY) * parentTransform.scaleY,
    scaleX: parentTransform.scaleX * scaleX,
    scaleY: parentTransform.scaleY * scaleY,
  };
};

const addShapeText = (
  entries: TextIndexEntry[],
  slideIndex: number,
  node: ShapeNodeData,
  nodePath: string,
  transform: CoordinateTransform,
): void => {
  const text = getTextBodyText(node.textBody);
  if (!shouldAddText(text)) return;
  entries.push({
    slideIndex,
    nodeId: node.id,
    nodePath,
    nodeType: node.nodeType,
    textKind: 'shape',
    text,
    bounds: toBounds(node, transform),
  });
};

const addTableText = (
  entries: TextIndexEntry[],
  slideIndex: number,
  node: TableNodeData,
  nodePath: string,
  transform: CoordinateTransform,
): void => {
  node.rows.forEach((row, rowIndex) => {
    row.cells.forEach((cell, cellIndex) => {
      const text = getCellText(cell);
      if (!shouldAddText(text)) return;
      entries.push({
        slideIndex,
        nodeId: node.id,
        nodePath: `${nodePath}/rows/${rowIndex}/cells/${cellIndex}`,
        nodeType: node.nodeType,
        textKind: 'table-cell',
        text,
        bounds: toBounds(node, transform),
        rowIndex,
        cellIndex,
      });
    });
  });
};

const addNodeText = (
  entries: TextIndexEntry[],
  slideIndex: number,
  node: SlideNode | BaseNodeData,
  nodePath: string,
  options: Required<TextIndexOptions>,
  transform: CoordinateTransform = IDENTITY_TRANSFORM,
  skipPlaceholders = false,
): void => {
  if (skipPlaceholders && node.placeholder) return;

  switch (node.nodeType) {
    case 'shape':
      if (options.includeShapes) {
        addShapeText(entries, slideIndex, node as ShapeNodeData, nodePath, transform);
      }
      break;
    case 'table':
      if (options.includeTables) {
        addTableText(entries, slideIndex, node as TableNodeData, nodePath, transform);
      }
      break;
    case 'group':
      if (!options.includeGroups) break;
      {
        const group = node as GroupNodeData;
        (node as GroupNodeData).children.forEach((childXml, childIndex) => {
          try {
            const child = parseGroupChild(childXml, skipPlaceholders);
            if (!child) return;
            const childTransform = getGroupChildTransform(group, child, transform);
            const childId = child.id || child.name || String(childIndex);
            addNodeText(
              entries,
              slideIndex,
              child,
              `${nodePath}/children/${childIndex}/${childId}`,
              options,
              childTransform,
              skipPlaceholders,
            );
          } catch {
            // Search should not make a presentation unusable because one group child is malformed.
          }
        });
      }
      break;
  }
};

const addTemplateText = (
  entries: TextIndexEntry[],
  slideIndex: number,
  spTree: SafeXmlNode | undefined,
  scope: 'master' | 'layout',
  options: Required<TextIndexOptions>,
): void => {
  if (!spTree?.exists()) return;

  spTree.allChildren().forEach((childXml, childIndex) => {
    if (isPlaceholderNode(childXml)) return;
    try {
      const child = parseGroupChild(childXml, true);
      if (!child) return;
      const childId = child.id || child.name || String(childIndex);
      addNodeText(
        entries,
        slideIndex,
        child,
        `slides/${slideIndex}/${scope}/nodes/${childId}`,
        options,
        IDENTITY_TRANSFORM,
        true,
      );
    } catch {
      // Keep text search best-effort, matching renderer error isolation for template shapes.
    }
  });
};

export const buildTextIndex = (
  presentation: PresentationData,
  options?: TextIndexOptions,
): TextIndexEntry[] => {
  const mergedOptions = { ...DEFAULT_INDEX_OPTIONS, ...options };
  const entries: TextIndexEntry[] = [];

  presentation.slides.forEach((slide, slideIndex) => {
    if (slide.showMasterSp) {
      const layoutPath = presentation.slideToLayout.get(slide.index) || slide.layoutIndex;
      const layout = presentation.layouts.get(layoutPath);
      const masterPath = layoutPath ? presentation.layoutToMaster.get(layoutPath) : '';
      const master = masterPath ? presentation.masters.get(masterPath) : undefined;

      if (layout?.showMasterSp && master) {
        addTemplateText(entries, slideIndex, master.spTree, 'master', mergedOptions);
      }
      if (layout) {
        addTemplateText(entries, slideIndex, layout.spTree, 'layout', mergedOptions);
      }
    }

    slide.nodes.forEach((node, nodeIndex) => {
      const nodeId = node.id || node.name || String(nodeIndex);
      addNodeText(entries, slideIndex, node, `slides/${slideIndex}/nodes/${nodeId}`, mergedOptions);
    });
  });

  return entries;
};

const createMatcher = (query: string | RegExp, options: TextSearchOptions): RegExp | null => {
  if (query instanceof RegExp) {
    const flags = new Set(query.flags.split(''));
    flags.add('g');
    return new RegExp(query.source, [...flags].join(''));
  }

  if (!query) return null;
  const source = options.useRegex ? query : escapeRegExp(query);
  const flags = options.matchCase ? 'g' : 'gi';
  return new RegExp(source, flags);
};

export const searchText = (
  index: readonly TextIndexEntry[],
  query: string | RegExp,
  options: TextSearchOptions = {},
): TextSearchResult[] => {
  const matcher = createMatcher(query, options);
  if (!matcher) return [];

  const snippetRadius = options.snippetRadius ?? 32;
  const results: TextSearchResult[] = [];

  for (const entry of index) {
    matcher.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(entry.text)) !== null) {
      const matchText = match[0];
      if (matchText.length === 0) {
        matcher.lastIndex += 1;
        continue;
      }

      const matchStart = match.index;
      const matchEnd = matchStart + matchText.length;
      if (options.wholeWord && !isWholeWordMatch(entry.text, matchStart, matchEnd)) continue;

      results.push({
        ...entry,
        matchStart,
        matchEnd,
        snippet: createSnippet(entry.text, matchStart, matchEnd, snippetRadius),
      });
    }
  }

  return results;
};

export const searchPresentation = (
  presentation: PresentationData,
  query: string | RegExp,
  options?: TextSearchOptions & TextIndexOptions,
): TextSearchResult[] => {
  const index = buildTextIndex(presentation, options);
  return searchText(index, query, options);
};
