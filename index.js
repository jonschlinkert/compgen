'use strict';

const bashPath = require('bash-path');
const spawn = require('cross-spawn');

function compgen(flags, options) {
  if (typeof flags !== 'string') {
    options = flags;
    flags = '-abck';
  }

  const cp = spawn(bashPath, ['-c', `compgen ${flags}`], options);

  const promise = new Promise((resolve, reject) => {
    let stdout = new Buffer('');
    let stderr = new Buffer('');

    if (cp.stdout) {
      cp.stdout.on('data', data => (stdout = Buffer.concat([stdout, data])));
    }

    if (cp.stderr) {
      cp.stderr.on('data', data => (stderr = Buffer.concat([stderr, data])));
    }

    const cleanupListeners = () => {
      cp.removeListener('error', onError);
      cp.removeListener('close', onClose);
    };

    const onError = err => {
      cleanupListeners();
      reject(err);
    };

    const onClose = code => {
      cleanupListeners();

      const res = createResult(code, stdout, stderr);
      if (res instanceof Error) {
        reject(res);
      } else {
        res.result = uniquify(res.stdout);
        resolve(res);
      }
    };

    cp.on('error', onError);
    cp.on('close', onClose);
  });

  promise.cp = cp;
  return promise;
}

compgen.sync = function(flags, options) {
  if (typeof flags !== 'string') {
    options = flags;
    flags = '-abck';
  }

  const result = spawn.sync(bashPath, ['-c', `compgen ${flags}`], options);

  if (result.error) {
    throw result.error;
  }

  const res = createResult(result.status, result.stdout, result.stderr);
  if (res instanceof Error) {
    throw res;
  }
  res.result = uniquify(res.stdout);
  return res;
};

function createResult(code, stdout, stderr) {
  if (stdout) stdout = stdout.toString();
  if (stderr) stderr = stderr.toString();
  if (code) {
    const err = new Error(`Command failed, exited with code #${code}`);
    return { ...err, code, stdout, stderr };
  }
  return { stdout, stderr };
}

function uniquify(buf) {
  return buf.toString()
    .split(/\r*\n/)
    .filter((e, i, arr) => e && arr.indexOf(e) === i)
    .sort((a, b) => {
      return a.localeCompare(b)
    });
}

module.exports = compgen;
