"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { MessageSquare, Send } from "lucide-react";
import { usePortalAuth } from "@/hooks/use-portal-auth";
import { formatDate } from "@/lib/utils";

export default function PortalMessagesPage() {
  const { contactId } = usePortalAuth();
  const messages = useQuery(api.portal.queries.getMyMessages);
  const sendMessage = useMutation(api.messages.mutations.send);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !contactId) return;
    setSending(true);
    try {
      await sendMessage({
        contactId,
        content: newMessage.trim(),
        senderRole: "client",
      });
      setNewMessage("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Messages</h1>

      <Card className="flex h-[calc(100vh-16rem)] flex-col">
        <CardHeader className="shrink-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5" />
            Conversation with Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col overflow-hidden">
          {messages === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="No messages yet"
                description="Send a message to start a conversation with your account manager."
              />
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto pr-2"
            >
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`rounded-lg p-3 text-sm ${
                    msg.senderRole === "client"
                      ? "bg-primary/10 ml-8 border border-primary/20"
                      : "bg-blue-50 dark:bg-blue-500/10 mr-8 border border-blue-100 dark:border-blue-500/20"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {msg.senderRole === "admin" ? "Admin" : "You"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex shrink-0 gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
