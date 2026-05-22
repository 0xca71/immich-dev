<script lang="ts">
  import { clickOutside } from '$lib/actions/click-outside';
  import ActionMenuItem from '$lib/components/ActionMenuItem.svelte';
  import UserPageLayout from '$lib/components/layouts/UserPageLayout.svelte';
  import ButtonContextMenu from '$lib/components/shared-components/context-menu/ButtonContextMenu.svelte';
  import EmptyPlaceholder from '$lib/components/shared-components/EmptyPlaceholder.svelte';
  import ArchiveAction from '$lib/components/timeline/actions/ArchiveAction.svelte';
  import ChangeDate from '$lib/components/timeline/actions/ChangeDateAction.svelte';
  import ChangeDescription from '$lib/components/timeline/actions/ChangeDescriptionAction.svelte';
  import ChangeLocation from '$lib/components/timeline/actions/ChangeLocationAction.svelte';
  import CreateSharedLink from '$lib/components/timeline/actions/CreateSharedLinkAction.svelte';
  import DeleteAssets from '$lib/components/timeline/actions/DeleteAssetsAction.svelte';
  import DownloadAction from '$lib/components/timeline/actions/DownloadAction.svelte';
  import FavoriteAction from '$lib/components/timeline/actions/FavoriteAction.svelte';
  import LinkLivePhotoAction from '$lib/components/timeline/actions/LinkLivePhotoAction.svelte';
  import SelectAllAssets from '$lib/components/timeline/actions/SelectAllAction.svelte';
  import SetVisibilityAction from '$lib/components/timeline/actions/SetVisibilityAction.svelte';
  import StackAction from '$lib/components/timeline/actions/StackAction.svelte';
  import TagAction from '$lib/components/timeline/actions/TagAction.svelte';
  import AssetSelectControlBar from '$lib/components/timeline/AssetSelectControlBar.svelte';
  import Timeline from '$lib/components/timeline/Timeline.svelte';
  import { AssetAction } from '$lib/constants';
  import { assetMultiSelectManager } from '$lib/managers/asset-multi-select-manager.svelte';
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { memoryManager } from '$lib/managers/memory-manager.svelte';
  import { TimelineManager } from '$lib/managers/timeline-manager/timeline-manager.svelte';
  import { Route } from '$lib/route';
  import { getAssetBulkActions } from '$lib/services/asset.service';
  import { getAssetMediaUrl, memoryLaneTitle } from '$lib/utils';
  import {
    updateStackedAssetInTimeline,
    updateUnstackedAssetInTimeline,
    type OnLink,
    type OnUnlink,
  } from '$lib/utils/actions';
  import { openFileUploadDialog } from '$lib/utils/file-uploader';
  import { getAltText } from '$lib/utils/thumbnail-util';
  import { toTimelineAsset } from '$lib/utils/timeline-util';
  import { AssetVisibility } from '@immich/sdk';
  import { ActionButton, CommandPaletteDefaultProvider, Icon, ImageCarousel } from '@immich/ui';
  import { mdiCheck, mdiDotsVertical } from '@mdi/js';
  import { t } from 'svelte-i18n';

  let timelineManager = $state<TimelineManager>() as TimelineManager;
  const allYearsValue = '__all__';
  const allYearsLabel = '';
  const allYearsMenuLabel = 'All';
  let isYearMenuOpen = $state(false);
  let selectedTimelineYear = $state(allYearsValue);
  const options = $derived.by(() => ({
    visibility: AssetVisibility.Timeline,
    withStacked: true,
    withPartners: true,
    displayYear: selectedTimelineYear !== allYearsValue ? Number(selectedTimelineYear) : undefined,
  }));
  const yearOptions = $derived.by(() => [
    { label: allYearsLabel, value: allYearsValue },
    ...(timelineManager?.availableYears ?? []).map((year) => ({ label: `${year}`, value: `${year}` })),
  ]);
  const selectedYearLabel = $derived(selectedTimelineYear === allYearsValue ? allYearsLabel : selectedTimelineYear);
  const showYearFilter = $derived((timelineManager?.availableYears?.length ?? 0) > 1);

  let selectedAssets = $derived(assetMultiSelectManager.assets);
  let isAssetStackSelected = $derived(selectedAssets.length === 1 && !!selectedAssets[0].stack);
  let isLinkActionAvailable = $derived.by(() => {
    const isLivePhoto = selectedAssets.length === 1 && !!selectedAssets[0].livePhotoVideoId;
    const isLivePhotoCandidate =
      selectedAssets.length === 2 &&
      selectedAssets.some((asset) => asset.isImage) &&
      selectedAssets.some((asset) => asset.isVideo);

    return assetMultiSelectManager.isAllUserOwned && (isLivePhoto || isLivePhotoCandidate);
  });

  const handleEscape = () => {
    if (assetViewerManager.isViewing) {
      return;
    }
    if (assetMultiSelectManager.selectionActive) {
      assetMultiSelectManager.clear();
      return;
    }
  };

  const handleLink: OnLink = ({ still, motion }) => {
    timelineManager.removeAssets([motion.id]);
    timelineManager.upsertAssets([still]);
  };

  const handleUnlink: OnUnlink = ({ still, motion }) => {
    timelineManager.upsertAssets([motion]);
    timelineManager.upsertAssets([still]);
  };

  const handleSetVisibility = (assetIds: string[]) => {
    timelineManager.removeAssets(assetIds);
    assetMultiSelectManager.clear();
  };

  const items = $derived(
    memoryManager.memories.map((memory) => ({
      id: memory.id,
      title: $memoryLaneTitle(memory),
      href: Route.memories({ id: memory.assets[0].id }),
      alt: $t('memory_lane_title', { values: { title: $getAltText(toTimelineAsset(memory.assets[0])) } }),
      src: getAssetMediaUrl({ id: memory.assets[0].id }),
    })),
  );
