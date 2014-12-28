'use strict';

var forEach = angular.forEach;
var isDefined = angular.isDefined;
var isObject = angular.isObject;
var isString = angular.isString;
var isFunction = angular.isFunction;
var extend = angular.extend;
var copy = angular.copy;

angular.module('ngRouter', [
	'ng',
	'ngRouter.state',
	'ngRouter.view',
	'ngRouter.url'
]);