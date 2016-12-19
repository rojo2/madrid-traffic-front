const gulp = require("gulp");
const plugins = require("gulp-load-plugins")();
const browserify = require("browserify");
const babelify = require("babelify");
const watchify = require("watchify");
const exorcist = require("exorcist");
const inferno = require("babel-preset-inferno");
const bs = require("browser-sync");
const chaf = require("connect-history-api-fallback");

function isProduction() {
	return process.env.NODE_ENV === "production";
}

function createBundler() {
	const bundler = browserify({
		debug: !isProduction(),
		paths: ["src/scripts"]
	}).add("src/scripts/madrid/index.js")
		.transform(babelify, { presets: ["latest"] })
		.plugin(watchify)
		.plugin(inferno);

	return bundler;
}

let bundler = null;

function bundle() {
	if (!bundler) {
		bundler = createBundler();
	}
	return bundler
		.bundle()
		.on("error", (err) => {
			plugins.util.log(err.message);
			bs.notify("browserify error!");
		})
		.pipe(exorcist("index.js.map"))
		.pipe(source("index.js"))
		.pipe(gulp.dest("dist"))
		.pipe(bs.stream({ once: true }));
}

gulp.task("scripts", () => {
	return bundle();
});

gulp.task("styles", () => {
	const processors = [
		autoprefixer({browsers: ['last 1 version']}),
		cssnano()
	];
	gulp.src("src/styles/index.css")
		.pipe(plugins.plumber());
		.pipe(postcss(processors))
		.pipe(gulp.dest("dist"));
});

gulp.task("build", ["scripts","styles"]);

gulp.task("watch", ["build"], () => {
	gulp.watch("src/styles/**/*.css",["styles"]);
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