</script>

<UserPageLayout hideNavbar={assetMultiSelectManager.selectionActive} scrollbar={false}>
  <Timeline
    enableRouting={true}
    bind:timelineManager
    {options}
    assetInteraction={assetMultiSelectManager}
    removeAction={AssetAction.ARCHIVE}
    onEscape={handleEscape}
    withStacked
  >
    {#snippet scrubberHeader()}
      {#if showYearFilter}
        <div class="w-full px-1 pb-2 pt-1 text-right">
          <div
            use:clickOutside={{ onOutclick: () => (isYearMenuOpen = false), onEscape: () => (isYearMenuOpen = false) }}
            class="relative"
          >
            <button
              type="button"
              class="relative flex h-10 w-full items-center justify-center rounded-[20px] bg-gray-100 text-sm font-medium text-immich-fg ring-1 ring-gray-200 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-immich-dark-fg dark:ring-neutral-900 dark:hover:bg-gray-700"
              aria-haspopup="listbox"
              aria-expanded={isYearMenuOpen}
              aria-label={$t('year')}
              onclick={() => (isYearMenuOpen = !isYearMenuOpen)}
            >
              <span class="min-w-0 truncate tabular-nums">{selectedYearLabel}</span>
            </button>

            {#if isYearMenuOpen}
              <div
                class="absolute end-0 top-full z-10 mt-2 w-full overflow-hidden rounded-[20px] bg-gray-100 py-2 text-sm font-medium shadow-lg ring-1 ring-gray-200 dark:bg-gray-800 dark:text-immich-dark-fg dark:ring-neutral-900"
                role="listbox"
                aria-label={$t('year')}
              >
                {#each yearOptions as option (option.value)}
                  <button
                    type="button"
                    class={[
                      'flex h-12 w-full items-center justify-center px-0 tabular-nums transition-colors',
                      option.value === selectedTimelineYear
                        ? 'bg-gray-200 text-primary dark:bg-gray-700'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700',
                    ]}
                    role="option"
                    aria-selected={option.value === selectedTimelineYear}
                    onclick={() => {
                      selectedTimelineYear = option.value;
                      isYearMenuOpen = false;
                    }}
                  >
                    {#if option.value === allYearsValue}
                      <span class="sr-only">{allYearsMenuLabel}</span>
                      {#if option.value === selectedTimelineYear}
                        <Icon icon={mdiCheck} size="18" />
                      {/if}
                    {:else}
                      <span>{option.label}</span>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {/snippet}
    {#if authManager.preferences.memories.enabled}
      <ImageCarousel {items} />
    {/if}
    {#snippet empty()}
      <EmptyPlaceholder text={$t('no_assets_message')} onClick={() => openFileUploadDialog()} class="mx-auto mt-10" />
    {/snippet}
  </Timeline>
</UserPageLayout>

{#if assetMultiSelectManager.selectionActive}
  <AssetSelectControlBar>
    {@const Actions = getAssetBulkActions($t)}
    <CommandPaletteDefaultProvider name={$t('assets')} actions={Object.values(Actions)} />

    <CreateSharedLink />
    <SelectAllAssets {timelineManager} assetInteraction={assetMultiSelectManager} />
    <ActionButton action={Actions.AddToAlbum} />

    {#if assetMultiSelectManager.isAllUserOwned}
      <FavoriteAction
        removeFavorite={assetMultiSelectManager.isAllFavorite}
        onFavorite={(ids, isFavorite) => timelineManager.update(ids, (asset) => (asset.isFavorite = isFavorite))}
      />

      <ButtonContextMenu icon={mdiDotsVertical} title={$t('menu')}>
        <DownloadAction menuItem />
        {#if assetMultiSelectManager.assets.length > 1 || isAssetStackSelected}
          <StackAction
            unstack={isAssetStackSelected}
            onStack={(result) => updateStackedAssetInTimeline(timelineManager, result)}
            onUnstack={(assets) => updateUnstackedAssetInTimeline(timelineManager, assets)}
          />
        {/if}
        {#if isLinkActionAvailable}
          <LinkLivePhotoAction
            menuItem
            unlink={assetMultiSelectManager.assets.length === 1}
            onLink={handleLink}
            onUnlink={handleUnlink}
          />
        {/if}
        <ChangeDate menuItem />
        <ChangeDescription menuItem />
        <ChangeLocation menuItem />
        <ArchiveAction
          menuItem
          onArchive={(ids, visibility) => timelineManager.update(ids, (asset) => (asset.visibility = visibility))}
        />
        {#if authManager.preferences.tags.enabled}
          <TagAction menuItem />
        {/if}
        <DeleteAssets
          menuItem
          onAssetDelete={(assetIds) => timelineManager.removeAssets(assetIds)}
          onUndoDelete={(assets) => timelineManager.upsertAssets(assets)}
        />
        <SetVisibilityAction menuItem onVisibilitySet={handleSetVisibility} />
        <hr />
        <ActionMenuItem action={Actions.RegenerateThumbnailJob} />
        <ActionMenuItem action={Actions.RefreshMetadataJob} />
        <ActionMenuItem action={Actions.TranscodeVideoJob} />
      </ButtonContextMenu>
    {:else}
      <DownloadAction />
    {/if}
  </AssetSelectControlBar>
{/if}
