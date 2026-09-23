import { AssetTypeEnum, type AssetResponseDto } from '@immich/sdk';
import { DateTime } from 'luxon';
import {
  buildCustomDateRange,
  buildRandomSearchFilter,
  defaultRandomFilter,
  isRandomExhausted,
  isSameRandomFilter,
  mergeUniqueAssets,
} from './explore-random';

const asset = (id: string, date: string, type = AssetTypeEnum.Image) =>
  ({
    id,
    type,
    localDateTime: `${date}T12:00:00.000Z`,
  }) as AssetResponseDto;

const filterState = (overrides: Partial<ReturnType<typeof defaultRandomFilter>> = {}) => ({
  ...defaultRandomFilter(),
  ...overrides,
});

describe('explore random helpers', () => {
  it('builds structured type and taken date filters', () => {
    const filter = buildRandomSearchFilter(
      filterState({ mediaType: 'video', dateRange: 'last_year' }),
      DateTime.fromISO('2026-09-23T12:00:00Z'),
    );
    expect(filter.type).toEqual({ eq: AssetTypeEnum.Video });
    expect(filter.takenAt?.gte).toBe('2025-09-23T12:00:00.000Z');
    expect(filter.takenAt?.lt).toBe('2026-09-23T12:00:00.000Z');
  });

  it('merges random batches without repeating assets', () => {
    const first = [asset('1', '2020-01-02'), asset('2', '2020-01-02')];
    const second = [asset('2', '2020-01-02'), asset('3', '2021-04-05')];
    const merged = mergeUniqueAssets(first, second);
    expect(merged.assets.map((item) => item.id)).toEqual(['1', '2', '3']);
    expect(merged.added).toBe(1);
  });

  it('stops sampling once a batch adds nothing or the library is covered', () => {
    expect(isRandomExhausted(200, 5000, 180)).toBe(false);
    expect(isRandomExhausted(200, 5000, 0)).toBe(true);
    expect(isRandomExhausted(500, 500, 20)).toBe(true);
    expect(isRandomExhausted(0, 0, 0)).toBe(true);
    // without a total, only an empty batch can end it
    expect(isRandomExhausted(200, null, 180)).toBe(false);
  });

  it('turns a custom range into an inclusive UTC window', () => {
    const range = buildCustomDateRange('2020-01-02', '2020-01-05');
    expect(range?.gte).toBe(DateTime.fromISO('2020-01-02').toUTC().toISO());
    expect(range?.lt).toBe(DateTime.fromISO('2020-01-06').toUTC().toISO());
  });

  it('keeps a custom range open ended and swaps a reversed selection', () => {
    expect(buildCustomDateRange('', '2020-01-05')?.gte).toBeUndefined();
    expect(buildCustomDateRange('2020-01-02', '')?.lt).toBeUndefined();
    expect(buildCustomDateRange('', '')).toBeUndefined();
    const swapped = buildCustomDateRange('2020-01-05', '2020-01-02');
    expect(swapped?.gte).toBe(DateTime.fromISO('2020-01-02').toUTC().toISO());
    expect(swapped?.lt).toBe(DateTime.fromISO('2020-01-06').toUTC().toISO());
  });

  it('applies a custom range instead of the presets', () => {
    const filter = buildRandomSearchFilter(filterState({ dateRange: 'custom', takenAfter: '2020-01-02' }));
    expect(filter.takenAt?.gte).toBe(DateTime.fromISO('2020-01-02').toUTC().toISO());
    expect(filter.takenAt?.lt).toBeUndefined();
  });

  it('only reuses a seed when the filter matches exactly', () => {
    expect(isSameRandomFilter(defaultRandomFilter(), defaultRandomFilter())).toBe(true);
    expect(isSameRandomFilter(defaultRandomFilter(), filterState({ mediaType: 'video' }))).toBe(false);
    expect(
      isSameRandomFilter(filterState({ takenAfter: '2020-01-02' }), filterState({ takenAfter: '2020-01-03' })),
    ).toBe(false);
  });
});
