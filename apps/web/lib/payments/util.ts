export function randomDelayMs(min: number, max: number) {
  const n = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((res) => setTimeout(res, n));
}
