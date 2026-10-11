type Values = Record<string, string>;

const translations: Record<string, Values> = {
  common: {
    "action.cancel": "Cancel",
    "action.confirm": "Confirm",
    "action.create": "Create",
    "field.name": "Name",
    "notification.create.error": "Create failed",
    "notification.create.success": "Created",
    "zod.errors.custom.boardAlreadyExists": "Board name already exists",
  },
  board: {
    "action.duplicate.message": "Duplicate {name}",
    "action.duplicate.title": "Duplicate board",
    "action.create.availability.available": "Name {name} is available",
    "action.create.availability.checking": "Checking name",
  },
};

export const useI18n = (scope = "") => {
  return (key: string, values: Record<string, string | number> = {}) => {
    let message = translations[scope]?.[key] ?? `${scope}.${key}`;
    for (const [name, value] of Object.entries(values)) message = message.replaceAll(`{${name}}`, String(value));
    return message;
  };
};
