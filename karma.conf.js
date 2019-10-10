// Karma configuration
// Generated on Fri Sep 20 2019 22:10:52 GMT-0400 (Eastern Daylight Time)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',
    
    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['qunit', 'commonjs'],

    // list of files / patterns to load in the browser
    files: [
      {pattern: 'src/lib/bluebird.js'},

      {pattern: 'src/utils/*.js'},
      {pattern: 'src/vnf/**/*.js'},

      {pattern: 'src/test-config.js'},
      {pattern: 'src/test/utils/**/*.js'},
      {pattern: 'src/test/mock/**/*.js'},

      {pattern: 'src/test/unit/**/*.js'},
      {pattern: 'src/test/**/rtc-channel-test.js'}
    ],


    // list of files / patterns to exclude
    exclude: [
        'src/test/unit/system/**/*.js'
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'src/**/*.js': ['babel', 'commonjs'],
      'src/utils/**/*.js': 'coverage',
      'src/vnf/**/*.js': 'coverage'
    },

     babelPreprocessor: {
      options: {
        presets: ['@babel/preset-env'],
        sourceMap: 'inline'
      },
      sourceFileName: function (file) {
        return file.originalPath;
      }
    },

    commonjsPreprocessor: {
      modulesRoot: 'src'
    },

    coverageIstanbulInstrumenter: {
      esModules: true
    },

    coverageReporter: {
      reporters: [{type: 'lcov'}]
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['spec', 'coverage'],

    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeHeadless', 'FirefoxHeadless'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
