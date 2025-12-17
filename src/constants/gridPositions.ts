export interface GridPosition {
  id: string;
  label: string;
  row: number;
  col: number;
}

export const GRID_POSITIONS: GridPosition[] = [
  { id: 'top-left', label: 'Top Left (1,1)', row: 0, col: 0 },
  { id: 'top-center', label: 'Top Center (1,2)', row: 0, col: 1 },
  { id: 'top-right', label: 'Top Right (1,3)', row: 0, col: 2 },
  { id: 'middle-left', label: 'Middle Left (2,1)', row: 1, col: 0 },
  { id: 'middle-center', label: 'Middle Center (2,2)', row: 1, col: 1 },
  { id: 'middle-right', label: 'Middle Right (2,3)', row: 1, col: 2 },
  { id: 'bottom-left', label: 'Bottom Left (3,1)', row: 2, col: 0 },
  { id: 'bottom-center', label: 'Bottom Center (3,2)', row: 2, col: 1 },
  { id: 'bottom-right', label: 'Bottom Right (3,3)', row: 2, col: 2 }
];

// Templates that produce 3x3 grid outputs
export const GRID_TEMPLATES = ['version1', 'version2', 'version3'];
