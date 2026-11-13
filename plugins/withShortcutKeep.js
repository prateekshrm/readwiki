const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Prevents Android's resource shrinker (enabled in release builds) from
 * stripping shortcut icons that are referenced dynamically at runtime via
 * expo-quick-actions' setItems(). Without this, icons appear in dev builds
 * but vanish in production.
 */
const withShortcutKeep = (config) =>
    withDangerousMod(config, [
        "android",
        async (config) => {
            const rawDir = path.join(
                config.modRequest.projectRoot,
                "android/app/src/main/res/raw"
            );
            await fs.promises.mkdir(rawDir, { recursive: true });

            const keepXml = `<?xml version="1.0" encoding="utf-8"?>
<!--
    Tells the Android resource shrinker to keep shortcut icons that are
    referenced dynamically at runtime (not statically in XML), so they
    are not stripped in release/production builds.
    See: https://developer.android.com/build/shrink-code#keep-resources
-->
<resources xmlns:tools="http://schemas.android.com/tools"
    tools:keep="@mipmap/shortcut_search,@mipmap/shortcut_flow" />
`;
            await fs.promises.writeFile(
                path.join(rawDir, "keep.xml"),
                keepXml,
                "utf8"
            );
            return config;
        },
    ]);

module.exports = withShortcutKeep;

