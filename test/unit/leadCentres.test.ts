import { describe, it, expect, vi } from "vitest";
import { normalizeLeadCentresInput } from "../../src/overlays/leadCentre";
import {
  buildBubbleSizeExpression,
  buildBubbleColorExpression,
} from "../../src/map/layers";
import { DEFAULT_STYLE } from "../../src/map/styles";
import type { LeadCentresStyleOptions } from "../../src/types/public";

// ── Helper ────────────────────────────────────────────────────────────────────

function makeLc(
  overrides: Partial<LeadCentresStyleOptions> = {},
): Required<LeadCentresStyleOptions> {
  return {
    ...(DEFAULT_STYLE.leadCentres as Required<LeadCentresStyleOptions>),
    ...overrides,
  };
}

// ── normalizeLeadCentresInput ─────────────────────────────────────────────────

describe("normalizeLeadCentresInput", () => {
  it("normalizes a valid entry with lat/lon", () => {
    const result = normalizeLeadCentresInput([
      { lat: 51.5, lon: -0.1, label: "GOSH" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].geometry.coordinates).toEqual([-0.1, 51.5]);
    expect(result[0].properties?.label).toBe("GOSH");
  });

  it("accepts latitude/longitude aliases", () => {
    const result = normalizeLeadCentresInput([
      { latitude: 53.0, longitude: -1.5, label: "Sheffield" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].geometry.coordinates).toEqual([-1.5, 53.0]);
  });

  it("accepts lng alias", () => {
    const result = normalizeLeadCentresInput([{ lat: 52.0, lng: -2.0 }]);
    expect(result).toHaveLength(1);
    expect(result[0].geometry.coordinates).toEqual([-2.0, 52.0]);
  });

  it("passes through extra fields as feature properties", () => {
    const result = normalizeLeadCentresInput([
      {
        lat: 51.5,
        lon: -0.1,
        label: "GOSH",
        total_patients: 312,
        median_hba1c: 58,
      },
    ]);
    expect(result[0].properties?.total_patients).toBe(312);
    expect(result[0].properties?.median_hba1c).toBe(58);
  });

  it("excludes coordinate alias keys from properties", () => {
    const result = normalizeLeadCentresInput([
      { lat: 51.5, lon: -0.1, latitude: 51.5, longitude: -0.1, lng: -0.1 },
    ]);
    const props = result[0].properties ?? {};
    expect(props).not.toHaveProperty("lat");
    expect(props).not.toHaveProperty("lon");
    expect(props).not.toHaveProperty("latitude");
    expect(props).not.toHaveProperty("longitude");
    expect(props).not.toHaveProperty("lng");
  });

  it("skips entries with missing coordinates and calls onWarning", () => {
    const onWarning = vi.fn();
    const result = normalizeLeadCentresInput(
      [{ label: "No coords" }],
      {},
      onWarning,
    );
    expect(result).toHaveLength(0);
    expect(onWarning).toHaveBeenCalledWith(
      expect.objectContaining({ code: "MISSING_LEAD_CENTRE_COORDS" }),
    );
  });

  it("skips entries with invalid coordinates and calls onWarning", () => {
    const onWarning = vi.fn();
    const result = normalizeLeadCentresInput(
      [{ lat: 999, lon: -0.1 }],
      {},
      onWarning,
    );
    expect(result).toHaveLength(0);
    expect(onWarning).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_LEAD_CENTRE_COORDS" }),
    );
  });

  it("skips non-object entries and calls onWarning", () => {
    const onWarning = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = normalizeLeadCentresInput([null as any], {}, onWarning);
    expect(result).toHaveLength(0);
    expect(onWarning).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_LEAD_CENTRE_ENTRY" }),
    );
  });

  it("throws in strict mode on first invalid entry", () => {
    expect(() => {
      normalizeLeadCentresInput([{ label: "Bad" }], { strict: true });
    }).toThrow();
  });

  it("returns empty array for empty input", () => {
    expect(normalizeLeadCentresInput([])).toHaveLength(0);
  });

  it("processes a mix of valid and invalid entries, skipping the invalid", () => {
    const onWarning = vi.fn();
    const result = normalizeLeadCentresInput(
      [
        { lat: 51.5, lon: -0.1, label: "Good" },
        { label: "Bad" },
        { lat: 53.0, lon: -1.5, label: "Also Good" },
      ],
      {},
      onWarning,
    );
    expect(result).toHaveLength(2);
    expect(onWarning).toHaveBeenCalledTimes(1);
  });

  it("uses fallback label when label is absent", () => {
    const result = normalizeLeadCentresInput([{ lat: 51.5, lon: -0.1 }]);
    expect(result[0].properties?.label).toBe("Centre 1");
  });
});

