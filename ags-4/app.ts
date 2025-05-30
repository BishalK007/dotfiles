import { App } from "astal/gtk4"
import style from "./style.scss"
import Bar from "./widget/Bar"
import { cssPreprocessor } from "./utils/utils"
import GLib from "gi://GLib";

// Load .env file into process environment
function loadEnvFile(filePath: string) {
    try {
        const [ok, contents] = GLib.file_get_contents(filePath);
        if (ok && contents) {
            const lines = new TextDecoder().decode(contents).split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                // Split at the first '=' only
                const eqIndex = trimmed.indexOf('=');
                if (eqIndex === -1) continue;
                const key = trimmed.slice(0, eqIndex).trim();
                let value = trimmed.slice(eqIndex + 1).trim();
                // Remove inline comments (unquoted)
                const hashIndex = value.indexOf('#');
                if (hashIndex !== -1 && !/^["'].*["']$/.test(value)) {
                    value = value.slice(0, hashIndex).trim();
                }
                // Remove surrounding quotes
                value = value.replace(/^['"]|['"]$/g, '');
                if (key && value !== undefined) {
                    print(`ENV: ${key} = ${value}`);
                    GLib.setenv(key, value, true);
                }
            }
        }
    } catch (e) {
        print(`Failed to load .env file: ${e}`);
    }
}

// Load .env from home config
loadEnvFile(GLib.build_filenamev([GLib.get_current_dir(), ".env"]));
const PROJ_ROOT = GLib.getenv("PROJ_ROOT");
if (!PROJ_ROOT) {
    throw new Error("PROJ_ROOT environment variable not set. Aborting startup.");
}
const envVars = { PROJ_ROOT };

App.start({
    css: cssPreprocessor(style, envVars),
    main() {
        App.get_monitors().map(Bar)
    },
})
