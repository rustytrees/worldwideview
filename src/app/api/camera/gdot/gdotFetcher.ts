/**
 * Fetches all 511GA / GDOT traffic cameras.
 *
 * 511GA exposes camera metadata through its DataTables endpoint and HLS URLs
 * through short-lived shared stream-manager tokens. The registry cache for
 * this adapter must stay short or clients will receive expired HLS URLs.
 */

import type { CameraFeature } from "../adapters/types";
import {
    GDOT_BASE_URL,
    GDOT_PAGE_SIZE,
    type GdotCameraFeature,
    type GdotCameraView,
    type RawGdotCameraRow,
} from "./gdotTypes";
import { resolveSharedAuthSuffix } from "./gdotAuth";
import { fetchGdotJson } from "./gdotHttp";

export type { GdotCameraFeature };

function cameraListUrl(start: number): string {
    const query = {
        columns: [{ name: "sortOrder" }, { name: "roadway", s: true }, { data: "", name: "" }],
        order: [{ column: 0, dir: "asc" }, { column: 1, dir: "asc" }],
        start,
        length: GDOT_PAGE_SIZE,
        search: { value: "" },
    };
    const params = new URLSearchParams({ query: JSON.stringify(query), lang: "en" });
    return `${GDOT_BASE_URL}/List/GetData/Cameras?${params}`;
}

function parsePoint(wkt?: string | null): [number, number] | null {
    const match = wkt?.match(/POINT\s*\(\s*([-0-9.]+)\s+([-0-9.]+)\s*\)/);
    if (!match) return null;
    const lon = Number(match[1]);
    const lat = Number(match[2]);
    return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
}

function flattenRows(rows: RawGdotCameraRow[]): GdotCameraView[] {
    const out: GdotCameraView[] = [];
    for (const row of rows) {
        const point = parsePoint(row.latLng?.geography?.wellKnownText);
        if (!point) continue;
        for (const image of row.images ?? []) {
            if (image.disabled || image.blocked || image.videoDisabled) continue;
            const viewId = String(image.id ?? "");
            const videoUrl = image.videoUrl ?? "";
            if (!viewId || !videoUrl) continue;
            out.push({
                siteId: String(row.id ?? ""),
                viewId,
                location: row.location ?? image.description ?? "",
                roadway: row.roadway ?? "",
                direction: row.direction ?? "",
                lat: point[0],
                lon: point[1],
                imageUrl: new URL(image.imageUrl ?? "", GDOT_BASE_URL).toString(),
                videoUrl,
                authRequired: image.isVideoAuthRequired === true,
            });
        }
    }
    return out;
}

async function fetchViews(): Promise<GdotCameraView[]> {
    const views: GdotCameraView[] = [];
    let total: number | null = null;
    for (let start = 0; total === null || start < total; start += GDOT_PAGE_SIZE) {
        const page = await fetchGdotJson<{ recordsTotal: number; data?: RawGdotCameraRow[] }>(
            cameraListUrl(start),
        );
        total ??= page.recordsTotal;
        const rows = page.data ?? [];
        if (rows.length === 0) break;
        views.push(...flattenRows(rows));
    }
    return views;
}

function toFeature(view: GdotCameraView, authSuffix: string): CameraFeature {
    const stream = view.authRequired && authSuffix ? `${view.videoUrl}${authSuffix}` : view.videoUrl;
    return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [view.lon, view.lat] },
        properties: {
            id: `gdot-${view.viewId}`,
            stream,
            streamType: "hls",
            hls: stream,
            country: "United States",
            region: "Georgia",
            city: "Georgia",
            source: "gdot",
            name: view.location || `GDOT camera ${view.viewId}`,
            route: view.roadway,
            direction: view.direction,
            location_description: view.location,
            categories: ["traffic"],
            extra: { siteId: view.siteId, viewId: view.viewId, imageUrl: view.imageUrl },
        },
    };
}

export async function fetchGdotCameras(): Promise<GdotCameraFeature[]> {
    const views = await fetchViews();
    const authSuffix = await resolveSharedAuthSuffix(views);
    return views.map((view) => toFeature(view, authSuffix));
}
