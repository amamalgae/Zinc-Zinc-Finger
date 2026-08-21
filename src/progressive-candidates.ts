const PAGE_SIZE = 30;
const LOAD_AHEAD_PX = 96;
const MIN_GENOME_TRANSITION_MS = 500;

type ListState = {
  visible: number;
  generation: number;
};

const states = new WeakMap<HTMLElement, ListState>();
const boundLists = new WeakSet<HTMLElement>();
let generation = 0;
let refreshQueued = false;
let genomeTransitionActive = false;
let genomeTransitionRequested = false;
let genomeTransitionStartedAt = 0;
let genomeTransitionTimer: number | null = null;

function candidateRows(list: HTMLElement): HTMLElement[] {
  return Array.from(list.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains("candidate"),
  );
}

function compactGenomeLabels(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".genome-match").forEach((label) => {
    if (label.classList.contains("exact-duplicate")) {
      if (label.textContent !== "0 mismatch") label.textContent = "0 mismatch";
      return;
    }
    if (
      !label.classList.contains("near-high")
      && !label.classList.contains("near-mid")
      && !label.classList.contains("near-weak")
    ) return;
    const text = label.textContent ?? "";
    if (/^(?:[1-9]|1\d|2[01]) mismatch$/.test(text)) return;
    const match = text.match(/\b((?:[1-9]|1\d|2[01]))\s*mm\b/);
    if (match) label.textContent = `${match[1]} mismatch`;
  });
}

function resultsPanel(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".results-panel");
}

function genomeStatus(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".genome-file-status");
}

function genomeIsReady(): boolean {
  return Boolean(document.querySelector(".genome-scope-note"));
}

function rowHasGenomeSummary(row: HTMLElement): boolean {
  return Boolean(row.querySelector(".genome-match"));
}

function applyVisibleRows(list: HTMLElement) {
  const rows = candidateRows(list);
  let state = states.get(list);
  if (!state || state.generation !== generation) {
    state = { visible: PAGE_SIZE, generation };
    states.set(list, state);
  }
  state.visible = Math.min(Math.max(PAGE_SIZE, state.visible), Math.max(PAGE_SIZE, rows.length));

  const genomePageMode = Boolean(genomeStatus()) && genomeIsReady();
  let waitingForGenomePage = false;
  rows.forEach((row, index) => {
    const requested = index < state!.visible;
    const genomeSummaryReady = !genomePageMode || rowHasGenomeSummary(row);
    row.hidden = !requested || !genomeSummaryReady;
    if (requested && !genomeSummaryReady) waitingForGenomePage = true;
  });

  list.dataset.visibleCandidates = String(rows.filter((row) => !row.hidden).length);
  list.dataset.totalCandidates = String(rows.length);
  if (waitingForGenomePage) list.dataset.genomePageLoading = "true";
  else delete list.dataset.genomePageLoading;

  if (!boundLists.has(list)) {
    boundLists.add(list);
    list.addEventListener("scroll", () => {
      const current = states.get(list);
      if (!current || genomeTransitionActive) return;
      if (list.scrollHeight - list.scrollTop - list.clientHeight > LOAD_AHEAD_PX) return;
      const total = candidateRows(list).length;
      if (current.visible >= total) return;
      current.visible = Math.min(total, current.visible + PAGE_SIZE);
      applyVisibleRows(list);
    }, { passive: true });
  }
}

function beginGenomeTransition() {
  if (genomeTransitionActive) return;
  const panel = resultsPanel();
  if (!panel || !document.querySelector(".candidate-list")) {
    genomeTransitionRequested = true;
    return;
  }
  genomeTransitionRequested = false;
  genomeTransitionActive = true;
  genomeTransitionStartedAt = performance.now();
  panel.classList.add("genome-transition-loading");
}

function finishGenomeTransition() {
  if (!genomeTransitionActive) {
    genomeTransitionRequested = false;
    return;
  }
  if (genomeTransitionTimer !== null) {
    window.clearTimeout(genomeTransitionTimer);
    genomeTransitionTimer = null;
  }
  resultsPanel()?.classList.remove("genome-transition-loading");
  genomeTransitionActive = false;
  genomeTransitionRequested = false;
  generation += 1;
  queueRefresh();
}

function finishGenomeTransitionAfterMinimum() {
  const remaining = Math.max(0, MIN_GENOME_TRANSITION_MS - (performance.now() - genomeTransitionStartedAt));
  if (genomeTransitionTimer !== null) window.clearTimeout(genomeTransitionTimer);
  genomeTransitionTimer = window.setTimeout(() => {
    genomeTransitionTimer = null;
    finishGenomeTransition();
  }, remaining);
}

function requestGenomeTransition() {
  genomeTransitionRequested = true;
  beginGenomeTransition();
}

function syncGenomeTransition() {
  const status = genomeStatus();
  if (!status) {
    if (genomeTransitionActive) finishGenomeTransition();
    else genomeTransitionRequested = false;
    return;
  }

  if (status.classList.contains("error")) {
    finishGenomeTransition();
    return;
  }

  if (genomeIsReady()) {
    if (genomeTransitionActive) finishGenomeTransitionAfterMinimum();
    return;
  }

  if (document.querySelector(".candidate-list") && (genomeTransitionRequested || !genomeTransitionActive)) {
    beginGenomeTransition();
  }
}

function refresh() {
  compactGenomeLabels();
  document.querySelectorAll<HTMLElement>(".candidate-list").forEach(applyVisibleRows);
  syncGenomeTransition();
}

function queueRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  queueMicrotask(() => {
    refreshQueued = false;
    refresh();
  });
}

function resetProgressiveList() {
  generation += 1;
  queueRefresh();
}

const observer = new MutationObserver(queueRefresh);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ["class"],
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.matches("#target-sequence, .simple-controls input")) {
    if (genomeStatus()) requestGenomeTransition();
    resetProgressiveList();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.matches("#genome-file")) {
    const input = target as HTMLInputElement;
    if (input.files?.length) requestGenomeTransition();
    return;
  }
  if (target.matches("#design-profile")) {
    if (genomeStatus()) requestGenomeTransition();
    resetProgressiveList();
  }
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest(".example-button")) {
    if (genomeStatus()) requestGenomeTransition();
    resetProgressiveList();
  }
});

queueRefresh();
