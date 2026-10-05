import { DATE_FORMAT } from "@/constants/date";
import { formatDate } from "date-fns";
import * as z from "zod";

const optionalDateSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .date("Invalid date.")
      .refine(
        (value) => {
          if (value) {
            return value <= formatDate(new Date(), DATE_FORMAT);
          }
        },
        { message: "Must be today or in the past." },
      ),
  ])
  .optional()
  .transform((val) => (val === "" || val === undefined ? undefined : val));
const optionalTimeSchema = z
  .union([z.literal(""), z.string().time("Invalid time.")])
  .optional()
  .transform((val) => (val === "" || val === undefined ? undefined : val));

export const ArticleFiltersSchema = z
  .object({
    startDate: optionalDateSchema,
    startTime: optionalTimeSchema,
    endDate: optionalDateSchema,
    endTime: optionalTimeSchema,
  })
  .superRefine(({ startDate, startTime, endDate, endTime }, ctx) => {
    const timeParser = z.string().time();
    const startTimeParse = timeParser.safeParse(startTime);
    const endTimeParse = timeParser.safeParse(endTime);

    if (startDate && !startTimeParse.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid time.",
        path: ["startTime"],
      });
    }
    if (endDate && !endTimeParse.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid time.",
        path: ["endTime"],
      });
    }
    if (
      startDate &&
      endDate &&
      startTimeParse.success &&
      endTimeParse.success
    ) {
      const startDateValue = `${startDate}T${startTimeParse.data}`;
      const endDateValue = `${endDate}T${endTimeParse.data}`;
      if (startDateValue > endDateValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid date range.",
          path: ["startDate"],
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid date range.",
          path: ["endDate"],
        });
      }
    }
  });

export type ArticleFiltersSchemaType = z.infer<typeof ArticleFiltersSchema>;
export type ArticleFilters = {
  startDate?: string;
  endDate?: string;
};

export const defaultArticleFilters: ArticleFilters = {
  startDate: undefined,
  endDate: undefined,
};

export const normalizeTime = (time: string) => {
  return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
};
