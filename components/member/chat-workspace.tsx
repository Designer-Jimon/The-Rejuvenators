"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCheck,
  Flag,
  Paperclip,
  MessageCircle,
  Reply,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Avatar, EmptyState } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { compressImageSafe } from "@/lib/client-image";
import { fetchWithTimeout } from "@/lib/client-fetch";
import { cn, formatDate } from "@/lib/utils";

type DateLike = string | Date | null;

type OtherUser = {
  id: string;
  name: string;
  avatarKey: string | null;
  avatarUrl: string | null;
  lastSeenAt: DateLike;
};

type Conversation = {
  id: string;
  type: string;
  title: string;
  departmentId: string | null;
  lastMessageAt: DateLike;
  lastMessage: string | null;
  lastSenderName: string | null;
  unreadCount: number;
  otherUser: OtherUser | null;
};

type Contact = {
  id: string;
  name: string;
  avatarKey: string | null;
  occupation: string | null;
  departmentName: string | null;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  body: string;
  kind: string;
  replyToId: string | null;
  attachmentKey: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentSize: number | null;
  editedAt: DateLike;
  deletedAt: DateLike;
  createdAt: DateLike;
};

type AttachmentDraft = {
  key: string;
  url: string;
  name: string;
  type: string;
  size: number;
};

function asDate(value: DateLike) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function timeLabel(value: DateLike) {
  const date = asDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    : formatDate(date);
}

function avatarUrl(key: string | null) {
  return key ? `/api/media/${key.split("/").map(encodeURIComponent).join("/")}` : null;
}

function mergeMessages(current: Message[], incoming: Message[]) {
  const map = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) map.set(message.id, message);
  return [...map.values()].sort(
    (left, right) =>
      (asDate(left.createdAt)?.getTime() ?? 0) -
      (asDate(right.createdAt)?.getTime() ?? 0),
  );
}

