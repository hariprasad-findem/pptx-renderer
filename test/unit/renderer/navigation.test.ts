import { describe, expect, it } from 'vitest';
import { resolveSlideNavigationIndex } from '../../../src/renderer/navigation';
import { createMockRenderContext } from '../helpers/mockContext';

describe('renderer navigation helpers', () => {
  it('resolves hlinksldjump action names case-insensitively', () => {
    const ctx = createMockRenderContext();
    ctx.slide.slidePath = 'ppt/slides/slide5.xml';
    ctx.presentation.slides = [
      ctx.slide,
      { ...ctx.slide, index: 1, slidePath: 'ppt/slides/slide2.xml', rels: new Map() },
      { ...ctx.slide, index: 2, slidePath: 'ppt/slides/slide9.xml', rels: new Map() },
    ];

    expect(
      resolveSlideNavigationIndex(ctx, 'PPACTION://hlinksldjump', {
        type: 'slide',
        target: 'slide9.xml',
      }),
    ).toBe(2);
  });

  it('resolves hlinkshowjump query keys and values case-insensitively', () => {
    const ctx = createMockRenderContext();
    ctx.slide.index = 1;
    ctx.presentation.slides = [
      { ...ctx.slide, index: 0, slidePath: 'ppt/slides/slide1.xml', rels: new Map() },
      ctx.slide,
      { ...ctx.slide, index: 2, slidePath: 'ppt/slides/slide3.xml', rels: new Map() },
    ];

    expect(resolveSlideNavigationIndex(ctx, 'PPACTION://hlinkshowjump?Jump=PreviousSlide')).toBe(0);
  });

  it('ignores URI query and fragment suffixes when resolving slide relationship targets', () => {
    const ctx = createMockRenderContext();
    ctx.slide.slidePath = 'ppt/slides/slide1.xml';
    ctx.presentation.slides = [
      ctx.slide,
      { ...ctx.slide, index: 1, slidePath: 'ppt/slides/slide2.xml', rels: new Map() },
    ];

    expect(
      resolveSlideNavigationIndex(ctx, 'ppaction://hlinksldjump', {
        type: 'slide',
        target: 'slide2.xml#section',
      }),
    ).toBe(1);

    expect(
      resolveSlideNavigationIndex(ctx, 'ppaction://hlinksldjump', {
        type: 'slide',
        target: 'slide2.xml?view=notes',
      }),
    ).toBe(1);
  });

  it('does not resolve external TargetMode relationships as internal slide jumps', () => {
    const ctx = createMockRenderContext();
    ctx.presentation.slides = [
      ctx.slide,
      { ...ctx.slide, index: 1, slidePath: 'ppt/slides/slide2.xml', rels: new Map() },
    ];

    expect(
      resolveSlideNavigationIndex(ctx, 'ppaction://hlinksldjump', {
        type: 'hyperlink',
        target: 'https://example.com/slide2.xml',
        targetMode: 'External',
      }),
    ).toBeUndefined();
  });
});
