import type { ImdMapState, LegendPosition, MapStyleOptions } from '../types/public';
import { getDecileColors } from './styles';

type OverlayKey = keyof ImdMapState['overlays'];

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
  const isNhserEligible = nation === 'all' || nation === 'england';
  const isIcbEligible = nation === 'all' || nation === 'england';
  const isLhbEligible = nation === 'all' || nation === 'wales';

  const rows: LegendRow[] = [
    {
      key: 'nhser',
      label: 'NHS England regions',
      isVisible: visibility.nhser,
      isEnabled: isNhserEligible,
      isActive: state.overlays.nhser,
      disabledNote: 'England only',
    },
    {
      key: 'icb',
      label: 'ICBs',
      isVisible: visibility.icb,
      isEnabled: isIcbEligible,
      isActive: state.overlays.icb,
      disabledNote: 'England only',
    },
    {
      key: 'localAuthority',
      label: 'Local authorities',
      isVisible: visibility.localAuthority,
      isEnabled: true,
      isActive: state.overlays.localAuthority,
    },
    {
      key: 'lhb',
      label: 'Local health boards',
      isVisible: visibility.lhb,
      isEnabled: isLhbEligible,
      isActive: state.overlays.lhb,
      disabledNote: 'Wales only',
    },
  ];

  return rows.filter((row) => row.isVisible);
}

function applyLegendPosition(el: HTMLDivElement, position: LegendPosition): void {
  el.style.top = '';
  el.style.right = '';
  el.style.bottom = '';
  el.style.left = '';

  switch (position) {
    case 'top-left':
      el.style.top = '12px';
      el.style.left = '12px';
      break;
    case 'bottom-left':
      el.style.bottom = '12px';
      el.style.left = '12px';
      break;
    case 'bottom-right':
      el.style.bottom = '12px';
      el.style.right = '12px';
      break;
    case 'top-right':
    default:
      el.style.top = '12px';
      el.style.right = '12px';
      break;
  }
}

