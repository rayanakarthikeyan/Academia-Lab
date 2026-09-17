import brand from "../../shared/brand.json";
export const APP_NAME = import.meta.env.VITE_APP_NAME?.trim() || brand.name;
export const RELEASE_LABEL = "Beta";
export const APP_DESCRIPTION = `${APP_NAME} academic learning and interactive laboratory platform`;
