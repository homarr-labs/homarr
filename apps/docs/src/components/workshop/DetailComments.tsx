import React, { useCallback, useEffect, useState } from "react";
import { IconCheck, IconEdit, IconMessageCircle, IconRefresh, IconSend, IconTrash, IconX } from "@tabler/icons-react";

import type { WorkshopComment } from "@site/src/lib/pocketbase";
import { getWorkshopBackend } from "@site/src/lib/pocketbase";
import { githubAvatarUrl, githubProfileUrl } from "@homarr/workshop/schema";
import type { WorkshopUser } from "@homarr/workshop/schema";
import { errorMessage } from "@site/src/lib/utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { formatRelativeTime } from "./format";

interface CommentsSectionProps {
  submissionId: string;
  backend: ReturnType<typeof getWorkshopBackend>;
  currentUser: WorkshopUser | null;
  onRequireAuth: (action: string) => Promise<string | null>;
}

const avatarFallback = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

export const CommentsSection = ({ submissionId, backend, currentUser, onRequireAuth }: CommentsSectionProps) => {
  const [rows, setRows] = useState<WorkshopComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      setRows(await backend.listComments(submissionId));
    } catch (caught) {
      const message = errorMessage(caught, "Failed to load comments");
      setFetchError(
        /collection context/iu.test(message)
          ? "Comments are unavailable because this Workshop database has not applied the current comments migration."
          : message,
      );
    } finally {
      setLoading(false);
    }
  }, [backend, submissionId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments, reloadKey]);

  const handleAdd = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || !(await onRequireAuth("comment"))) return;
    try {
      setMutationError(null);
      const created = await backend.createComment(submissionId, trimmed);
      setRows((previous) => [...previous, created]);
      setNewComment("");
    } catch (caught) {
      setMutationError(errorMessage(caught, "Failed to post comment"));
    }
  };

  const handleUpdate = async (id: string) => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    try {
      setMutationError(null);
      const updated = await backend.updateComment(id, trimmed);
      setRows((previous) => previous.map((comment) => (comment.id === id ? updated : comment)));
      setEditingId(null);
    } catch (caught) {
      setMutationError(errorMessage(caught, "Failed to update comment"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setMutationError(null);
      await backend.deleteComment(id);
      setRows((previous) => previous.filter((comment) => comment.id !== id));
      setConfirmDeleteId(null);
    } catch (caught) {
      setMutationError(errorMessage(caught, "Failed to delete comment"));
    }
  };

  return (
    <section aria-labelledby="workshop-comments-heading" className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <IconMessageCircle size={18} className="text-muted-foreground" />
            <h2 id="workshop-comments-heading" className="text-lg font-semibold">
              Discussion
            </h2>
            {!loading && <Badge variant="secondary">{rows.length}</Badge>}
          </div>
          <p className="m-0 mt-1 text-sm text-muted-foreground">Questions, fixes, and feedback from the community.</p>
        </div>
      </div>

      {loading && (
        <div className="space-y-4" aria-label="Loading comments">
          <div className="h-20 w-3/4 animate-pulse rounded-xl bg-muted" />
          <div className="ml-auto h-20 w-2/3 animate-pulse rounded-xl bg-primary/10" />
        </div>
      )}

      {!loading && fetchError && (
        <Alert variant="destructive">
          <IconMessageCircle />
          <AlertTitle>Comments could not be loaded</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="col-start-2 mt-2 w-fit text-destructive hover:bg-destructive/10"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            <IconRefresh size={14} /> Retry comments
          </Button>
        </Alert>
      )}

      {!loading && !fetchError && rows.length === 0 && (
        <div className="rounded-xl bg-muted/40 px-4 py-8 text-center">
          <IconMessageCircle size={24} className="mx-auto text-muted-foreground" />
          <p className="m-0 mt-2 text-sm font-medium">Start the discussion</p>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Share a question or something you learned using this submission.
          </p>
        </div>
      )}

      {!loading && !fetchError && rows.length > 0 && (
        <div className="space-y-4">
          {rows.map((comment) => {
            const ownComment = currentUser?.id === comment.author;
            const canDelete = ownComment || currentUser?.isAdmin === true;
            const isEditing = editingId === comment.id;
            const edited = comment.updated !== comment.created;
            const authorGithubUsername = ownComment
              ? (currentUser?.githubUsername ?? comment.authorGithubUsername)
              : comment.authorGithubUsername;
            const authorName = authorGithubUsername || "Community member";
            const avatarUrl = githubAvatarUrl(authorGithubUsername);
            const profileUrl = githubProfileUrl(authorGithubUsername);

            return (
              <article
                key={comment.id}
                className={ownComment ? "ml-auto w-full max-w-[44rem]" : "w-full max-w-[44rem]"}
              >
                <div className={ownComment ? "flex flex-row-reverse items-start gap-3" : "flex items-start gap-3"}>
                  <a
                    href={profileUrl || undefined}
                    target={profileUrl ? "_blank" : undefined}
                    rel="noreferrer"
                    aria-label={profileUrl ? `Open ${authorName}'s GitHub profile` : undefined}
                    className="mt-0.5 shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Avatar className="size-9 ring-1 ring-border">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                      <AvatarFallback>{avatarFallback(authorName)}</AvatarFallback>
                    </Avatar>
                  </a>

                  <div className={ownComment ? "flex min-w-0 flex-1 flex-col items-end" : "min-w-0 flex-1"}>
                    <div
                      className={
                        ownComment
                          ? "mb-1.5 flex flex-wrap items-center justify-end gap-x-2 px-1"
                          : "mb-1.5 flex flex-wrap items-center gap-x-2 px-1"
                      }
                    >
                      <a
                        href={profileUrl || undefined}
                        target={profileUrl ? "_blank" : undefined}
                        rel="noreferrer"
                        className="truncate text-sm font-semibold text-primary hover:underline"
                      >
                        {authorName}
                      </a>
                      {ownComment && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[0.6875rem]">
                          You
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(comment.created)}
                        {edited && " · edited"}
                      </span>
                    </div>

                    <div
                      className={
                        ownComment
                          ? "w-fit max-w-full rounded-xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-primary-foreground"
                          : "w-fit max-w-full rounded-xl rounded-tl-sm border border-border/70 bg-muted/60 px-3.5 py-2.5 text-foreground"
                      }
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            className="min-w-48 bg-background text-foreground"
                            aria-label="Edit comment"
                            value={editContent}
                            onChange={(event) => setEditContent(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") void handleUpdate(comment.id);
                            }}
                          />
                          <Button
                            size="icon-sm"
                            variant="secondary"
                            aria-label="Save comment"
                            onClick={() => void handleUpdate(comment.id)}
                          >
                            <IconCheck size={12} />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Cancel editing"
                            onClick={() => setEditingId(null)}
                          >
                            <IconX size={12} />
                          </Button>
                        </div>
                      ) : (
                        <p className="m-0 break-words whitespace-pre-wrap text-[0.9375rem] leading-6">
                          {comment.content}
                        </p>
                      )}
                    </div>

                    {(ownComment || canDelete) && !isEditing && (
                      <div className={ownComment ? "mt-1 flex justify-end gap-1" : "mt-1 flex gap-1"}>
                        {ownComment && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-muted-foreground"
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditContent(comment.content);
                            }}
                          >
                            <IconEdit /> Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setConfirmDeleteId(comment.id)}
                          >
                            <IconTrash /> Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-3">
        <div className="flex items-start gap-2.5">
          <Avatar className="mt-0.5 size-9 bg-background ring-1 ring-border">
            {currentUser?.githubUsername && <AvatarImage src={githubAvatarUrl(currentUser.githubUsername)} alt="" />}
            <AvatarFallback className="bg-background">
              {avatarFallback(currentUser?.githubUsername ?? "Guest")}
            </AvatarFallback>
          </Avatar>
          <Textarea
            className="min-h-16 flex-1 resize-none bg-background"
            placeholder={currentUser ? "Add to the discussion…" : "Write a comment, you will be asked to sign in…"}
            aria-label="Write a comment"
            value={newComment}
            maxLength={2000}
            onChange={(event) => setNewComment(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void handleAdd();
            }}
          />
          <Button
            size="icon-lg"
            className="self-end"
            disabled={!newComment.trim()}
            onClick={() => void handleAdd()}
            aria-label="Post comment"
          >
            <IconSend size={15} />
          </Button>
        </div>
        <p className="m-0 mt-2 pl-12 text-xs text-muted-foreground">Press Ctrl or ⌘ + Enter to post.</p>
        {mutationError && (
          <Alert variant="destructive" className="mt-3">
            <IconMessageCircle />
            <AlertTitle>Comment was not saved</AlertTitle>
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        )}
      </div>

      <AlertDialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmDeleteId) void handleDelete(confirmDeleteId);
              }}
            >
              Delete comment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
