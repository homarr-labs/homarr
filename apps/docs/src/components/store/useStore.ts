import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { StoreComment, StoreSubmission, StoreVote } from "@site/src/lib/pocketbase";
import { getPocketBase } from "@site/src/lib/pocketbase";
import type { SubmissionType } from "@site/src/lib/store-schema";
import { schemaVersionByType, validateSubmissionContent } from "@site/src/lib/store-schema";
import { errorMessage } from "@/lib/utils";

export type SortKey = "top" | "new";
export type TypeFilter = "all" | "yours" | SubmissionType;

export interface SubmitInput {
  type: SubmissionType;
  title: string;
  description: string;
  content: string;
  screenshots: File[];
}

export interface CommentActions {
  fetch: (submissionId: string) => Promise<StoreComment[]>;
  add: (submissionId: string, content: string) => Promise<StoreComment | null>;
  update: (commentId: string, content: string) => Promise<StoreComment | null>;
  delete: (commentId: string) => Promise<boolean>;
}

const sorters: Record<SortKey, (a: StoreSubmission, b: StoreSubmission) => number> = {
  top: (a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes),
  new: (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
};

export const useStore = (storeUrl: string) => {
  const pb = useMemo(() => getPocketBase(storeUrl), [storeUrl]);
  const [submissions, setSubmissions] = useState<StoreSubmission[]>([]);
  const [votes, setVotes] = useState<Record<string, StoreVote>>({});
  const [user, setUser] = useState(pb.authStore.record);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const votingIds = useRef(new Set<string>());

  const refreshVotes = useCallback(async () => {
    if (!pb.authStore.isValid || !pb.authStore.record) {
      setVotes({});
      return;
    }
    const rows = await pb.collection("votes").getFullList<StoreVote>({
      filter: pb.filter("user = {:id}", { id: pb.authStore.record.id }),
    });
    setVotes(Object.fromEntries(rows.map((row) => [row.submission, row])));
  }, [pb]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSubmissions(
        await pb.collection("marketplace").getFullList<StoreSubmission>({ sort: "-created" }),
      );
      await refreshVotes();
    } catch (caught) {
      setError(errorMessage(caught, "Failed to load the marketplace"));
    } finally {
      setLoading(false);
    }
  }, [pb, refreshVotes]);

  useEffect(() => {
    if (pb.authStore.isValid)
      pb.collection("users")
        .authRefresh()
        .catch(() => pb.authStore.clear());
    void refresh();
    return pb.authStore.onChange(() => {
      setUser(pb.authStore.record);
      if (!pb.authStore.isValid) setVotes({});
    });
  }, [pb, refresh]);

  const ensureAuth = useCallback(async () => {
    if (pb.authStore.isValid) {
      try {
        await pb.collection("users").authRefresh();
        return true;
      } catch {
        pb.authStore.clear();
      }
    }
    await pb.collection("users").authWithOAuth2({ provider: "github" });
    await refreshVotes();
    return pb.authStore.isValid;
  }, [pb, refreshVotes]);

  const requireUserId = useCallback(
    async (action: string) => {
      if (!(await ensureAuth())) {
        setError(`Sign in to ${action}`);
        return null;
      }
      const userId = pb.authStore.record?.id;
      if (!userId) {
        setError(`Sign in to ${action}`);
        return null;
      }
      return userId;
    },
    [pb, ensureAuth],
  );

  const login = useCallback(async () => {
    try {
      await ensureAuth();
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught, "Sign in failed"));
    }
  }, [ensureAuth]);

  const voteDelta = (prev: 1 | -1 | undefined, next: 1 | -1): [up: number, down: number] => {
    if (!prev) return next === 1 ? [1, 0] : [0, 1];
    if (prev === next) return next === 1 ? [-1, 0] : [0, -1];
    return next === 1 ? [1, -1] : [-1, 1];
  };

  const vote = useCallback(
    async (submissionId: string, value: 1 | -1) => {
      if (votingIds.current.has(submissionId)) return;
      votingIds.current.add(submissionId);

      const userId = await requireUserId("vote");
      if (!userId) {
        votingIds.current.delete(submissionId);
        return;
      }

      const prev = votes[submissionId];
      const isToggleOff = prev?.value === value;
      const [upD, downD] = voteDelta(prev?.value, value);

      // Optimistic update — instant UI feedback
      setVotes((v) => {
        const next = { ...v };
        if (isToggleOff) delete next[submissionId];
        else
          next[submissionId] = {
            ...(prev ?? { id: "", submission: submissionId, user: userId, created: "", updated: "" }),
            value,
          } as StoreVote;
        return next;
      });
      setSubmissions((s) =>
        s.map((sub) =>
          sub.id === submissionId ? { ...sub, upvotes: sub.upvotes + upD, downvotes: sub.downvotes + downD } : sub,
        ),
      );

      // Server validates in background
      try {
        const existing = prev?.id ? prev : undefined;
        if (!existing) {
          await pb.collection("votes").create({ submission: submissionId, value, user: userId });
        } else if (isToggleOff) {
          try {
            await pb.collection("votes").delete(existing.id);
          } catch {
            // Already deleted server-side — fine
          }
        } else {
          try {
            await pb.collection("votes").update(existing.id, { value });
          } catch {
            // Record gone server-side — recreate
            await pb.collection("votes").create({ submission: submissionId, value, user: userId });
          }
        }
      } catch (caught) {
        // Revert optimistic state
        setVotes((v) => {
          const next = { ...v };
          if (prev) next[submissionId] = prev;
          else delete next[submissionId];
          return next;
        });
        setSubmissions((s) =>
          s.map((sub) =>
            sub.id === submissionId ? { ...sub, upvotes: sub.upvotes - upD, downvotes: sub.downvotes - downD } : sub,
          ),
        );
        setError(errorMessage(caught, "Failed to register your vote"));
      } finally {
        votingIds.current.delete(submissionId);
      }
    },
    [pb, votes, requireUserId],
  );

  const report = useCallback(
    async (submissionId: string, reason: string) => {
      try {
        const userId = await requireUserId("report");
        if (!userId) return;
        await pb.collection("reports").create({ submission: submissionId, reason, user: userId });
      } catch (caught) {
        setError(errorMessage(caught, "Failed to submit your report"));
      }
    },
    [pb, requireUserId],
  );

  const deleteSubmission = useCallback(
    async (submissionId: string) => {
      try {
        await pb.collection("submissions").delete(submissionId);
        setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
        return true;
      } catch (caught) {
        setError(errorMessage(caught, "Failed to delete submission"));
        return false;
      }
    },
    [pb],
  );

  const submit = useCallback(
    async (input: SubmitInput): Promise<boolean> => {
      const validation = validateSubmissionContent(input.type, input.content);
      if (!validation.success) throw new Error(validation.error);
      if (!(await ensureAuth())) throw new Error("Sign in required to submit");
      const userId = pb.authStore.record?.id;
      if (!userId) throw new Error("Sign in required to submit");

      const data = new FormData();
      data.set("type", input.type);
      data.set("title", input.title);
      data.set("description", input.description);
      data.set("schemaVersion", schemaVersionByType[input.type]);
      data.set("content", input.content);
      data.set("author", userId);
      for (const file of input.screenshots) data.append("screenshots", file);
      await pb.collection("submissions").create(data);
      await refresh();
      return true;
    },
    [pb, ensureAuth, refresh],
  );

  const fetchComments = useCallback(
    (submissionId: string) =>
      pb.collection("comments").getFullList<StoreComment>({
        filter: pb.filter("submission = {:id}", { id: submissionId }),
        sort: "-created",
        expand: "author",
      }),
    [pb],
  );

  const addComment = useCallback(
    async (submissionId: string, content: string) => {
      const userId = await requireUserId("comment");
      if (!userId) return null;
      try {
        return await pb
          .collection("comments")
          .create<StoreComment>({ submission: submissionId, content, author: userId }, { expand: "author" });
      } catch (caught) {
        setError(errorMessage(caught, "Failed to post comment"));
        return null;
      }
    },
    [pb, requireUserId],
  );

  const updateComment = useCallback(
    async (commentId: string, content: string) => {
      try {
        return await pb.collection("comments").update<StoreComment>(commentId, { content }, { expand: "author" });
      } catch (caught) {
        setError(errorMessage(caught, "Failed to update comment"));
        return null;
      }
    },
    [pb],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      try {
        await pb.collection("comments").delete(commentId);
        return true;
      } catch (caught) {
        setError(errorMessage(caught, "Failed to delete comment"));
        return false;
      }
    },
    [pb],
  );

  const logout = useCallback(() => pb.authStore.clear(), [pb]);

  const comments = useMemo<CommentActions>(
    () => ({
      fetch: fetchComments,
      add: addComment,
      update: updateComment,
      delete: deleteComment,
    }),
    [fetchComments, addComment, updateComment, deleteComment],
  );

  return {
    pb,
    submissions,
    votes,
    user,
    loading,
    error,
    sorters,
    comments,
    refresh,
    login,
    logout,
    vote,
    report,
    submit,
    deleteSubmission,
  };
};
