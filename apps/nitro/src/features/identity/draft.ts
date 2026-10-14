import { useState } from "react";

function sameValue<T>(left: T, right: T) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function useIdentityDraft<T>(
  initial: T,
  options: { equal?: (left: T, right: T) => boolean; reconcile?: (value: T, latest: T) => T } = {},
) {
  const equal = options.equal ?? sameValue;
  const [state, setState] = useState({ source: initial, baseline: initial, value: initial });
  const dirty = !equal(state.value, state.baseline);
  if (!equal(state.source, initial)) {
    const baseline = dirty ? (options.reconcile?.(state.baseline, initial) ?? state.baseline) : initial;
    const value = dirty ? (options.reconcile?.(state.value, initial) ?? state.value) : initial;
    const reconciledDirty = !equal(value, baseline);
    setState({
      source: initial,
      baseline: reconciledDirty ? baseline : initial,
      value: reconciledDirty ? value : initial,
    });
  }
  return {
    value: state.value,
    baseline: state.baseline,
    dirty,
    changed: !equal(state.baseline, initial),
    setValue: (value: T) =>
      setState((current) =>
        equal(value, current.baseline) ? { source: initial, baseline: initial, value: initial } : { ...current, value },
      ),
    discard: () => setState({ source: initial, baseline: initial, value: initial }),
    acknowledge: (value: T) => setState({ source: initial, baseline: value, value }),
  };
}
