import type { AssetResponseDto } from '@immich/sdk';
import { isSameRandomFilter, type RandomFilterState } from '$lib/utils/explore-random';

type RandomSeed = { assets: AssetResponseDto[]; filter: RandomFilterState };

// Carries the batch shown on the Explore page over to the View All page, so opening it
// continues from the same photos instead of drawing a brand new sample.
class RandomSeedManager {
  #seed = $state<RandomSeed>();

  set(assets: AssetResponseDto[], filter: RandomFilterState) {
    this.#seed = assets.length ? { assets, filter } : undefined;
  }

  take(filter: RandomFilterState): AssetResponseDto[] | undefined {
    const seed = this.#seed;
    if (!seed || !isSameRandomFilter(seed.filter, filter)) {
      return undefined;
    }

    // Seeds are single-use: shuffle and filter changes always draw a fresh sample.
    this.#seed = undefined;
    return seed.assets;
  }

  clear() {
    this.#seed = undefined;
  }
}

export const randomSeedManager = new RandomSeedManager();
