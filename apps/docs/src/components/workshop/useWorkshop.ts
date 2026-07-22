import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";

import type { WorkshopComment, WorkshopSubmission, WorkshopVote } from "@site/src/lib/pocketbase";
import { getWorkshopBackend } from "@site/src/lib/pocketbase";
import type { SubmissionType } from "@site/src/lib/workshop-schema";
import { validateSubmissionContent } from "@site/src/lib/workshop-schema";
import { errorMessage, oauthErrorMessage } from "@site/src/lib/utils";

import { voteDelta } from "./workshop-utils";

export type SortKey = "top" | "new" | "recent" | "discussed";
export type TypeFilter = "all" | "yours" | SubmissionType;

export interface SubmitInput {
  type: SubmissionType;
  title: string;
  description: string;
  changelog: string;
  content: string;
  screenshots: File[];
}

export interface CommentActions {
  fetch: (submissionId: string) => Promise<WorkshopComment[]>;
  add: (submissionId: string, content: string) => Promise<WorkshopComment | null>;
  update: (commentId: string, content: string) => Promise<WorkshopComment | null>;
  delete: (commentId: string) => Promise<boolean>;
}

const sorters: Record<SortKey, (a: WorkshopSubmission, b: WorkshopSubmission) => number> = {
  top: (a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes),
  new: (a, b) => dayjs(b.created).valueOf() - dayjs(a.created).valueOf(),
  recent: (a, b) => dayjs(b.updated).valueOf() - dayjs(a.updated).valueOf(),
  discussed: (a, b) => b.commentCount - a.commentCount || dayjs(b.created).valueOf() - dayjs(a.created).valueOf(),
};

export const useWorkshop = (workshopUrl: string) => {
  const backend = useMemo(() => getWorkshopBackend(workshopUrl), [workshopUrl]);
  const [submissions, setSubmissions] = useState<WorkshopSubmission[]>([]);
  const [votes, setVotes] = useState<Record<string, WorkshopVote>>({});
  const [user, setUser] = useState(backend.currentUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const votingIds = useRef(new Set<string>());

  const refreshVotes = useCallback(async () => {
    if (!backend.currentUser) {
      setVotes({});
      return;
    }
    const rows = await backend.listVotesForCurrentUser();
    setVotes(Object.fromEntries(rows.map((row) => [row.submission, row])));
  }, [backend]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await backend.listAll({ sort: "newest" });
      setSubmissions(rows.map((submission) => ({ ...submission, content: "" })));
      await refreshVotes();
    } catch (caught) {
      setError(errorMessage(caught, "Failed to load the workshop"));
    } finally {
      setLoading(false);
    }
  }, [backend, refreshVotes]);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = backend.subscribeToAuth((nextUser) => {
      setUser(nextUser);
      if (!nextUser) setVotes({});
    });

    const load = async () => {
      await backend.refreshAuth();
      if (!cancelled) await refresh();
    };

    void load();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [backend, refresh]);

  const ensureAuth = useCallback(async () => {
    if (backend.currentUser) return true;
    await backend.signInWithGitHub();
    await refreshVotes();
    return backend.currentUser !== null;
  }, [backend, refreshVotes]);

  const requireUserId = useCallback(
    async (action: string) => {
      let authenticated = false;
      try {
        authenticated = await ensureAuth();
      } catch (caught) {
        setError(oauthErrorMessage(caught));
        return null;
      }

      if (!authenticated) {
        setError(`Sign in to ${action}`);
        return null;
      }
      const userId = backend.currentUser?.id;
      if (!userId) {
        setError(`Sign in to ${action}`);
        return null;
      }
      return userId;
    },
    [backend, ensureAuth],
  );

  const login = useCallback(async () => {
    try {
      await ensureAuth();
      setError(null);
    } catch (caught) {
      setError(oauthErrorMessage(caught));
    }
  }, [ensureAuth]);

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

      setVotes((v) => {
        const next = { ...v };
        if (isToggleOff) delete next[submissionId];
        else
          next[submissionId] = {
            ...(prev ?? { id: "", submission: submissionId, user: userId, created: "", updated: "" }),
            value,
          } as WorkshopVote;
        return next;
      });
      setSubmissions((s) =>
        s.map((sub) =>
          sub.id === submissionId ? { ...sub, upvotes: sub.upvotes + upD, downvotes: sub.downvotes + downD } : sub,
        ),
      );

      try {
        const saved = await backend.vote(submissionId, value);
        setVotes((current) => {
          const next = { ...current };
          if (saved) next[submissionId] = saved;
          else delete next[submissionId];
          return next;
        });
      } catch (caught) {
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
    [backend, votes, requireUserId],
  );

  const report = useCallback(
    async (
      submissionId: string,
      category: "malicious" | "spam" | "copyright" | "inappropriate" | "other",
      explanation: string,
    ) => {
      try {
        if (!(await requireUserId("report"))) return;
        await backend.report(submissionId, category, explanation);
      } catch (caught) {
        setError(errorMessage(caught, "Failed to submit your report"));
      }
    },
    [backend, requireUserId],
  );

  const deleteSubmission = useCallback(
    async (submissionId: string) => {
      try {
        await backend.delete(submissionId);
        setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
        return true;
      } catch (caught) {
        setError(errorMessage(caught, "Failed to delete submission"));
        return false;
      }
    },
    [backend],
  );

  const submit = useCallback(
    async (input: SubmitInput): Promise<boolean> => {
      const validation = validateSubmissionContent(input.type, input.content);
      if (!validation.success) throw new Error(validation.error);
      if (!(await ensureAuth())) throw new Error("Sign in required to submit");
      await backend.create(
        {
          type: input.type,
          title: input.title,
          description: input.description,
          content: input.content,
          changelog: input.changelog || "Initial publication",
          outdated: false,
        },
        input.screenshots,
      );
      await refresh();
      return true;
    },
    [backend, ensureAuth, refresh],
  );

  const fetchComments = useCallback((submissionId: string) => backend.listComments(submissionId), [backend]);

  const addComment = useCallback(
    async (submissionId: string, content: string) => {
      const userId = await requireUserId("comment");
      if (!userId) return null;
      try {
        return await backend.createComment(submissionId, content);
      } catch (caught) {
        setError(errorMessage(caught, "Failed to post comment"));
        return null;
      }
    },
    [backend, requireUserId],
  );

  const updateComment = useCallback(
    async (commentId: string, content: string) => {
      try {
        return await backend.updateComment(commentId, content);
      } catch (caught) {
        setError(errorMessage(caught, "Failed to update comment"));
        return null;
      }
    },
    [backend],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      try {
        await backend.deleteComment(commentId);
        return true;
      } catch (caught) {
        setError(errorMessage(caught, "Failed to delete comment"));
        return false;
      }
    },
    [backend],
  );

  const logout = useCallback(() => backend.signOut(), [backend]);

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
    backend,
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
