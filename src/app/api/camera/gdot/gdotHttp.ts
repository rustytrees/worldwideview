import { GDOT_BASE_URL, GDOT_USER_AGENT } from "./gdotTypes";

const RETRIES = 4;
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchGdotText(url: string, init: RequestInit = {}): Promise<string> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
        try {
            const res = await fetch(url, {
                ...init,
                headers: {
                    "User-Agent": GDOT_USER_AGENT,
                    "Referer": `${GDOT_BASE_URL}/cctv`,
                    "X-Requested-With": "XMLHttpRequest",
                    ...(init.headers ?? {}),
                },
                signal: AbortSignal.timeout(20_000),
            });
            if (res.ok) return res.text();
            lastError = new Error(`511GA returned ${res.status} for ${url}`);
            if (!RETRYABLE_STATUSES.has(res.status)) throw lastError;
        } catch (error) {
            lastError = error;
        }
        if (attempt < RETRIES) await delay(500 * (attempt + 1));
    }
    throw lastError;
}

export async function fetchGdotJson<T>(url: string): Promise<T> {
    const text = await fetchGdotText(url, {
        headers: { "Accept": "application/json, text/javascript, */*; q=0.01" },
    });
    return JSON.parse(text) as T;
}
