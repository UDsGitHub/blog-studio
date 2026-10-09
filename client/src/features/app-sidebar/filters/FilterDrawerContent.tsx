import DateInput from "@/components/DateInput";
import { Button } from "@/components/ui/button";
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Field,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Clock } from "lucide-react";
import {
  ArticleFiltersSchema,
  normalizeTime,
  type ArticleFilters,
  type ArticleFiltersSchemaType,
} from "./filter";
import { format, formatDate, subWeeks } from "date-fns";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DATE_FORMAT } from "@/constants/date";

type Props = {
  initialValues: ArticleFilters;
  onSubmit: (value: Partial<ArticleFilters>) => void;
  onClose: () => void;
};

const today = new Date();
const placeHolderStartDate = formatDate(subWeeks(today, 1), DATE_FORMAT);
const maxDate = formatDate(today, DATE_FORMAT);

export default function FilterDrawerContent({
  initialValues,
  onSubmit,
  onClose,
}: Props) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ArticleFiltersSchemaType>({
    resolver: zodResolver(ArticleFiltersSchema),
    defaultValues: {
      startDate: initialValues.startDate
        ? formatDate(new Date(initialValues.startDate), DATE_FORMAT)
        : undefined,
      startTime: initialValues.startDate
        ? format(initialValues.startDate, "HH:mm:ss")
        : "00:00:00",
      endDate: initialValues.endDate
        ? formatDate(new Date(initialValues.endDate), DATE_FORMAT)
        : undefined,
      endTime: initialValues.endDate
        ? format(initialValues.endDate, "HH:mm:ss")
        : "00:00:00",
    },
  });

  const applyFilters = (values: ArticleFiltersSchemaType) => {
    const startDate =
      values.startDate && values.startTime
        ? `${values.startDate}T${normalizeTime(values.startTime)}`
        : undefined;
    const endDate =
      values.endDate && values.endTime
        ? `${values.endDate}T${normalizeTime(values.endTime)}`
        : undefined;
    onSubmit({ startDate, endDate });
  };

  const clearFilters = () => {
    reset({
      startDate: "",
      startTime: "00:00:00",
      endDate: "",
      endTime: "00:00:00",
    });
    onClose();
  };

  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Filters</DrawerTitle>
        <DrawerDescription className={"text-wrap"}>
          Customize results by date-time range or article tags.
        </DrawerDescription>
      </DrawerHeader>
      <form
        onSubmit={handleSubmit(applyFilters)}
        className="h-full flex flex-col"
      >
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <FieldSet>
            <FieldLegend>From</FieldLegend>
            <FieldGroup className="flex-row items-center">
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <DateInput
                      id="start-date"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={placeHolderStartDate}
                      error={fieldState.error?.message}
                      maxDate={today}
                    />
                  )}
                />
                <Field aria-invalid={!!errors.startTime}>
                  <InputGroup>
                    <InputGroupInput
                      type="time"
                      id="start-date-time"
                      step="1"
                      className="appearance-none bg-transparent [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                      {...register("startTime")}
                      aria-invalid={!!errors.startTime}
                    />
                    <InputGroupAddon align={"inline-end"}>
                      <Clock />
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              </div>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>To</FieldLegend>
            <FieldGroup className="flex-row items-center">
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <DateInput
                      id="end-date"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={maxDate}
                      error={fieldState.error?.message}
                      maxDate={today}
                    />
                  )}
                />
                <Field aria-invalid={!!errors.endTime}>
                  <InputGroup>
                    <InputGroupInput
                      type="time"
                      id="end-date-time"
                      step="1"
                      className="appearance-none bg-transparent [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                      {...register("endTime")}
                      aria-invalid={!!errors.endTime}
                    />
                    <InputGroupAddon align={"inline-end"}>
                      <Clock />
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              </div>
            </FieldGroup>
          </FieldSet>
        </div>
        <DrawerFooter className="mt-auto">
          <div className="w-full grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={"secondary"}
              className={"h-8.5"}
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
            <Button className="h-8.5" type="submit">
              Apply
            </Button>
          </div>
          <DrawerClose
            onClick={() => reset()}
            render={<Button variant="ghost">Cancel</Button>}
          />
        </DrawerFooter>
      </form>
    </DrawerContent>
  );
}
