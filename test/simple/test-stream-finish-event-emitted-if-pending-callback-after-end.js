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

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

var util = require('util');
var stream = require('stream');
var assert = require('assert');

function MyWritableStream() {
  stream.Writable.call(this);
}

util.inherits(MyWritableStream, stream.Writable)

MyWritableStream.prototype._write = function _write(chunk, encoding, cb) {
  if (cb) return cb(new Error("Fake err"));
}

var writableStream = new MyWritableStream();

writableStream.on('error', function onError(err) {
});

var finishListenerCalled = false;
writableStream.on('finish', function onFinish() {
  finishListenerCalled = true;
});

writableStream.write('foo');
writableStream.end();

process.on('exit', function onTestExit() {
  assert.ok(finishListenerCalled,
            "writable's finish event hasn't been emitted, but should have.");
});
