# @leisurelink/random-access-file

A simple abstraction for random access files using the promise style, for nodejs.

`@leisurelink/random-access-file` exposes a fairly simple, low-level class, `RandomAccessFile` that is intended for binary data that is frequently accessed out of order.

## Install

```bash
npm install @leisurelink/random-access-file 
```

## Use/Import

[nodejs](https://nodejs.org/en/)
```javascript
const RandomAccessFile = require('@leisurelink/random-access-file')
```

### Module API

**Classes:**

* [`RandomAccessFile`](#user-content-randomaccessfile-class) : _class_ &ndash; a convenience class for working with random access files.

**Functions:**

* [`.create(name)`](#user-content-create)
* [`.open(name, writable)`](#user-content-open)

#### .create(name)

Creates the specified file and opens it for random access.

Note that newly created files are opened in writable node.

_arguments:_
* `name` : _string, required_ &ndash; the file's fully quailified name

_returns:_
* a `Promise` that is resolved with an instance of `RandomAccessFile` opened on the newly created file.

_example:_
```javascript
const RandomAccessFile = require('@leisurelink/random-access-file')

RandomAccessFile.create('/home/me/temp/my-test-file')
  .then(file => {
    // file is open, do with it what you will.
  });
```

#### .open(name, writable)

Opens the specified, existing file.

_arguments:_
* `name` : _string, required_ &ndash; the file's fully quailified name
* `writable` : _boolean, optional_ &ndash; indicates whether the file is opened for writing. Default: **false**

_returns:_
* a `Promise` that is resolved with an instance of `RandomAccessFile` opened on the specified file.

_example:_
```javascript
const RandomAccessFile = require('@leisurelink/random-access-file')

RandomAccessFile.open('/home/me/temp/my-test-file', true)
  .then(file => {
    // file is open, do with it what you will.
  });
```

### `RandomAccessFile` Class

A convenience class for working with random access files.

_properties:_
* `.descriptor` : _object_ &ndash; the file's opaque file descriptor.
* `.name` : _string_ &ndash; the file's name.
* `.size` : _number_ &ndash; the file's size in bytes.
* `.writable` : _boolean_ &ndash; indicates whether the file was opened in a writable mode.

_methods:_
#### .read(offset, length)
Reads the specified number of bytes from the file, starting at the specified offset.

_arguments:_
* `offset` : _number, required_ &ndash; the byte offset where reading will begin.
* `length` : _number, required_ &ndash; then number of bytes to read.

_result:_
* A `Promise` that is resolved with a `Buffer` containing bytes read from the file.

#### .write(offset, data, first, length)
Writes the specified bytes to the file beginning at the specified offset.

_arguments:_
* `offset` : _number, required_ &ndash; the byte offset where writing will begin.
* `data` : _Buffer, required_ &ndash; a `Buffer` containing the bytes that will be written.
* `first` : _number, optional_ &ndash; the first byte that will be written from the specified data.
* `length` : _number, optional_ &ndash; then number of bytes to write from the specified data.

_result:_
* A `Promise` that is resolved with the offset of the byte following the last byte written

#### .sync()
Synchronizes the underlying storage device by writing through the disk cache if such is present.

_result:_
* A `Promise` that is resolved when the file has been flushed.

#### .truncate(length)
Truncates the underlying file to precisely the length specified (bytes).

_arguments:_
* `length` : _number, required_ &ndash; the length of the resulting file.

_result:_
* A `Promise` that is resolved when the file has been truncated.

#### .close()
Closes the file.

_result:_
* A `Promise` that is resolved when the file has been closed.

## License

[MIT](https://github.com/LeisureLink/random-access-file/blob/master/LICENSE)
