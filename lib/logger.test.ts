import { logEvent } from './logger';

test('release logger drops unknown events, free text, arbitrary objects and invalid fields', () => {
  const dev = __DEV__;
  Object.defineProperty(globalThis, '__DEV__', { value: false, configurable: true });
  const output = jest.spyOn(console, 'info').mockImplementation(() => {});
  try {
    const untyped: (...args: unknown[]) => void = logEvent as (...args: unknown[]) => void;
    untyped('a meal description', { text: 'private' });
    untyped('record_failure', { errorCode: 'SQL and file path', count: NaN, ids: ['food text'], message: 'secret' });
    untyped('record_failure', 'private text');
    untyped('record_failure', { errorCode: 'openFailed', count: 3, ids: ['123e4567-e89b-12d3-a456-426614174000', 'private'] }, 'secret');
    expect(output.mock.calls).toEqual([
      ['record_failure', { ids: [] }],
      ['record_failure', {}],
      ['record_failure', { errorCode: 'openFailed', count: 3, ids: ['123e4567-e89b-12d3-a456-426614174000'] }],
    ]);
  } finally {
    output.mockRestore();
    Object.defineProperty(globalThis, '__DEV__', { value: dev, configurable: true });
  }
});
