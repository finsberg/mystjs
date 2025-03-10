import type { GenericNode } from 'myst-common';
import { u } from 'unist-builder';
import type { Handler, ITexParser } from './types';
import { getArguments, texToText } from './utils';

function renderCaption(node: GenericNode, state: ITexParser) {
  state.closeParagraph();
  state.openNode('caption');
  const args = getArguments(node, 'group');
  const children = args[args.length - 1];
  state.openParagraph();
  state.renderChildren(children);
  state.closeParagraph();
  state.closeNode();
}

const FIGURE_HANDLERS: Record<string, Handler> = {
  env_figure(node, state) {
    state.closeParagraph();
    state.openNode('container', { kind: 'figure' });
    state.renderChildren(node);
    state.closeParagraph();
    state.closeNode();
  },
  env_subfigure(node, state) {
    state.renderChildren(node);
  },
  macro_centering(node, state) {
    state.closeParagraph();
    const container = state.top();
    if (container.type === 'container') {
      container.align = 'center';
    } else {
      state.warn('Unknown use of centering, currently this only works for containers', node);
    }
  },
  macro_includegraphics(node, state) {
    state.closeParagraph();
    const url = texToText(getArguments(node, 'group'));
    // TODO: width, placement, etc.
    state.pushNode(u('image', { url }));
  },
  macro_caption: renderCaption,
  macro_captionof: renderCaption,
  macro_framebox(node, state) {
    state.closeParagraph();
    const [children] = getArguments(node, 'group');
    if (!children) return;
    state.openNode('container', { kind: 'figure' });
    state.renderChildren(children);
    state.closeParagraph();
    state.closeNode();
  },
};

FIGURE_HANDLERS['env_figure*'] = FIGURE_HANDLERS.env_figure;

export { FIGURE_HANDLERS };
