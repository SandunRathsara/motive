import { render, screen } from '@testing-library/react-native';
import { SignalStatusText } from './SignalStatusText';

test.each([
  ['unavailableOnDevice', 'Unavailable on this device'],
  ['notRequested', 'Not connected to Apple Health'],
  ['hasSamples', 'Samples available'],
  ['noReadableSamples', 'No readable samples in this window. Check Health access and source sync.'],
  ['queryError', "Couldn't read this signal. Pull to refresh to try again."],
] as const)('%s has calm observable status copy', async (_, copy) => {
  await render(<SignalStatusText text={copy} />);
  expect(screen.getByLabelText(copy)).toBeOnTheScreen();
  expect(screen.getByText(copy)).toBeOnTheScreen();
  expect(screen.queryByText(/denied|^0$/i)).toBeNull();
});
