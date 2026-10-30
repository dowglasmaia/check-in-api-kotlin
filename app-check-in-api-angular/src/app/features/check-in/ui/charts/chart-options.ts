import type { ApexOptions } from 'apexcharts';
import { BoardingPassView, FlightAvailability, FlightView } from '../../model/flight';

/** Hex mirrors of the tokens in `styles.css` (ApexCharts cannot read CSS variables or oklch). */
export const CHART_COLORS = {
  accent: '#9184d9',
  accentLight: '#d2cefd',
  ok: '#67d6a1',
  warn: '#e2c25e',
  bad: '#f0867a',
  muted: '#75798c',
  track: '#3f424d',
  text: '#b2b6ca',
  grid: '#3f424d',
} as const;

const AVAILABILITY_COLOR: Record<FlightAvailability, string> = {
  available: CHART_COLORS.ok,
  'not-open': CHART_COLORS.warn,
  closed: CHART_COLORS.warn,
  cancelled: CHART_COLORS.bad,
};

const AVAILABILITY_LABEL: Record<FlightAvailability, string> = {
  available: 'Check-in open',
  'not-open': 'Not open yet',
  closed: 'Check-in closed',
  cancelled: 'Cancelled',
};

const FONT = 'Inter Variable, system-ui, sans-serif';

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}

