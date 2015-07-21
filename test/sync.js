/*jshint node: true, indent:2, loopfunc: true, asi: true, undef:true, mocha: true */

// require('longjohn')

var sync   = require('../sync')
var Fiber = require('fibers')
var expect = require('chai').expect

describe('Control Flow', function(){
  var waitAndReturn = function(time, err, value, cb){
    setTimeout(function(){cb(err, value)}, time)
  }

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

  it('should fiber call just once at raise error', function(done){
    var read = function(cb){
      process.nextTick(function(){
        cb(new Error('an error'))
      })
    }

    var called = 0
    sync.fiber(function(){
      called += 1
      sync.await(read(sync.defers()))
    }, function() {})

    setTimeout(function(){
      expect(called).to.eql(1)
      done()
    }, 100)
  })

  it('should handle parallel errors', function(done){
    sync.fiber(function(){
      var calls = []
      var readA = function(cb){
        process.nextTick(function(){
          cb(new Error("error a"))
        })
      }
      var readB = function(cb){
        process.nextTick(function(){
          cb(new Error("error b"))
        })
      }

      try {
        sync.parallel(function(){
          readA(sync.defer())
          readB(sync.defer())
        })
        var results = sync.await()
      }catch(err){
        if(err.message == 'error a') expect(err.message).to.eql('error a')
        else expect(err.message).to.eql('error b')
      }
    }, done)
  })

  it('should handle parallel errors with multiple arguments', function(done){
    sync.fiber(function(){
      var calls = []
      var readA = function(cb){
        process.nextTick(function(){
          cb(new Error("error a"))
        })
      }
      var readB = function(cb){
        process.nextTick(function(){
          cb(new Error("error b"))
        })
      }

      try {
        sync.parallel(function(){
          readA(sync.defers())
          readB(sync.defers())
        })
        var results = sync.await()
      }catch(err){
        if(err.message == 'error a') expect(err.message).to.eql('error a')
        else expect(err.message).to.eql('error b')
      }
    }, done)
  })

  it('should not unwind when await is called after an empty parallel block', function(done){
    sync.fiber(function(){
      sync.parallel(function(){
        // Imagine that the user intends to enumerate an array here, calling
        // `defer` once per array item, but the array is empty.
      })
      expect(sync.await()).to.eql([])
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

  it('should abort on timeout', function(done){
    sync.fiber(function(){
      waitAndReturn(10, null, 'some result', sync.deferWithTimeout(100))
      expect(sync.await()).to.eql('some result')

      try{
        waitAndReturn(10, null, 'some result', sync.deferWithTimeout(1))
        expect(sync.await()).to.eql('some result')
      }catch(err){
        expect(err.message).to.eql('defer timed out!')
      }
    }, done)
  })

  // TODO, add also the same specs for `defers`.
  it('should not resume terminated fiber with value', function(done){
    var runCount = 0
    var results = []
    sync.fiber(function(){
      runCount += 1
      waitAndReturn(1, null, 'some value', sync.defer())
    }, function(err){
      results.push(err || null)
    })

    // Need to wait for some time after the fiber ends its execution to make sure
    // it won't be runned one more time.
    setTimeout(function(){
      expect(runCount).to.eql(1)
      expect(results.length).to.eql(1)
      expect(results[0]).to.eql(null)
      done()
    }, 10)
  })

  // TODO, add also the same specs for `defers`.
  it('should not resume terminated fiber with error', function(done){
    var runCount = 0
    var results = []
    sync.fiber(function(){
      runCount += 1
      waitAndReturn(1, (new Error('some error')), null, sync.defer())
    }, function(err){
      results.push(err)
    })

    // Need to wait for some time after the fiber ends its execution to make sure
    // it won't be runned one more time.
    setTimeout(function(){
      expect(runCount).to.eql(1)
      expect(results.length).to.eql(1)
      expect(results[0]).to.eql(null)
      done()
    }, 10)
  })

  it('should call terminate callback just once', function(done) {
    var callCount = 0
    var callback = function(error) {
      callCount += 1
      throw new Error('some error')
    }
    expect(function() {sync.fiber(function() {}, callback)}).to.throw(Error)
    setTimeout(function() {
      expect(callCount).to.eql(1)
      done()
    }, 10)
  })

  it('should throw error if defer called twice', function(done){
    sync.fiber(function(){
      var defer = sync.defer()
      defer()
      sync.await()
      expect(defer).to.throw(Error)
    }, done)
  })

  it('should call defer only once in the fiber process', function(done){
    var broken = function(cb) {
      sync.fiber(function() {
        cb()
      }, cb)
    }
    sync.fiber(function(){
      broken(sync.defer())
      sync.await()
      throw new Error('an error')
    }, function(err) {
      expect(err).to.exist
      expect(err.message).to.eql("defer can't be used twice!")
      done()
    })
  })

  it('should throw error if defers called twice', function(done){
    sync.fiber(function(){
      var defer = sync.defers()
      defer()
      sync.await()
      expect(defer).to.throw(Error)
    }, done)
  })

  it('should prevent defers call just once in fiber process', function(done){
    var broken = function(cb) {
      sync.fiber(function() {
        cb()
      }, cb)
    }
    sync.fiber(function(){
      broken(sync.defers())
      sync.await()
      throw new Error('an error')
    }, function(err) {
      expect(err).to.exist
      expect(err.message).to.eql("defer can't be used twice!")
      done()
    })
  })

  it('should prevent restart fiber', function(done){
    var currentFiber
    var called = 0
    sync.fiber(function(){
      called += 1
      currentFiber = sync.Fiber.current
    })
    setTimeout(function() {
      currentFiber.run()
    }, 1)
    setTimeout(function() {
      expect(called).to.eql(1)
      done()
    }, 10);
  })

  it('should throw error when not matched defer-await pair', function(done){
    sync.fiber(function(){
	    process.nextTick(sync.defer());
      expect(function() { process.nextTick(sync.defer()) }).to.throw(Error)
      sync.await()
	    process.nextTick(sync.defers());
      expect(function() { process.nextTick(sync.defers()) }).to.throw(Error)
      sync.await()
    }, done)
  })

  beforeEach(function(){
    this.someKey = 'some value'
  })
  it('should provide asyncIt helper for tests', sync.asyncIt(function(){
    expect(Fiber.current).to.exist
    expect(this.someKey).to.eql('some value')
  }))
})
