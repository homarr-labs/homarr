interface BoardValidationInput {
  attempted: boolean;
  hasExistingBoards: boolean;
  selectedBoardId: string | null;
  boardName: string;
}

export const getBoardValidationErrors = ({
  attempted,
  hasExistingBoards,
  selectedBoardId,
  boardName,
}: BoardValidationInput) => ({
  target: attempted && hasExistingBoards && !selectedBoardId,
  name: attempted && !boardName.trim(),
});
