<script lang="ts">
  interface Props {
    years: number[];
    selectedYear?: number;
    onSelectYear?: (year?: number) => void;
    onJumpToDate?: (date: string) => void;
  }

  let { years, selectedYear = undefined, onSelectYear = () => {}, onJumpToDate = () => {} }: Props = $props();

  let jumpDate = $state('');

  $effect(() => {
    if (selectedYear === undefined) {
      jumpDate = '';
    }
  });

  const minDate = $derived(() => (selectedYear === undefined ? '' : `${selectedYear}-01-01`));
  const maxDate = $derived(() => (selectedYear === undefined ? '' : `${selectedYear}-12-31`));
</script>

<div class="year-filter-bar">
  <div class="year-filter-container">
    <div class="year-filter-label">快速跳转:</div>

    <div class="year-filter-buttons">
      <button
        type="button"
        class="year-filter-button"
        class:active={selectedYear === undefined}
        onclick={() => onSelectYear(undefined)}
      >
        全部
      </button>

      {#each years as year}
        <button
          type="button"
          class="year-filter-button"
          class:active={selectedYear === year}
          onclick={() => onSelectYear(year)}
        >
          {year}
        </button>
      {/each}
    </div>

    {#if selectedYear !== undefined}
      <div class="year-filter-date">
        <input type="date" bind:value={jumpDate} min={minDate} max={maxDate} />
        <button
          type="button"
          class="year-filter-button"
          disabled={!jumpDate}
          onclick={() => jumpDate && onJumpToDate(jumpDate)}
        >
          跳转
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .year-filter-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    background-color: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.75rem 1rem;
    box-shadow: 0 -4px 6px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s ease;
  }

  .year-filter-container {
    max-width: 100%;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 1rem;
    overflow-x: auto;
  }

  .year-filter-label {
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .year-filter-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .year-filter-date {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-shrink: 0;
  }

  .year-filter-date input[type='date'] {
    height: 2.25rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
    padding: 0 0.5rem;
  }

  .year-filter-date input[type='date']::-webkit-calendar-picker-indicator {
    filter: invert(1);
  }

  .year-filter-button {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .year-filter-button.active {
    background-color: rgba(255, 255, 255, 0.25);
    color: white;
    border-color: rgba(255, 255, 255, 0.45);
  }

  .year-filter-button:hover {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  .year-filter-button:active {
    transform: translateY(0);
  }

  /* Scrollbar styling for year filter container */
  .year-filter-container::-webkit-scrollbar {
    height: 4px;
  }

  .year-filter-container::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }

  .year-filter-container::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
  }

  .year-filter-container::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .year-filter-bar {
      padding: 0.5rem 0.75rem;
    }

    .year-filter-button {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }
  }
</style>
