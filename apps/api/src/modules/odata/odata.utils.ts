export const pickString = (
  v: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(v)) return v[0];
  return v;
};
