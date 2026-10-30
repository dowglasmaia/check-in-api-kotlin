import { TestBed } from '@angular/core/testing';
import { Scenario } from '../../test-data/public-api';
import { SearchForm, SearchRequest } from './search-form';

type Fixture = ReturnType<typeof TestBed.createComponent<SearchForm>>;

describe('SearchForm', () => {
  async function setup(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(SearchForm);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    const submitted: SearchRequest[] = [];
    fixture.componentInstance.submitted.subscribe((request) => submitted.push(request));
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, submitted };
  }

  async function type(fixture: Fixture, value: string) {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#search-value',
    )!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function submit(fixture: Fixture) {
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function pickTab(fixture: Fixture, label: string) {
    const tabs = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[role=tab]'),
    );
    tabs.find((tab) => tab.textContent?.includes(label))!.click();
    await fixture.whenStable();
  }

  const text = (el: HTMLElement) => el.textContent ?? '';

  it('starts on the booking code tab with its hint', async () => {
    const { fixture, el } = await setup();
    await fixture.whenStable();
    expect(el.querySelector('[role=tab][aria-selected=true]')?.textContent).toContain(
      'Booking code',
    );
    expect(text(el)).toContain('6 letters or digits');
  });

  it('shows a required message and does not emit when the value is empty', async () => {
    const { fixture, el, submitted } = await setup();
    await submit(fixture);
    expect(submitted).toEqual([]);
    expect(el.querySelector('[role=alert]')?.textContent).toContain(
      'Enter your booking code to continue.',
    );
  });

  it.each([
    ['Flight number', 'zz', 'two letters and 2–4 digits'],
    ['Booking code', 'ABC', '6 letters or digits'],
    ['Document', '12', '6–20 characters'],
  ])('rejects an invalid %s value inline', async (tab, value, message) => {
    const { fixture, el, submitted } = await setup();
    await pickTab(fixture, tab);
    await type(fixture, value);
    await submit(fixture);
    expect(submitted).toEqual([]);
    expect(el.querySelector('[role=alert]')?.textContent).toContain(message);
  });

  it('emits the typed value for a valid search (spaces are fine, the store normalizes)', async () => {
    const { fixture, submitted } = await setup();
    await pickTab(fixture, 'Flight number');
    await type(fixture, 'MF 214');
    await submit(fixture);
    expect(submitted).toEqual([{ searchType: 'FLIGHT_NUMBER', value: 'MF 214' }]);
  });

  it('accepts a CPF typed without punctuation', async () => {
    const { fixture, submitted } = await setup();
    await pickTab(fixture, 'Document');
    await type(fixture, '12345678909');
    await submit(fixture);
    expect(submitted).toEqual([{ searchType: 'DOCUMENT', value: '12345678909' }]);
  });

  it('clears the value when the search type changes', async () => {
    const { fixture, el } = await setup();
    await type(fixture, 'MAIA7K');
    await pickTab(fixture, 'Document');
    expect(el.querySelector<HTMLInputElement>('#search-value')!.value).toBe('');
  });

  it('does not emit while a search is loading', async () => {
    const { fixture, el, submitted } = await setup({ loading: true });
    await type(fixture, 'MAIA7K');
    await submit(fixture);
    expect(submitted).toEqual([]);
    expect(el.querySelector('button[type=submit]')?.getAttribute('aria-busy')).toBe('true');
  });

  it('starts from the provided scenario', async () => {
    const { fixture, el } = await setup({
      initial: { searchType: 'DOCUMENT', value: '123.456.789-09' },
    });
    await fixture.whenStable();
    expect(el.querySelector('[role=tab][aria-selected=true]')?.textContent).toContain('Document');
    expect(el.querySelector<HTMLInputElement>('#search-value')!.value).toBe('123.456.789-09');
  });

  it('fills the form from a "Try" chip', async () => {
    const scenarios: Scenario[] = [
      { label: 'Open', searchType: 'FLIGHT_NUMBER', value: 'MF214', expectedOutcome: 'ok' },
    ];
    const { fixture, el } = await setup({ scenarios });
    await fixture.whenStable();
    Array.from(el.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'MF214')!
      .click();
    await fixture.whenStable();
    expect(el.querySelector<HTMLInputElement>('#search-value')!.value).toBe('MF214');
    expect(el.querySelector('[role=tab][aria-selected=true]')?.textContent).toContain(
      'Flight number',
    );
  });

  it('hides the chips when there are no scenarios', async () => {
    const { fixture, el } = await setup();
    await fixture.whenStable();
    expect(text(el)).not.toContain('Try:');
  });
});
