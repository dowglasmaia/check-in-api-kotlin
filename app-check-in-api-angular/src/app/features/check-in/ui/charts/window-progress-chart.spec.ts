import { TestBed } from '@angular/core/testing';
import { flightView } from '../../testing/fixtures';
import { WindowProgressChart } from './window-progress-chart';

const START = new Date('2026-03-05T12:00:00Z');

describe('WindowProgressChart', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(START);
  });
  afterEach(() => vi.useRealTimers());

  async function render(departureTime: string) {
    const fixture = TestBed.createComponent(WindowProgressChart);
    fixture.componentRef.setInput(
      'flight',
      flightView({ checkinOpensAt: '2026-03-03T12:00:00Z', departureTime }),
    );
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const countdown = () => {
      const days = el.querySelector('[data-days]')?.textContent?.trim();
      const clock = el.querySelector('[data-clock]')!.textContent!.trim();
      return days ? `${days} ${clock}` : clock;
    };
    const tick = async (seconds: number) => {
      await vi.advanceTimersByTimeAsync(seconds * 1000);
      await fixture.whenStable();
    };
    return { fixture, el, countdown, tick };
  }

  it('counts down to departure every second', async () => {
    const { countdown, tick } = await render('2026-03-06T14:05:12Z');
    expect(countdown()).toBe('1 day 02:05:12');

    await tick(1);
    expect(countdown()).toBe('1 day 02:05:11');

    await tick(60);
    expect(countdown()).toBe('1 day 02:04:11');
  });

  it('pluralizes the days and hides them under one day', async () => {
    const two = await render('2026-03-07T12:00:05Z');
    expect(two.countdown()).toBe('2 days 00:00:05');
    two.fixture.destroy();

    const none = await render('2026-03-05T20:00:00Z');
    expect(none.el.querySelector('[data-days]')).toBeNull();
  });

  it('switches to hours, minutes and seconds under a day', async () => {
    const { countdown, tick } = await render('2026-03-05T12:00:03Z');
    expect(countdown()).toBe('00:00:03');
    await tick(2);
    expect(countdown()).toBe('00:00:01');
  });

  it('stops at zero after departure', async () => {
    const { countdown, tick } = await render('2026-03-05T12:00:01Z');
    await tick(5);
    expect(countdown()).toBe('00:00:00');
  });

  it('keeps the ring unchanged between ticks within the same minute', async () => {
    const { fixture, tick } = await render('2026-03-07T12:00:00Z');
    const options = (fixture.componentInstance as unknown as { options(): unknown }).options();
    await tick(10);
    expect((fixture.componentInstance as unknown as { options(): unknown }).options()).toBe(
      options,
    );
  });

  it('labels the countdown and hides the ticking text from screen readers', async () => {
    const { el } = await render('2026-03-06T14:05:12Z');
    expect(el.textContent).toContain('to departure');
    expect(el.querySelector('[data-clock]')!.parentElement!.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(el.querySelector('[role=img]')!.getAttribute('aria-label')).toContain('check-in window');
  });

  it('stops its timer when destroyed', async () => {
    const { fixture } = await render('2026-03-06T14:05:12Z');
    expect(vi.getTimerCount()).toBe(1);
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('says "opened" once the window has started and "opens" before that', async () => {
    const started = await render('2026-03-06T14:05:12Z');
    expect(started.el.textContent).toMatch(/Check-in opened .* of the window has passed/s);
    started.fixture.destroy();

    const fixture = TestBed.createComponent(WindowProgressChart);
    fixture.componentRef.setInput(
      'flight',
      flightView({ checkinOpensAt: '2026-03-08T12:00:00Z', departureTime: '2026-03-11T12:00:00Z' }),
    );
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Check-in opens 8 Mar');
    expect(text).not.toContain('opened');
  });
});
