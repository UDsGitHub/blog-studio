import { UNEXPECTED_ERROR_MESSAGE } from "@/constants/error";
import type { ErrorMessage } from "@/types/error";

export const getUrlQueryParamsFromObject = (
  object: Record<string, unknown>,
) => {
  return new URLSearchParams(
    Object.entries(object)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
};

const isErrorWithMessage = (
  error: unknown,
): error is { data: { message: string | string[] } } => {
  return (
    typeof error === "object" &&
    error !== null &&
    error !== undefined &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    error.data !== undefined &&
    "message" in error.data &&
    (typeof error.data.message === "string" ||
      Array.isArray(error.data.message))
  );
};

export const isErrorWithStatusCode = (
  error: unknown,
): error is { code?: number; status?: number } => {
  return (
    typeof error === "object" &&
    error !== null &&
    (("code" in error && typeof error.code === "number") ||
      ("status" in error && typeof error.status === "number"))
  );
};

export const getErrorMessage = (
  error: unknown,
): ErrorMessage => {
  let title = UNEXPECTED_ERROR_MESSAGE;
  let subtext: string | undefined = undefined;

  if (isErrorWithStatusCode(error)) {
    const statusCode = error.code ?? error.status;
    switch (statusCode) {
      case 429:
        subtext = "Received too many requests, try again in a moment.";
        break;
      case 401:
        subtext = "Please enter a valid API key to access admin features.";
        break;
      case 400:
        subtext = "Invalid request parameters.";
        break;
      default:
        break;
    }
  }

  if (isErrorWithMessage(error)) {
    title = Array.isArray(error.data.message)
      ? error.data.message[0]
      : error.data.message;
  }

  return { message: title, subtext };
};
