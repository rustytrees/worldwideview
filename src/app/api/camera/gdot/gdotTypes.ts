import type { CameraFeature } from "../adapters/types";

export const GDOT_BASE_URL = "https://prod-ga.ibi511.com";
export const GDOT_PAGE_SIZE = 100;
export const GDOT_USER_AGENT = "WorldWideView/1.0";

export type GdotCameraFeature = CameraFeature;

export interface RawGdotImage {
    id?: string | number;
    description?: string | null;
    imageUrl?: string | null;
    videoUrl?: string | null;
    isVideoAuthRequired?: boolean;
    disabled?: boolean;
    blocked?: boolean;
    videoDisabled?: boolean;
}

export interface RawGdotCameraRow {
    id?: string | number;
    location?: string | null;
    roadway?: string | null;
    direction?: string | null;
    latLng?: { geography?: { wellKnownText?: string | null } };
    images?: RawGdotImage[];
}

export interface GdotCameraView {
    siteId: string;
    viewId: string;
    location: string;
    roadway: string;
    direction: string;
    lat: number;
    lon: number;
    imageUrl: string;
    videoUrl: string;
    authRequired: boolean;
}
