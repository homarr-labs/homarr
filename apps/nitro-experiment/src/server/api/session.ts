import { assertLocalRequest, assertMutationRequest } from "../access/guards";
import { currentSession, logoutSession, selectSession } from "../session/service";
import { rpc } from "./implementer";

export const sessionProcedures = {
  current: rpc.session.current.handler(({ context }) => {
    assertLocalRequest(context);
    return currentSession(context);
  }),
  select: rpc.session.select.handler(({ context, input }) => {
    assertMutationRequest(context);
    return selectSession(context, input.identityId);
  }),
  logout: rpc.session.logout.handler(({ context }) => {
    assertMutationRequest(context);
    return logoutSession(context);
  }),
};
