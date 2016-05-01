'use strict';

const crypto = require('crypto');
const expect = require('expect.js');
const fs = require('fs');
const temp = require('temp');
const RandomAccessFile = require('../lib/random-access-file');

temp.track();

function randomInt(low, high) {
  return Math.floor(Math.random() * (high - low) + low);
}

describe('RandomAccessFile', function() {

  let filePath;

  before(function(done) {
    // create a temporary filePath for our random-access...
    temp.open('raf', function(err, info) {
      if (err) {
        done(err);
        return;
      }
      filePath = info.path;
      fs.close(info.fd, done);
    });
  });

  describe('.open()', function() {

    it('fails to open non-existent file', function(done) {
      RandomAccessFile.open(filePath + 'na-na-none')
        .then(() => {
          done(new Error('shouldna'));
        })
        .catch(err => {
          expect(err.code).to.be('ENOENT');
          done();
        });
    });

    describe('.open(path, true)', function() {

      let file;

      before(function(done) {
        RandomAccessFile.open(filePath, true)
          .then(raf => {
            file = raf;
            done();
          }).catch(done);
      });

      it('resolves instanceof RandomAccessFile', function() {
        expect(file).to.be.a(RandomAccessFile);
      });

      it('is writable', function() {
        expect(file.writable).to.be(true);
      });

      it('can read and write from random file positions', function(done) {
        let min = 8;
        let max = 1024;
        let count = 100;
        let reads = 10 * count;
        let records = [];
        let offset = 0;

        // generate many random buffers
        for (let i = 0; i < count; ++i) {
          let bytes = randomInt(min, max);
          let data = new Buffer(crypto.randomBytes(bytes), 'binary');
          records.push({ offset, bytes, data });
          offset += bytes;
        }

        let series = records.reduce((acc, rec) => {
          return acc.then(offset => {
            return file.write(offset, rec.data);
          });
        }, Promise.resolve(0));

        function compareData(expected, actual) {
          expect(actual.toString('hex')).to.eql(expected.toString('hex'));
        }

        function readCompareRecord(rec) {
          return file.read(rec.offset, rec.bytes)
            .then(compareData.bind(null, rec.data))
            .catch(done);
        }

        series.then(size => {
          expect(size).to.be(file.size);

          // ramdomly read the records and compare them to the
          // values written...
          let comparisons = Promise.resolve();
          for (let i = 0; i < reads; ++i) {
            let j = randomInt(0, count);
            let rec = records[j];
            comparisons = comparisons.then(readCompareRecord(rec));
          }
          comparisons.then(done);
        });


      });

      after(function(done) {
        file.close()
          .then(() => done())
          .catch(done);
      });

    });

    describe('.open(path)', function() {

      let file;

      before(function(done) {
        RandomAccessFile.open(filePath)
          .then(raf => {
            file = raf;
            done();
          }).catch(done);
      });

      it('resolves instanceof RandomAccessFile', function() {
        expect(file).to.be.a(RandomAccessFile);
      });

      it('is implicitly readonly', function() {
        expect(file.writable).to.be(false);
      });

      after(function(done) {
        file.close()
          .then(() => done())
          .catch(done);
      });

    });

  });

});
