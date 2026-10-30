import { CANCELLED, NOT_OPEN, NOW, boardingPass, flightView } from '../../testing/fixtures';
import { toFlightView } from '../../data-access/checkin.mappers';
import {
  CHART_COLORS,
  buildJourneyChart,
  buildProgressChart,
  buildWindowsChart,
  escapeHtml,
  countdownParts,
  formatCountdown,
  formatDuration,
  windowProgress,
} from './chart-options';

describe('chart options', () => {
  describe('formatDuration', () => {
    it.each([
      [0, '0m'],
      [45 * 60_000, '45m'],
      [90 * 60_000, '1h 30m'],
      [26 * 3_600_000, '1d 2h'],
      [-5000, '0m'],
    ])('formats %i ms as %s', (ms, expected) => expect(formatDuration(ms)).toBe(expected));
  });

  describe('countdownParts', () => {
    it('splits days from the clock', () => {
      expect(countdownParts(90_061_000)).toEqual({ days: 1, clock: '01:01:01' });
      expect(countdownParts(-1)).toEqual({ days: 0, clock: '00:00:00' });
    });
  });

  describe('formatCountdown', () => {
    it.each([
      [0, '00:00:00'],
      [-5000, '00:00:00'],
      [59_000, '00:00:59'],
      [3_661_000, '01:01:01'],
      [86_399_000, '23:59:59'],
      [90_061_000, '1d 01:01:01'],
      [(2 * 86_400 + 3 * 3600 + 5 * 60 + 9) * 1000, '2d 03:05:09'],
    ])('formats %i ms as %s', (ms, expected) => expect(formatCountdown(ms)).toBe(expected));
  });

  describe('windowProgress', () => {
    const flight = flightView({
      checkinOpensAt: '2026-03-03T00:00:00Z',
      departureTime: '2026-03-05T00:00:00Z',
    });

    it('is a percentage of the window from the API dates', () => {
      expect(windowProgress(flight, new Date('2026-03-04T00:00:00Z'))).toBe(50);
    });

    it('is clamped to 0–100', () => {
      expect(windowProgress(flight, new Date('2026-03-01T00:00:00Z'))).toBe(0);
      expect(windowProgress(flight, new Date('2026-03-09T00:00:00Z'))).toBe(100);
    });
  });

  describe('buildWindowsChart', () => {
    const flights = [flightView(), toFlightView(NOT_OPEN), toFlightView(CANCELLED)];
    const options = buildWindowsChart(flights, NOW);
    const data = (options.series as { data: { x: string; y: number[]; fillColor: string }[] }[])[0]
      .data;

    it('has one bar per flight from the opening of check-in to departure', () => {
      expect(data).toHaveLength(3);
      expect(data[0].y).toEqual([
        flights[0].checkinOpensAt.getTime(),
        flights[0].departureTime.getTime(),
      ]);
      expect(data[0].x).toContain('MF 214');
    });

    it('colors bars by availability', () => {
      expect(data.map((point) => point.fillColor)).toEqual([
        CHART_COLORS.ok,
        CHART_COLORS.warn,
        CHART_COLORS.bad,
      ]);
    });

    it('marks "now"', () => {
      expect(options.annotations?.xaxis?.[0].x).toBe(NOW.getTime());
    });

    it('grows with the number of flights', () => {
      expect(buildWindowsChart(flights, NOW).chart?.height).toBeGreaterThan(
        buildWindowsChart([flights[0]], NOW).chart?.height as number,
      );
    });

    it('turns animations off for reduced motion', () => {
      expect(buildWindowsChart(flights, NOW, true).chart?.animations?.enabled).toBe(false);
      expect(buildWindowsChart(flights, NOW, false).chart?.animations?.enabled).toBe(true);
    });

    it('escapes flight data in the custom tooltip', () => {
      const hostile = flightView({ flightNumber: '<img src=x onerror=alert(1)>' });
      const tooltip = buildWindowsChart([hostile], NOW).tooltip!.custom as (o: {
        dataPointIndex: number;
      }) => string;
      const html = tooltip({ dataPointIndex: 0 });
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });
  });

  describe('buildProgressChart', () => {
    it('shows the elapsed share of the window', () => {
      const flight = flightView({
        checkinOpensAt: '2026-03-03T12:00:00Z',
        departureTime: '2026-03-07T12:00:00Z',
      });
      const options = buildProgressChart(flight, NOW);
      expect(options.series).toEqual([50]);
    });

    it('leaves the countdown to the component instead of a chart label', () => {
      const options = buildProgressChart(flightView(), NOW);
      expect(options.plotOptions?.radialBar?.dataLabels?.show).toBe(false);
    });
  });

  describe('buildJourneyChart', () => {
    it('has a leg from check-in to boarding and one from boarding to departure', () => {
      const pass = boardingPass();
      const options = buildJourneyChart(pass);
      const data = (options.series as { data: { x: string; y: number[] }[] }[])[0].data;
      expect(data.map((leg) => leg.x)).toEqual(['Check-in → boarding', 'Boarding → departure']);
      expect(data[0].y).toEqual([pass.checkedInAt.getTime(), pass.boardingTime.getTime()]);
      expect(data[1].y).toEqual([pass.boardingTime.getTime(), pass.flight.departureTime.getTime()]);
    });
  });

  describe('escapeHtml', () => {
    it('escapes markup characters', () => {
      expect(escapeHtml(`<a href="x">&'</a>`)).toBe(
        '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;',
      );
    });
  });
});
