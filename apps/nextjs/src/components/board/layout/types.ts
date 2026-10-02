export interface GridCoordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridPlacement extends GridCoordinates {
  id: string;
}
