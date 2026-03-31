"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  paymentTermsSchema,
  type PaymentTermsFormValues,
} from "@/lib/validators";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { enumerateMonthRange } from "../../../../../../convex/billing/helpers";
import { dollarsToCents, centsToDollars } from "@/lib/utils";
import { CalendarDays, DollarSign } from "lucide-react";

const FEE_TYPE_LABELS: Record<string, string> = {
  flat: "Flat ($)",
  percent: "Percent (%)",
};

const DELIVERY_LABELS: Record<string, string> = {
  mail: "Mail",
  email: "Email",
  pickup: "Pickup",
};

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const y = new Date().getFullYear() - 2 + i;
  return { value: String(y), label: String(y) };
});

export interface PaymentTermsStepRef {
  validate: () => Promise<PaymentTermsFormValues | null>;
  getValues: () => PaymentTermsFormValues;
}

interface PaymentTermsStepProps {
  values: PaymentTermsFormValues;
  onChange: (values: PaymentTermsFormValues) => void;
  suggestedTotal: number;
}

function computeFormNet(v: PaymentTermsFormValues): number {
  const base =
    (v.totalSale ?? 0) -
    (v.discount1 ?? 0) -
    (v.discount2 ?? 0) +
    (v.additionalSale1 ?? 0) +
    (v.additionalSale2 ?? 0) -
    (v.trade ?? 0);

  let earlyDiscount = 0;
  if (v.earlyDiscountType && v.earlyDiscountAmount) {
    earlyDiscount =
      v.earlyDiscountType === "flat"
        ? v.earlyDiscountAmount
        : Math.round(((v.totalSale ?? 0) * v.earlyDiscountAmount) / 100 * 100) / 100;
  }

  return base - earlyDiscount;
}

const fmtDollars = (dollars: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);

export const PaymentTermsStep = forwardRef<
  PaymentTermsStepRef,
  PaymentTermsStepProps
