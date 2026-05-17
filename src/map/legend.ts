import type {
  ImdMapState,
  LegendPosition,
  MapStyleOptions,
} from "../types/public";
import { getDecileColors } from "./styles";

type OverlayKey = keyof ImdMapState["overlays"];

interface BubbleLegendContext {
  sizeMin: number;
  sizeMax: number;
  colorMin: number;
  colorMax: number;
}

let bubbleLegendContext: BubbleLegendContext = {
  sizeMin: 0,
  sizeMax: 0,
  colorMin: 0,
  colorMax: 0,
};

export function updateBubbleLegendContext(ctx: BubbleLegendContext): void {
  bubbleLegendContext = ctx;
}

interface LegendRow {
  key: OverlayKey;
  label: string;
  isVisible: boolean;
  isEnabled: boolean;
  isActive: boolean;
  disabledNote?: string;
}

interface LegendVisibilityConfig {
  localAuthority: boolean;
  nhser: boolean;
  icb: boolean;
  lhb: boolean;
}

interface CreateLegendInput {
  container: HTMLElement;
  position: LegendPosition;
  title: string;
  collapsed: boolean;
  style: Required<MapStyleOptions>;
  state: ImdMapState;
  visibility: LegendVisibilityConfig;
  onToggle: (key: OverlayKey, nextValue: boolean) => void;
}

export interface LegendController {
  update: (state: ImdMapState, style: Required<MapStyleOptions>) => void;
  destroy: () => void;
}

export function getLegendRows(
  state: ImdMapState,
  visibility: LegendVisibilityConfig,
): LegendRow[] {
  const nation = state.nation;

  // Channel Islands has no applicable health or LA boundary overlays.
  // Return no rows so the legend panel hides itself.
  if (nation === "channel_islands") return [];

  const isNhserEligible = nation === "all" || nation === "england";
  const isIcbEligible = nation === "all" || nation === "england";
  const isLhbEligible = nation === "all" || nation === "wales";

  const rows: LegendRow[] = [
    {
      key: "nhser",
      label: "NHS England regions",
      isVisible: visibility.nhser,
      isEnabled: isNhserEligible,
      isActive: state.overlays.nhser,
      disabledNote: "England only",
    },
    {
      key: "icb",
      label: "ICBs",
      isVisible: visibility.icb,
      isEnabled: isIcbEligible,
      isActive: state.overlays.icb,
      disabledNote: "England only",
    },
    {
      key: "localAuthority",
      label: "Local authorities",
      isVisible: visibility.localAuthority,
      isEnabled: true,
      isActive: state.overlays.localAuthority,
    },
    {
      key: "lhb",
      label: "Local health boards",
      isVisible: visibility.lhb,
      isEnabled: isLhbEligible,
      isActive: state.overlays.lhb,
      disabledNote: "Wales only",
    },
  ];

  return rows.filter((row) => row.isVisible);
}

function applyLegendPosition(
  el: HTMLDivElement,
  position: LegendPosition,
): void {
  el.style.top = "";
  el.style.right = "";
  el.style.bottom = "";
  el.style.left = "";

  switch (position) {
    case "top-left":
      el.style.top = "12px";
      el.style.left = "12px";
      break;
    case "bottom-left":
      el.style.bottom = "12px";
      el.style.left = "12px";
      break;
    case "bottom-right":
      el.style.bottom = "12px";
      el.style.right = "12px";
      break;
    case "top-right":
    default:
      el.style.top = "12px";
      el.style.right = "12px";
      break;
  }
}

