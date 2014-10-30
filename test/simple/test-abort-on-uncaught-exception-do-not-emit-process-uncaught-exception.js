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

var fork = require('child_process').fork;

var WITH_DOMAIN_ERR_HANDLER_OPT = '--with-domain-err-handler';

var CALL_TYPE_SYNC_CMD_OPT = '--sync';
var CALL_TYPE_NEXT_TICK_CMD_OPT = '--next-tick';
var CALL_TYPE_CALLBACK_CMD_OPT  = '--callback';

var CALL_TYPES = {
  sync: CALL_TYPE_SYNC_CMD_OPT,
  nextTick: CALL_TYPE_NEXT_TICK_CMD_OPT,
  callback: CALL_TYPE_CALLBACK_CMD_OPT
};

function testSetupToCmdLineOpts(testSetup) {
  var cmdLineOpts = [];

  if (testSetup.withDomainErrHandler)
    cmdLineOpts.push(WITH_DOMAIN_ERR_HANDLER_OPT)

  if (testSetup.callType)
    cmdLineOpts.push(CALL_TYPES[testSetup.callType]);

  return cmdLineOpts;
}

if (process.argv[2] === 'child') {
  var assert = require('assert');

  process.on('uncaughtException', function onUncaughtEx(e) {
    process.send('triggeredProcessUncaughtExHandler');
  });

  function doThrowCall() {
    var error = new Error('Foo');

    if (process.argv.indexOf(CALL_TYPE_SYNC_CMD_OPT) !== -1) {
      throw error;
    } else if (process.argv.indexOf(CALL_TYPE_NEXT_TICK_CMD_OPT) !== -1) {
      process.nextTick(function onNextTick() {
        throw error;
      });
    } else if (process.argv.indexOf(CALL_TYPE_CALLBACK_CMD_OPT) !== -1) {
      require('fs').readFile('/non/existing/file', function onFileRead() {
        throw error;
      });
    } else {
      assert(false, 'Invalid call type!');
    }
  }

  if (process.argv.indexOf(WITH_DOMAIN_ERR_HANDLER_OPT) !== -1) {
    var domain = require('domain');
    var d = domain.create();

    d.on('error', function onDomainError(err) {
      throw new Error('Error from domain err handler');
    });

    d.run(function() {
      doThrowCall();
    });
  } else {
    doThrowCall();
  }
} else {
  function test(testSetup) {
    var child = fork(__filename,
                     ['child'].concat(testSetupToCmdLineOpts(testSetup)),
                     { execArgv: ['--abort-on-uncaught-exception']});

    child.on('message', function onChildMsg(msg) {
      if (msg === 'triggeredProcessUncaughtExHandler') {
        assert(false,
               "Child triggered process' uncaught exception handler, but " +
               " should not have.");
      }
    });
  }

  var callTypes = ['sync', 'nextTick', 'callback'];
  var testSetups = [];
  callTypes.forEach(function(callType) {
    testSetups.push({callType: callType, withDomainErrHandler: true});
    testSetups.push({callType: callType, withDomainErrHandler: false});
  });

  testSetups.forEach(function(testSetup) {
    test(testSetup);
  });
}


