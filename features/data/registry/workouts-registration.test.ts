import { trainingLogExportSection, workoutsEraseParticipant } from '@/features/workouts';
import { eraseParticipants } from './erase-participants';
import { exportSections } from './export-sections';

test('the training log is exported and its participant is erased by delete-all', () => {
  expect(exportSections).toContain(trainingLogExportSection);
  expect(eraseParticipants).toContain(workoutsEraseParticipant);
});