export function createLegendControl(
  input: CreateLegendInput,
): LegendController {
  const containerStyle = window.getComputedStyle(input.container);
  if (containerStyle.position === "static") {
    input.container.style.position = "relative";
  }

  let currentState = input.state;
  let currentStyle = input.style;
  let collapsed = input.collapsed;

  const root = document.createElement("div");
  root.setAttribute("data-rcpch-legend", "true");
  root.style.position = "absolute";
  root.style.zIndex = "5";
  root.style.pointerEvents = "auto";
  applyLegendPosition(root, input.position);

  const panel = document.createElement("div");
  const headerBtn = document.createElement("button");
  const headerTitle = document.createElement("span");
  const headerIcon = document.createElement("span");
  const scrollBody = document.createElement("div");
  const body = document.createElement("div");
  const keySection = document.createElement("div");

  headerBtn.type = "button";
  headerBtn.setAttribute("aria-expanded", String(!collapsed));
  headerTitle.textContent = input.title;
  headerIcon.textContent = collapsed ? "+" : "-";

  scrollBody.appendChild(body);
  scrollBody.appendChild(keySection);

  headerBtn.appendChild(headerTitle);
  headerBtn.appendChild(headerIcon);
  panel.appendChild(headerBtn);
  panel.appendChild(scrollBody);
  root.appendChild(panel);
  input.container.appendChild(root);

  function applyStyle(): void {
    const legend = currentStyle.legend;
    const backgroundColor = legend?.backgroundColor ?? "#ffffff";
    const textColor = legend?.textColor ?? "#0d0d58";
    const borderColor = legend?.borderColor ?? "#d8dde6";
    const borderRadius = legend?.borderRadius ?? 8;
    const fontSize = legend?.fontSize ?? 13;
    const fontFamily =
      legend?.fontFamily ??
      "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    const width = legend?.width ?? 220;
    const boxShadow = legend?.boxShadow ?? "0 6px 18px rgba(0, 0, 0, 0.12)";

    panel.style.background = backgroundColor;
    panel.style.color = textColor;
    panel.style.border = `1px solid ${borderColor}`;
    panel.style.borderRadius = `${borderRadius}px`;
    panel.style.width = `${width}px`;
    panel.style.boxShadow = boxShadow;
    panel.style.overflow = "hidden";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.minHeight = "0";

    headerBtn.style.width = "100%";
    headerBtn.style.border = "0";
    headerBtn.style.background = "transparent";
    headerBtn.style.color = textColor;
    headerBtn.style.display = "flex";
    headerBtn.style.alignItems = "center";
    headerBtn.style.justifyContent = "space-between";
    headerBtn.style.padding = "10px 12px";
    headerBtn.style.cursor = "pointer";
    headerBtn.style.fontWeight = "600";
    headerBtn.style.fontSize = `${fontSize}px`;
    headerBtn.style.fontFamily = fontFamily;
    headerBtn.style.textAlign = "left";
    headerBtn.style.flexShrink = "0";

    scrollBody.style.display = collapsed ? "none" : "flex";
    scrollBody.style.flexDirection = "column";
    scrollBody.style.overflowY = "auto";
    scrollBody.style.minHeight = "0";

    body.style.padding = "0 12px 10px";
    body.style.fontFamily = fontFamily;
    body.style.fontSize = `${fontSize}px`;
    body.style.flexShrink = "0";

    keySection.style.padding = "0 12px 10px";
    keySection.style.fontFamily = fontFamily;
    keySection.style.fontSize = `${Math.max(fontSize - 1, 11)}px`;
    keySection.style.borderTop = `1px solid ${borderColor}`;
    keySection.style.flexShrink = "0";
  }

  function renderRows(): void {
    body.innerHTML = "";
    keySection.innerHTML = "";

    const rows = getLegendRows(currentState, input.visibility);
    if (!rows.length) {
      root.style.display = "none";
      return;
    }

    root.style.display = "";

    for (const row of rows) {
      const rowBtn = document.createElement("button");
      const dot = document.createElement("span");
      const label = document.createElement("span");
      const textWrap = document.createElement("span");

      rowBtn.type = "button";
      rowBtn.style.width = "100%";
      rowBtn.style.border = "0";
      rowBtn.style.background = "transparent";
      rowBtn.style.color = currentStyle.legend?.textColor ?? "#0d0d58";
      rowBtn.style.display = "flex";
      rowBtn.style.alignItems = "center";
      rowBtn.style.gap = "8px";
      rowBtn.style.padding = "6px 0";
      rowBtn.style.cursor = row.isEnabled ? "pointer" : "not-allowed";
      rowBtn.style.textAlign = "left";
      rowBtn.style.opacity = row.isEnabled
        ? row.isActive
          ? "1"
          : "0.75"
        : "0.5";

      dot.style.width = "10px";
      dot.style.height = "10px";
      dot.style.borderRadius = "999px";
      dot.style.flex = "0 0 10px";
      dot.style.background = row.isActive
        ? (currentStyle.legend?.toggleOnColor ?? "#0d0d58")
        : (currentStyle.legend?.toggleOffColor ?? "#6b7280");

      textWrap.style.display = "flex";
      textWrap.style.flexDirection = "column";
      textWrap.style.gap = "1px";

      label.textContent = row.label;
      textWrap.appendChild(label);

      if (!row.isEnabled && row.disabledNote) {
        const note = document.createElement("span");
        note.textContent = row.disabledNote;
        note.style.fontSize = "11px";
        note.style.opacity = "0.9";
        textWrap.appendChild(note);
      }

      rowBtn.setAttribute("aria-pressed", String(row.isActive));
      rowBtn.setAttribute("aria-disabled", String(!row.isEnabled));
      rowBtn.disabled = !row.isEnabled;
      rowBtn.setAttribute(
        "title",
        !row.isEnabled && row.disabledNote
          ? `${row.label} (${row.disabledNote})`
          : row.isActive
            ? `Hide ${row.label}`
            : `Show ${row.label}`,
      );

      rowBtn.addEventListener("click", () => {
        if (!row.isEnabled) return;
        input.onToggle(row.key, !row.isActive);
      });

      rowBtn.appendChild(dot);
      rowBtn.appendChild(textWrap);
      body.appendChild(rowBtn);
    }

    renderKeySection(rows);
  }

  function renderKeySection(rows: LegendRow[]): void {
    const keyTitle = document.createElement("div");
    keyTitle.textContent = "Key";
    keyTitle.style.paddingTop = "8px";
    keyTitle.style.paddingBottom = "6px";
    keyTitle.style.fontWeight = "600";
    keySection.appendChild(keyTitle);

    for (const row of rows) {
      const line = document.createElement("div");
      const swatch = document.createElement("span");
      const label = document.createElement("span");

      line.style.display = "flex";
      line.style.alignItems = "center";
      line.style.gap = "8px";
      line.style.padding = "2px 0";

      swatch.style.display = "inline-block";
      swatch.style.width = "18px";
      swatch.style.height = "0";
      swatch.style.borderTopWidth = `${Math.max(
        resolveBoundaryWidth(row.key, currentStyle),
        2,
      )}px`;
      swatch.style.borderTopStyle = "solid";
      swatch.style.borderTopColor = resolveBoundaryColor(row.key, currentStyle);

      label.textContent = row.label;
      line.appendChild(swatch);
      line.appendChild(label);
      keySection.appendChild(line);
    }

    const scale = document.createElement("div");
    scale.style.paddingTop = "8px";

    const scaleLabel = document.createElement("div");
    scaleLabel.textContent = "IMD decile (1 most deprived, 10 least deprived)";
    scaleLabel.style.paddingBottom = "4px";
    keySection.appendChild(scaleLabel);

    const ramp = document.createElement("div");
    ramp.style.display = "grid";
    ramp.style.gridTemplateColumns = "repeat(10, minmax(0, 1fr))";
    ramp.style.gap = "2px";

    const colors = getDecileColors(currentState.nation, currentStyle);
    for (let i = 0; i < 10; i++) {
      const chip = document.createElement("span");
      chip.style.height = "8px";
      chip.style.background = colors[i] ?? colors[0] ?? "#cccccc";
      chip.style.display = "inline-block";
      chip.title = `Decile ${i + 1}`;
      ramp.appendChild(chip);
    }

    const scaleTicks = document.createElement("div");
    scaleTicks.style.display = "flex";
    scaleTicks.style.justifyContent = "space-between";
    scaleTicks.style.paddingTop = "2px";
    scaleTicks.textContent = "1";

    const rightTick = document.createElement("span");
    rightTick.textContent = "10";
    scaleTicks.appendChild(rightTick);

    scale.appendChild(ramp);
    scale.appendChild(scaleTicks);
    keySection.appendChild(scale);

    // Bubble map legend — shown only when lead centres (plural) are active
    if (currentState.hasLeadCentres) {
      renderBubbleLegend(keySection);
    }
  }

  function renderBubbleLegend(container: HTMLElement): void {
    const lc = currentStyle.leadCentres;
    const textColor = currentStyle.legend?.textColor ?? "#0d0d58";
    const borderColor = currentStyle.legend?.borderColor ?? "#d8dde6";

    const section = document.createElement("div");
    section.style.marginTop = "10px";
    section.style.paddingTop = "8px";
    section.style.borderTop = `1px solid ${borderColor}`;

    // ── Bubble size scale ─────────────────────────────────────────────────────
    const sizeTitle = document.createElement("div");
    sizeTitle.textContent = lc.sizeLabel ?? "Count";
    sizeTitle.style.fontWeight = "600";
    sizeTitle.style.marginBottom = "6px";
    section.appendChild(sizeTitle);

    const { sizeMin, sizeMax, colorMin, colorMax } = bubbleLegendContext;
    const minR = lc.minRadius ?? 8;
    const maxR = lc.maxRadius ?? 40;
    const midR = Math.round((minR + maxR) / 2);
    const midValue = Math.round((sizeMin + sizeMax) / 2);

    const bubbleRow = document.createElement("div");
    bubbleRow.style.display = "flex";
    bubbleRow.style.alignItems = "flex-end";
    bubbleRow.style.gap = "12px";
    bubbleRow.style.marginBottom = "4px";

    for (const [r, val] of [
      [minR, sizeMin],
      [midR, midValue],
      [maxR, sizeMax],
    ] as [number, number][]) {
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexDirection = "column";
      wrap.style.alignItems = "center";
      wrap.style.gap = "3px";

      const circle = document.createElement("span");
      circle.style.display = "inline-block";
      circle.style.width = `${r * 2}px`;
      circle.style.height = `${r * 2}px`;
      circle.style.borderRadius = "50%";
      circle.style.background = textColor;
      circle.style.opacity = "0.4";
      circle.style.border = `2px solid ${textColor}`;

      const label = document.createElement("span");
      label.textContent = String(val);
      label.style.fontSize = "10px";

      wrap.appendChild(circle);
      wrap.appendChild(label);
      bubbleRow.appendChild(wrap);
    }
    section.appendChild(bubbleRow);

    // ── Colour scale ──────────────────────────────────────────────────────────
    const colorTitle = document.createElement("div");
    colorTitle.textContent = lc.colorLabel ?? "Value";
    colorTitle.style.fontWeight = "600";
    colorTitle.style.marginTop = "8px";
    colorTitle.style.marginBottom = "4px";
    section.appendChild(colorTitle);

    if (
      lc.colorMode === "categorical" &&
      Object.keys(lc.colorByCategory ?? {}).length
    ) {
      // Categorical: colour swatches
      for (const [cat, color] of Object.entries(lc.colorByCategory ?? {})) {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "6px";
        row.style.padding = "1px 0";

        const swatch = document.createElement("span");
        swatch.style.display = "inline-block";
        swatch.style.width = "12px";
        swatch.style.height = "12px";
        swatch.style.borderRadius = "50%";
        swatch.style.background = color;
        swatch.style.flexShrink = "0";

        // Find label from breakdownFields if available
        const bdf = lc.breakdownFields?.find(
          (bf) =>
            bf.field.includes(cat) || bf.label.toLowerCase().includes(cat),
        );
        const displayLabel = bdf ? bdf.label : cat;

        const labelEl = document.createElement("span");
        labelEl.textContent = displayLabel;

        row.appendChild(swatch);
        row.appendChild(labelEl);
        section.appendChild(row);
      }
    } else {
      // Continuous: gradient bar
      const stops = lc.colorScale ?? ["#2166ac", "#f7f7f7", "#d6604d"];
      const gradient = stops.join(", ");
      const colorUnit = lc.colorUnit ?? "";

      const bar = document.createElement("div");
      bar.style.height = "10px";
      bar.style.borderRadius = "3px";
      bar.style.background = `linear-gradient(to right, ${gradient})`;
      bar.style.marginBottom = "2px";

      const ticks = document.createElement("div");
      ticks.style.display = "flex";
      ticks.style.justifyContent = "space-between";
      ticks.style.fontSize = "10px";
      ticks.style.opacity = "0.8";
      ticks.innerHTML = `<span>${colorMin}${colorUnit ? " " + colorUnit : ""}</span><span>${colorMax}${colorUnit ? " " + colorUnit : ""}</span>`;

      section.appendChild(bar);
      section.appendChild(ticks);
    }

    container.appendChild(section);
  }

  function resolveBoundaryColor(
    key: OverlayKey,
    style: Required<MapStyleOptions>,
  ): string {
    if (key === "localAuthority")
      return style.boundaries.localAuthorityColor ?? "#0d0d58";
    if (key === "nhser") return style.boundaries.nhserColor ?? "#e00087";
    if (key === "icb") return style.boundaries.icbColor ?? "#57c7f2";
    return style.boundaries.lhbColor ?? "#57c7f2";
  }

  function resolveBoundaryWidth(
    key: OverlayKey,
    style: Required<MapStyleOptions>,
  ): number {
    if (key === "localAuthority")
      return style.boundaries.localAuthorityWidth ?? 1;
    if (key === "nhser") return style.boundaries.nhserWidth ?? 1.5;
    if (key === "icb") return style.boundaries.icbWidth ?? 1;
    return style.boundaries.lhbWidth ?? 1;
  }

  function applyMaxHeight(): void {
    const containerHeight = input.container.getBoundingClientRect().height;
    if (containerHeight > 0) {
      panel.style.maxHeight = `${containerHeight - 24}px`;
    }
  }

  const resizeObserver = new ResizeObserver(() => applyMaxHeight());
  resizeObserver.observe(input.container);
  applyMaxHeight();

  headerBtn.addEventListener("click", () => {
    collapsed = !collapsed;
    headerBtn.setAttribute("aria-expanded", String(!collapsed));
    headerIcon.textContent = collapsed ? "+" : "-";
    scrollBody.style.display = collapsed ? "none" : "flex";
  });

  applyStyle();
  renderRows();

  return {
    update(nextState, nextStyle) {
      currentState = nextState;
      currentStyle = nextStyle;
      applyStyle();
      renderRows();
    },
    destroy() {
      resizeObserver.disconnect();
      root.remove();
    },
  };
}
