type AssistantComposerActions = {
  setText: (text: string) => void;
  send: () => void;
};

export const sendAssistantPrompt = (composer: AssistantComposerActions, prompt: string) => {
  const text = prompt.trim();
  if (text.length === 0) return false;

  composer.setText(text);
  composer.send();
  return true;
};
