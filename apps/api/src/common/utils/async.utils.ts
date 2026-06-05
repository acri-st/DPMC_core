export const lazyImport = <T>(
  factory: () => Promise<T>,
): (() => Promise<T>) => {
  let cached: Promise<T> | undefined;
  return () => (cached ??= factory());
};