export function ChatWorkspace({
  initialConversationId,
  initialConversations,
  contacts,
  currentUserId,
  currentUserName,
}: {
  initialConversationId: string | null;
  initialConversations: Conversation[];
  contacts: Contact[];
  currentUserId: string;
  currentUserName: string;
}) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [contactList, setContactList] = useState(contacts);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversationId ?? initialConversations[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingName, setTypingName] = useState<string | null>(null);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [showContacts, setShowContacts] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const filteredContacts = useMemo(() => {
    const term = contactSearch.trim().toLowerCase();
    if (!term) return contactList;
    return contactList.filter((contact) =>
      [contact.name, contact.occupation, contact.departmentName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [contactList, contactSearch]);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    });
  }

  async function loadConversations() {
    try {
      const response = await fetchWithTimeout("/api/chat/conversations");
      if (!response.ok) return;
      const result = (await response.json()) as {
        conversations: Conversation[];
        contacts: Contact[];
      };
      setConversations(result.conversations);
      setContactList(result.contacts);
      return result.conversations;
    } catch {
      return null;
    }
  }

  async function loadMessages(conversationId: string, before?: string) {
    const response = await fetchWithTimeout(
      `/api/chat/conversations/${conversationId}/messages${
        before ? `?before=${encodeURIComponent(before)}` : ""
      }`,
    );
    const result = (await response.json()) as {
      messages?: Message[];
      error?: string;
    };
    if (!response.ok) throw new Error(result.error ?? "Could not load messages.");
    return result.messages ?? [];
  }

  async function markRead(conversationId: string) {
    try {
      await fetchWithTimeout(`/api/chat/conversations/${conversationId}/read`, {
        method: "POST",
      });
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      );
      router.refresh();
    } catch {
      /* Read state will catch up on the next visit. */
    }
  }

  async function selectConversation(conversationId: string) {
    setSelectedId(conversationId);
    setShowContacts(false);
    setError(null);
    setLoadingMessages(true);
    setMessages([]);
    setReplyTo(null);
    setAttachment(null);
    try {
      const items = await loadMessages(conversationId);
      setMessages(items);
      setHasOlder(items.length >= 50);
      scrollToBottom("auto");
      await markRead(conversationId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load messages.");
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (!selectedId) return;
    void selectConversation(selectedId);
    // Only run when the selected conversation changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadConversations();
    }, 20000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let closed = false;
    let retry: number | null = null;
    let ping: number | null = null;
    let socket: WebSocket | null = null;

    const connect = () => {
      if (closed) return;
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(
        `${protocol}://${window.location.host}/api/realtime?conversationId=${encodeURIComponent(
          selectedId,
        )}`,
      );
      socketRef.current = socket;
      socket.onopen = () => {
        ping = window.setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };
      socket.onmessage = (event) => {
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(event.data as string) as Record<string, unknown>;
        } catch {
          return;
        }
        if (payload.type === "ready" && Array.isArray(payload.online)) {
          setOnlineIds(payload.online.filter((id): id is string => typeof id === "string"));
        }
        if (payload.type === "presence" && typeof payload.userId === "string") {
          setOnlineIds((current) => {
            const next = new Set(current);
            if (payload.online) next.add(payload.userId as string);
            else next.delete(payload.userId as string);
            return [...next];
          });
        }
        if (payload.type === "typing" && typeof payload.name === "string") {
          setTypingName(payload.name);
          window.setTimeout(() => setTypingName(null), 3500);
        }
        if (payload.type === "message" && payload.message) {
          const message = payload.message as Message;
          if (message.conversationId !== selectedId) return;
          setMessages((current) => mergeMessages(current, [message]));
          if (message.senderId !== currentUserId) {
            void markRead(selectedId);
            scrollToBottom();
          }
          void loadConversations();
        }
        if (payload.type === "message_deleted" && typeof payload.messageId === "string") {
          setMessages((current) =>
            current.map((message) =>
              message.id === payload.messageId
                ? {
                    ...message,
                    body: "",
                    attachmentUrl: null,
                    attachmentName: null,
                    deletedAt: new Date().toISOString(),
                  }
                : message,
            ),
          );
        }
      };
      socket.onclose = () => {
        if (ping) window.clearInterval(ping);
        socketRef.current = null;
        if (!closed) retry = window.setTimeout(connect, 3500);
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    const poll = window.setInterval(async () => {
      try {
        const latest = await loadMessages(selectedId);
        setMessages((current) => mergeMessages(current, latest));
      } catch {
        /* Polling is a fallback; the next attempt may succeed. */
      }
    }, 15000);

    return () => {
      closed = true;
      if (retry) window.clearTimeout(retry);
      if (ping) window.clearInterval(ping);
      window.clearInterval(poll);
      socket?.close();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function loadOlder() {
    const first = messages[0];
    const before = asDate(first?.createdAt)?.toISOString();
    if (!selectedId || !before) return;
    setOlderLoading(true);
    try {
      const older = await loadMessages(selectedId, before);
      setMessages((current) => mergeMessages(older, current));
      setHasOlder(older.length >= 50);
    } catch {
      setError("Could not load older messages.");
    } finally {
      setOlderLoading(false);
    }
  }

  async function uploadAttachment(file: File) {
    setError(null);
    setUploading(true);
    try {
      const upload =
        file.type.startsWith("image/")
          ? await compressImageSafe(file, {
              maxDimension: 1600,
              maxBytes: 1.5 * 1024 * 1024,
            })
          : file;
      const data = new FormData();
      data.append("file", upload);
      const response = await fetchWithTimeout("/api/chat/upload", {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as AttachmentDraft & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Upload failed.");
      setAttachment(result);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    if (!selectedId || sending || uploading) return;
    const body = draft.trim();
    if (!body && !attachment) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetchWithTimeout(
        `/api/chat/conversations/${selectedId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body,
            replyToId: replyTo?.id ?? null,
            attachmentKey: attachment?.key ?? null,
            attachmentName: attachment?.name ?? null,
            attachmentType: attachment?.type ?? null,
            attachmentSize: attachment?.size ?? null,
          }),
        },
      );
      const result = (await response.json()) as { message?: Message; error?: string };
      if (!response.ok || !result.message) {
        throw new Error(result.error ?? "Message could not be sent.");
      }
      setMessages((current) => mergeMessages(current, [result.message!]));
      setDraft("");
      setReplyTo(null);
      setAttachment(null);
      scrollToBottom();
      void loadConversations();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function startChat(userId: string) {
    setError(null);
    try {
      const response = await fetchWithTimeout("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const result = (await response.json()) as { conversationId?: string; error?: string };
      if (!response.ok || !result.conversationId) {
        throw new Error(result.error ?? "Could not start chat.");
      }
      await loadConversations();
      setShowContacts(false);
      setSelectedId(result.conversationId);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Could not start chat.");
    }
  }

  async function deleteMessage(message: Message) {
    if (!selectedId) return;
    try {
      const response = await fetchWithTimeout(
        `/api/chat/conversations/${selectedId}/messages/${message.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Could not delete message.");
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, body: "", attachmentUrl: null, deletedAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete message.");
    }
  }

  async function reportMessage(message: Message) {
    if (!selectedId) return;
    const reason = window.prompt("Why are you reporting this message?");
    if (!reason?.trim()) return;
    try {
      const response = await fetchWithTimeout(
        `/api/chat/conversations/${selectedId}/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: message.id, reason: reason.trim() }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not report message.");
      setError(null);
      window.alert("Thank you. The church team has been notified.");
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "Could not report message.");
    }
  }

  const online = selected?.otherUser
    ? onlineIds.includes(selected.otherUser.id)
    : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            The family
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Messages</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
            Chat privately with members and stay connected with your department.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowContacts((value) => !value)}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          New message
        </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="grid min-h-[60vh] gap-3 lg:grid-cols-[340px_1fr]">
        <section
          className={cn(
            "surface flex min-h-0 flex-col overflow-hidden",
            selectedId && "hidden lg:flex",
          )}
        >
          <div className="border-b border-brand-100 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
              Conversations
            </p>
          </div>
          {showContacts ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-brand-100 p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
                  <Input
                    value={contactSearch}
                    onChange={(event) => setContactSearch(event.target.value)}
                    placeholder="Search members"
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {filteredContacts.length ? (
                  filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => void startChat(contact.id)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-brand-50 active:scale-[0.99]"
                    >
                      <Avatar
                        name={contact.name}
                        src={avatarUrl(contact.avatarKey)}
                        size="sm"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {contact.name}
                        </span>
                        <span className="block truncate text-xs text-charcoal/50">
                          {contact.departmentName ?? contact.occupation ?? "Member"}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="p-4 text-sm text-charcoal/50">No members found.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {conversations.length ? (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => void selectConversation(conversation.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                      conversation.id === selectedId
                        ? "bg-brand-700 text-cream"
                        : "hover:bg-brand-50",
                    )}
                  >
                    <Avatar
                      name={conversation.title}
                      src={
                        conversation.otherUser?.avatarUrl ??
                        avatarUrl(conversation.otherUser?.avatarKey ?? null)
                      }
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {conversation.title}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[10px]",
                            conversation.id === selectedId
                              ? "text-cream/65"
                              : "text-charcoal/40",
                          )}
                        >
                          {timeLabel(conversation.lastMessageAt)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 flex items-center gap-1 truncate text-xs",
                          conversation.id === selectedId
                            ? "text-cream/75"
                            : "text-charcoal/55",
                        )}
                      >
                        {conversation.lastSenderName
                          ? `${conversation.lastSenderName.split(" ")[0]}: `
                          : ""}
                        {conversation.lastMessage ?? "No messages yet"}
                      </span>
                    </span>
                    {conversation.unreadCount > 0 ? (
                      <span className="mt-1 rounded-full bg-gold-300 px-2 py-0.5 text-[10px] font-bold text-charcoal">
                        {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                      </span>
                    ) : null}
                  </button>
                ))
              ) : (
                <div className="p-4">
                  <EmptyState
                    icon={<MessageCircle className="h-6 w-6" aria-hidden="true" />}
                    title="No conversations yet"
                    description="Choose a member to start a private conversation."
                    action={
                      <Button size="sm" onClick={() => setShowContacts(true)}>
                        Find a member
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          )}
        </section>

        <section
          className={cn(
            "surface flex min-h-[60vh] flex-col overflow-hidden",
            !selectedId && "hidden lg:flex",
          )}
        >
          {selected ? (
            <>
              <header className="flex items-center gap-3 border-b border-brand-100 px-3 py-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-charcoal/60 hover:bg-brand-50 lg:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar
                  name={selected.title}
                  src={
                    selected.otherUser?.avatarUrl ??
                    avatarUrl(selected.otherUser?.avatarKey ?? null)
                  }
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-serif text-lg font-semibold">
                    {selected.title}
                  </h2>
                  <p className="flex items-center gap-1.5 text-xs text-charcoal/50">
                    {selected.type === "department" ? "Department group" : "Direct message"}
                    {selected.otherUser ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className={online ? "text-emerald-700" : undefined}>
                          {online ? "Online" : "Offline"}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
              </header>

              <div
                ref={scrollRef}
                className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-cream/50 px-3 py-4"
              >
                {hasOlder ? (
                  <div className="pb-2 text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={olderLoading}
                      onClick={() => void loadOlder()}
                    >
                      Load older messages
                    </Button>
                  </div>
                ) : null}
                {loadingMessages ? (
                  <p className="py-10 text-center text-sm text-charcoal/50">
                    Loading messages...
                  </p>
                ) : messages.length ? (
                  messages.map((message) => {
                    const mine = message.senderId === currentUserId;
                    const replied = message.replyToId
                      ? messages.find((item) => item.id === message.replyToId)
                      : null;
                    return (
                      <div
                        key={message.id}
                        className={cn("group flex gap-2", mine && "justify-end")}
                      >
                        {!mine ? (
                          <Avatar
                            name={message.senderName}
                            src={message.senderAvatarUrl}
                            size="sm"
                            className="mt-auto h-7 w-7 text-[10px]"
                          />
                        ) : null}
                        <div className={cn("max-w-[82%] sm:max-w-[70%]", mine && "text-right")}>
                          {!mine && selected.type === "department" ? (
                            <p className="mb-0.5 text-[11px] font-semibold text-brand-800">
                              {message.senderName}
                            </p>
                          ) : null}
                          <div
                            className={cn(
                              "rounded-2xl px-3.5 py-2 text-left text-sm leading-6 shadow-sm",
                              mine
                                ? "bg-brand-700 text-cream"
                                : "border border-brand-100 bg-white text-charcoal",
                            )}
                          >
                            {replied ? (
                              <p
                                className={cn(
                                  "mb-1 border-l-2 pl-2 text-xs",
                                  mine
                                    ? "border-cream/40 text-cream/70"
                                    : "border-brand-300 text-charcoal/50",
                                )}
                              >
                                {replied.senderName}: {replied.body.slice(0, 80)}
                              </p>
                            ) : null}
                            {message.deletedAt ? (
                              <p className="italic opacity-60">Message deleted</p>
                            ) : (
                              <>
                                {message.body ? (
                                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                                ) : null}
                                {message.attachmentUrl ? (
                                  <a
                                    href={message.attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 flex items-center gap-2 overflow-hidden rounded-xl"
                                  >
                                    {message.attachmentType?.startsWith(
                                      "image/",
                                    ) ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={message.attachmentUrl}
                                        alt={message.attachmentName ?? "Attachment"}
                                        className="max-h-72 w-full object-cover"
                                      />
                                    ) : (
                                      <>
                                        <Paperclip className="h-4 w-4 shrink-0" />
                                        <span className="truncate text-xs underline">
                                          {message.attachmentName ?? "Attachment"}
                                        </span>
                                      </>
                                    )}
                                  </a>
                                ) : null}
                              </>
                            )}
                          </div>
                          <div
                            className={cn(
                              "mt-0.5 flex items-center gap-2 text-[10px] text-charcoal/40",
                              mine && "justify-end",
                            )}
                          >
                            <span>{timeLabel(message.createdAt)}</span>
                            {mine ? <CheckCheck className="h-3 w-3" aria-hidden="true" /> : null}
                            {!message.deletedAt ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setReplyTo(message)}
                                  className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 hover:bg-brand-50 hover:text-brand-800"
                                >
                                  <Reply className="h-3 w-3" /> Reply
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void reportMessage(message)}
                                  className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 hover:bg-brand-50 hover:text-brand-800"
                                >
                                  <Flag className="h-3 w-3" /> Report
                                </button>
                                {mine ? (
                                  <button
                                    type="button"
                                    onClick={() => void deleteMessage(message)}
                                    className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" /> Delete
                                  </button>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-sm text-charcoal/50">
                    No messages yet. Say hello.
                  </div>
                )}
                {typingName ? (
                  <p className="pl-9 text-xs italic text-charcoal/45">{typingName} is typing...</p>
                ) : null}
              </div>

              <div className="border-t border-brand-100 bg-white p-3">
                {replyTo ? (
                  <div className="mb-2 flex items-start justify-between gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs text-charcoal/65">
                    <span className="min-w-0">
                      <span className="font-semibold">Replying to {replyTo.senderName}: </span>
                      <span className="line-clamp-1">{replyTo.body || "Attachment"}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      aria-label="Cancel reply"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                {attachment ? (
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-brand-100 px-2 py-1.5 text-xs">
                    <span className="flex min-w-0 items-center gap-2">
                      {attachment.type.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={attachment.url}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
                          <Paperclip className="h-4 w-4" />
                        </span>
                      )}
                      <span className="truncate">{attachment.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      aria-label="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                <div className="flex items-end gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/zip"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadAttachment(file);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-200 text-brand-800 disabled:opacity-50"
                    aria-label="Attach a file"
                  >
                    {uploading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Paperclip className="h-5 w-5" />
                    )}
                  </button>
                  <Textarea
                    value={draft}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      if (socketRef.current?.readyState === WebSocket.OPEN) {
                        socketRef.current.send(
                          JSON.stringify({ type: "typing", name: currentUserName }),
                        );
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void send();
                      }
                    }}
                    placeholder="Write a message..."
                    rows={1}
                    maxLength={4000}
                    className="max-h-32 min-h-11 flex-1 resize-none py-2.5"
                  />
                  <Button
                    size="icon"
                    onClick={() => void send()}
                    loading={sending}
                    disabled={!draft.trim() && !attachment}
                    aria-label="Send message"
                  >
                    {!sending ? <Send className="h-4 w-4" /> : null}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <EmptyState
                icon={<MessageCircle className="h-6 w-6" aria-hidden="true" />}
                title="Select a conversation"
                description="Choose a member or department to start chatting."
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
