export const calculateResourcePercentage = (used: number, available: number) =>
  available > 0 ? Number(((used / available) * 100).toFixed(2)) : 0;
