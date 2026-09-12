import { useRef, useState } from "react";

import { clientApi } from "@homarr/api/client";
import { parseCustomWidgetWorkshopOrigin } from "@homarr/custom-widgets/core";
import {
  useWorkshopCreateMutation,
  useWorkshopSubmissionQuery,
  useWorkshopUpdateMutation,
} from "@homarr/workshop/backend";
import type { WorkshopSubmissionInput } from "@homarr/workshop/schema";

import { useWorkshopSession } from "~/components/workshop/workshop-session";
import { getWorkshopApiUrl, getWorkshopWebUrl } from "~/components/workshop/workshop-client";

export function useWorkshopPublication(id: string) {
  const session = useWorkshopSession();
  const utils = clientApi.useUtils();
  const saved = clientApi.customWidget.get.useQuery({ id });
  let origin = parseCustomWidgetWorkshopOrigin(saved.data?.workshopOrigin);
  if (origin?.endpoint !== getWorkshopApiUrl()) origin = null;
  const linked = useWorkshopSubmissionQuery(session.client, origin?.submissionId ?? "");
  const owns = Boolean(linked.data && session.user?.id === linked.data.author);
  const [mode, setMode] = useState("new");
  const [reviewedRevision, setReviewedRevision] = useState<number>();
  const create = useWorkshopCreateMutation(session.client);
  const update = useWorkshopUpdateMutation(session.client);
  const link = clientApi.customWidget.workshopLink.useMutation();
  const [linkError, setLinkError] = useState(false);
  const inFlight = useRef(false);

  const publish = async (input: WorkshopSubmissionInput, screenshots: File[]) => {
    if (inFlight.current) throw new Error("A publication is already in progress");
    if (!session.user) throw new Error("Sign in to Workshop before publishing");
    inFlight.current = true;
    setLinkError(false);
    try {
      let submission;
      if (mode === "update") {
        if (!owns || !origin || reviewedRevision === undefined) {
          throw new Error("The linked submission is unavailable or belongs to another author");
        }
        submission = await update.mutateAsync({
          id: origin.submissionId,
          input,
          screenshotChanges: { additions: screenshots },
          expectedRevision: reviewedRevision,
        });
      } else {
        let description = input.description;
        if (mode === "remix") {
          if (!origin) throw new Error("The original Workshop submission is no longer linked");
          description = `${description ?? ""}\n\nRemixed from ${getWorkshopWebUrl(origin.submissionId)}`;
        }
        submission = await create.mutateAsync({ input: { ...input, description }, screenshots });
      }
      try {
        await link.mutateAsync({ id, submissionId: submission.id, expectedRevision: submission.revision });
        await utils.customWidget.get.invalidate({ id });
      } catch {
        // Publication already succeeded. Never retry it because linking local
        // metadata failed; that could create a duplicate public submission.
        setLinkError(true);
      }
      return submission;
    } finally {
      inFlight.current = false;
    }
  };

  const selectMode = (nextMode: string) => {
    setMode(nextMode);
    setReviewedRevision(linked.data?.revision);
  };
  return {
    mode,
    setMode: selectMode,
    owns,
    origin,
    linked: linked.data,
    reviewedRevision,
    publish,
    linkError,
    isPending: create.isPending || update.isPending || link.isPending,
  };
}
