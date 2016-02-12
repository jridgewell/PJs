import gulp  from 'gulp';
import loadPlugins from 'gulp-load-plugins';
import del  from 'del';
import path  from 'path';
import source  from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import rollup from 'rollup-stream';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';
import rollupMultiEntry from 'rollup-plugin-multi-entry';

import mochaGlobals from './test/setup/.globals';
import manifest  from './package.json';

const multiEntry = rollupMultiEntry.default;

// Load all of our Gulp plugins
const $ = loadPlugins();

const env = process.env;

// Gather the library data from `package.json`
const config = manifest.babelBoilerplateOptions;
const mainFile = manifest.main;
const destinationFolder = path.dirname(mainFile);
const exportFileName = path.basename(mainFile, path.extname(mainFile));

function clean(files) {
  return del(files);
}

function cleanDist() {
  return clean([destinationFolder]);
}

// Lint a set of files
function lint(files) {
  return gulp.src(files)
    .pipe($.plumber())
    .pipe($.eslint())
    .pipe($.eslint.format())
    .pipe($.eslint.failOnError())
    .on('error', $.util.beep);
}

function lintSrc() {
  return lint('src/**/*.js');
}

function lintTest() {
  return lint('test/**/*.js');
}

function lintGulpfile() {
  return lint('gulpfile.babel.js');
}

function _build(files) {
  return rollup({
    entry: files,
    sourceMap: true,
    plugins: [
      env.min ? uglify() : {},
      Array.isArray(files) ? multiEntry() : {},
      babel({
        babelrc: false,
        presets: ['es2015-rollup'],
        exclude: 'node_modules/**'
      })
    ],
    format: 'umd',
    moduleName: config.mainVarName,
    external: Object.keys(mochaGlobals.deps),
    globals: mochaGlobals.deps
  });
}

function build() {
  env.min = true;
  return _build(`./src/${config.entryFileName}.js`)
    .pipe(source(`${config.entryFileName}.js`, './src'))
    .pipe($.plumber())
    .pipe(buffer())
    .pipe($.rename(`${exportFileName}.js`))
    .pipe(gulp.dest(destinationFolder))
    .pipe($.filter(['*', '!**/*.js.map']))
    .pipe($.rename(exportFileName + '.min.js'))
    .pipe(gulp.dest(destinationFolder));
}

function test() {
  return _build(['test/setup/node.js', 'test/unit/**/*.js'])
    .pipe(source('__spec-build.js'))
    .pipe($.plumber())
    .pipe(gulp.dest('./tmp'))
    .pipe(buffer())
    .pipe($.mocha({
      reporter: 'dot',
      globals: Object.keys(mochaGlobals.globals),
      ignoreLeaks: false,
      bail: true,
      timeout: 200
    }));
}

// Run the headless unit tests as you make changes.
function watch() {
  gulp.watch([
    'src/**/*',
    'test/**/*',
    'package.json',
    '**/.eslintrc'
  ], ['lint', 'test']);
  gulp.run(['lint', 'test']);
}

// Remove the built files
gulp.task('clean', cleanDist);

// Lint our source code
gulp.task('lint-src', lintSrc);

// Lint our test code
gulp.task('lint-test', lintTest);

// Lint this file
gulp.task('lint-gulpfile', lintGulpfile);

// Lint everything
gulp.task('lint', ['lint-src', 'lint-test', 'lint-gulpfile']);

// Build two versions of the library
gulp.task('build', ['lint', 'clean'], build);

// Lint and run our tests
gulp.task('test', ['lint'], test);

// Run the headless unit tests as you make changes.
gulp.task('watch', watch);

// An alias of test
gulp.task('default', ['test']);
