var sync   = require('../sync')
var Fiber = require('fibers')
var expect = require('chai').expect

describe('Control Flow', function(){
  var fn = function(arg, cb){
    expect(arg).to.eql('something')
    process.nextTick(function(){
      cb(null, 'ok')
    })
  }

  it('should provide await & defer', function(done){
    sync.fiber(function(){
      var result = sync.await(fn('something', sync.defer()))
      expect(result).to.eql('ok')
    }, done)
  })

  it('should synchronize function', function(done){
    fn = sync(fn)
    sync.fiber(function(){
      expect(fn('something')).to.eql('ok')
    }, done)
  })

  it('should be save aginst synchronizing function twice', function(done){
    fn = sync(sync(fn))
    sync.fiber(function(){
      expect(fn('something')).to.eql('ok')
    }, done)
  })

  it('should allow call synchronized function explicitly', function(done){
    fn = sync(fn)
    fn('something', function(err, result){
      expect(result).to.eql('ok')
      done(err)
    })
  })

  it("should catch asynchronous errors", function(done){
    var fn = function(cb){
      process.nextTick(function(){
        cb(new Error('an error'))
      })
    }
    fn = sync(fn)
    sync.fiber(function(){
      var err
      try {
        fn()
      } catch (e) {
        err = e
      }
      expect(err.message).to.eql('an error')
    }, done)
  })

  it("should be compatible with not asynchronous cbs", function(done){
    fn = function(cb){
      cb(null, 'ok')
    }
    fn = sync(fn)
    sync.fiber(function(){
      expect(fn()).to.eql('ok')
    }, done)
  })

  it("should catch non asynchronous errors", function(done){
    fn = function(cb){
      cb(new Error('an error'))
    }
    fn = sync(fn)
    sync.fiber(function(){
      var err
      try {
        fn()
      } catch (e) {
        err = e
      }
      expect(err.message).to.eql('an error')
    }, done)
  })

  describe("Special cases", function(){
    it('should be able to emulate sleep', function(done){
      var sleep = function(ms){
        sync.await(setTimeout(sync.defer(), ms))
      }

      sync.fiber(function(){
        var start = new Date().getTime()
        sleep(50)
        expect(new Date().getTime()).to.be.greaterThan(start)
      }, done)
    })
  })

  it('should support parallel calls', function(done){
    sync.fiber(function(){
      var calls = []
      var readA = function(cb){
        calls.push('readA')
        process.nextTick(function(){
          calls.push('nextTick')
          cb(null, 'dataA')
        })
      }
      var readB = function(cb){
        calls.push('readB')
        process.nextTick(function(){
          calls.push('nextTick')
          cb(null, 'dataB')
        })
      }

      sync.parallel(function(){
        readA(sync.defer())
        readB(sync.defer())
      })
      var results = sync.await()

      expect(results).to.eql(['dataA', 'dataB'])
      expect(calls).to.eql(['readA', 'readB', 'nextTick', 'nextTick'])
    }, done)
  })

  it('should support multiple arguments', function(done){
    sync.fiber(function(){
      var read = function(cb){
        process.nextTick(function(){
          cb(null, 'data1', 'data2')
        })
      }

      var result = sync.await(read(sync.defers()))
      expect(result).to.eql(['data1', 'data2'])
    }, done)
  })

  it('should support multiple `named` arguments', function(done){
    sync.fiber(function(){
      var read = function(cb){
        process.nextTick(function(){
          cb(null, 'data1', 'data2')
        })
      }

      var result = sync.await(read(sync.defers('a', 'b')))
      expect(result).to.eql({a: 'data1', b: 'data2'})
    }, done)
  })

  it('should support multiple arguments parallel calls', function(done){
    sync.fiber(function(){
      var read = function(cb){
        process.nextTick(function(){
          cb(null, 'data1', 'data2')
        })
      }

      sync.parallel(function(){
        read(sync.defers())
        read(sync.defers('a', 'b'))
      })
      var results = sync.await()
      expect(results).to.eql([['data1', 'data2'], {a: 'data1', b: 'data2'}])
    }, done)
  })

  it('should return result from fiber', function(done){
    sync.fiber(function(){
      return 'some value'
    }, function(err, result){
      expect(err).to.eql(null)
      expect(result).to.eql('some value')
      done()
    })
  })

  beforeEach(function(){
    this.someKey = 'some value'
  })
  it('should provide asyncIt helper for tests', sync.asyncIt(function(){
    expect(Fiber.current).to.exist
    expect(this.someKey).to.eql('some value')
  }))
})
