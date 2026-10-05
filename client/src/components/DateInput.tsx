import { formatDate } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Field, FieldError, FieldLabel } from "./ui/field";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "./ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { useEffect, useState } from "react";

type Props = {
  id: string;
  name?: string;
  label?: string;
  value?: string;
  format?: "MM/dd/yyyy" | "yyyy-MM-dd";
  maxDate?: Date;
  required?: boolean;
  placeholder?: string;
  onChange: (value?: string) => void;
  error?: string;
};

export default function DateInput({
  id,
  name,
  label,
  value,
  onChange,
  maxDate,
  placeholder,
  error,
  format = "yyyy-MM-dd",
  required = false,
}: Props) {
  const [inputValue, setInputValue] = useState<string>(value ?? "");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  useEffect(() => {
    console.log('i rerendered')
    const resetState = () => {
      setInputValue(value ?? "");
      setDate(value ? new Date(value) : undefined);
    };
    resetState();
  }, [value]);

  const handleValueChange = (value: string) => {
    let formattedDate = "";

    switch (format) {
      case "MM/dd/yyyy": {
        const cleanInput = value.replaceAll("/", "").trim();
        if (
          cleanInput.length > 8 ||
          (cleanInput !== "" && !/^\d+$/.test(cleanInput))
        )
          return;

        if (cleanInput.length > 4) {
          formattedDate = `${cleanInput.slice(0, 2)}/${cleanInput.slice(2, 4)}/${cleanInput.slice(4)}`;
          if (cleanInput.length === 8) {
            setDate(new Date(formattedDate));
            onChange(formattedDate);
          }
        } else if (cleanInput.length > 2) {
          formattedDate = `${cleanInput.slice(0, 2)}/${cleanInput.slice(2)}`;
        } else if (cleanInput.length > 0) {
          formattedDate += cleanInput;
        }

        break;
      }
      case "yyyy-MM-dd": {
        const cleanInput = value.replaceAll("-", "").trim();
        if (
          cleanInput.length > 8 ||
          (cleanInput !== "" && !/^\d+$/.test(cleanInput))
        )
          return;

        if (cleanInput.length > 6) {
          formattedDate = `${cleanInput.slice(0, 4)}-${cleanInput.slice(4, 6)}-${cleanInput.slice(6)}`;
          if (cleanInput.length === 8) {
            setDate(new Date(formattedDate));
            onChange(formattedDate);
          }
        } else if (cleanInput.length > 4) {
          formattedDate = `${cleanInput.slice(0, 4)}-${cleanInput.slice(4)}`;
        } else if (cleanInput.length > 0) {
          formattedDate += cleanInput;
        }

        break;
      }
    }

    setInputValue(formattedDate);
  };

  const handleDatePickerSelect = (date?: Date) => {
    setDate(date);
    setInputValue(date ? formatDate(date, format) : "");
    onChange(date ? formatDate(date, format) : "");
    setPickerOpen(false);
  };

  return (
    <Field aria-invalid={!!error}>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <InputGroup>
        <InputGroupInput
          id={id}
          name={name}
          value={inputValue}
          placeholder={placeholder}
          max={maxDate ? formatDate(maxDate, format) : undefined}
          onChange={(e) => handleValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setPickerOpen(true);
            }
          }}
          aria-invalid={!!error}
          required={required}
        />
        <InputGroupAddon align="inline-end">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger
              render={
                <InputGroupButton
                  id="date-picker"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Select date"
                >
                  <CalendarIcon />
                  <span className="sr-only">Select date</span>
                </InputGroupButton>
              }
            />
            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align="end"
              alignOffset={-8}
              sideOffset={10}
            >
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                month={date}
                onMonthChange={(month) => setDate(month)}
                onSelect={handleDatePickerSelect}
                endMonth={maxDate}
              />
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>
      <FieldError>{error}</FieldError>
    </Field>
  );
}
