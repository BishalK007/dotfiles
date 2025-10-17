import GLib from "gi://GLib";
import Gio from "gi://Gio";

// Cache directory: ~/.cache/ags/notifications
const CACHE_DIR = GLib.build_filenamev([GLib.get_user_cache_dir(), "ags", "notifications"]);

// In-memory map: notification id -> cached absolute file path
const cacheMap: Map<number, string> = new Map();

function ensureCacheDir(): void {
    try {
        GLib.mkdir_with_parents(CACHE_DIR, 0o755);
    } catch {}
}

function uriExists(uri: string): boolean {
    try { return Gio.File.new_for_uri(uri).query_exists(null); } catch { return false; }
}

function pathExists(path: string): boolean {
    try { return Gio.File.new_for_path(path).query_exists(null); } catch { return false; }
}

function extractFirstImgSrc(html?: string | null): string | null {
    if (!html) return null;
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return m ? m[1] : null;
}

/**
 * Cache a temp file:// image referenced by the notification (body <img> or app_icon).
 * Returns the cached absolute path if copied, else null.
 */
export function cacheTempImageForNotification(id: number, body?: string, appIcon?: string): string | null {
    ensureCacheDir();

    const candidates: string[] = [];
    const bodyImg = extractFirstImgSrc(body || "");
    if (bodyImg) candidates.push(bodyImg);
    if (appIcon) candidates.push(appIcon);

    for (const uri of candidates) {
        if (!uri.startsWith("file://")) continue;
        if (!uriExists(uri)) continue;
        try {
            const src = Gio.File.new_for_uri(uri);
            const base = src.get_basename() || `n${id}.png`;
            const destPath = GLib.build_filenamev([CACHE_DIR, `${id}-${base}`]);
            const dest = Gio.File.new_for_path(destPath);
            src.copy(dest, Gio.FileCopyFlags.OVERWRITE, null, null);
            cacheMap.set(id, destPath);
            return destPath;
        } catch {
            // try next candidate
        }
    }
    return null;
}

/** Get cached absolute path for the given notification id, if present and still exists. */
export function getCachedImagePath(id: number): string | null {
    const p = cacheMap.get(id) || null;
    if (p && pathExists(p)) return p;
    if (p && !pathExists(p)) cacheMap.delete(id);
    return null;
}

/** Remove cached file for the given id (if any). */
export function removeCachedForId(id: number): void {
    const p = cacheMap.get(id);
    if (p) {
        try { Gio.File.new_for_path(p).delete(null); } catch {}
        cacheMap.delete(id);
    }
}

/** Load existing cache files (id-*) into the map at startup. */
export function loadExistingCache(): void {
    ensureCacheDir();
    try {
        const dir = Gio.File.new_for_path(CACHE_DIR);
        const e = dir.enumerate_children("standard::name,standard::type", Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
        let info: Gio.FileInfo | null;
        // eslint-disable-next-line no-cond-assign
        while ((info = e.next_file(null))) {
            const name = info.get_name();
            if (!name) continue;
            const m = name.match(/^(\d+)-/);
            if (!m) continue;
            const id = parseInt(m[1], 10);
            if (!Number.isFinite(id)) continue;
            const full = GLib.build_filenamev([CACHE_DIR, name]);
            cacheMap.set(id, full);
        }
        e.close(null);
    } catch {}
}

/** Remove any cached files whose ids are not in the active set. */
export function pruneCacheForActiveIds(activeIds: number[]): void {
    ensureCacheDir();
    const active = new Set(activeIds);
    try {
        const dir = Gio.File.new_for_path(CACHE_DIR);
        const e = dir.enumerate_children("standard::name,standard::type", Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
        let info: Gio.FileInfo | null;
        // eslint-disable-next-line no-cond-assign
        while ((info = e.next_file(null))) {
            const name = info.get_name();
            if (!name) continue;
            const m = name.match(/^(\d+)-/);
            if (!m) continue;
            const id = parseInt(m[1], 10);
            if (!active.has(id)) {
                try { Gio.File.new_for_path(GLib.build_filenamev([CACHE_DIR, name])).delete(null); } catch {}
                cacheMap.delete(id);
            }
        }
        e.close(null);
    } catch {}
}

export function getCacheDir(): string { ensureCacheDir(); return CACHE_DIR; }
