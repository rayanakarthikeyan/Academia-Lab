import brand from "../../shared/brand.json";
export const APP_NAME = import.meta.env.VITE_APP_NAME?.trim() || brand.name;
export const RELEASE_LABEL = "Beta";
export const APP_TITLE = `${APP_NAME}: ${brand.subtitle}`;
export const APP_TAGLINE = brand.tagline;
export const APP_DESCRIPTION = `${APP_TITLE}. ${APP_TAGLINE}`;
