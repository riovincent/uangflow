export const INTRO = { revealStart: 0.16, fillStart: 1.25, revealEnd: 2.15, bouncePeak: 2.4, bounceRebound: 2.63, bounceEnd: 2.85, shineStart: 2.9, shineEnd: 3.55, dockStart: 3.65, dockEnd: 5.3, pageEnd: 6 };
export const CONTINUATION_DELAY = 2.1;
export const clamp = (value) => Math.max(0, Math.min(1, value));
export const smooth = (value) => {
  const p = clamp(value);
  return p * p * p * (p * (p * 6 - 15) + 10);
};

export const logoScale = (seconds) => {
  if (seconds <= INTRO.revealEnd) return 0.88 + 0.12 * smooth((seconds - INTRO.revealStart) / (INTRO.revealEnd - INTRO.revealStart));
  if (seconds <= INTRO.bouncePeak) return 1 + 0.09 * smooth((seconds - INTRO.revealEnd) / (INTRO.bouncePeak - INTRO.revealEnd));
  if (seconds <= INTRO.bounceRebound) return 1.09 - 0.1 * smooth((seconds - INTRO.bouncePeak) / (INTRO.bounceRebound - INTRO.bouncePeak));
  return 0.99 + 0.01 * smooth((seconds - INTRO.bounceRebound) / (INTRO.bounceEnd - INTRO.bounceRebound));
};

export const logoPose = (seconds) => {
  const progress = smooth((seconds - INTRO.dockStart) / (INTRO.dockEnd - INTRO.dockStart));
  const width = 360 + (69.4 - 360) * progress;
  return {
    progress,
    x: 780 + (64 - 780) * progress,
    y: 387 + (32 - 387) * progress - 90 * Math.sin(Math.PI * progress),
    width,
    height: width * 910 / 1070,
  };
};
