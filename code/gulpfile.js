const gulp = require("gulp");
const path = require('path');

const BUILD_OUTPUT_DIR = path.join(__dirname, "build", "app");

module.exports.default = function (cb) {
    gulp.src("package.json").pipe(gulp.dest(BUILD_OUTPUT_DIR));
    gulp.src("main.js").pipe(gulp.dest(BUILD_OUTPUT_DIR));
    gulp.src("src/**").pipe(gulp.dest(path.join(BUILD_OUTPUT_DIR, 'src')));
    cb();
};