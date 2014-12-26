'use strict';

var forEach = angular.forEach;
var isDefined = angular.isDefined;
var isObject = angular.isObject;
var isString = angular.isString;
var isFunction = angular.isFunction;

angular.module('ngRouter', [
	'ng',
	'ngRouter.state',
	'ngRouter.view'
]);