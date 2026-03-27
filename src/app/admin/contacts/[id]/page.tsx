"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ContactForm } from "../contact-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Pencil,
  ShoppingCart,
  CreditCard,
  FileText,
  Link2,
  Unlink,
  MessageSquare,
  ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import { useOrg } from "@/hooks/use-org";
import { formatDate, formatCurrency } from "@/lib/utils";

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | undefined | null;
}) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function ContactDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as Id<"contacts">;
  const { orgId, isReady } = useOrg();
  const contact = useQuery(api.contacts.queries.getById, { id });
  const addressBooks = useQuery(
    api.addressBooks.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const purchases = useQuery(api.purchases.queries.listByContact, {
    contactId: id,
  });
  const payments = useQuery(api.payments.queries.listByContact, {
    contactId: id,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUserId, setLinkUserId] = useState("");

  const clientLink = useQuery(api.clientLinks.queries.getByContactId, {
    contactId: id,
  });
  const clientMessages = useQuery(api.messages.queries.listByContact, {
    contactId: id,
  });
  const clientAssets = useQuery(api.clientAssets.queries.listByContact, {
    contactId: id,
  });

  const createLink = useMutation(api.clientLinks.mutations.create);
  const removeLink = useMutation(api.clientLinks.mutations.remove);
  const sendMessage = useMutation(api.messages.mutations.send);
  const reviewAsset = useMutation(api.clientAssets.mutations.review);

  const [newMessage, setNewMessage] = useState("");

  if (contact === undefined) {
    return <ContactDetailSkeleton />;
  }

  if (contact === null) {
    return (
      <div className="space-y-6">
        <Link href="/admin/contacts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contacts
          </Button>
        </Link>
        <EmptyState
          title="Contact not found"
          description="This contact may have been deleted."
        />
      </div>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;
  const addressParts = [
    contact.address?.street,
    contact.address?.city,
    contact.address?.state,
    contact.address?.zip,
  ].filter(Boolean);
  const formattedAddress = addressParts.length > 0 ? addressParts.join(", ") : null;

  const contactAddressBookNames = (contact.addressBookIds ?? [])
    .map((abId) => (addressBooks ?? []).find((ab) => ab._id === abId)?.name)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/contacts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      <PageHeader
        title={fullName}
        description={contact.company ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/contacts/${id}/statement`)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Statement
            </Button>
            <Button
              variant="outline"
              onClick={() => setFormOpen(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="portal">Portal Access</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <DetailField label="First Name" value={contact.firstName} />
                <DetailField label="Last Name" value={contact.lastName} />
                <DetailField label="Company" value={contact.company} />
                <DetailField label="Email" value={contact.email} />
                <DetailField label="Phone" value={contact.phone} />
                <DetailField label="Website" value={contact.website} />
                <DetailField label="Category" value={contact.category} />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Address</CardTitle>
                </CardHeader>
                <CardContent>
                  {formattedAddress ? (
                    <p className="text-sm">{formattedAddress}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No address on file
                    </p>
                  )}
                </CardContent>
              </Card>

              {contactAddressBookNames.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Address Books</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {contactAddressBookNames.map((name) => (
                        <Badge key={name} variant="secondary">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {contact.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {contact.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="purchases">
          <div className="pt-4">
            {purchases && purchases.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Edition</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => (
                      <TableRow
                        key={purchase._id}
                        className="cursor-pointer"
                        onClick={() =>
                          router.push(`/admin/purchases/${purchase._id}`)
                        }
                      >
                        <TableCell className="font-medium">
                          {purchase.invoiceNumber ?? "—"}
                        </TableCell>
                        <TableCell>{purchase.editionName}</TableCell>
                        <TableCell>{purchase.year}</TableCell>
                        <TableCell>{formatCurrency(purchase.net)}</TableCell>
                        <TableCell>{formatCurrency(purchase.amountPaid)}</TableCell>
                        <TableCell>
                          {purchase.isPaid ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              Paid
                            </Badge>
                          ) : purchase.amountPaid > 0 ? (
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                              Partial
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Unpaid</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={ShoppingCart}
                title="No purchases yet"
                description="No purchase records found for this contact."
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="pt-4">
            {payments && payments.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Edition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment._id}>
                        <TableCell>{formatDate(payment.date)}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell className="capitalize">
                          {payment.method?.replace("_", " ") ?? "—"}
                        </TableCell>
                        <TableCell>{payment.invoiceNumber ?? "—"}</TableCell>
                        <TableCell>
                          {payment.editionName} {payment.year}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={CreditCard}
                title="No payments yet"
                description="No payment records found for this contact."
              />
            )}
          </div>
        </TabsContent>
        <TabsContent value="portal">
          <div className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Client Portal Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {clientLink ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">Linked User ID</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {clientLink.userId}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          await removeLink({ id: clientLink._id });
                        }}
                      >
                        <Unlink className="mr-2 h-4 w-4" />
                        Unlink
                      </Button>
                    </div>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Portal Access Enabled
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      No client portal account linked. Link a Clerk user ID to
                      give this contact access to the client portal.
                    </p>
                    <Button onClick={() => setLinkDialogOpen(true)}>
                      <Link2 className="mr-2 h-4 w-4" />
                      Link Client Account
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="messages">
          <div className="pt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                  {clientMessages && clientMessages.length > 0 ? (
                    clientMessages.map((msg) => (
                      <div
                        key={msg._id}
                        className={`rounded-lg p-3 text-sm ${
                          msg.senderRole === "admin"
                            ? "bg-primary/10 ml-8"
                            : "bg-muted mr-8"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">
                            {msg.senderRole === "admin" ? "Admin" : "Client"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={MessageSquare}
                      title="No messages"
                      description="Start a conversation with this client."
                    />
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
                        e.preventDefault();
                        await sendMessage({
                          contactId: id,
                          content: newMessage.trim(),
                          senderRole: "admin",
                        });
                        setNewMessage("");
                      }
                    }}
                  />
                  <Button
                    onClick={async () => {
                      if (!newMessage.trim()) return;
                      await sendMessage({
                        contactId: id,
                        content: newMessage.trim(),
                        senderRole: "admin",
                      });
                      setNewMessage("");
                    }}
                  >
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assets">
          <div className="pt-4">
            {clientAssets && clientAssets.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientAssets.map((asset) => (
                      <TableRow key={asset._id}>
                        <TableCell className="font-medium">
                          {asset.fileName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              asset.status === "approved"
                                ? "default"
                                : asset.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className={
                              asset.status === "approved"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : undefined
                            }
                          >
                            {asset.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {asset.feedback ?? "—"}
                        </TableCell>
                        <TableCell>
                          {(asset.status === "uploaded" ||
                            asset.status === "under_review") && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  reviewAsset({
                                    id: asset._id,
                                    status: "approved",
                                  })
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const fb = prompt("Rejection reason:");
                                  if (fb !== null) {
                                    reviewAsset({
                                      id: asset._id,
                                      status: "rejected",
                                      feedback: fb || undefined,
                                    });
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={ImageIcon}
                title="No assets uploaded"
                description="Client-uploaded ad artwork will appear here."
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Client Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">Clerk User ID</Label>
              <Input
                id="userId"
                value={linkUserId}
                onChange={(e) => setLinkUserId(e.target.value)}
                placeholder="user_2abc123..."
              />
              <p className="text-xs text-muted-foreground">
                Enter the Clerk user ID of the client who should access this
                contact&apos;s data through the portal.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLinkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!linkUserId.trim()}
              onClick={async () => {
                try {
                  await createLink({
                    userId: linkUserId.trim(),
                    contactId: id,
                  });
                  setLinkDialogOpen(false);
                  setLinkUserId("");
                } catch (err) {
                  alert(
                    err instanceof Error ? err.message : "Failed to link"
                  );
                }
              }}
            >
              Link Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={contact as Doc<"contacts">}
        addressBooks={addressBooks ?? []}
      />
    </div>
  );
}
