export const WidgetInteractionGuide = ({ advancedView = true }: { advancedView?: boolean }) => {
  if (!advancedView) return null;

  return (
    <p>
      <strong>Supports advanced view.</strong> See the{" "}
      <a href="/docs/advanced/keyboard-shortcuts/">advanced keyboard shortcuts</a>.
    </p>
  );
};
