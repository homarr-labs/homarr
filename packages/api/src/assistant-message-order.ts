interface OrderableMessage {
  id: string;
  parentId: string | null;
}

/**
 * Orders thread messages so that a parent always precedes its children.
 *
 * The database can only order by `created_at`, which is second-granular on MySQL and SQLite. Two
 * messages written in the same second therefore tie, and the client rebuilds the conversation tree
 * from `parent_id`, so a child arriving before its parent corrupts the thread. Sorting here keeps
 * the relative order of siblings from the incoming (already deterministic) list.
 */
export const orderMessagesByParent = <TMessage extends OrderableMessage>(messages: TMessage[]): TMessage[] => {
  if (messages.length <= 1) return messages;

  const messagesById = new Map<string, TMessage>();
  const incomingIndexById = new Map<string, number>();
  messages.forEach((message, index) => {
    messagesById.set(message.id, message);
    incomingIndexById.set(message.id, index);
  });

  const childrenByParent = new Map<string | null, TMessage[]>();
  const resolvedParentIds = new Map<string, string | null>();

  for (const message of messages) {
    // Treat a dangling parent reference as a root so the message is never dropped.
    const parentId = message.parentId !== null && messagesById.has(message.parentId) ? message.parentId : null;
    resolvedParentIds.set(message.id, parentId);
    const siblings = childrenByParent.get(parentId);
    if (siblings) siblings.push(message);
    else childrenByParent.set(parentId, [message]);
  }

  const ordered: TMessage[] = [];
  const visited = new Set<string>();

  // A conversation is one long parent chain, so the traversal depth grows with the message count.
  // An explicit stack keeps a long thread from exhausting the call stack.
  const visitFrom = (start: TMessage) => {
    const stack: TMessage[] = [start];
    while (stack.length > 0) {
      const message = stack.pop();
      if (!message || visited.has(message.id)) continue;
      visited.add(message.id);
      ordered.push(message);
      const children = childrenByParent.get(message.id);
      if (!children) continue;
      // Pushed in reverse so the stack pops siblings back in their incoming order.
      for (let index = children.length - 1; index >= 0; index--) {
        const child = children[index];
        if (child) stack.push(child);
      }
    }
  };

  for (const root of childrenByParent.get(null) ?? []) {
    visitFrom(root);
  }

  // Whatever is left belongs to a parent cycle, which by definition has no root to start from.
  // Corrupted data should still come back complete and in a sensible order, so each cycle is
  // broken at its earliest member in the incoming order and traversed from there. Only that one
  // back-edge can violate parent-before-child; every other message in the component is fine.
  const findCycleEntry = (start: TMessage) => {
    const path: TMessage[] = [start];
    const positionInPath = new Map<string, number>([[start.id, 0]]);
    let current = start;

    for (;;) {
      const parentId = resolvedParentIds.get(current.id) ?? null;
      if (parentId === null || visited.has(parentId)) return current;

      const parent = messagesById.get(parentId);
      if (!parent) return current;

      const loopStart = positionInPath.get(parent.id);
      if (loopStart !== undefined) {
        // Closed the loop: the cycle is the tail of the walked path. Start from whichever of its
        // members came first in the incoming list so the choice is deterministic.
        return path.slice(loopStart).reduce((earliest, member) => {
          const memberIndex = incomingIndexById.get(member.id) ?? 0;
          const earliestIndex = incomingIndexById.get(earliest.id) ?? 0;
          return memberIndex < earliestIndex ? member : earliest;
        });
      }

      positionInPath.set(parent.id, path.length);
      path.push(parent);
      current = parent;
    }
  };

  for (const message of messages) {
    if (visited.has(message.id)) continue;
    visitFrom(findCycleEntry(message));
  }

  return ordered;
};