>(function PaymentTermsStep({ values, onChange, suggestedTotal }, ref) {
  const form = useForm<PaymentTermsFormValues>({
    resolver: zodResolver(paymentTermsSchema),
    defaultValues: values,
  });

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const subscription = form.watch((data) => {
      onChangeRef.current(data as PaymentTermsFormValues);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useImperativeHandle(ref, () => ({
    validate: async () => {
      const valid = await form.trigger();
      if (valid) return form.getValues();
      return null;
    },
    getValues: () => form.getValues(),
  }));

  const watched = form.watch();
  const liveNet = useMemo(() => computeFormNet(watched), [watched]);

  const splitEqually = watched.splitEqually ?? true;
  const startMonth = watched.scheduleStartMonth ?? 1;
  const startYear = watched.scheduleStartYear ?? new Date().getFullYear();
  const endMonth = watched.scheduleEndMonth ?? 12;
  const endYear = watched.scheduleEndYear ?? startYear;

  const rangeMonths = useMemo(
    () => enumerateMonthRange(startMonth, startYear, endMonth, endYear),
    [startMonth, startYear, endMonth, endYear]
  );

  const years = useMemo(() => {
    const s = new Set(rangeMonths.map((m) => m.year));
    return Array.from(s).sort((a, b) => a - b);
  }, [rangeMonths]);

  const [activeTab, setActiveTab] = useState(String(years[0] ?? ""));
  useEffect(() => {
    if (years.length > 0 && !years.includes(Number(activeTab))) {
      setActiveTab(String(years[0]));
    }
  }, [years, activeTab]);

  const perMonthAmounts = useMemo(() => {
    if (rangeMonths.length === 0 || liveNet <= 0) return new Map<string, number>();
    const netCents = dollarsToCents(liveNet);
    const count = rangeMonths.length;
    const base = Math.floor(netCents / count);
    const remainder = netCents - base * count;
    const m = new Map<string, number>();
    rangeMonths.forEach(({ month, year }, i) => {
      const isLast = i === count - 1;
      m.set(`${year}-${month}`, centsToDollars(isLast ? base + remainder : base));
    });
    return m;
  }, [liveNet, rangeMonths]);


  const customSchedule = watched.customSchedule ?? [];

  const customTotal = useMemo(
    () => customSchedule.reduce((sum, e) => sum + (e.amount ?? 0), 0),
    [customSchedule]
  );

  const updateCustomAmount = useCallback(
    (month: number, year: number, amount: number) => {
      const current = form.getValues("customSchedule") ?? [];
      const idx = current.findIndex(
        (e) => e.month === month && e.year === year
      );
      let next: typeof current;
      if (idx >= 0) {
        next = [...current];
        next[idx] = { month, year, amount };
      } else {
        next = [...current, { month, year, amount }];
      }
      form.setValue("customSchedule", next, { shouldDirty: true });
    },
    [form]
  );

  const getCustomAmount = useCallback(
    (month: number, year: number): number => {
      const entry = customSchedule.find(
        (e) => e.month === month && e.year === year
      );
      return entry?.amount ?? 0;
    },
    [customSchedule]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Payment Terms</h3>
          <p className="text-sm text-muted-foreground">
            Configure pricing, discounts, and payment schedule.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
          <span className="text-sm font-medium text-muted-foreground">
            Net:
          </span>
          <span className="text-xl font-bold text-primary">
            {fmtDollars(liveNet)}
          </span>
        </div>
      </div>

      <Form {...form}>
        <div className="space-y-6">
          {/* --- Pricing --- */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Pricing
            </h4>
            <FormField
              control={form.control}
              name="totalSale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Sale ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder={
                        suggestedTotal > 0
                          ? String(suggestedTotal)
                          : "0.00"
                      }
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="discount1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount 1 ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discount1Label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount 1 Label</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Early bird"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="discount2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount 2 ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discount2Label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount 2 Label</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Multi-edition"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* --- Additional Sales & Trade --- */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Additional Sales & Trade
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="additionalSale1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Sale 1 ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="additionalSale1Label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Sale 1 Label</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Website ad"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="additionalSale2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Sale 2 ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="additionalSale2Label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Sale 2 Label</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Sponsorship"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="trade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trade ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* --- Fee Configuration --- */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Fee Configuration
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="earlyDiscountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Early Discount Type</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v || undefined)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None">
                            {field.value
                              ? FEE_TYPE_LABELS[field.value]
                              : "None"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="flat">Flat ($)</SelectItem>
                        <SelectItem value="percent">Percent (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="earlyDiscountAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Early Discount Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="lateFeeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Late Fee Type</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v || undefined)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None">
                            {field.value
                              ? FEE_TYPE_LABELS[field.value]
                              : "None"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="flat">Flat ($)</SelectItem>
                        <SelectItem value="percent">Percent (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lateFeeAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Late Fee Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* --- Payment Schedule --- */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Payment Schedule
            </h4>

            <div className="flex flex-col gap-2">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Start
                </Label>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="scheduleStartMonth"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={String(field.value ?? 1)}
                          onValueChange={(v) =>
                            v != null && field.onChange(parseInt(v, 10))
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue>
                                {MONTH_NAMES_FULL[(field.value ?? 1) - 1]}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MONTH_NAMES_FULL.map((name, i) => (
                              <SelectItem
                                key={i + 1}
                                value={String(i + 1)}
                              >
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="scheduleStartYear"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={String(field.value ?? startYear)}
                          onValueChange={(v) =>
                            v != null && field.onChange(parseInt(v, 10))
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue>
                                {String(field.value ?? startYear)}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {YEAR_OPTIONS.map((opt) => (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                              >
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  End
                </Label>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="scheduleEndMonth"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={String(field.value ?? 12)}
                          onValueChange={(v) =>
                            v != null && field.onChange(parseInt(v, 10))
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue>
                                {MONTH_NAMES_FULL[(field.value ?? 12) - 1]}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MONTH_NAMES_FULL.map((name, i) => (
                              <SelectItem
                                key={i + 1}
                                value={String(i + 1)}
                              >
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="scheduleEndYear"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={String(field.value ?? endYear)}
                          onValueChange={(v) =>
                            v != null && field.onChange(parseInt(v, 10))
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue>
                                {String(field.value ?? endYear)}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {YEAR_OPTIONS.map((opt) => (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                              >
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="dueDayOfMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Day of Month</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      className="w-24"
                      {...field}
                      value={field.value ?? 1}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10) || 1)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="splitEqually"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={
                        (field.value ?? true) ? "equal" : "custom"
                      }
                      onValueChange={(v) => {
                        const isEqual = v === "equal";
                        field.onChange(isEqual);
                        if (!isEqual && liveNet > 0 && rangeMonths.length > 0) {
                          const count = rangeMonths.length;
                          const base = Math.round((liveNet / count) * 100) / 100;
                          const total = Math.round(base * (count - 1) * 100) / 100;
                          const lastAmt = Math.round((liveNet - total) * 100) / 100;
                          const schedule = rangeMonths.map((m, i) => ({
                            month: m.month,
                            year: m.year,
                            amount: i === count - 1 ? lastAmt : base,
                          }));
                          form.setValue("customSchedule", schedule, { shouldDirty: true });
                        }
                      }}
                      className="flex flex-col gap-3 sm:flex-row"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="equal" id="split-equal" />
                        <Label
                          htmlFor="split-equal"
                          className="cursor-pointer font-medium"
                        >
                          Split payments equally
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="custom" id="split-custom" />
                        <Label
                          htmlFor="split-custom"
                          className="cursor-pointer font-medium"
                        >
                          Enter custom monthly amounts
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {rangeMonths.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {rangeMonths.length} month{rangeMonths.length !== 1 && "s"}{" "}
                    selected
                  </span>
                  {splitEqually && liveNet > 0 && (
                    <Badge variant="secondary">
                      ~{fmtDollars(centsToDollars(Math.floor(dollarsToCents(liveNet) / rangeMonths.length)))}/mo
                    </Badge>
                  )}
                  {!splitEqually && (
                    <Badge
                      variant={
                        Math.abs(customTotal - liveNet) < 0.01
                          ? "default"
                          : "destructive"
                      }
                    >
                      {fmtDollars(customTotal)} / {fmtDollars(liveNet)}
                    </Badge>
                  )}
                </div>

                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  {years.length > 1 && (
                    <TabsList className="mb-4 h-auto p-1">
                      {years.map((y) => (
                        <TabsTrigger
                          key={y}
                          value={String(y)}
                          className="flex items-center gap-1.5 px-4 py-2"
                        >
                          <CalendarDays className="h-4 w-4" />
                          {y}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  )}

                  {years.map((y) => {
                    const monthsForYear = rangeMonths.filter(
                      (m) => m.year === y
                    );
                    return (
                      <TabsContent
                        key={y}
                        value={String(y)}
                        className="mt-0"
                      >
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                          {monthsForYear.map(({ month, year }) => {
                            const customAmt = getCustomAmount(month, year);
                            return (
                              <Card
                                key={`${year}-${month}`}
                                className="overflow-hidden"
                              >
                                <CardHeader className="bg-muted/30 px-3 py-2">
                                  <CardTitle className="text-sm">
                                    {MONTH_NAMES_SHORT[month - 1]} {year}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="px-3 py-3">
                                  {splitEqually ? (
                                    <p className="text-lg font-semibold text-primary">
                                      {liveNet > 0
                                        ? fmtDollars(perMonthAmounts.get(`${year}-${month}`) ?? 0)
                                        : "$0.00"}
                                    </p>
                                  ) : (
                                    <div className="relative">
                                      <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        placeholder="0.00"
                                        className="pl-8"
                                        value={customAmt || ""}
                                        onChange={(e) =>
                                          updateCustomAmount(
                                            month,
                                            year,
                                            e.target.value
                                              ? parseFloat(e.target.value)
                                              : 0
                                          )
                                        }
                                      />
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </div>
            )}
          </div>

          <Separator />

          {/* --- Delivery & Messages --- */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Delivery & Messages
            </h4>
            <FormField
              control={form.control}
              name="deliveryMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Method</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method...">
                          {field.value
                            ? DELIVERY_LABELS[field.value]
                            : "Select method..."}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mail">Mail</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="pickup">Pickup</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="invoiceMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Message to include on invoices..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="statementMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statement Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Message to include on statements..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </Form>
    </div>
  );
});
