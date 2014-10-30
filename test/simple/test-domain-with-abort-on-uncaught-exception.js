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
var util = require('util');

/*
 * The goal of this test is to test the behavior of domains' error handlers
 * depending on weither the --abort-on-uncaught-exception command line is
 * passed to node.
 */

var domainErrHandlerExMessage = 'exception from domain error handler';

if (process.argv[2] == 'child') {
  var domain = require('domain');
  var d = domain.create();
  var triggeredProcessUncaughtException = false;

  if (process.argv.indexOf('setupProcessOnUncaughtExceptionHandler') !== -1) {
    process.on('uncaughtException', function onUncaughtException() {
      triggeredProcessUncaughtException = true;
    });
  }

  process.on('exit', function onExit() {
    var setupProcessUncaughtHandler =
        process.argv.indexOf('setupProcessOnUncaughtExceptionHandler') !== -1;
    if (setupProcessUncaughtHandler) {
      if (process.argv.indexOf('--abort-on-uncaught-exception') !== -1) {
        // If --abort-on-uncaught-exception was passed on the command line,
        // then the process' uncaught exception handler must not be called.
        // Instead, the process must abort if an uncaught exception is thrown
        // in the top-level domain error handler, or exit gracefully otherwise.
        assert(triggeredProcessUncaughtException === false,
               "Process' uncaughtException handler should not be called when " +
               "passing --abort-on-uncaught-exception");
      } else {
        if (process.argv.indexOf('throwInDomainErrHandler') !== -1) {
          assert(triggeredProcessUncaughtException === true,
                 "When throwing within the top-level domain error handler, " +
                 "process' uncaughtException handler should trigger");
        }
      }
    } else {
      assert(triggeredProcessUncaughtException === false);
    }
  });

  d.on('error', function() {
    // Swallowing the error on purpose if 'throwInDomainErrHandler' is not
    // set
    if (process.argv.indexOf('throwInDomainErrHandler') !== -1)
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
    if (typeof cmdLineOption === 'object') {
      options = cmdLineOption;
      cmdLineOption = undefined;
    }

    var forkOptions;
    if (cmdLineOption) {
      forkOptions = { execArgv: [cmdLineOption] };
    }

    var throwInDomainErrHandlerOpt;
    if (options.throwInDomainErrHandler)
     throwInDomainErrHandlerOpt = 'throwInDomainErrHandler';

    var setupProcessOnUncaughtExceptionHandlerOpt;
    if (options.setupProcessOnUncaughtExceptionHandler)
     setupProcessOnUncaughtExceptionHandlerOpt = 'setupProcessOnUncaughtExceptionHandler';

    var child = fork(process.argv[1], [
                       'child',
                       throwInDomainErrHandlerOpt,
                       setupProcessOnUncaughtExceptionHandlerOpt
                     ],
                     forkOptions);

    var uncaughtExceptionHandlerFired = false;

    if (child) {
      child.on('exit', function onChildExited(exitCode, signal) {
        var expectedExitCode = 0;
        if (options.throwInDomainErrHandler) {
         if (cmdLineOption === '--abort-on-uncaught-exception')
            expectedExitCode = null;
          else if (!options.setupProcessOnUncaughtExceptionHandler)
            expectedExitCode = 7;
        }

        var expectedSignal = null;
        if (options.throwInDomainErrHandler &&
            cmdLineOption === '--abort-on-uncaught-exception') {
          expectedSignal = 'SIGABRT';
        }

        assert.equal(exitCode, expectedExitCode);
        assert.equal(signal, expectedSignal);
      });
    }
  }

  testDomainExceptionHandling('--abort-on-uncaught-exception', {
                              throwInDomainErrHandler: false,
                            });

  testDomainExceptionHandling('--abort-on-uncaught-exception', {
                              throwInDomainErrHandler: true
                            });

  testDomainExceptionHandling('--abort-on-uncaught-exception', {
                              throwInDomainErrHandler: true,
                              setupProcessOnUncaughtExceptionHandler: true
                            });

  testDomainExceptionHandling({ throwInDomainErrHandler: false });
  testDomainExceptionHandling({ throwInDomainErrHandler: true });
  testDomainExceptionHandling({
    throwInDomainErrHandler: true,
    setupProcessOnUncaughtExceptionHandler: true
  });
}
