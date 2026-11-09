import { buildActiveSession, buildSetSheet, type SessionUiState } from './workouts.session-view';
import { card, detail, entry, history, idle, pushUp, squat } from './workouts.test-kit';

describe('chips (S3)', () => {
  test('a Recommended Set shows load × reps with last session as secondary text and a spoken label', () => {
    const squatCard = card(buildActiveSession(detail({ squatHistory: [history([[80, 8], [80, 8], [80, 7]])] }), idle), 'sq');
    expect(squatCard.chips[0]).toMatchObject({
      label: 'Set 1', kind: 'working', loadKg: 80, reps: 9, recommended: true, saveState: 'idle', needsLoad: false, setId: null,
      primaryText: '80 × 9', secondaryText: 'last 80 × 8', accessibilityLabel: '80 kilograms, 9 reps, recommended',
    });
    expect(squatCard.chips.map((chip) => chip.primaryText)).toEqual(['80 × 9', '80 × 9', '80 × 8']);
    expect(squatCard.chips[2].secondaryText).toBe('last 80 × 7');
    expect(squatCard.prescriptionText).toBe('3 × 6–10');
    expect(squatCard.progressText).toBe('0 of 3 sets');
    expect(squatCard.firstSession).toBe(false);
  });

  test('first session: reps start at the bottom of the range, no load until set, later sets copy the first load (TRN-3)', () => {
    const first = card(buildActiveSession(detail(), idle), 'sq');
    expect(first.firstSession).toBe(true);
    expect(first.chips[0]).toMatchObject({ loadKg: null, reps: 6, recommended: false, needsLoad: true, secondaryText: null, primaryText: '— × 6' });
    const afterOne = card(buildActiveSession(detail({ sets: [entry('a', squat, 0, 60, 6)] }), idle), 'sq');
    expect(afterOne.chips[0]).toMatchObject({ saveState: 'saved', setId: 'a', loadKg: 60 });
    expect(afterOne.chips[1]).toMatchObject({ loadKg: 60, reps: 6, recommended: false, needsLoad: false });
    expect(afterOne.progressText).toBe('1 of 3 sets');
  });

  test('bodyweight chips take reps only and say so', () => {
    const body = card(buildActiveSession(detail(), idle), 'pu');
    expect(body.chips[0]).toMatchObject({ loadKg: null, reps: 8, bodyweight: true, needsLoad: false, primaryText: '8 reps' });
  });

  test('a stepper draft replaces the recommendation and drops the recommended marker', () => {
    const ui: SessionUiState = { ...idle, drafts: { 'sq:0': { loadKg: 82.5, reps: 7 } } };
    const chip = card(buildActiveSession(detail({ squatHistory: [history([[80, 8], [80, 8], [80, 8]])] }), ui), 'sq').chips[0];
    expect(chip).toMatchObject({ loadKg: 82.5, reps: 7, recommended: false, primaryText: '82.5 × 7' });
    expect(chip.accessibilityLabel).toBe('82.5 kilograms, 7 reps');
  });

  test('a pending commit shows saving, and a failed one stays editable with its values (DATA-2)', () => {
    const base = detail({ squatHistory: [history([[80, 8], [80, 8], [80, 8]])] });
    const saving = card(buildActiveSession(base, { ...idle, pending: { 'sq:0': { status: 'saving', loadKg: 80, reps: 9 } } }), 'sq').chips[0];
    const failed = card(buildActiveSession(base, { ...idle, pending: { 'sq:0': { status: 'failed', loadKg: 80, reps: 9 } } }), 'sq').chips[0];
    expect(saving).toMatchObject({ saveState: 'saving', setId: null });
    expect(failed).toMatchObject({ saveState: 'failed', setId: null, loadKg: 80, reps: 9 });
  });

  test('a draft made after a failed commit replaces the failed values; while saving the committed values stay shown', () => {
    const base = detail({ squatHistory: [history([[80, 8], [80, 8], [80, 8]])] });
    const draft = { 'sq:0': { loadKg: 82.5, reps: 7 } };
    const failed = card(buildActiveSession(base, { ...idle, drafts: draft, pending: { 'sq:0': { status: 'failed', loadKg: 80, reps: 9 } } }), 'sq').chips[0];
    const saving = card(buildActiveSession(base, { ...idle, drafts: draft, pending: { 'sq:0': { status: 'saving', loadKg: 80, reps: 9 } } }), 'sq').chips[0];
    expect(failed).toMatchObject({ saveState: 'failed', loadKg: 82.5, reps: 7, recommended: false });
    expect(saving).toMatchObject({ saveState: 'saving', loadKg: 80, reps: 9 });
  });

  test('a saved set is marked Failed Set only below the range at the recommended load', () => {
    const sets = [entry('a', squat, 0, 80, 5), entry('b', squat, 1, 70, 5), entry('c', squat, 2, 80, 8)];
    const chips = card(buildActiveSession(detail({ squatHistory: [history([[80, 8], [80, 8], [80, 8]])], sets }), idle), 'sq').chips;
    expect(chips.slice(0, 3).map((chip) => chip.failedSet)).toEqual([true, false, false]);
  });

  test('warmups are listed first with no recommendation; sets beyond the prescription add one extra chip', () => {
    const sets = [entry('w', squat, 0, 40, 10, 'warmup'), entry('a', squat, 0, 80, 8), entry('b', squat, 1, 80, 8), entry('c', squat, 2, 80, 8)];
    const chips = card(buildActiveSession(detail({ squatHistory: [history([[80, 8], [80, 8], [80, 8]])], sets }), idle), 'sq').chips;
    expect(chips.map((chip) => [chip.kind, chip.label, chip.saveState])).toEqual([
      ['warmup', 'Warmup 1', 'saved'], ['working', 'Set 1', 'saved'], ['working', 'Set 2', 'saved'], ['working', 'Set 3', 'saved'], ['extra', 'Extra set', 'idle'],
    ]);
    expect(chips[0]).toMatchObject({ recommended: false, secondaryText: null });
    expect(chips[4]).toMatchObject({ loadKg: 80, reps: 8, recommended: false });
    expect(card(buildActiveSession(detail({ sets }), idle), 'sq').complete).toBe(true);
  });

  test('a Load Reset carries its one reason line', () => {
    const failing = [history([[100, 5], [100, 5], [100, 5]]), { ...history([[100, 5], [100, 5], [100, 5]]), id: 'older' }];
    const squatCard = card(buildActiveSession(detail({ squatHistory: failing }), idle), 'sq');
    expect(squatCard.reasonLine).toBe('Reset after 2 sessions under 6 reps');
    expect(squatCard.chips[0]).toMatchObject({ loadKg: 90, reps: 6 });
  });

  test('a finished session offers only its logged sets, for correction (G9)', () => {
    const content = buildActiveSession(detail({ ended: true, sets: [entry('a', squat, 0, 80, 8)] }), idle);
    expect(content.active).toBe(false);
    expect(card(content, 'sq').chips.map((chip) => chip.saveState)).toEqual(['saved']);
  });

  test('expansion, rest and session progress are passed through', () => {
    const ui: SessionUiState = { ...idle, expandedExerciseId: 'pu', rest: { deadlineMs: 5, durationSeconds: 90 } };
    const content = buildActiveSession(detail({ sets: [entry('a', squat, 0, 80, 8), entry('p', pushUp, 0, null, 10)] }), ui);
    expect(content).toMatchObject({ sessionId: 's-now', templateName: 'Full Body', loggedWorkingSets: 2, prescribedWorkingSets: 5, progressText: '2 of 5 sets', rest: { deadlineMs: 5, durationSeconds: 90 } });
    expect(card(content, 'pu').expanded).toBe(true);
    expect(card(content, 'sq').expanded).toBe(false);
  });

  test('the set sheet carries the exercise increment and whether the set is committed', () => {
    const content = buildActiveSession(detail({ squatHistory: [history([[80, 8], [80, 8], [80, 8]])], sets: [entry('a', squat, 0, 80, 9)] }), idle);
    const squatCard = card(content, 'sq');
    expect(buildSetSheet(squatCard, squatCard.chips[0])).toMatchObject({ title: 'Back Squat · Set 1', setId: 'a', isSaved: true, canDelete: true, incrementKg: 2.5, type: 'working' });
    expect(buildSetSheet(squatCard, squatCard.chips[1])).toMatchObject({ setId: null, isSaved: false, canDelete: false, loadKg: 80, reps: 9 });
  });

  test('the rest override rides on the card', () => {
    const custom = detail();
    custom.exercises[0].templateExercise = { ...squat, restOverrideSeconds: 150 };
    expect(card(buildActiveSession(custom, idle), 'sq').restSeconds).toBe(150);
    expect(card(buildActiveSession(detail(), idle), 'sq').restSeconds).toBe(90);
  });
});
