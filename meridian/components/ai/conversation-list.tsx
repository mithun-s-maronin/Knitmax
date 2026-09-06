"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteConversation, renameConversation } from "@/lib/actions/conversations";
import { formatDate } from "@/lib/format";
import type { AiConversationRow } from "@/types/database";

/** Saved conversations: open, rename, delete (§26, §71). */
export function ConversationList({
  conversations,
  activeId,
}: {
  conversations: AiConversationRow[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = React.useState<AiConversationRow | null>(null);
  const [deleting, setDeleting] = React.useState<AiConversationRow | null>(null);
  const [title, setTitle] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const submitRename = () => {
    if (!renaming || !title.trim()) return;
    startTransition(async () => {
      const result = await renameConversation({ id: renaming.id, title: title.trim() });
      if (result.ok) {
        toast.success("Renamed.");
        setRenaming(null);
      } else {
        toast.error(result.error ?? "That did not save.");
      }
    });
  };

  const submitDelete = () => {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteConversation(deleting.id);
      if (result.ok) {
        toast.success("Conversation deleted.");
        if (activeId === deleting.id) router.replace("/dashboard/ai");
        setDeleting(null);
      } else {
        toast.error(result.error ?? "We could not delete that.");
      }
    });
  };

  return (
    <div className="flex h-full flex-col">
      <Button asChild variant="outline" className="w-full justify-start">
        <Link href="/dashboard/ai">
          <Plus className="size-4" />
          New conversation
        </Link>
      </Button>

      {conversations.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground text-pretty">
          Your conversations are saved here, so you can pick one back up later.
        </p>
      ) : (
        <ul className="mt-4 flex-1 space-y-0.5 overflow-y-auto">
          {conversations.map((conversation) => {
            const active = conversation.id === activeId;
            return (
              <li key={conversation.id} className="group relative">
                <Link
                  href={`/dashboard/ai?c=${conversation.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg py-2 pl-3 pr-9 text-sm transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/60",
                  )}
                >
                  <MessageSquare className="mt-0.5 size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{conversation.title}</span>
                    <span className="mt-0.5 block text-[0.6875rem] text-muted-foreground">
                      {formatDate(conversation.updated_at)}
                    </span>
                  </span>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-1 top-1.5 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                      aria-label={`Actions for ${conversation.title}`}
                    >
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        setTitle(conversation.title);
                        setRenaming(conversation);
                      }}
                    >
                      <Pencil className="size-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeleting(conversation)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="conversation-title">Title</Label>
            <Input
              id="conversation-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitRename();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submitRename} loading={pending} disabled={!title.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the conversation and every message in it, permanently.
              Nothing about your score or financial data is affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                submitDelete();
              }}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? "Deleting" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
