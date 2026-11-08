import type { EraseParticipant } from '@/lib/contracts/erase-participant';
import { clearUncleanExitTracking, quiesceUncleanExitTracking, resetUncleanExitTracking } from './unclean-exit';

export const metricsEraseParticipant: EraseParticipant = {
  key: 'metrics', owner: 'metrics',
  quiesce: quiesceUncleanExitTracking,
  reset: resetUncleanExitTracking,
  isClear: clearUncleanExitTracking,
};
