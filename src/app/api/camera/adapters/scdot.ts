import { fetchScdotCameras } from "../scdot/scdotFetcher";
import type { CameraAdapter, CameraFeature } from "./types";

export const scdotAdapter: CameraAdapter = {
    id: "scdot",
    displayName: "511SC / SCDOT (South Carolina)",
    region: "United States — South Carolina",
    fetch: async () => (await fetchScdotCameras()) as CameraFeature[],
};
