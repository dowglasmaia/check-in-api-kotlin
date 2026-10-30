import { TestBed } from '@angular/core/testing';
import { DEVELOPER, PROFILE_LINKS, SiteFooter, STACK } from './site-footer';

describe('SiteFooter', () => {
  async function render() {
    const fixture = TestBed.createComponent(SiteFooter);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return { el, text: el.textContent ?? '' };
  }

  it('credits the developer', async () => {
    const { text } = await render();
    expect(text).toContain('Dowglas Maia');
    expect(text).toContain('Senior Java Engineer');
    expect(DEVELOPER.initials).toBe('DM');
  });

  it.each([
    ['LinkedIn', 'https://www.linkedin.com/in/dowglasmaia/'],
    ['GitHub', 'https://github.com/dowglasmaia'],
    ['Malt', 'https://www.malt.com/profile/dowglasmaia'],
  ])('links to the %s profile', async (label, href) => {
    const { el } = await render();
    const link = Array.from(el.querySelectorAll('a')).find((a) => a.textContent?.includes(label))!;
    expect(link.getAttribute('href')).toBe(href);
  });

  it('opens every external link in a new tab without leaking the opener', async () => {
    const { el } = await render();
    const links = Array.from(el.querySelectorAll('a'));
    expect(links).toHaveLength(PROFILE_LINKS.length);
    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link.textContent).toContain('(opens in a new tab)');
    }
  });

  it('lists the stack', async () => {
    const { text } = await render();
    for (const item of STACK) expect(text).toContain(item);
  });

  it('shows the current year and the fictitious-data notice', async () => {
    const { text } = await render();
    expect(text).toContain(`© ${new Date().getFullYear()} Dowglas Maia`);
    expect(text).toContain('fictitious');
    expect(text).toContain("device's time zone");
  });

  it('labels its sections for assistive technology', async () => {
    const { el } = await render();
    expect(el.querySelector('nav')?.getAttribute('aria-labelledby')).toBe('footer-profiles');
    expect(el.querySelectorAll('h2')).toHaveLength(3);
  });

  it('is hidden when printing', async () => {
    const { el } = await render();
    expect(el.classList.contains('print:hidden')).toBe(true);
  });
});
