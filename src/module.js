'use strict';

var forEach = angular.forEach;
var isDefined = angular.isDefined;
var isObject = angular.isObject;
var isString = angular.isString;

angular.module('ngRouter', [
	'ng',
	'ngRouter.state',
	'ngRouter.view'
])
	.provider('$async', function $AsyncProvider () {
		this.$get = function $AsyncFactory ($q, $timeout) {
			var $async = {};

			$async.forEach = forEach;

			function forEach (obj, iterator, context) {
				var keys;
				var index = 0;

				if(!iterator) {
					return;
				}

				if(!context) {
					context = {};
				}

				if(isObject(obj)) {
					keys = Object.keys(obj);
				}

				function next(i) {
					if(i) {
						index = i;
					} else {
						index++;
					}

					if(!keys[index]) {
						return;
					}

					var key = keys[index], value = obj[key];

					iterator.call(context, value, key, obj);
				}

				context.next = next;

				next('0');
			}

			return $async;
		};
	});