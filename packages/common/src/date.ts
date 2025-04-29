export const isDateWithin = (date: Date, relativeDate: string): boolean => {
  if (relativeDate.length < 2) {
    throw new Error("Relative date must be at least 2 characters long");
  }

  const amount = parseInt(relativeDate.slice(0, -1), 10);
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Relative date must be a number greater than 0");
  }

  const unit = relativeDate.slice(-1);

  const startTime = new Date().getTime();
  const endTime = date.getTime();
  const diffTime = Math.abs(endTime - startTime);
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

  switch (unit) {
    case "h":
      return diffHours < amount;

    case "d":
      return diffHours / 24 < amount;

    case "w":
      return diffHours / (24 * 7) < amount;

    case "m":
      return diffHours / (24 * 30) < amount;

    case "y":
      return diffHours / (24 * 365) < amount;

    default:
      throw new Error("Invalid relative time unit");
  }
};
