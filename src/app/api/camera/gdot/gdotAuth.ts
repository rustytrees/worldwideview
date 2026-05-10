import { fetchGdotJson, fetchGdotText } from "./gdotHttp";
import { GDOT_BASE_URL, type GdotCameraView } from "./gdotTypes";

async function fetchStreamTemplate(): Promise<string> {
    const text = await fetchGdotText(
        `${GDOT_BASE_URL}/scripts/jsresources/List/listResources?lang=en`,
    );
    return text.match(/resources\.CameraVideoUrl\s*=\s*'([^']+)'/)?.[1] ?? "";
}

function cameraNameFrom(view: GdotCameraView, data: any): string {
    const value = data?.cameraName ?? data?.CameraName ?? data?.name ?? data?.Name;
    return value ?? view.videoUrl.match(/\/rtplive\/([^/]+)\/playlist\.m3u8/)?.[1] ?? "";
}

async function fetchAuthSuffix(view: GdotCameraView, template: string): Promise<string> {
    const tokenData = await fetchGdotJson<any>(
        `${GDOT_BASE_URL}/Camera/GetVideoUrl?imageId=${view.viewId}`,
    );
    if (typeof tokenData === "string") {
        return tokenData.startsWith(view.videoUrl) ? tokenData.slice(view.videoUrl.length) : "";
    }
    const postUrl = template.replace("{cameraName}", encodeURIComponent(cameraNameFrom(view, tokenData)));
    const suffix = (await fetchGdotText(postUrl, {
        method: "POST",
        headers: { "Accept": "text/plain, */*", "Content-Type": "application/json" },
        body: JSON.stringify(tokenData),
    })).trim().replace(/^"|"$/g, "");
    return suffix.startsWith("http") ? "" : suffix;
}

export async function resolveSharedAuthSuffix(views: GdotCameraView[]): Promise<string> {
    const sample = views.find((v) => v.authRequired);
    if (!sample) return "";
    const template = await fetchStreamTemplate();
    return template ? fetchAuthSuffix(sample, template) : "";
}
