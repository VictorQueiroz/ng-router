'use strict';

var forEach = angular.forEach;
var isDefined = angular.isDefined;
var isObject = angular.isObject;
var isString = angular.isString;

angular.module('ngRouter', [
	'ng',
	'ngRouter.state',
	'ngRouter.view'
]);