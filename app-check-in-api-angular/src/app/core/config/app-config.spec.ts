import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, provideAppConfig } from './app-config';

function mockConfigResponse(init: { ok?: boolean; contentType?: string; body?: unknown } = {}) {
  const {
    ok = true,
    contentType = 'application/json',
    body = { apiBaseUrl: 'https://api.example.test' },
  } = init;
  return vi.fn().mockResolvedValue({
    ok,
    headers: new Headers({ 'content-type': contentType }),
    json: async () => body,
  });
}

async function initialize() {
  TestBed.configureTestingModule({ providers: [provideAppConfig()] });
  await TestBed.inject(ApplicationInitStatus).donePromise;
  return TestBed.inject(APP_CONFIG);
}

describe('provideAppConfig', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('defaults to the same origin', () => {
    expect(TestBed.inject(APP_CONFIG).apiBaseUrl).toBe('');
  });

  it('overrides the defaults with config.json', async () => {
    vi.stubGlobal('fetch', mockConfigResponse());
    expect((await initialize()).apiBaseUrl).toBe('https://api.example.test');
  });

  it('ignores a response that is not JSON (dev-server fallback to index.html)', async () => {
    vi.stubGlobal('fetch', mockConfigResponse({ contentType: 'text/html' }));
    expect((await initialize()).apiBaseUrl).toBe('');
  });

  it('keeps the defaults when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect((await initialize()).apiBaseUrl).toBe('');
  });
});
