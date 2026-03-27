"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { contactSchema, type ContactFormValues } from "@/lib/validators";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

function timestampToDateString(ts: number | undefined): string {
  if (!ts) return "";
  return new Date(ts).toISOString().split("T")[0];
}

function dateStringToTimestamp(dateStr: string): number {
  return new Date(dateStr).getTime();
}

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Doc<"contacts"> | null;
  addressBooks: Doc<"addressBooks">[];
}

export function ContactForm({
  open,
  onOpenChange,
  editing,
  addressBooks,
}: ContactFormProps) {
  const { orgId } = useOrg();
  const create = useMutation(api.contacts.mutations.create);
  const update = useMutation(api.contacts.mutations.update);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      company: "",
      salutation: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      cellPhone: "",
      fax: "",
      altPhone: "",
      altContactFirstName: "",
      altContactLastName: "",
      address: {
        street: "",
        street2: "",
        city: "",
        state: "",
        zip: "",
        country: "",
      },
      website: "",
      category: "",
      notes: "",
      customerSince: undefined,
      addressBookIds: [],
    },
  });

  useEffect(() => {
    if (editing) {
      form.reset({
        company: editing.company ?? "",
        salutation: editing.salutation ?? "",
        firstName: editing.firstName,
        lastName: editing.lastName,
        email: editing.email ?? "",
        phone: editing.phone ?? "",
        cellPhone: editing.cellPhone ?? "",
        fax: editing.fax ?? "",
        altPhone: editing.altPhone ?? "",
        altContactFirstName: editing.altContactFirstName ?? "",
        altContactLastName: editing.altContactLastName ?? "",
        address: {
          street: editing.address?.street ?? "",
          street2: editing.address?.street2 ?? "",
          city: editing.address?.city ?? "",
          state: editing.address?.state ?? "",
          zip: editing.address?.zip ?? "",
          country: editing.address?.country ?? "",
        },
        website: editing.website ?? "",
        category: editing.category ?? "",
        notes: editing.notes ?? "",
        customerSince: editing.customerSince,
        addressBookIds: (editing.addressBookIds as string[]) ?? [],
      });
    } else {
      form.reset({
        company: "",
        salutation: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        cellPhone: "",
        fax: "",
        altPhone: "",
        altContactFirstName: "",
        altContactLastName: "",
        address: {
          street: "",
          street2: "",
          city: "",
          state: "",
          zip: "",
          country: "",
        },
        website: "",
        category: "",
        notes: "",
        customerSince: undefined,
        addressBookIds: [],
      });
    }
  }, [editing, form]);

  const onSubmit = async (values: ContactFormValues) => {
    if (!orgId) return;
    setIsPending(true);
    try {
      const address =
        values.address &&
        (values.address.street ||
          values.address.street2 ||
          values.address.city ||
          values.address.state ||
          values.address.zip ||
          values.address.country)
          ? values.address
          : undefined;

      const payload = {
        company: values.company,
        salutation: values.salutation || undefined,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email || undefined,
        phone: values.phone || undefined,
        cellPhone: values.cellPhone || undefined,
        fax: values.fax || undefined,
        altPhone: values.altPhone || undefined,
        altContactFirstName: values.altContactFirstName || undefined,
        altContactLastName: values.altContactLastName || undefined,
        address,
        website: values.website || undefined,
        category: values.category || undefined,
        notes: values.notes || undefined,
        customerSince: values.customerSince,
        addressBookIds:
          values.addressBookIds && values.addressBookIds.length > 0
            ? (values.addressBookIds as Id<"addressBooks">[])
            : undefined,
      };

      if (editing) {
        await update({ id: editing._id, ...payload });
      } else {
        await create({ orgId, ...payload });
      }
      toast.success("Contact saved");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error("Failed to save contact");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit" : "New"} Contact</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6 px-4"
          >
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Basic Info
              </h3>
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salutation"
                render={({ field }) => (
                  <FormItem className="max-w-40">
                    <FormLabel>Salutation</FormLabel>
                    <FormControl>
                      <Input placeholder="Mr., Ms., Dr." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="customerSince"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Since</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={timestampToDateString(field.value)}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? dateStringToTimestamp(e.target.value)
                              : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cellPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cell Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Cell" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fax</FormLabel>
                      <FormControl>
                        <Input placeholder="Fax" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="altPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alt Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Alternate phone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Alt Contact
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="altContactFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="altContactLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Sponsor, Vendor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Address
              </h3>
              <FormField
                control={form.control}
                name="address.street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address.street2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street 2</FormLabel>
                    <FormControl>
                      <Input placeholder="Suite, unit, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address.zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address.country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {addressBooks.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Address Books
                  </h3>
                  <FormField
                    control={form.control}
                    name="addressBookIds"
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-2">
                          {addressBooks.map((ab) => {
                            const checked = (field.value ?? []).includes(
                              ab._id
                            );
                            return (
                              <div
                                key={ab._id}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={ab._id}
                                  checked={checked}
                                  onCheckedChange={(val) => {
                                    const current = field.value ?? [];
                                    if (val) {
                                      field.onChange([...current, ab._id]);
                                    } else {
                                      field.onChange(
                                        current.filter(
                                          (id: string) => id !== ab._id
                                        )
                                      );
                                    }
                                  }}
                                />
                                <Label htmlFor={ab._id}>{ab.name}</Label>
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <SheetFooter>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving..." : "Save Contact"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
