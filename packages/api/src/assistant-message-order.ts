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

  const known = new Set(messages.map((message) => message.id));
  const childrenByParent = new Map<string | null, TMessage[]>();

  for (const message of messages) {
    // Treat a dangling parent reference as a root so the message is never dropped.
    const parentId = message.parentId !== null && known.has(message.parentId) ? message.parentId : null;
    const siblings = childrenByParent.get(parentId);
    if (siblings) siblings.push(message);
    else childrenByParent.set(parentId, [message]);
  }

  const ordered: TMessage[] = [];
  const visited = new Set<string>();

  const visit = (message: TMessage) => {
    // Guards against a cycle introduced by corrupted data.
    if (visited.has(message.id)) return;
    visited.add(message.id);
    ordered.push(message);
    for (const child of childrenByParent.get(message.id) ?? []) {
      visit(child);
    }
  };

  for (const root of childrenByParent.get(null) ?? []) {
    visit(root);
  }

  // Any message left over is part of a cycle; append it so nothing is silently lost.
  for (const message of messages) {
    if (!visited.has(message.id)) ordered.push(message);
  }

  return ordered;
};
