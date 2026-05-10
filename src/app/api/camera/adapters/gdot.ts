import { fetchGdotCameras } from "../gdot/gdotFetcher";
import type { CameraAdapter, CameraFeature } from "./types";

export const gdotAdapter: CameraAdapter = {
    id: "gdot",
    displayName: "511GA / GDOT (Georgia)",
    region: "United States — Georgia",
    cacheTtlMs: 60_000,
    fetch: async () => (await fetchGdotCameras()) as CameraFeature[],
};
