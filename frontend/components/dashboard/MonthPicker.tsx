"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}

function isFutureMonth(month: number, year: number): boolean {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  return year > currentYear || (year === currentYear && month > currentMonth);
}

export default function MonthPicker({ month, year, onChange }: Props) {
  const goPrev = () => {
    if (month === 1) onChange(12, year - 1);
    else onChange(month - 1, year);
  };

  const goNext = () => {
    if (isFutureMonth(month, year)) return;
    if (month === 12) onChange(1, year + 1);
    else onChange(month + 1, year);
  };

  const atCurrentMonth = (() => {
    const now = new Date();
    return month === now.getMonth() + 1 && year === now.getFullYear();
  })();

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon-sm" onClick={goPrev} aria-label="Previous month">
        <ChevronLeft />
      </Button>
      <span className="min-w-[140px] text-center text-sm font-medium text-gray-700">
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={goNext}
        disabled={atCurrentMonth}
        aria-label="Next month"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
