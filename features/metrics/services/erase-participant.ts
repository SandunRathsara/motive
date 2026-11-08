import type { EraseParticipant } from '@/lib/contracts/erase-participant';
import { isUncleanExitTrackingClear, quiesceUncleanExitTracking, resetUncleanExitTracking } from './unclean-exit';

export const metricsEraseParticipant: EraseParticipant = {
  key: 'metrics', owner: 'metrics',
  quiesce: quiesceUncleanExitTracking,
  reset: resetUncleanExitTracking,
  isClear: isUncleanExitTrackingClear,
};
