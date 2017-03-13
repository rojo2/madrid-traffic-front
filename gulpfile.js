const gulp = require("gulp");
const plugins = require("gulp-load-plugins")();
const browserify = require("browserify");
const babelify = require("babelify");
const watchify = require("watchify");
const exorcist = require("exorcist");
const uglifyify = require("uglifyify");
const source = require("vinyl-source-stream");
const inferno = require("babel-plugin-inferno");
const bs = require("browser-sync");
const chaf = require("connect-history-api-fallback");
const precss = require("precss");
const cssnano = require("cssnano");
const cssnext = require("postcss-cssnext");

/**
 * Devuelve si estamos en producción o no.
 */
function isProduction() {
  return process.env.NODE_ENV === "production";
}

function isHeroku() {
  return process.env.NODE_ENV === "heroku";
}

/**
 * Crea el bundler  (browserify + watchify).
 */
function createBundler() {
  const bundler = browserify({
      debug: !isProduction(),
      paths: ["src/scripts"]
    });

  if (!isProduction() && !isHeroku()) {
    bundler.plugin(watchify);
  }

  bundler
    .plugin(inferno)
    .transform(babelify, {
      presets: ["latest"]
    });

  if (isProduction() || isHeroku()) {
    bundler.transform(uglifyify, {
      global: true,
      mangle: true,
      compress: true
    });
  }

  bundler.add("src/scripts/madrid/index.js");
  bundler.on("update", bundle);
  bundler.on("log", plugins.util.log);
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
    .pipe(exorcist("dist/index.js.map"))
    .pipe(source("index.js"))
    .pipe(gulp.dest("dist"));
  if (bs.active) {
    stream.pipe(bs.stream({
      once: true
    }));
  }
  return stream;
}

/**
 * Genera las plantillas.
 */
gulp.task("templates", () => {
  const stream = gulp.src("src/templates/index.pug")
    .pipe(plugins.plumber())
    .pipe(plugins.pug({
      locals: {
        title: "Madrid Traffic"
      }
    }))
    .pipe(gulp.dest("dist"));
  if (bs.active) {
    stream.pipe(bs.stream());
  }
});

/**
 * Genera los scripts.
 */
gulp.task("scripts", () => {
  return bundle();
});

/**
 * Genera los estilos.
 */
gulp.task("styles", () => {
  const stream = gulp.src("src/styles/index.css")
    .pipe(plugins.plumber())
    .pipe(plugins.postcss([
      precss(),
      cssnext({
        browsers: ['last 1 version']
      }),
      cssnano()
    ]))
    .pipe(gulp.dest("dist"));
  if (bs.active) {
    stream.pipe(bs.stream());
  }
});

/**
 * Genera las fuentes.
 */
gulp.task("fonts", () => {
    const stream = gulp.src("src/fonts/*.ttf")
      .pipe(plugins.ttf2woff())
      .pipe(gulp.dest("dist/fonts"));
    if (bs.active) {
      stream.pipe(bs.stream());
    }
});

/**
 * Mueve las imágenes
 */
gulp.task("images", () => {
    const stream = gulp.src("src/images/*.png")
      .pipe(gulp.dest("dist/img"));
    if (bs.active) {
      stream.pipe(bs.stream());
    }
});

/**
 * Construye todo el proyecto.
 */
gulp.task("build", ["scripts", "styles", "templates", "fonts", "images"]);

/**
 * Observa los archivos para regenerarlos.
 */
gulp.task("watch", ["build"], () => {
  gulp.watch("src/styles/**/*.css", ["styles"]);
  gulp.watch("src/templates/**/*.pug", ["templates"]);
});

/**
 * Browser Sync.
 */
gulp.task("bs", ["watch"], () => {
  bs.init({
    server: {
      baseDir: "dist",
      middleware: [chaf()]
    }
  });
});

/**
 * Tarea por defecto.
 */
gulp.task("default", ["bs"]);
