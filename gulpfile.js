const gulp = require("gulp");
const plugins = require("gulp-load-plugins")();
const browserify = require("browserify");
const babelify = require("babelify");
const watchify = require("watchify");
const exorcist = require("exorcist");
const source = require("vinyl-source-stream");
const inferno = require("babel-plugin-inferno");
const bs = require("browser-sync");
const chaf = require("connect-history-api-fallback");
const precss = require("precss");
const cssnext = require("postcss-cssnext");

/**
 * Devuelve si estamos en producción o no.
 */
function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Crea el bundler  (browserify + watchify)
 */
function createBundler() {
  const bundler = browserify({
      debug: !isProduction(),
      paths: ["src/scripts"]
    })
    .plugin(watchify)
    .plugin(inferno)
    .transform(babelify, {
      presets: ["latest"]
    })
    .add("src/scripts/madrid/index.js");
  bundler.on("update", bundle);
  return bundler;
}

// Bundler
let bundler = null;

/**
 * Compila el código javascript.
 */
function bundle() {
  if (!bundler) {
    bundler = createBundler();
  }
  const stream = bundler
    .bundle()
    .on("error", (err) => {
      plugins.util.log(err.message);
      if (bs.active) {
        bs.notify("browserify error!");
      }
    })
    .pipe(exorcist("index.js.map"))
    .pipe(source("index.js"))
    .pipe(gulp.dest("dist"));
  if (bs.active) {
    stream.pipe(bs.stream({
      once: true
    }));
  }
  return stream;
}

gulp.task("scripts", () => {
  return bundle();
});

gulp.task("styles", () => {
  const stream = gulp.src("src/styles/index.css")
    .pipe(plugins.plumber())
    .pipe(plugins.postcss([
      precss(),
      cssnext({
        browsers: ['last 1 version']
      })
    ]))
    .pipe(gulp.dest("dist"));
  if (bs.active) {
    stream.pipe(bs.stream());
  }
});

gulp.task("build", ["scripts", "styles"]);

gulp.task("watch", ["build"], () => {
  gulp.watch("src/styles/**/*.css", ["styles"]);
});

gulp.task("bs", ["watch"], () => {
  bs.init({
    server: {
      baseDir: "dist",
      middleware: [chaf()]
    }
  });
});

gulp.task("default", ["bs"]);