function clock(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDuration(milliseconds: number): string {
  const minutes = Math.max(Math.round(milliseconds / 60_000), 0);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(rest).padStart(2, '0')}m`;
  return `${rest}m`;
}

function tooltipCard(title: string, lines: string[], color: string): string {
  return (
    `<div style="padding:8px 12px;font-family:${FONT};font-size:12px;line-height:1.5;background:#232532;color:#e9e9ed;border-radius:8px">` +
    `<div style="font-weight:500;margin-bottom:2px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px"></span>${escapeHtml(title)}</div>` +
    lines.map((line) => `<div style="color:#b2b6ca">${line}</div>`).join('') +
    '</div>'
  );
}

function baseChart(height: number, reducedMotion: boolean): ApexOptions['chart'] {
  return {
    height,
    fontFamily: FONT,
    background: 'transparent',
    foreColor: CHART_COLORS.text,
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: !reducedMotion, speed: 600 },
  };
}

/** One bar per flight: from the moment check-in opens until departure, with a marker for "now". */
export function buildWindowsChart(
  flights: FlightView[],
  now: Date,
  reducedMotion = false,
): ApexOptions {
  return {
    series: [
      {
        name: 'Check-in window',
        data: flights.map((flight) => ({
          x: `${flight.displayNumber} · ${flight.origin}→${flight.destination}`,
          y: [flight.checkinOpensAt.getTime(), flight.departureTime.getTime()],
          fillColor: AVAILABILITY_COLOR[flight.availability],
        })),
      },
    ],
    chart: {
      ...baseChart(Math.max(flights.length * 56 + 48, 120), reducedMotion),
      type: 'rangeBar',
    },
    plotOptions: {
      bar: { horizontal: true, barHeight: '38%', borderRadius: 4, borderRadiusApplication: 'end' },
    },
    xaxis: {
      type: 'datetime',
      labels: { datetimeUTC: false, style: { colors: CHART_COLORS.muted, fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: CHART_COLORS.text, fontSize: '12px' }, maxWidth: 190 } },
    grid: {
      borderColor: CHART_COLORS.grid,
      strokeDashArray: 3,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    annotations: {
      xaxis: [
        {
          x: now.getTime(),
          borderColor: CHART_COLORS.accent,
          strokeDashArray: 4,
          label: {
            text: 'Now',
            orientation: 'horizontal',
            borderWidth: 0,
            style: {
              color: '#161826',
              background: CHART_COLORS.accent,
              fontSize: '10px',
              fontFamily: FONT,
            },
          },
        },
      ],
    },
    tooltip: {
      theme: 'dark',
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        const flight = flights[dataPointIndex];
        return tooltipCard(
          flight.displayNumber,
          [
            `${escapeHtml(flight.origin)} → ${escapeHtml(flight.destination)}`,
            `Opens ${clock(flight.checkinOpensAt)}`,
            `Departs ${clock(flight.departureTime)}`,
            AVAILABILITY_LABEL[flight.availability],
          ],
          AVAILABILITY_COLOR[flight.availability],
        );
      },
    },
  };
}

/** Share of the check-in window that has already elapsed, from the API's `checkinOpensAt` and `departureTime`. */
export function windowProgress(flight: FlightView, now: Date): number {
  const total = flight.departureTime.getTime() - flight.checkinOpensAt.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - flight.checkinOpensAt.getTime();
  return Math.round(Math.min(Math.max(elapsed / total, 0), 1) * 100);
}

/** `1d 02:05:12`, or `02:05:12` under a day; `00:00:00` once the flight has departed. */
export function countdownParts(milliseconds: number): { days: number; clock: string } {
  const total = Math.max(Math.floor(milliseconds / 1000), 0);
  const clock = [Math.floor((total % 86_400) / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
  return { days: Math.floor(total / 86_400), clock };
}

export function formatCountdown(milliseconds: number): string {
  const { days, clock } = countdownParts(milliseconds);
  return days > 0 ? `${days}d ${clock}` : clock;
}

/** The ring only; the ticking countdown is drawn by the component so the chart is not redrawn every second. */
export function buildProgressChart(
  flight: FlightView,
  now: Date,
  reducedMotion = false,
): ApexOptions {
  return {
    series: [windowProgress(flight, now)],
    labels: ['to departure'],
    chart: { ...baseChart(260, reducedMotion), type: 'radialBar' },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '72%' },
        track: { background: CHART_COLORS.track, strokeWidth: '100%' },
        dataLabels: { show: false },
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'horizontal',
        gradientToColors: [CHART_COLORS.accentLight],
        stops: [0, 100],
      },
    },
    colors: [CHART_COLORS.accent],
    stroke: { lineCap: 'round' },
  };
}

/** Check-in → boarding → departure, from the confirmation response. */
export function buildJourneyChart(pass: BoardingPassView, reducedMotion = false): ApexOptions {
  const checkedIn = pass.checkedInAt.getTime();
  const boarding = pass.boardingTime.getTime();
  const departure = pass.flight.departureTime.getTime();
  const legs = [
    { x: 'Check-in → boarding', y: [checkedIn, boarding], fillColor: CHART_COLORS.accent },
    { x: 'Boarding → departure', y: [boarding, departure], fillColor: CHART_COLORS.ok },
  ];

  return {
    series: [{ name: 'Journey', data: legs }],
    chart: { ...baseChart(190, reducedMotion), type: 'rangeBar' },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '42%',
        borderRadius: 4,
        borderRadiusApplication: 'end',
        dataLabels: { hideOverflowingLabels: false },
      },
    },
    xaxis: {
      type: 'datetime',
      labels: { datetimeUTC: false, style: { colors: CHART_COLORS.muted, fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: CHART_COLORS.text, fontSize: '12px' } } },
    grid: { borderColor: CHART_COLORS.grid, strokeDashArray: 3, yaxis: { lines: { show: false } } },
    legend: { show: false },
    dataLabels: {
      enabled: true,
      style: { colors: ['#e9e9ed'], fontSize: '11px', fontWeight: 500 },
      background: {
        enabled: true,
        foreColor: '#161826',
        opacity: 0.85,
        borderRadius: 3,
        padding: 4,
        borderWidth: 0,
      },
      formatter: (_value: unknown, opts?: { dataPointIndex: number }) => {
        const [from, to] = legs[opts?.dataPointIndex ?? 0].y;
        return formatDuration(to - from);
      },
    },
    tooltip: {
      theme: 'dark',
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        const leg = legs[dataPointIndex];
        const [from, to] = leg.y.map((value) => new Date(value));
        return tooltipCard(
          leg.x,
          [`${clock(from)} → ${clock(to)}`, formatDuration(to.getTime() - from.getTime())],
          leg.fillColor,
        );
      },
    },
  };
}
