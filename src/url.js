'use strict';

var STATE_PARAMS_REGEXP = /(?:[\:\{])([A-z]{0,})(?:[\}]|)/g;

function matchParams (url) {
	if(!isString(url)) {
		throw new Error('The url must be a string.');
	}

	return STATE_PARAMS_REGEXP.exec(url);
}	

function $UrlProvider () {
	this.$get = function $UrlFactory () {
	};
}

angular.module('ngRouter.url', [])
	.provider('$url', $UrlProvider)