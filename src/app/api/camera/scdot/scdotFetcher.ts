/**
 * Fetches all 511SC / SCDOT traffic cameras.
 *
 * 511SC publishes an Iteris SafeTravel GeoJSON inventory with public HLS
 * camera streams and snapshot thumbnails. No API key is required.
 */

import type { CameraFeature, StreamType } from "../adapters/types";

const SCDOT_URL =
    "https://sc.cdn.iteris-atis.com/geojson/icons/metadata/icons.cameras.geojson";

export type ScdotCameraFeature = CameraFeature;

interface ScdotProperties {
    id?: string;
    name?: string;
    jurisdiction?: string | null;
    route?: string | null;
    direction?: string | null;
    description?: string | null;
    https_url?: string | null;
    ios_url?: string | null;
    image_url?: string | null;
    active?: boolean;
    problem_stream?: boolean;
    mrm?: number | null;
}

interface ScdotGeoJsonFeature {
    geometry?: { coordinates?: [number, number] };
    properties?: ScdotProperties;
}

function directionLabel(value?: string | null): string {
    const labels: Record<string, string> = {
        NB: "Northbound",
        SB: "Southbound",
        EB: "Eastbound",
        WB: "Westbound",
        N: "Northbound",
        S: "Southbound",
        E: "Eastbound",
        W: "Westbound",
    };
    const key = (value ?? "").trim().toUpperCase();
    return labels[key] ?? key;
}

function streamTypeFor(url: string): StreamType {
    if (url.includes(".m3u8")) return "hls";
    return url ? "image" : null;
}

function toFeature(raw: ScdotGeoJsonFeature): CameraFeature | null {
    const props = raw.properties;
    const coords = raw.geometry?.coordinates;
    if (!props || !coords || coords.length < 2) return null;
    if (props.active === false || props.problem_stream === true) return null;

    const [lon, lat] = coords;
    if (typeof lat !== "number" || typeof lon !== "number") return null;

    const stream = props.https_url || props.ios_url || props.image_url || "";
    if (!stream) return null;
    const streamType = streamTypeFor(stream);

    return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {
            id: `scdot-${props.id ?? props.name ?? `${lat},${lon}`}`,
            source: "scdot",
            stream,
            streamType,
            hls: streamType === "hls" ? stream : null,
            country: "United States",
            region: "South Carolina",
            city: props.jurisdiction || "South Carolina",
            name: props.description || props.name || "SCDOT camera",
            route: props.route || "",
            direction: directionLabel(props.direction),
            location_description: props.description || "",
            categories: ["traffic"],
            extra: {
                scdotId: props.id,
                cameraName: props.name,
                mileReferenceMarker: props.mrm,
                imageUrl: props.image_url,
            },
        },
    };
}

export async function fetchScdotCameras(): Promise<ScdotCameraFeature[]> {
    const res = await fetch(SCDOT_URL, {
        headers: { "User-Agent": "WorldWideView/1.0" },
        signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`511SC returned ${res.status}`);

    const data = await res.json() as { features?: ScdotGeoJsonFeature[] };
    const features = Array.isArray(data.features) ? data.features : [];
    return features.flatMap((feature) => {
        const converted = toFeature(feature);
        return converted ? [converted] : [];
    });
}
