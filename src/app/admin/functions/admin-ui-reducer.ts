export type PendingDelete =
  | { kind: "product"; id: string }
  | { kind: "category"; id: string };

export type ErrorMapsKey =
  | "availabilityErrors"
  | "categoryDeleteErrors"
  | "driverDeleteErrors"
  | "productDeleteErrors";

export type AdminUiState = {
  pendingDelete: PendingDelete | null;
  deleteSubmitting: boolean;
  productFormError: string | null;
  categoryAddError: string | null;
  categoryEditError: string | null;
  driverAddError: string | null;
  availabilityErrors: Record<string, string>;
  categoryDeleteErrors: Record<string, string>;
  driverDeleteErrors: Record<string, string>;
  productDeleteErrors: Record<string, string>;
};

export const initialAdminUiState: AdminUiState = {
  pendingDelete: null,
  deleteSubmitting: false,
  productFormError: null,
  categoryAddError: null,
  categoryEditError: null,
  driverAddError: null,
  availabilityErrors: {},
  categoryDeleteErrors: {},
  driverDeleteErrors: {},
  productDeleteErrors: {},
};

function withoutId(
  map: Record<string, string>,
  id: string
): Record<string, string> {
  const next = { ...map };
  delete next[id];
  return next;
}

export type AdminUiAction =
  | { type: "setPendingDelete"; value: PendingDelete | null }
  | { type: "setDeleteSubmitting"; value: boolean }
  | { type: "setProductFormError"; value: string | null }
  | { type: "setCategoryAddError"; value: string | null }
  | { type: "setCategoryEditError"; value: string | null }
  | { type: "setDriverAddError"; value: string | null }
  | { type: "setMapError"; map: ErrorMapsKey; id: string; message: string }
  | { type: "clearMapError"; map: ErrorMapsKey; id: string };

export function adminUiReducer(
  state: AdminUiState,
  action: AdminUiAction
): AdminUiState {
  switch (action.type) {
    case "setPendingDelete":
      return { ...state, pendingDelete: action.value };
    case "setDeleteSubmitting":
      return { ...state, deleteSubmitting: action.value };
    case "setProductFormError":
      return { ...state, productFormError: action.value };
    case "setCategoryAddError":
      return { ...state, categoryAddError: action.value };
    case "setCategoryEditError":
      return { ...state, categoryEditError: action.value };
    case "setDriverAddError":
      return { ...state, driverAddError: action.value };
    case "setMapError": {
      const { map, id, message } = action;
      const prev = state[map];
      return { ...state, [map]: { ...prev, [id]: message } };
    }
    case "clearMapError": {
      const { map, id } = action;
      return { ...state, [map]: withoutId(state[map], id) };
    }
    default:
      return state;
  }
}
