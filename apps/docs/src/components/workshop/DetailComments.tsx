import React, { useEffect, useState } from "react";
import { IconCheck, IconEdit, IconSend, IconTrash, IconX } from "@tabler/icons-react";

import type { WorkshopComment } from "@site/src/lib/pocketbase";
import { getPocketBase } from "@site/src/lib/pocketbase";
import { errorMessage } from "@site/src/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { formatRelativeTime } from "./format";

const commentAuthorName = (comment: WorkshopComment) =>
  comment.expand?.author?.name || comment.expand?.author?.username || "unknown";

interface CommentsSectionProps {
  submissionId: string;
  pb: ReturnType<typeof getPocketBase>;
  currentUserId?: string;
  onRequireAuth: (action: string) => Promise<string | null>;
  onError: (message: string) => void;
}

export const CommentsSection = ({ submissionId, pb, currentUserId, onRequireAuth, onError }: CommentsSectionProps) => {
  const [rows, setRows] = useState<WorkshopComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(false);
    pb.collection("comments")
      .getFullList<WorkshopComment>({
        filter: pb.filter("submission = {:id}", { id: submissionId }),
        sort: "-created",
        expand: "author",
      })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pb, submissionId]);

  const handleAdd = async () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    const userId = await onRequireAuth("comment");
    if (!userId) return;
    try {
      const created = await pb
        .collection("comments")
        .create<WorkshopComment>({ submission: submissionId, content: trimmed, author: userId }, { expand: "author" });
      setRows((prev) => [created, ...prev]);
      setNewComment("");
    } catch (caught) {
      onError(errorMessage(caught, "Failed to post comment"));
    }
  };

  const handleUpdate = async (id: string) => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    try {
      const updated = await pb
        .collection("comments")
        .update<WorkshopComment>(id, { content: trimmed }, { expand: "author" });
      setRows((prev) => prev.map((comment) => (comment.id === id ? updated : comment)));
      setEditingId(null);
    } catch (caught) {
      onError(errorMessage(caught, "Failed to update comment"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await pb.collection("comments").delete(id);
      setRows((prev) => prev.filter((comment) => comment.id !== id));
    } catch (caught) {
      onError(errorMessage(caught, "Failed to delete comment"));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">Comments</h2>
      <div className="flex items-center gap-2">
        <Input
          className="flex-1"
          placeholder="Write a comment…"
          aria-label="Write a comment"
          value={newComment}
          onChange={(event) => setNewComment(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleAdd();
          }}
        />
        <Button size="icon-sm" onClick={() => void handleAdd()} aria-label="Post comment">
          <IconSend size={14} />
        </Button>
      </div>

      {loading && <p className="py-4 text-center text-sm text-muted-foreground">Loading comments…</p>}
      {!loading && fetchError && <p className="py-4 text-center text-sm text-destructive">Failed to load comments</p>}
      {!loading && !fetchError && rows.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">No comments yet</p>
      )}

      <div className="space-y-2">
        {rows.map((comment) => {
          const isOwner = currentUserId === comment.author;
          const isEditing = editingId === comment.id;
          return (
            <div key={comment.id} className="rounded-lg bg-muted/30 px-3 py-2 dark:bg-input/20">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">{commentAuthorName(comment)}</span>
                <span className="text-muted-foreground/60">{formatRelativeTime(comment.created)}</span>
                {isOwner && !isEditing && (
                  <div className="ml-auto flex gap-0.5">
                    <button
                      className="rounded p-1 hover:bg-accent"
                      aria-label="Edit comment"
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditContent(comment.content);
                      }}
                    >
                      <IconEdit size={12} />
                    </button>
                    <button
                      className="rounded p-1 hover:bg-destructive/20 hover:text-destructive"
                      aria-label="Delete comment"
                      onClick={() => void handleDelete(comment.id)}
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="mt-2 flex items-center gap-1">
                  <Input
                    className="flex-1"
                    aria-label="Edit comment"
                    value={editContent}
                    onChange={(event) => setEditContent(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleUpdate(comment.id);
                    }}
                  />
                  <Button size="icon-sm" aria-label="Save comment" onClick={() => void handleUpdate(comment.id)}>
                    <IconCheck size={12} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Cancel editing" onClick={() => setEditingId(null)}>
                    <IconX size={12} />
                  </Button>
                </div>
              ) : (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{comment.content}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
