'use strict';

var STATE_PARAMS_REGEXP = /(?:[\:\{])([A-z]{0,})(?:[\}]|)/g;

function $UrlProvider () {
	this.$get = function $UrlFactory ($location) {
		var $url = {};

		$url.go = function (path, stateParams) {
			if(stateParams) {
				path = $url.params(path, stateParams);
			}

			if($location.path().match(path)) {
				return;
			}

			$location.path(path);
		};

		$url.params = function (pathname, stateParams) {
			var match;

			if(!isString(pathname)) {
				throw new Error('\'pathname\' must be a string');
			}

			if(!(match = pathname.match(STATE_PARAMS_REGEXP))) {
				return pathname;
			}

			match.forEach(function (m){
				var key = m.replace(/[\{\}\:]/g, '');
				var param = stateParams[key] || '';

				pathname = pathname.replace(new RegExp(m, 'g'), param)
			});

			return pathname;
		};

		return $url;
	};
}

angular.module('ngRouter.url', [])
	.provider('$url', $UrlProvider)