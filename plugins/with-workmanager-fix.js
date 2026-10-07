// react-native-android-widget depends on androidx.work:work-runtime 2.8.1, while another dependency pulls in
// work-runtime-ktx 2.7.1. Since 2.8 the -ktx classes live inside work-runtime, so the old -ktx artifact causes
// "Duplicate class androidx.work.OneTimeWorkRequestKt". Aligning -ktx to 2.8.1 (an empty shim) removes the clash.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// @pace/workmanager-fix';
const SNIPPET = `
${MARKER}
configurations.all {
    resolutionStrategy {
        force 'androidx.work:work-runtime:2.8.1'
        force 'androidx.work:work-runtime-ktx:2.8.1'
    }
}
`;

module.exports = function withWorkManagerFix(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(MARKER)) cfg.modResults.contents += SNIPPET;
    return cfg;
  });
};
