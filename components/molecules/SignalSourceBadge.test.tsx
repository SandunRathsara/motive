import { render, screen } from '@testing-library/react-native';
import { SignalSourceBadge } from './SignalSourceBadge';

test.each([
  ['unavailableOnDevice', null, 'Source not yet available'],
  ['notRequested', null, 'Source not yet available'],
  ['hasSamples', 'Health', 'Health · User-entered'],
  ['noReadableSamples', null, 'Source not yet available'],
  ['queryError', null, 'Source not yet available'],
])('%s exposes provenance or an explicit unknown to VoiceOver', async (_state, sourceName, label) => {
  await render(<SignalSourceBadge sourceName={sourceName} userEntered />);
  expect(screen.getByLabelText(label!)).toBeOnTheScreen();
  if (!sourceName) expect(screen.queryByText('User-entered')).toBeNull();
});

test('a device sample names its source without a user-entered label', async () => {
  await render(<SignalSourceBadge sourceName="Apple Watch" />);
  expect(screen.getByLabelText('Apple Watch')).toBeOnTheScreen();
  expect(screen.queryByText('User-entered')).toBeNull();
});
