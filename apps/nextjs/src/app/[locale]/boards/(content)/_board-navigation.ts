export const getNextBoardIndex = (boardCount: number, currentIndex: number, direction: -1 | 1) => {
  if (boardCount <= 1 || currentIndex < 0 || currentIndex >= boardCount) return null;
  return (currentIndex + direction + boardCount) % boardCount;
};