export function createLegendControl(input: CreateLegendInput): LegendController {
  const containerStyle = window.getComputedStyle(input.container);
  if (containerStyle.position === 'static') {
    input.container.style.position = 'relative';
  }

  let currentState = input.state;
  let currentStyle = input.style;
  let collapsed = input.collapsed;

  const root = document.createElement('div');
  root.setAttribute('data-rcpch-legend', 'true');
  root.style.position = 'absolute';
  root.style.zIndex = '5';
  root.style.pointerEvents = 'auto';
  applyLegendPosition(root, input.position);

  const panel = document.createElement('div');
  const headerBtn = document.createElement('button');
  const headerTitle = document.createElement('span');
  const headerIcon = document.createElement('span');
  const body = document.createElement('div');
  const keySection = document.createElement('div');

  headerBtn.type = 'button';
  headerBtn.setAttribute('aria-expanded', String(!collapsed));
  headerTitle.textContent = input.title;
  headerIcon.textContent = collapsed ? '+' : '-';

  headerBtn.appendChild(headerTitle);
  headerBtn.appendChild(headerIcon);
  panel.appendChild(headerBtn);
  panel.appendChild(body);
  panel.appendChild(keySection);
  root.appendChild(panel);
  input.container.appendChild(root);

  function applyStyle(): void {
    const legend = currentStyle.legend;
    const backgroundColor = legend?.backgroundColor ?? '#ffffff';
    const textColor = legend?.textColor ?? '#0d0d58';
    const borderColor = legend?.borderColor ?? '#d8dde6';
    const borderRadius = legend?.borderRadius ?? 8;
    const fontSize = legend?.fontSize ?? 13;
    const fontFamily = legend?.fontFamily ?? 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    const width = legend?.width ?? 220;
    const boxShadow = legend?.boxShadow ?? '0 6px 18px rgba(0, 0, 0, 0.12)';

    panel.style.background = backgroundColor;
    panel.style.color = textColor;
    panel.style.border = `1px solid ${borderColor}`;
    panel.style.borderRadius = `${borderRadius}px`;
    panel.style.width = `${width}px`;
    panel.style.boxShadow = boxShadow;
    panel.style.overflow = 'hidden';

    headerBtn.style.width = '100%';
    headerBtn.style.border = '0';
    headerBtn.style.background = 'transparent';
    headerBtn.style.color = textColor;
    headerBtn.style.display = 'flex';
    headerBtn.style.alignItems = 'center';
    headerBtn.style.justifyContent = 'space-between';
    headerBtn.style.padding = '10px 12px';
    headerBtn.style.cursor = 'pointer';
    headerBtn.style.fontWeight = '600';
    headerBtn.style.fontSize = `${fontSize}px`;
    headerBtn.style.fontFamily = fontFamily;
    headerBtn.style.textAlign = 'left';

    body.style.padding = '0 12px 10px';
    body.style.display = collapsed ? 'none' : 'block';
    body.style.fontFamily = fontFamily;
    body.style.fontSize = `${fontSize}px`;

    keySection.style.padding = '0 12px 10px';
    keySection.style.display = collapsed ? 'none' : 'block';
    keySection.style.fontFamily = fontFamily;
    keySection.style.fontSize = `${Math.max(fontSize - 1, 11)}px`;
    keySection.style.borderTop = `1px solid ${borderColor}`;
  }

  function renderRows(): void {
    body.innerHTML = '';
    keySection.innerHTML = '';

    const rows = getLegendRows(currentState, input.visibility);
    if (!rows.length) {
      root.style.display = 'none';
      return;
    }

    root.style.display = '';

    for (const row of rows) {
      const rowBtn = document.createElement('button');
      const dot = document.createElement('span');
      const label = document.createElement('span');
      const textWrap = document.createElement('span');

      rowBtn.type = 'button';
      rowBtn.style.width = '100%';
      rowBtn.style.border = '0';
      rowBtn.style.background = 'transparent';
      rowBtn.style.color = currentStyle.legend?.textColor ?? '#0d0d58';
      rowBtn.style.display = 'flex';
      rowBtn.style.alignItems = 'center';
      rowBtn.style.gap = '8px';
      rowBtn.style.padding = '6px 0';
      rowBtn.style.cursor = row.isEnabled ? 'pointer' : 'not-allowed';
      rowBtn.style.textAlign = 'left';
      rowBtn.style.opacity = row.isEnabled ? (row.isActive ? '1' : '0.75') : '0.5';

      dot.style.width = '10px';
      dot.style.height = '10px';
      dot.style.borderRadius = '999px';
      dot.style.flex = '0 0 10px';
      dot.style.background = row.isActive
        ? currentStyle.legend?.toggleOnColor ?? '#0d0d58'
        : currentStyle.legend?.toggleOffColor ?? '#6b7280';

      textWrap.style.display = 'flex';
      textWrap.style.flexDirection = 'column';
      textWrap.style.gap = '1px';

      label.textContent = row.label;
      textWrap.appendChild(label);

      if (!row.isEnabled && row.disabledNote) {
        const note = document.createElement('span');
        note.textContent = row.disabledNote;
        note.style.fontSize = '11px';
        note.style.opacity = '0.9';
        textWrap.appendChild(note);
      }

      rowBtn.setAttribute('aria-pressed', String(row.isActive));
      rowBtn.setAttribute('aria-disabled', String(!row.isEnabled));
      rowBtn.disabled = !row.isEnabled;
      rowBtn.setAttribute(
        'title',
        !row.isEnabled && row.disabledNote
          ? `${row.label} (${row.disabledNote})`
          : (row.isActive ? `Hide ${row.label}` : `Show ${row.label}`),
      );

      rowBtn.addEventListener('click', () => {
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
    const keyTitle = document.createElement('div');
    keyTitle.textContent = 'Key';
    keyTitle.style.paddingTop = '8px';
    keyTitle.style.paddingBottom = '6px';
    keyTitle.style.fontWeight = '600';
    keySection.appendChild(keyTitle);

    for (const row of rows) {
      const line = document.createElement('div');
      const swatch = document.createElement('span');
      const label = document.createElement('span');

      line.style.display = 'flex';
      line.style.alignItems = 'center';
      line.style.gap = '8px';
      line.style.padding = '2px 0';

      swatch.style.display = 'inline-block';
      swatch.style.width = '18px';
      swatch.style.height = '0';
      swatch.style.borderTopWidth = `${Math.max(
        resolveBoundaryWidth(row.key, currentStyle),
        2,
      )}px`;
      swatch.style.borderTopStyle = 'solid';
      swatch.style.borderTopColor = resolveBoundaryColor(row.key, currentStyle);

      label.textContent = row.label;
      line.appendChild(swatch);
      line.appendChild(label);
      keySection.appendChild(line);
    }

    const scale = document.createElement('div');
    scale.style.paddingTop = '8px';

    const scaleLabel = document.createElement('div');
    scaleLabel.textContent = 'IMD decile (1 most deprived, 10 least deprived)';
    scaleLabel.style.paddingBottom = '4px';
    keySection.appendChild(scaleLabel);

    const ramp = document.createElement('div');
    ramp.style.display = 'grid';
    ramp.style.gridTemplateColumns = 'repeat(10, minmax(0, 1fr))';
    ramp.style.gap = '2px';

    const colors = getDecileColors(currentState.nation, currentStyle);
    for (let i = 0; i < 10; i++) {
      const chip = document.createElement('span');
      chip.style.height = '8px';
      chip.style.background = colors[i] ?? colors[0] ?? '#cccccc';
      chip.style.display = 'inline-block';
      chip.title = `Decile ${i + 1}`;
      ramp.appendChild(chip);
    }

    const scaleTicks = document.createElement('div');
    scaleTicks.style.display = 'flex';
    scaleTicks.style.justifyContent = 'space-between';
    scaleTicks.style.paddingTop = '2px';
    scaleTicks.textContent = '1';

    const rightTick = document.createElement('span');
    rightTick.textContent = '10';
    scaleTicks.appendChild(rightTick);

    scale.appendChild(ramp);
    scale.appendChild(scaleTicks);
    keySection.appendChild(scale);
  }

  function resolveBoundaryColor(
    key: OverlayKey,
    style: Required<MapStyleOptions>,
  ): string {
    if (key === 'localAuthority') return style.boundaries.localAuthorityColor ?? '#0d0d58';
    if (key === 'nhser') return style.boundaries.nhserColor ?? '#e00087';
    if (key === 'icb') return style.boundaries.icbColor ?? '#57c7f2';
    return style.boundaries.lhbColor ?? '#57c7f2';
  }

  function resolveBoundaryWidth(
    key: OverlayKey,
    style: Required<MapStyleOptions>,
  ): number {
    if (key === 'localAuthority') return style.boundaries.localAuthorityWidth ?? 1;
    if (key === 'nhser') return style.boundaries.nhserWidth ?? 1.5;
    if (key === 'icb') return style.boundaries.icbWidth ?? 1;
    return style.boundaries.lhbWidth ?? 1;
  }

  headerBtn.addEventListener('click', () => {
    collapsed = !collapsed;
    headerBtn.setAttribute('aria-expanded', String(!collapsed));
    headerIcon.textContent = collapsed ? '+' : '-';
    body.style.display = collapsed ? 'none' : 'block';
    keySection.style.display = collapsed ? 'none' : 'block';
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
      root.remove();
    },
  };
}
