// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var assert = require('assert');

/*
 * The goal of this test is to reproduce the following issue:
 * When throwing an error from a top-level domain error handler,
 * the uncaught exception handler is not called, and the error
 * that bubbles up is the original one caught by the top-level error
 * handler, not the one it threw.
 */
var domainErrHandlerExMessage = 'exception from domain error handler';
var uncaughtExceptionHandlerCalled = false;

process.on('uncaughtException', function onChildUncaughtEx(e) {
  uncaughtExceptionHandlerCalled = true;
  assert(e.message === domainErrHandlerExMessage);
});

process.on('exit', function onProcessExited() {
  assert(uncaughtExceptionHandlerCalled);
});

var domain = require('domain');
var d = domain.create();

d.on('error', function() {
  throw new Error(domainErrHandlerExMessage);
});

d.run(function doStuff() {
  process.nextTick(function () {
    throw new Error("You should NOT see me");
  });
});
