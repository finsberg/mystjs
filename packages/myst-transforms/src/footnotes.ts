import type { Plugin } from 'unified';
import type { Root } from 'mdast';
import type { VFile } from 'vfile';
import type { FootnoteDefinition, FootnoteReference } from 'myst-spec-ext';
import { selectAll } from 'unist-util-select';
import { fileWarn } from 'myst-common';

function nextNumber(current: number, reserved: Set<number>): number {
  do {
    current += 1;
  } while (reserved.has(current));
  return current;
}

const TRANSFORM_SOURCE = 'myst-transforms:footnotes';

export function footnotesTransform(mdast: Root, file: VFile) {
  const footnotes = selectAll('footnoteDefinition', mdast) as FootnoteDefinition[];
  const footnotesLookup = Object.fromEntries(
    footnotes.map((n) => {
      // Clear out the number
      delete n.number;
      return [n.identifier, n];
    }),
  );
  const references = selectAll('footnoteReference', mdast) as FootnoteReference[];
  const reserved = new Set(
    references.map((r) => Number(r.identifier)).filter((num) => !Number.isNaN(num) && num > 0),
  );
  let footnoteCount = 0;
  references.forEach((node) => {
    if (!node.identifier) {
      fileWarn(file, 'FootnoteReference does not have an identifier', {
        node,
        source: TRANSFORM_SOURCE,
      });
      return;
    }
    const def = footnotesLookup[node.identifier] as FootnoteDefinition | undefined;
    if (!def) {
      fileWarn(file, `No footnoteDefinition found for ${node.identifier}`, {
        node,
        source: TRANSFORM_SOURCE,
      });
      return;
    }
    const identifierNumber = Number(node.identifier);
    if (!Number.isNaN(identifierNumber) && identifierNumber > 0) {
      def.number = identifierNumber;
      node.number = identifierNumber;
      def.enumerator = String(identifierNumber);
      node.enumerator = String(identifierNumber);
    } else {
      footnoteCount = nextNumber(footnoteCount, reserved);
      def.number = footnoteCount;
      node.number = footnoteCount;
      def.enumerator = String(footnoteCount);
      node.enumerator = String(footnoteCount);
    }
  });
}

export const footnotesPlugin: Plugin<[], Root, Root> = () => (tree, file) => {
  footnotesTransform(tree, file);
};
