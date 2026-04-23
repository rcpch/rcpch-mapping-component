import { describe, it, expect } from 'vitest';
import {
  buildChoroplethTooltipHtml,
  buildChoroplethTooltipHtmlFromTemplate,
} from '../../src/map/popups';
import { DEFAULT_STYLE } from '../../src/map/styles';

describe('area tooltip rendering', () => {
  it('renders legacy default area tooltip content', () => {
    const html = buildChoroplethTooltipHtml(
      {
        area_name: 'Test area',
        year: 2021,
        imd_decile: 3,
        imd_year: 2025,
        nation: 'england',
      },
      DEFAULT_STYLE,
    );

    expect(html).toContain('Test area');
    expect(html).toContain('LSOA year: 2021');
    expect(html).toContain('IMD decile');
    expect(html).toContain('IMD year: 2025');
    expect(html).toContain('Nation: england');
  });

  it('renders template area tooltip with interpolated canonical fields', () => {
    const html = buildChoroplethTooltipHtmlFromTemplate(
      {
        code: 'E01012345',
        area_name: 'Area X',
        area_type: 'LSOA',
        nation: 'england',
        imd_decile: 4,
        imd_year: 2025,
        year: 2021,
        la_code: 'E09000001',
        la_name: 'City One',
        la_year: 2021,
        nhser_code: 'R1',
        nhser_name: 'North East',
        icb_code: 'QWE',
        icb_name: 'ICB Name',
        lhb_code: 'LHB1',
        lhb_name: 'LHB Name',
      },
      {
        ...DEFAULT_STYLE,
        tooltip: {
          ...DEFAULT_STYLE.tooltip,
          areaTooltipText:
            '{{areaCode}}|{{areaName}}|{{areaType}}|{{nation}}|{{imdDecile}}|{{imdYear}}|{{boundaryYear}}|{{laCode}}|{{laName}}|{{laYear}}|{{nhserCode}}|{{nhserName}}|{{icbCode}}|{{icbName}}|{{lhbCode}}|{{lhbName}}',
        },
      },
    );

    expect(html).toContain(
      'E01012345|Area X|LSOA|england|4|2025|2021|E09000001|City One|2021|R1|North East|QWE|ICB Name|LHB1|LHB Name',
    );
  });

  it('supports label interpolation for template mode', () => {
    const html = buildChoroplethTooltipHtmlFromTemplate(
      {
        area_name: 'Area Y',
        nation: 'wales',
        imd_decile: 2,
      },
      {
        ...DEFAULT_STYLE,
        tooltip: {
          ...DEFAULT_STYLE.tooltip,
          decileLabel: 'Deprivation decile',
          nationLabel: 'Country',
          areaTooltipText: '{{decileLabel}}={{imdDecile}};{{nationLabel}}={{nation}}',
        },
      },
    );

    expect(html).toContain('Deprivation decile=2;Country=wales');
  });
});