// ── buildBubbleSizeExpression ─────────────────────────────────────────────────

describe("buildBubbleSizeExpression", () => {
  it("returns defaultRadius when sizeMin === sizeMax", () => {
    const lc = makeLc({ defaultRadius: 12, sizeField: "count" });
    const expr = buildBubbleSizeExpression(lc, { sizeMin: 100, sizeMax: 100 });
    expect(expr).toBe(12);
  });

  it("returns an interpolate expression when range is valid", () => {
    const lc = makeLc({
      sizeField: "count",
      minRadius: 8,
      maxRadius: 40,
      defaultRadius: 12,
    });
    const expr = buildBubbleSizeExpression(lc, {
      sizeMin: 0,
      sizeMax: 500,
    }) as unknown[];
    expect(Array.isArray(expr)).toBe(true);
    expect(expr[0]).toBe("interpolate");
    expect(expr[1]).toEqual(["linear"]);
  });

  it("uses the configured sizeField in the expression", () => {
    const lc = makeLc({
      sizeField: "patient_count",
      minRadius: 5,
      maxRadius: 30,
      defaultRadius: 10,
    });
    const expr = buildBubbleSizeExpression(lc, {
      sizeMin: 10,
      sizeMax: 200,
    }) as unknown[];
    const getExpr = JSON.stringify(expr);
    expect(getExpr).toContain("patient_count");
  });
});

// ── buildBubbleColorExpression ────────────────────────────────────────────────

describe("buildBubbleColorExpression", () => {
  describe("continuous mode", () => {
    it("returns first stop color when colorMin === colorMax", () => {
      const lc = makeLc({
        colorMode: "continuous",
        colorScale: ["#2166ac", "#f7f7f7", "#d6604d"],
        colorField: "hba1c",
      });
      const expr = buildBubbleColorExpression(lc, {
        colorMin: 58,
        colorMax: 58,
      });
      expect(expr).toBe("#2166ac");
    });

    it("returns an interpolate expression for valid range", () => {
      const lc = makeLc({
        colorMode: "continuous",
        colorScale: ["#2166ac", "#f7f7f7", "#d6604d"],
        colorField: "hba1c",
      });
      const expr = buildBubbleColorExpression(lc, {
        colorMin: 48,
        colorMax: 86,
      }) as unknown[];
      expect(Array.isArray(expr)).toBe(true);
      expect(expr[0]).toBe("interpolate");
    });

    it("includes the colour stops in the expression", () => {
      const lc = makeLc({
        colorMode: "continuous",
        colorScale: ["#aa0000", "#ffffff", "#0000aa"],
        colorField: "hba1c",
      });
      const expr = buildBubbleColorExpression(lc, {
        colorMin: 0,
        colorMax: 100,
      }) as unknown[];
      const flat = JSON.stringify(expr);
      expect(flat).toContain("#aa0000");
      expect(flat).toContain("#ffffff");
      expect(flat).toContain("#0000aa");
    });
  });

  describe("categorical mode", () => {
    it("returns colorFallback when colorByCategory is empty", () => {
      const lc = makeLc({
        colorMode: "categorical",
        colorByCategory: {},
        colorFallback: "#999999",
        colorField: "type",
      });
      const expr = buildBubbleColorExpression(lc, { colorMin: 0, colorMax: 0 });
      expect(expr).toBe("#999999");
    });

    it("returns a match expression when colorByCategory has entries", () => {
      const lc = makeLc({
        colorMode: "categorical",
        colorField: "dominant_type",
        colorByCategory: { type1: "#4e79a7", type2: "#f28e2b" },
        colorFallback: "#aaaaaa",
      });
      const expr = buildBubbleColorExpression(lc, {
        colorMin: 0,
        colorMax: 0,
      }) as unknown[];
      expect(Array.isArray(expr)).toBe(true);
      expect(expr[0]).toBe("match");
      const flat = JSON.stringify(expr);
      expect(flat).toContain("#4e79a7");
      expect(flat).toContain("#f28e2b");
      expect(flat).toContain("#aaaaaa");
    });
  });
});
