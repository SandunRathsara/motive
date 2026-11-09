import {
  armSetTimer, backgroundSetTimer, endRest, foregroundSetTimer, setLoggingDurationMs, touchSetTimer,
} from './workouts.timing';

const s = (seconds: number) => seconds * 1000;

describe('set-logging duration (D1, §10b)', () => {
  test('without a rest it runs from when the chip became actionable to the commit', () => {
    const timer = armSetTimer(s(100));
    expect(setLoggingDurationMs(timer, s(104), null)).toBe(s(4));
  });

  test('after a rest it runs from the later of actionable and the end of rest', () => {
    const timer = armSetTimer(s(100)); // previous commit; rest until 190
    expect(setLoggingDurationMs(timer, s(195), s(190))).toBe(s(5));
  });

  test('Skip ends the rest early', () => {
    const timer = endRest(armSetTimer(s(100)), s(120));
    expect(setLoggingDurationMs(timer, s(123), s(190))).toBe(s(3));
  });

  test('logged during rest, it starts at the first touch after the previous commit', () => {
    const touched = touchSetTimer(armSetTimer(s(100)), s(130));
    expect(setLoggingDurationMs(touched, s(136), s(190))).toBe(s(6));
    // A later touch never moves the start.
    expect(setLoggingDurationMs(touchSetTimer(touched, s(133)), s(136), s(190))).toBe(s(6));
  });

  test('logged during rest with no earlier touch, the commit tap is the first touch', () => {
    expect(setLoggingDurationMs(armSetTimer(s(100)), s(150), s(190))).toBe(0);
  });

  test('backgrounded time is excluded', () => {
    let timer = armSetTimer(s(100));
    timer = foregroundSetTimer(backgroundSetTimer(timer, s(110)), s(170));
    expect(setLoggingDurationMs(timer, s(180), null)).toBe(s(20));
  });

  test('backgrounded time before the start of the measured span is ignored', () => {
    let timer = armSetTimer(s(100));
    timer = foregroundSetTimer(backgroundSetTimer(timer, s(105)), s(115)); // inside the rest
    expect(setLoggingDurationMs(timer, s(195), s(190))).toBe(s(5));
  });

  test('still backgrounded at the commit counts only up to the moment it left the foreground', () => {
    const timer = backgroundSetTimer(armSetTimer(s(100)), s(110));
    expect(setLoggingDurationMs(timer, s(180), null)).toBe(s(10));
  });

  test('never negative', () => {
    expect(setLoggingDurationMs(armSetTimer(s(100)), s(90), null)).toBe(0);
  });
});
