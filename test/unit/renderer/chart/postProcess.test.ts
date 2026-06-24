import { describe, expect, it } from 'vitest';
import {
  applyDefaultTextColors,
  applyNiceAxisRange,
} from '../../../../src/renderer/chart/postProcess';

describe('chart option post-process helpers', () => {
  it('fills Office-like default text colors when chart text omits explicit color', () => {
    const option = {
      title: { textStyle: {} },
      legend: { textStyle: {} },
      xAxis: { name: 'Category', nameTextStyle: {} },
      radar: { indicator: [{ axisLabel: {} }] },
    };

    applyDefaultTextColors(option);

    expect(option.title.textStyle.color).toBe('#000000');
    expect(option.legend.textStyle.color).toBe('#000000');
    expect(option.xAxis.nameTextStyle.color).toBe('#000000');
    expect(option.radar.indicator[0].axisLabel.color).toBe('#000000');
  });

  it('adds nice value-axis headroom when no explicit max exists', () => {
    const option = {
      xAxis: { type: 'category' },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [1, 5] }],
    };

    applyNiceAxisRange(option);

    expect(option.yAxis.min).toBe(0);
    expect(option.yAxis.max).toBeGreaterThan(5);
    expect(option.yAxis.interval).toBeGreaterThan(0);
  });

  it('limits default value-axis tick density for compact bar charts', () => {
    const option = {
      grid: { top: 40, bottom: 24 },
      xAxis: { type: 'category' },
      yAxis: { type: 'value', axisLabel: { fontSize: 24 } },
      series: [{ type: 'bar', data: [2, 4, 3] }],
    };

    applyNiceAxisRange(option, { w: 278, h: 182 });

    expect(option.yAxis.min).toBe(0);
    expect(option.yAxis.max).toBe(5);
    expect(option.yAxis.interval).toBe(5);
  });
});
