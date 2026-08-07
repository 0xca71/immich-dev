import { AssetTypeEnum, updateAsset } from '@immich/sdk';
import { fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { getAnimateMock } from '$lib/__mocks__/animate.mock';
import { getResizeObserverMock } from '$lib/__mocks__/resize-observer.mock';
import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { SlideshowNavigation, SlideshowState, slideshowStore } from '$lib/stores/slideshow.store';
import { navigate } from '$lib/utils/navigation';
import { renderWithTooltips } from '$tests/helpers';
import { assetFactory } from '@test-data/factories/asset-factory';
import { preferencesFactory } from '@test-data/factories/preferences-factory';
import { userAdminFactory } from '@test-data/factories/user-factory';
import AssetViewer from './AssetViewer.svelte';

vi.hoisted(() => {
  const store = new Map<string, string>();
  const localStorageMock: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorageMock,
    writable: true,
  });
});

vi.mock('$lib/managers/feature-flags-manager.svelte', () => ({
  featureFlagsManager: {
    init: vi.fn(),
    loadFeatureFlags: vi.fn(),
    value: { smartSearch: true, trash: true },
  } as never,
}));

vi.mock('$lib/utils/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/utils/navigation')>();
  return {
    ...actual,
    navigate: vi.fn(),
  };
});

vi.mock('$lib/stores/ocr.svelte', () => ({
  ocrManager: {
    clear: vi.fn(),
    getAssetOcr: vi.fn(),
    hasOcrData: false,
    showOverlay: false,
  },
}));

vi.mock('$lib/stores/face.svelte', () => ({
  faceManager: {
    clear: vi.fn(),
    data: [],
    getAssetFaces: vi.fn(),
  },
}));

vi.mock('@immich/sdk', async () => {
  const sdk = await vi.importActual<typeof import('@immich/sdk')>('@immich/sdk');
  return {
    ...sdk,
    updateAsset: vi.fn(),
  };
});

