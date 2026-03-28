"use client";

import { useRouter } from "next/navigation";
import { getContactColor, getContrastText } from "@/lib/colors";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MAX_DAY_SLOTS = 35;

interface SlotData {
  _id: string;
  month: number;
  slotNumber: number | null;
  contactId: string;
  contactName: string;
  company: string;
  advertisementName: string;
  isDayType: boolean;
  purchaseId: string;
}

function getMultiOccupantBackground(occupants: SlotData[]): string {
  if (occupants.length === 1) {
    return getContactColor(occupants[0].contactId.toString());
  }
  const pct = 100 / occupants.length;
  const stops = occupants
    .map((o, i) => {
      const color = getContactColor(o.contactId.toString());
      return `${color} ${pct * i}%, ${color} ${pct * (i + 1)}%`;
    })
    .join(", ");
  return `linear-gradient(135deg, ${stops})`;
}

export function CalendarInventoryGrid({ slots }: { slots: SlotData[] }) {
  const router = useRouter();

  const daySlotsByMonth = new Map<number, Map<number, SlotData[]>>();
  const nonDaySlotsByMonth = new Map<number, Map<string, SlotData[]>>();

  for (const slot of slots) {
    if (slot.isDayType && slot.slotNumber != null) {
      if (!daySlotsByMonth.has(slot.month)) {
        daySlotsByMonth.set(slot.month, new Map());
      }
      const monthMap = daySlotsByMonth.get(slot.month)!;
      if (!monthMap.has(slot.slotNumber)) {
        monthMap.set(slot.slotNumber, []);
      }
      monthMap.get(slot.slotNumber)!.push(slot);
    } else {
      if (!nonDaySlotsByMonth.has(slot.month)) {
        nonDaySlotsByMonth.set(slot.month, new Map());
      }
      const adMap = nonDaySlotsByMonth.get(slot.month)!;
      const adName = slot.advertisementName;
      if (!adMap.has(adName)) {
        adMap.set(adName, []);
      }
      adMap.get(adName)!.push(slot);
    }
  }

  const allNonDayAdNames = new Set<string>();
  for (const adMap of nonDaySlotsByMonth.values()) {
    for (const name of adMap.keys()) {
      allNonDayAdNames.add(name);
    }
  }

  return (
    <div className="space-y-6">
      {/* Day-type slots: 12-month grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 print:hidden">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const monthSlots = daySlotsByMonth.get(month) ?? new Map();
          return (
            <div key={month} className="rounded-md border">
              <div className="border-b bg-muted/50 px-3 py-1.5">
                <h4 className="text-xs font-semibold">{MONTH_NAMES[month - 1]}</h4>
              </div>
              <div className="grid grid-cols-5 gap-px p-1">
                {Array.from({ length: MAX_DAY_SLOTS }, (_, j) => j + 1).map(
                  (slotNum) => {
                    const occupants = monthSlots.get(slotNum);
                    if (occupants && occupants.length > 0) {
                      const isSingle = occupants.length === 1;
                      const bgValue = getMultiOccupantBackground(occupants);
                      const fg = isSingle
                        ? getContrastText(getContactColor(occupants[0].contactId.toString()))
                        : "#ffffff";

                      const style: React.CSSProperties = isSingle
                        ? { backgroundColor: bgValue, color: fg }
                        : { background: bgValue, color: fg };

                      return (
                        <Tooltip key={slotNum}>
                          <TooltipTrigger
                            onClick={() =>
                              router.push(`/admin/purchases/${occupants[0].purchaseId}`)
                            }
                            className="relative flex h-7 items-center justify-center rounded text-[10px] font-medium leading-none transition-opacity hover:opacity-80"
                            style={style}
                          >
                            {slotNum}
                            {!isSingle && (
                              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground text-background text-[8px] font-bold leading-none">
                                {occupants.length}
                              </span>
                            )}
                          </TooltipTrigger>
                          <TooltipContent className="flex-col items-start gap-0">
                            {occupants.map((occ, idx) => (
                              <div key={occ._id} className={idx > 0 ? "mt-1 pt-1 border-t border-border/50 w-full" : ""}>
                                <p className="font-medium flex items-center gap-1">
                                  <span
                                    className="inline-block h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: getContactColor(occ.contactId.toString()) }}
                                  />
                                  {occ.company || occ.contactName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {occ.advertisementName} &middot; Slot {slotNum}
                                </p>
                              </div>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return (
                      <div
                        key={slotNum}
                        className="flex h-7 items-center justify-center rounded border border-dashed border-muted-foreground/20 text-[10px] text-muted-foreground/40"
                      >
                        {slotNum}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Non-day-type slots */}
      {allNonDayAdNames.size > 0 && (
        <div className="space-y-4 print:hidden">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Non-Day Ad Placements
          </h3>
          {Array.from(allNonDayAdNames)
            .sort()
            .map((adName) => (
              <div key={adName} className="rounded-md border">
                <div className="border-b bg-muted/50 px-3 py-1.5">
                  <h4 className="text-xs font-semibold">{adName}</h4>
                </div>
                <div className="grid grid-cols-3 gap-px p-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 print:grid-cols-12">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const adMap = nonDaySlotsByMonth.get(month);
                    const monthSlots = adMap?.get(adName) ?? [];
                    return (
                      <div
                        key={month}
                        className="min-h-8 rounded border border-dashed border-muted-foreground/20 p-1"
                      >
                        <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
                          {MONTH_NAMES[month - 1].slice(0, 3)}
                        </p>
                        {monthSlots.length > 0 ? (
                          <div className="space-y-0.5">
                            {monthSlots.map((slot) => {
                              const bg = getContactColor(
                                slot.contactId.toString()
                              );
                              const fg = getContrastText(bg);
                              return (
                                <Tooltip key={slot._id}>
                                  <TooltipTrigger
                                    onClick={() =>
                                      router.push(
                                        `/admin/purchases/${slot.purchaseId}`
                                      )
                                    }
                                    className="block w-full truncate rounded px-1 py-0.5 text-[9px] font-medium transition-opacity hover:opacity-80"
                                    style={{
                                      backgroundColor: bg,
                                      color: fg,
                                    }}
                                  >
                                    {slot.company || slot.contactName}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium">
                                      {slot.company || slot.contactName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {slot.advertisementName}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[9px] text-muted-foreground/40">
                            Empty
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Print-only reference tables */}
      <div className="hidden print:block">
        <h3 className="text-sm font-semibold mb-3">Slot Reference</h3>

        {/* Day-type reference */}
        {daySlotsByMonth.size > 0 && (
          <div className="grid grid-cols-4 gap-x-4 gap-y-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
              const monthMap = daySlotsByMonth.get(month);
              if (!monthMap || monthMap.size === 0) return null;

              const rows: { slotNumber: number; occ: SlotData }[] = [];
              for (const [slotNum, occupants] of monthMap) {
                for (const occ of occupants) {
                  rows.push({ slotNumber: slotNum, occ });
                }
              }
              rows.sort((a, b) => a.slotNumber - b.slotNumber);

              return (
                <div key={month} className="break-inside-avoid mb-2">
                  <p className="text-[10px] font-bold border-b border-black/20 pb-0.5 mb-0.5">
                    {MONTH_NAMES[month - 1]}
                  </p>
                  <table className="w-full text-[9px] leading-tight">
                    <thead>
                      <tr className="text-left text-[8px] text-gray-500">
                        <th className="pr-1 font-medium w-6">#</th>
                        <th className="pr-1 font-medium">Advertiser</th>
                        <th className="font-medium">Ad Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ slotNumber, occ }) => (
                        <tr key={`${slotNumber}-${occ._id}`}>
                          <td className="pr-1 tabular-nums">{slotNumber}</td>
                          <td className="pr-1">
                            <span className="inline-flex items-center gap-0.5">
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: getContactColor(occ.contactId.toString()),
                                  printColorAdjust: "exact",
                                  WebkitPrintColorAdjust: "exact",
                                } as React.CSSProperties}
                              />
                              {occ.company || occ.contactName}
                            </span>
                          </td>
                          <td className="text-gray-600">{occ.advertisementName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* Non-day-type reference */}
        {allNonDayAdNames.size > 0 && (
          <div className="mt-4 space-y-3">
            <h4 className="text-[10px] font-bold">Non-Day Ad Placements</h4>
            {Array.from(allNonDayAdNames)
              .sort()
              .map((adName) => {
                const hasAny = Array.from({ length: 12 }, (_, i) => i + 1).some(
                  (m) => (nonDaySlotsByMonth.get(m)?.get(adName)?.length ?? 0) > 0
                );
                if (!hasAny) return null;

                return (
                  <div key={adName}>
                    <p className="text-[10px] font-bold border-b border-black/20 pb-0.5 mb-1">
                      {adName}
                    </p>
                    <div className="grid grid-cols-4 gap-x-4 gap-y-2">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                        const adMap = nonDaySlotsByMonth.get(month);
                        const monthSlots = adMap?.get(adName) ?? [];
                        if (monthSlots.length === 0) return null;

                        return (
                          <div key={month} className="break-inside-avoid mb-2">
                            <p className="text-[10px] font-bold border-b border-black/20 pb-0.5 mb-0.5">
                              {MONTH_NAMES[month - 1]}
                            </p>
                            <table className="w-full text-[9px] leading-tight">
                              <thead>
                                <tr className="text-left text-[8px] text-gray-500">
                                  <th className="pr-1 font-medium w-6">#</th>
                                  <th className="font-medium">Advertiser</th>
                                </tr>
                              </thead>
                              <tbody>
                                {monthSlots.map((slot) => (
                                  <tr key={slot._id}>
                                    <td className="pr-1 tabular-nums">
                                      {slot.slotNumber ?? "--"}
                                    </td>
                                    <td>
                                      <span className="inline-flex items-center gap-0.5">
                                        <span
                                          className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                                          style={{
                                            backgroundColor: getContactColor(slot.contactId.toString()),
                                            printColorAdjust: "exact",
                                            WebkitPrintColorAdjust: "exact",
                                          } as React.CSSProperties}
                                        />
                                        {slot.company || slot.contactName}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
