'use strict';

const assert = require('assert-plus');
const promisify = require('es6-promisify');
const fs = require('fs');

const fsOpen = promisify(fs.open);
const fsStat = promisify(fs.fstat);
const fsSync = promisify(fs.fsync);
const fsTruncate = promisify(fs.ftruncate);
const fsAccess = promisify(fs.access);
const fsClose = promisify(fs.close);

const $fd = Symbol('fd');
const $name = Symbol('name');
const $size = Symbol('size');
const $writable = Symbol('writable');

/**
 * Random access file wrapper.
 */
class RandomAccessFile {

  /**
   * Constructs a new instance.
   * @param {string} name - the file name on which the file descriptor was opened.
   * @param {Any} fd - the file descriptor, opened for random access
   * @param {number} size - the file's size in bytes
   * @param {bool} writable - indicates whether the file was opened writable
   */
  constructor(name, fd, size, writable) {
    assert.string(name, 'name');
    assert.number(fd, 'fd');
    assert.number(size, 'size');
    assert.optionalBool(writable, 'writable');
    this[$name] = name;
    this[$fd] = fd;
    this[$size] = size;
    this[$writable] = writable;
  }

  /**
   * @type {object} the file's opaque file descriptor.
   */
  get descriptor() { return this[$fd]; }
  /**
   * @type {string} the file's name.
   */
  get name() { return this[$name]; }
  /**
   * @type {number} the file's size in bytes.
   */
  get size() {
    assert.ok(this[$fd], 'Invalid state; file closed.');
    return this[$size];
  }
  /**
   * @type {bool} indicates whether the file was opened in a writable mode.
   */
  get writable() { return this[$writable]; }

  /*
   * Reads the specified number of bytes from the file beginning at the
   * specified offset.
   * @param {number} offset - the byte index of the first byte to read
   * @param {number} length = the number of bytes to read
   * @returns {Promise} a promise that upon success will be resolved with a Buffer containing the bytes read.
   */
  read(offset, length) {
    assert.number(offset, 'offset');
    assert.number(length, 'length');
    if (!this[$fd]) return Promise.reject(new Error(`Invalid state; file closed: ${this.name}.`));
    let data = new Buffer(length);
    if (length === 0) return Promise.resolve(data);

    return new Promise((resolve, reject) => {
      let totalBytes = 0;
      let possiblyIncrementalRead = (err, bytes) => {
        if (err) {
          reject(err);
          return;
        }
        if (!bytes) {
          reject(new Error('Unexpected end of file'));
          return;
        }
        length -= bytes;
        if (length === 0) {
          resolve(data);
          return;
        }
        offset += bytes;
        totalBytes += bytes;
        if (!this[$fd]) {
          reject(new Error('Invalid state; file closed.'));
        } else {
          fs.read(this[$fd], data, totalBytes, length, offset, possiblyIncrementalRead);
        }
      };
      fs.read(this[$fd], data, 0, length, offset, possiblyIncrementalRead);
    });
  }

  /*
   * Writes the specified bytes to the file beginning at the specified offset.
   * @param {number} offset - the byte index where writing will begin
   * @param {Buffer} data - the bytes to be written to the file
   * @param {number} first - (optional) the first byte to write from the data buffer
   * @param {number} length - (optional) the number of bytes to write from the buffer
   * @returns {Promise} a promise that upon success will be resolved with the index of the byte following the last byte written (convenient for successive writes)
   */
  write(offset, data, first, length) {
    assert.number(offset, 'offset');
    assert.ok(Buffer.isBuffer(data), 'data (Buffer) is required');
    assert.optionalNumber(first, 'first');
    assert.optionalNumber(length, 'length');
    if (!this[$fd]) return Promise.reject(new Error(`Invalid state: file closed: ${this.name}`));
    if (!this.writable) return Promise.reject(new Error(`Invalid state; file opened read only: ${this.name}.`));
    first = (first !== undefined) ? first : 0;
    length = (length !== undefined) ? length : data.length;

    return new Promise((resolve, reject) => {
      let totalBytes = 0;
      let possiblyIncrementalWrite = (err, bytes) => {
        if (err) {
          reject(err);
          return;
        }
        if (!bytes) {
          reject(new Error('Unexpected end of file'));
          return;
        }
        length -= bytes;
        offset += bytes;
        if (offset > this[$size]) {
          // record writes at end of file...
          this[$size] = offset;
        }
        if (length === 0) {
          resolve(offset);
          return;
        }
        totalBytes += bytes;
        if (!this[$fd]) {
          reject(new Error('Invalid state; file closed.'));
        } else {
          fs.write(this[$fd], data, first + totalBytes, length, offset, possiblyIncrementalWrite);
        }
      };
      fs.write(this[$fd], data, first, length, offset, possiblyIncrementalWrite);
    });
  }

  /*
   * Syncronizes the underlying storage device by writing through the disk cache if such is present.
   * @returns {Promise} a promise that is resolved upon success.
   */
  sync() {
    if (!this[$fd]) return Promise.reject(new Error(`Invalid state: file closed: ${this.name}`));
    return fsSync(this[$fd]);
  }

  /*
   * Truncates the underlying file to precisely the length specified (bytes).
   * @param {number} length - the desired byte length.
   * @returns {Promise} a promise that is resolved upon success.
   */
  truncate(length) {
    assert.number(length, 'length');
    if (!this[$fd]) return Promise.reject(new Error(`Invalid state: file closed: ${this.name}`));
    return fsTruncate(this[$fd], length)
      .then(() => {
        this[$size] = length;
        return length;
      });
  }

  /*
   * Closes the file.
   * @returns {Promise} a promise that is resolved upon success.
   */
  close() {
    if (!this[$fd]) return Promise.resolve();
    return fsClose(this[$fd])
      .then(() => {
        this[$fd] = null;
      });
  }

}

/*
 * Opens the specified file for random access.
 * @param {string} path - the file's fully qualified name
 * @param {bool} writable - indicates whether the file is opened writable
 * @returns {Promise} a promise that upon success is resolved with an instance of RandomAccessFile opened on specified file.
 */
function open(path, writable) {
  assert.string(path, 'path');
  assert.optionalBool(writable, 'writable');
  writable = writable === true;
  let flags = 'r';
  if (writable) {
    flags += '+';
  }
  return fsAccess(path)
    .then(() => fsOpen(path, flags))
    .then(fd => fsStat(fd)
      .then(st => new RandomAccessFile(path, fd, st.size, writable)));
}
/*
 * Creates the specified file and opens it for reading and writing.
 * @param {string} path - the file's fully qualified name
 * @returns {Promise} a promise that upon success is resolved with an instance of RandomAccessFile opened on the newly created file.
 */
function create(path) {
  assert.string(path, 'path');
  let flags = 'wx+';
  return fsOpen(path, flags)
    .then(fd => fsStat(fd)
      .then(st => new RandomAccessFile(path, fd, st.size, true)));
}

RandomAccessFile.open = open;
RandomAccessFile.create = create;

module.exports = RandomAccessFile;
