var sync   = require('../synchronize')
var expect = require('expect.js')

describe('sync', function(){
  it('should synchronize function', function(done){
    var fn = function(a, b, callback){
      expect(a).to.be('a')
      expect(b).to.be('b')
      setTimeout(function(){
        callback(null, 'ok')
      }, 10)
    }
    var syncFn = sync(fn)
    sync.fiber(function(){
      expect(syncFn('a', 'b')).to.be('ok')
    }, done)
  }),

  it("should synchronize object functions", function(done){
    var obj = {
      name : 'obj',
      fn   : function(a, b, callback){
        expect(a).to.be('a')
        expect(b).to.be('b')
        setTimeout(function(){
          callback(null, 'ok')
        }, 10)
      }
    }
    sync.fiber(function(){
      expect(sync(obj, 'fn')('a', 'b')).to.be('ok')
    }, done)
  }),

  it("should catch asynchronous errors", function(done){
    var obj = {
      name : 'obj',
      fn   : function(callback){
        setTimeout(function(){
          callback(new Error('an error'))
        }, 10)
      }
    }
    sync.fiber(function(){
      var err
      try {
        sync(obj, 'fn')()
      } catch (e) {
        err = e
      }
      expect(err.message).to.be('an error')
    }, done)
  }),

  it("should be compatible with not asynchronous callbacks", function(done){
    var obj = {
      name : 'obj',
      fn   : function(callback){
        callback(null, 'ok')
      }
    }
    sync.fiber(function(){
      expect(sync(obj, 'fn')()).to.be('ok')
    }, done)
  }),

  it("should catch non asynchronous errors", function(done){
    var obj = {
      name : 'obj',
      fn   : function(callback){
        callback(new Error('an error'))
      }
    }
    sync.fiber(function(){
      var err
      try {
        sync(obj, 'fn')()
      } catch (e) {
        err = e
      }
      expect(err.message).to.be('an error')
    }, done)
  })
})