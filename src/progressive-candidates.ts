const PAGE_SIZE = 30;
const LOAD_AHEAD_PX = 96;

type ListState = {
  visible: number;
  generation: number;
};

const states = new WeakMap<HTMLElement, ListState>();
const boundLists = new WeakSet<HTMLElement>();
let generation = 0;
let refreshQueued = false;

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
    if (!label.classList.contains("near-high") && !label.classList.contains("near-mid")) return;
    const text = label.textContent ?? "";
    if (/^[1-4] mismatch$/.test(text)) return;
    const match = text.match(/\b([1-4])\s*mm\b/);
    if (match) label.textContent = `${match[1]} mismatch`;
  });
}

function applyVisibleRows(list: HTMLElement) {
  const rows = candidateRows(list);
  let state = states.get(list);
  if (!state || state.generation !== generation) {
    state = { visible: PAGE_SIZE, generation };
    states.set(list, state);
  }
  state.visible = Math.min(Math.max(PAGE_SIZE, state.visible), Math.max(PAGE_SIZE, rows.length));
  rows.forEach((row, index) => {
    row.hidden = index >= state!.visible;
  });
  list.dataset.visibleCandidates = String(Math.min(state.visible, rows.length));
  list.dataset.totalCandidates = String(rows.length);

  if (!boundLists.has(list)) {
    boundLists.add(list);
    list.addEventListener("scroll", () => {
      const current = states.get(list);
      if (!current) return;
      if (list.scrollHeight - list.scrollTop - list.clientHeight > LOAD_AHEAD_PX) return;
      const total = candidateRows(list).length;
      if (current.visible >= total) return;
      current.visible = Math.min(total, current.visible + PAGE_SIZE);
      applyVisibleRows(list);
    }, { passive: true });
  }
}

function refresh() {
  compactGenomeLabels();
  document.querySelectorAll<HTMLElement>(".candidate-list").forEach(applyVisibleRows);
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
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.matches("#target-sequence, .simple-controls input")) resetProgressiveList();
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.matches("#design-profile")) resetProgressiveList();
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest(".example-button")) resetProgressiveList();
});

queueRefresh();
