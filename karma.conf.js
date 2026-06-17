// Karma configuration for baia-ui
// Coverage thresholds per §A7: global gate ≥85% lines / ≥80% branches.
// Per-component ≥90% convention: when a non-trivial logic component/service is added,
// add its path to the `check` thresholds object below (per-file overrides are supported
// by karma-coverage using the same glob-key pattern as Jest's coverageThreshold).
//
// Example (add when the module exists):
//   './src/app/core/api.service.ts': { lines: 90, branches: 90, functions: 90, statements: 90 }

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],

    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
      },
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },

    jasmineHtmlReporter: {
      suppressAll: true, // removes the duplicated traces
    },

    // Coverage configuration
    coverageReporter: {
      dir: 'coverage/',
      reporters: [
        { type: 'html', subdir: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly', subdir: '.', file: 'lcov.info' },
      ],
      // §A7 coverage gate: ≥85% lines / ≥80% branches globally.
      // Per-module ≥90% convention: add per-file entries here as core-logic
      // services/components land (same pattern as Jest's coverageThreshold).
      check: {
        global: {
          statements: 85,
          lines: 85,
          branches: 80,
          functions: 80,
        },
        // Per-file ≥90% override example (uncomment + adjust path when module exists):
        // 'src/app/core/store/run.store.ts': {
        //   statements: 90, lines: 90, branches: 90, functions: 90,
        // },
      },
    },

    reporters: ['progress', 'kjhtml', 'coverage'],

    // Custom launchers for CI / headless environments
    customLaunchers: {
      /**
       * ChromeHeadlessCI — headless Chrome with --no-sandbox for CI environments
       * (Docker/GitHub Actions containers run without user namespaces).
       * Use via: ng test --browsers=ChromeHeadlessCI
       */
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },

    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['ChromeHeadless'],
    singleRun: false,
    restartOnFileChange: true,
  });
};
