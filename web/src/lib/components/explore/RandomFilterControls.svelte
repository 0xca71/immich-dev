<script lang="ts">
  import { DatePicker, IconButton } from '@immich/ui';
  import { mdiShuffle, mdiTune } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { DateTime } from 'luxon';
  import { dateRangeOptions, type RandomFilterState } from '$lib/utils/explore-random';
  let {
    filter = $bindable(),
    loading,
    onrefresh,
  }: { filter: RandomFilterState; loading: boolean; onrefresh: () => void } = $props();
  let expanded = $state(false);
  const asDateTime = (value: string) => (value ? DateTime.fromISO(value) : undefined);
</script>

<div class="flex flex-wrap items-center justify-end gap-2">
  <IconButton
    shape="round"
    color="secondary"
    variant="ghost"
    icon={mdiTune}
    aria-label={$t('filters')}
    aria-expanded={expanded}
    onclick={() => (expanded = !expanded)}
  />
  <IconButton
    shape="round"
    color="secondary"
    variant="ghost"
    icon={mdiShuffle}
    aria-label={$t('shuffle')}
    disabled={loading}
    onclick={onrefresh}
  />
  {#if expanded}
    <div class="flex w-full flex-wrap items-end justify-end gap-3 pb-3">
      <label class="text-sm"
        >{$t('media_type')}
        <select
          class="ms-2 rounded border p-2 dark:bg-immich-dark-gray"
          bind:value={filter.mediaType}
          disabled={loading}
          onchange={(event) => {
            filter.mediaType = event.currentTarget.value as RandomFilterState['mediaType'];
            onrefresh();
          }}
        >
          <option value="all">{$t('all')}</option><option value="image">{$t('photos')}</option><option value="video"
            >{$t('videos')}</option
          >
        </select>
      </label>
      <label class="text-sm"
        >{$t('date_range')}
        <select
          class="ms-2 rounded border p-2 dark:bg-immich-dark-gray"
          bind:value={filter.dateRange}
          disabled={loading}
          onchange={(event) => {
            filter.dateRange = event.currentTarget.value as RandomFilterState['dateRange'];
            // Custom only reveals the pickers; the sample is redrawn once a date is picked.
            if (filter.dateRange !== 'custom') {
              onrefresh();
            }
          }}
        >
          {#each dateRangeOptions as range}<option value={range}>{$t(`explore_random_range_${range}`)}</option>{/each}
        </select>
      </label>
      {#if filter.dateRange === 'custom'}
        <label class="flex flex-col gap-1 text-sm"
          >{$t('start_date')}
          <DatePicker
            value={asDateTime(filter.takenAfter)}
            maxDate={DateTime.now()}
            onChange={(date) => {
              filter.takenAfter = date?.toISODate() ?? '';
              onrefresh();
            }}
          />
        </label>
        <label class="flex flex-col gap-1 text-sm"
          >{$t('end_date')}
          <DatePicker
            value={asDateTime(filter.takenBefore)}
            maxDate={DateTime.now()}
            onChange={(date) => {
              filter.takenBefore = date?.toISODate() ?? '';
              onrefresh();
            }}
          />
        </label>
      {/if}
    </div>
  {/if}
</div>
