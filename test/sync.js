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
    sync.fiber(function(){
      var obj = {name: 'obj'}
      expect(sync(fn).call(obj, 'a', 'b')).to.be('ok')
    }, done)
  }),

  it("should execute within context", function(done){
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
  })
})