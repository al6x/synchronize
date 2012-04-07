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
    var syncObj = sync(obj, 'fn')
    expect(syncObj.__proto__).to.be(obj)
    sync.fiber(function(){
      expect(syncObj.fn('a', 'b')).to.be('ok')
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
    var syncObj = sync(obj, 'fn')
    sync.fiber(function(){
      var err
      try {
        syncObj.fn()
      } catch (e) {
        err = e
      }
      expect(err.message).to.be('an error')
    }, done)
  })
})