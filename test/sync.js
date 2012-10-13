var sync   = require('../sync')
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
  }),

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
  }),

  it('should allow call synchronized function explicitly', function(done){
    fn = sync(fn)
    fn('something', function(err, result){
      expect(result).to.eql('ok')
      done(err)
    })
  }),

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
  }),

  it("should be compatible with not asynchronous cbs", function(done){
    fn = function(cb){
      cb(null, 'ok')
    }
    fn = sync(fn)
    sync.fiber(function(){
      expect(fn()).to.eql('ok')
    }, done)
  }),

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
  }),

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
})