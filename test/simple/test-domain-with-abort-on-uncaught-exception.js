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
 * The goal of this test is to reproduce an issue when, if the
 * --abort-on-uncaught-exception command line argument is passed
 * to node, then the top domain error handler nevers catches the
 * error thrown in its context.
 */
var domainErrHandlerExMessage = 'exception from domain error handler';

if (process.argv[2] == 'child') {
  var domain = require('domain');
  var d = domain.create();

  d.on('error', function() {
    // Swallowing the error on purpose if 'throwInDomainErrHandler' is not
    // set
    if (process.argv[3] === 'throwInDomainErrHandler')
      throw new Error(domainErrHandlerExMessage);
  });

  d.run(function doStuff() {
    process.nextTick(function () {
      throw new Error("You should NOT see me");
    });
  });
} else {
  var fork = require('child_process').fork;
  var assert = require('assert');

  function testDomainExceptionHandling(cmdLineOption, options) {
    var child = fork(process.argv[1],
                     ['child', options.throwInDomainErrHandler ? 'throwInDomainErrHandler' : undefined],
                     { execArgv: [cmdLineOption]});
    var uncaughtExceptionHandlerFired = false;

    if (child) {
      child.on('exit', function onChildExited(exitCode, signal) {
        // If the domain should have swallowed the exception
        //, --abort-on-uncaught-exception should not have made
        // the process abort.
        // Otherwise, if the domain throws an exception, then
        // --abort-on-uncaught-exception should abort as usual.
        assert(exitCode === (options.throwInDomainErrHandler ? null : 0));
        assert(signal === (options.throwInDomainErrHandler ? 'SIGABRT' : null))
      });
    }
  }

  testDomainExceptionHandling('--abort-on-uncaught-exception', { throwInDomainErrHandler: false });
  testDomainExceptionHandling('--abort-on-uncaught-exception', { throwInDomainErrHandler: true });
}
