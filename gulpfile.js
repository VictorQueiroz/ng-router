'use strict';

var path = require('path');
var gulp = require('gulp');
var karma = require('karma').server;
var concat = require('gulp-concat');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');

var paths = {
	scripts: ['src/**/*.js', '!src/**/*_test.js']
};

gulp.task('jshint', function () {
	gulp.src(paths.scripts)
		.pipe(jshint())
		.pipe(jshint.reporter());
});

gulp.task('scripts', ['jshint'], function () {
	gulp.src(paths.scripts)
		.pipe(concat('ng-router.js'))
		.pipe(gulp.dest('dist'));
});

gulp.task('watch', function () {
	gulp.watch(paths.scripts, ['scripts']);
});

gulp.task('tdd', function (done) {
	karma.start({
		configFile: path.join(__dirname, 'karma.conf.js'),
		singleRun: false
	}, done);
});