"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ORDINALS = [
  { value: "first", label: "First" },
  { value: "second", label: "Second" },
  { value: "third", label: "Third" },
  { value: "fourth", label: "Fourth" },
  { value: "last", label: "Last" },
];

export interface RecurrenceData {
  recurrenceType: string | null;
  recurrenceInterval: number;
  recurrenceDays: string | null;
  recurrenceStartDate: string | null;
  recurrenceEndDate: string | null;
  recurrenceCount: number | null;
}

interface RecurrencePickerProps {
  value: RecurrenceData;
  onChange: (data: RecurrenceData) => void;
  defaultStartDate?: string;
}

export function RecurrencePicker({ value, onChange, defaultStartDate }: RecurrencePickerProps) {
  const enabled = !!value.recurrenceType;
  const [endCondition, setEndCondition] = useState<"never" | "count" | "date">(
    value.recurrenceCount ? "count" : value.recurrenceEndDate ? "date" : "never"
  );
  const [monthlyMode, setMonthlyMode] = useState<"day" | "ordinal">(
    value.recurrenceDays?.includes("_") ? "ordinal" : "day"
  );
  const [ordinal, setOrdinal] = useState("first");
  const [ordinalDay, setOrdinalDay] = useState("Mon");
  const [monthDay, setMonthDay] = useState("1");

  // Parse existing recurrenceDays for monthly
  useEffect(() => {
    if (value.recurrenceDays && (value.recurrenceType === "monthly")) {
      const match = value.recurrenceDays.match(/^(first|second|third|fourth|last)_(\w+)$/);
      if (match) {
        setMonthlyMode("ordinal");
        setOrdinal(match[1]);
        setOrdinalDay(match[2]);
      } else {
        setMonthlyMode("day");
        setMonthDay(value.recurrenceDays);
      }
    }
  }, [value.recurrenceDays, value.recurrenceType]);

  const selectedDays: string[] = (() => {
    if (!value.recurrenceDays) return [];
    try { return JSON.parse(value.recurrenceDays); } catch { return []; }
  })();

  const toggleEnabled = (on: boolean) => {
    if (on) {
      onChange({
        ...value,
        recurrenceType: "weekly",
        recurrenceInterval: 1,
        recurrenceStartDate: defaultStartDate || null,
      });
    } else {
      onChange({
        recurrenceType: null,
        recurrenceInterval: 1,
        recurrenceDays: null,
        recurrenceStartDate: null,
        recurrenceEndDate: null,
        recurrenceCount: null,
      });
    }
  };

  const toggleDay = (day: string) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    onChange({ ...value, recurrenceDays: JSON.stringify(newDays) });
  };

  const handleMonthlyDayChange = (mode: "day" | "ordinal") => {
    setMonthlyMode(mode);
    if (mode === "day") {
      onChange({ ...value, recurrenceDays: monthDay });
    } else {
      onChange({ ...value, recurrenceDays: `${ordinal}_${ordinalDay}` });
    }
  };

  if (!enabled) {
    return (
      <div className="flex items-center gap-2">
        <Switch checked={false} onCheckedChange={toggleEnabled} />
        <span className="text-sm text-muted-foreground">Repeat</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 border rounded-md p-3 bg-muted/20">
      <div className="flex items-center gap-2">
        <Switch checked={true} onCheckedChange={toggleEnabled} />
        <span className="text-sm font-medium">Repeat</span>
      </div>

      {/* Frequency */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Every</span>
        <Input
          type="number"
          min={1}
          value={value.recurrenceInterval}
          onChange={(e) => onChange({ ...value, recurrenceInterval: parseInt(e.target.value) || 1 })}
          className="h-8 w-16 text-sm"
        />
        <Select
          value={value.recurrenceType || "weekly"}
          onValueChange={(v) => {
            const newValue = { ...value, recurrenceType: v, recurrenceDays: null };
            // Reset days when changing type
            onChange(newValue);
          }}
        >
          <SelectTrigger className="h-8 w-32 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Day(s)</SelectItem>
            <SelectItem value="weekly">Week(s)</SelectItem>
            <SelectItem value="biweekly">2 Weeks</SelectItem>
            <SelectItem value="monthly">Month(s)</SelectItem>
            <SelectItem value="quarterly">Quarter(s)</SelectItem>
            <SelectItem value="yearly">Year(s)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Day-of-week toggles for weekly/biweekly */}
      {(value.recurrenceType === "weekly" || value.recurrenceType === "biweekly") && (
        <div className="flex flex-wrap gap-1">
          {DAYS_OF_WEEK.map((day) => (
            <Button
              key={day}
              type="button"
              size="sm"
              variant={selectedDays.includes(day) ? "default" : "outline"}
              className="h-7 w-10 text-xs p-0"
              onClick={() => toggleDay(day)}
            >
              {day}
            </Button>
          ))}
        </div>
      )}

      {/* Monthly options */}
      {value.recurrenceType === "monthly" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="radio"
              checked={monthlyMode === "day"}
              onChange={() => handleMonthlyDayChange("day")}
              className="h-3 w-3"
            />
            <span className="text-sm">Day</span>
            <Input
              type="number"
              min={1}
              max={31}
              value={monthDay}
              onChange={(e) => {
                setMonthDay(e.target.value);
                if (monthlyMode === "day") {
                  onChange({ ...value, recurrenceDays: e.target.value });
                }
              }}
              className="h-7 w-16 text-sm"
              disabled={monthlyMode !== "day"}
            />
            <span className="text-sm text-muted-foreground">of the month</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              checked={monthlyMode === "ordinal"}
              onChange={() => handleMonthlyDayChange("ordinal")}
              className="h-3 w-3"
            />
            <Select
              value={ordinal}
              onValueChange={(v) => {
                setOrdinal(v);
                if (monthlyMode === "ordinal") {
                  onChange({ ...value, recurrenceDays: `${v}_${ordinalDay}` });
                }
              }}
              disabled={monthlyMode !== "ordinal"}
            >
              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORDINALS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={ordinalDay}
              onValueChange={(v) => {
                setOrdinalDay(v);
                if (monthlyMode === "ordinal") {
                  onChange({ ...value, recurrenceDays: `${ordinal}_${v}` });
                }
              }}
              disabled={monthlyMode !== "ordinal"}
            >
              <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Start date */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Starts</span>
        <Input
          type="date"
          value={value.recurrenceStartDate || ""}
          onChange={(e) => onChange({ ...value, recurrenceStartDate: e.target.value || null })}
          className="h-8 w-40 text-sm"
        />
      </div>

      {/* End condition */}
      <div className="space-y-2">
        <span className="text-sm text-muted-foreground">Ends</span>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={endCondition === "never"}
              onChange={() => {
                setEndCondition("never");
                onChange({ ...value, recurrenceEndDate: null, recurrenceCount: null });
              }}
              className="h-3 w-3"
            />
            <span className="text-sm">Never</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={endCondition === "count"}
              onChange={() => {
                setEndCondition("count");
                onChange({ ...value, recurrenceEndDate: null, recurrenceCount: 10 });
              }}
              className="h-3 w-3"
            />
            <span className="text-sm">After</span>
            <Input
              type="number"
              min={1}
              value={value.recurrenceCount || 10}
              onChange={(e) => onChange({ ...value, recurrenceCount: parseInt(e.target.value) || null })}
              className="h-7 w-16 text-sm"
              disabled={endCondition !== "count"}
            />
            <span className="text-sm">occurrences</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={endCondition === "date"}
              onChange={() => {
                setEndCondition("date");
                onChange({ ...value, recurrenceCount: null, recurrenceEndDate: "" });
              }}
              className="h-3 w-3"
            />
            <span className="text-sm">On</span>
            <Input
              type="date"
              value={value.recurrenceEndDate || ""}
              onChange={(e) => onChange({ ...value, recurrenceEndDate: e.target.value || null })}
              className="h-7 w-40 text-sm"
              disabled={endCondition !== "date"}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
