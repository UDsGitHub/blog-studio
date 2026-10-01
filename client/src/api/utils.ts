export const getUrlQueryParamsFromObject = (
  object: Record<string, unknown>,
) => {
  return new URLSearchParams(
    Object.entries(object)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
};
