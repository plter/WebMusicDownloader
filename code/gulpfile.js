const gulp = require("gulp");
const path = require('path');
const child_process = require('child_process');

const BUILD_OUTPUT_DIR = path.join(__dirname, "build", "app");

function copyPackageJson(cb) {
    gulp.src("package.json").pipe(gulp.dest(BUILD_OUTPUT_DIR));
    cb();
}

function copyMainJs(cb) {
    gulp.src("main.js").pipe(gulp.dest(BUILD_OUTPUT_DIR));
    cb();
}

function copySrcFiles(cb) {
    gulp.src("src/**").pipe(gulp.dest(path.join(BUILD_OUTPUT_DIR, 'src')));
    cb();
}

function npmInstallProduction(cb) {
    console.log('Running "npm install --production" in build output directory.');
    child_process.exec("npm install --production", {cwd: BUILD_OUTPUT_DIR}, (error, stdout, stderr) => {
        if (error) {
            console.log(`Failed to run command 'npm install --production', ${error}`);
        }
        console.log(stdout);
        console.log(stderr);
        cb();
    });
}

module.exports.default = gulp.series(copyPackageJson, copyMainJs, copySrcFiles, npmInstallProduction);