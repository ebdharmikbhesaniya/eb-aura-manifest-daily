// Silences Xcode's "Script has ambiguous dependencies causing it to run on every
// build" warning on two upstream-generated shell-script phases:
//   • "Upload Debug Symbols to Sentry"                       (@sentry/react-native/expo)
//   • "[Expo Dev Launcher] Strip Local Network Keys for Release"  (expo-dev-launcher)
//
// Both plugins register the phase via `addBuildPhase([], ...)` with no outputs and
// no dependency spec. Neither exposes a config option. Setting `alwaysOutOfDate = 1;`
// on the phase is the pbxproj-level equivalent of unchecking "Based on dependency
// analysis" in Xcode — the script still runs every build (that's the intent), the
// warning goes away.
//
// Must be the LAST plugin in the plugins[] array so its withXcodeProject mod is
// registered last and thus runs last against the shared xcodeProject modResults.

const { withXcodeProject } = require('expo/config-plugins');

const PHASE_NAMES = new Set([
  'Upload Debug Symbols to Sentry',
  '[Expo Dev Launcher] Strip Local Network Keys for Release',
]);

const unquote = (s) => (typeof s === 'string' ? s.replace(/^"|"$/g, '') : s);

const withSilencedBuildPhases = (config) => {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const section = project.hash.project.objects.PBXShellScriptBuildPhase ?? {};

    let patched = 0;
    for (const key of Object.keys(section)) {
      if (key.endsWith('_comment')) continue;
      const phase = section[key];
      if (!phase || typeof phase !== 'object') continue;
      if (PHASE_NAMES.has(unquote(phase.name))) {
        phase.alwaysOutOfDate = 1;
        patched += 1;
      }
    }

    if (patched < PHASE_NAMES.size) {
      console.warn(
        `[withSilencedBuildPhases] patched ${patched}/${PHASE_NAMES.size} phase(s); ` +
          `an upstream plugin may have renamed a phase.`,
      );
    }
    return cfg;
  });
};

module.exports = withSilencedBuildPhases;