describe('AssetViewer', () => {
  beforeAll(() => {
    Element.prototype.animate = getAnimateMock();
    vi.stubGlobal('ResizeObserver', getResizeObserverMock());
  });

  afterEach(() => {
    slideshowStore.slideshowState.set(SlideshowState.None);
    slideshowStore.slideshowNavigation.set(SlideshowNavigation.DescendingOrder);
    slideshowStore.slideshowAutoplay.set(true);
    slideshowStore.slideshowRepeat.set(false);
    slideshowStore.slideshowSkipVideos.set(false);
    slideshowStore.slideshowSkipMotionPhotos.set(false);
    assetViewerManager.resetZoomState();
    assetViewerManager.resetPanelState();
    authManager.reset();
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it.skip('updates the top bar favorite action after pressing favorite', async () => {
    const ownerId = 'owner-id';
    const user = userAdminFactory.build({ id: ownerId });
    const asset = assetFactory.build({ ownerId, isFavorite: false, isTrashed: false });

    authManager.setUser(user);
    authManager.setPreferences(preferencesFactory.build({ cast: { gCastEnabled: false } }));

    vi.mocked(updateAsset).mockResolvedValue({ ...asset, isFavorite: true });

    const { getByLabelText, queryByLabelText } = renderWithTooltips(AssetViewer, {
      cursor: { current: asset },
      showNavigation: false,
    });

    expect(getByLabelText('to_favorite')).toBeInTheDocument();
    expect(queryByLabelText('unfavorite')).toBeNull();

    await fireEvent.click(getByLabelText('to_favorite'));

    await waitFor(() =>
      expect(updateAsset).toHaveBeenCalledWith({ id: asset.id, updateAssetDto: { isFavorite: true } }),
    );
    await waitFor(() => expect(getByLabelText('unfavorite')).toBeInTheDocument());
  });

  it('does not use the unfiltered random fallback when the slideshow resolver is exhausted', async () => {
    const ownerId = 'owner-id';
    const user = userAdminFactory.build({ id: ownerId });
    const asset = assetFactory.build({ ownerId, isTrashed: false, type: AssetTypeEnum.Image });
    const onRandom = vi.fn().mockResolvedValue({ id: 'unfiltered-asset' });
    const resolveSlideshowRandomAsset = vi.fn().mockResolvedValue(undefined);

    authManager.setUser(user);
    authManager.setPreferences(preferencesFactory.build({ cast: { gCastEnabled: false } }));
    slideshowStore.slideshowNavigation.set(SlideshowNavigation.Shuffle);
    slideshowStore.slideshowAutoplay.set(false);

    const { findByLabelText } = renderWithTooltips(AssetViewer, {
      cursor: { current: asset },
      showNavigation: false,
      onRandom,
      resolveSlideshowRandomAsset,
    });

    slideshowStore.slideshowState.set(SlideshowState.PlaySlideshow);
    await fireEvent.click(await findByLabelText('next'));

    await waitFor(() => expect(resolveSlideshowRandomAsset).toHaveBeenCalledOnce());
    expect(onRandom).not.toHaveBeenCalled();
  });

  it('navigates with the wheel and zooms photos with Alt + wheel', async () => {
    const ownerId = 'owner-id';
    const user = userAdminFactory.build({ id: ownerId });
    const asset = assetFactory.build({ ownerId, isTrashed: false, type: AssetTypeEnum.Image });
    const nextAsset = assetFactory.build({ ownerId, isTrashed: false, type: AssetTypeEnum.Image });

    authManager.setUser(user);
    authManager.setPreferences(preferencesFactory.build({ cast: { gCastEnabled: false } }));

    const { container } = renderWithTooltips(AssetViewer, {
      cursor: { current: asset, nextAsset },
      showNavigation: false,
    });
    const viewerContent = container.querySelector<HTMLElement>('[data-viewer-content]')!;
    await tick();

    await fireEvent.wheel(viewerContent, { deltaY: 100 });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ targetRoute: 'current', assetId: nextAsset.id }));

    vi.mocked(navigate).mockClear();
    const zoomStateSetter = vi.spyOn(assetViewerManager, 'zoomState', 'set');
    const zoomEvent = new WheelEvent('wheel', { altKey: true, bubbles: true, cancelable: true, deltaY: -300 });
    Object.defineProperties(zoomEvent, {
      altKey: { value: true },
      deltaX: { value: 0 },
      deltaY: { value: -300 },
    });
    viewerContent.dispatchEvent(zoomEvent);

    expect(zoomEvent.defaultPrevented).toBe(true);
    expect(zoomStateSetter).toHaveBeenCalledWith(expect.objectContaining({ currentZoom: 1.35 }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ignores wheel navigation from interactive overlays and while editing', async () => {
    const ownerId = 'owner-id';
    const user = userAdminFactory.build({ id: ownerId });
    const asset = assetFactory.build({ ownerId, isTrashed: false, type: AssetTypeEnum.Image });
    const nextAsset = assetFactory.build({ ownerId, isTrashed: false, type: AssetTypeEnum.Image });

    authManager.setUser(user);
    authManager.setPreferences(preferencesFactory.build({ cast: { gCastEnabled: false } }));

    const { container } = renderWithTooltips(AssetViewer, {
      cursor: { current: asset, nextAsset },
      showNavigation: false,
    });
    const viewerContent = container.querySelector<HTMLElement>('[data-viewer-content]')!;
    await tick();
    const overlay = document.createElement('button');
    overlay.dataset.overlayInteractive = '';
    viewerContent.append(overlay);

    await fireEvent.wheel(overlay, { deltaY: 100 });
    expect(navigate).not.toHaveBeenCalled();

    assetViewerManager.openEditor();
    viewerContent.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 }));
    assetViewerManager.closeEditor();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('enters fullscreen only from the explicit slideshow control', async () => {
    const ownerId = 'owner-id';
    const user = userAdminFactory.build({ id: ownerId });
    const asset = assetFactory.build({ ownerId, isTrashed: false, type: AssetTypeEnum.Image });

    authManager.setUser(user);
    authManager.setPreferences(preferencesFactory.build({ cast: { gCastEnabled: false } }));
    slideshowStore.slideshowAutoplay.set(false);

    const { container, findByLabelText } = renderWithTooltips(AssetViewer, {
      cursor: { current: asset },
      showNavigation: false,
    });
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const viewer = container.querySelector<HTMLElement>('#immich-asset-viewer')!;
    Object.defineProperty(viewer, 'requestFullscreen', { configurable: true, value: requestFullscreen });

    slideshowStore.slideshowState.set(SlideshowState.PlaySlideshow);
    const fullscreenButton = await findByLabelText('set_slideshow_to_fullscreen');

    expect(requestFullscreen).not.toHaveBeenCalled();
    await fireEvent.click(fullscreenButton);
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });
});
