/*jshint node: true, indent:2, loopfunc: true, asi: true, undef:true*/

var Fiber = require('fibers')

// Takes function and returns its synchronized version, it's still backward compatible and
// can be used as asynchronous `syncFn = sync(asyncFn)`.
//
// Or You can provide object and it will synchronize its functions `sync(obj, fname1, fname2, ...)`.
//
// New synchronized version of function is backward compatible and You may call it as usual with
// explicit callback or inside of `fiber` with `aware` and `defer` keywords.
var sync = module.exports = function(){
  if(arguments.length > 1){
    // Synchronizing functions of object.
    var obj = arguments[0]
    for(var i = 1; i < arguments.length; i++){
      var fname = arguments[i]
      var fn = obj[fname]
      if(!fn) throw new Error("object doesn't have '" + fname + "' function!")
      obj[fname] = sync(fn)
    }
  }else{
    return sync.syncFn(arguments[0])
  }
}

var nextTick = global.setImmediate || process.nextTick || function(cb) { setTimeout(cb, 0) }

// Sometimes `Fiber` needed outside of `sync`.
sync.Fiber = Fiber

// Takes function and returns its synchronized version, it's still backward compatible and can
// be used as asynchronous.
sync.syncFn = function(fn){
  // Preventing function to be synchronized twice.
  if(fn._synchronized) return fn

  var syncFn = function(){
    // Using fibers only if there's active fiber and callback not provided explicitly.
    if(Fiber.current && (typeof arguments[arguments.length-1] !== 'function')){
      // Calling asynchronous function with our special fiber-aware callback.
      Array.prototype.push.call(arguments, sync.defer())
      fn.apply(this, arguments)

      // Waiting for asynchronous result.
      return sync.await()
    }else{
      // If there's no active fiber or callback provided explicitly we call original version.
      return fn.apply(this, arguments)
    }
  }

  // Marking function as synchronized.
  syncFn._synchronized = true

  return syncFn
}
// Use it to wait for asynchronous callback.
sync.await = Fiber.yield

// Creates fiber-aware asynchronous callback resuming current fiber when it will be finished.
sync.defer = function(){
  if(!Fiber.current) throw new Error("no current Fiber, defer can't be used without Fiber!")
  if(Fiber.current._syncParallel) return sync.deferParallel()
  else return sync.deferSerial()
}

// Exactly the same as defer, but additionally it triggers an error if there's no response
// on time.
sync.deferWithTimeout = function(timeout, message){
  if(!Fiber.current) throw new Error("no current Fiber, deferWithTimeout can't be used without Fiber!")
  if(!timeout) throw new Error("no timeout provided!")
  if(Fiber.current._syncParallel) throw new Error("deferWithTimeout can't be used in parallel!")

  var defer = this.defer()
  var error = new Error(message || "defer timed out!")
  var called = false
  var d = setTimeout(function(){
    if(called) return
    called = true
    defer(error)
  }, timeout)

  return function(){
    if(called) return
    called = true
    clearTimeout(d)
    return defer.apply(this, arguments)
  }
}

//
sync.deferSerial = function(){
  var fiber = Fiber.current
  if(!fiber) throw new Error("no current Fiber, defer can't be used without Fiber!")
  // if(fiber._defered) throw new Error("invalid usage, should be clear previous defer!")
  // fiber._defered = true
  // Prevent recursive call
  var called = false
  // Returning asynchronous callback.
  return function(err, result){
    if (called) throw new Error("defer can't be used twice!")
    called = true

    // Wrapping in nextTick as a safe measure against not asynchronous usage.
    nextTick(function(){
      // fiber._defered = false
      if(fiber._syncIsTerminated) return
      if(err){
        // Resuming fiber and throwing error.
        fiber.throwInto(err)
      }else{
        // Resuming fiber and returning result.
        fiber.run(result)
      }
    })
  }
}

sync.deferParallel = function(){
  var fiber = Fiber.current
  if(!fiber) throw new Error("no current Fiber, defer can't be used without Fiber!")
  if(!fiber._syncParallel) throw new Error("invalid usage, should be called in parallel mode!")
  var data = fiber._syncParallel

  // Counting amount of `defer` calls.
  data.called += 1
  var resultIndex = data.called - 1

  // Returning asynchronous callback.
  return function(err, result){
    // Wrapping in nextTick as a safe measure against not asynchronous usage.
    nextTick(function(){
      if(fiber._syncIsTerminated) return
      // Error in any of parallel call will result in aborting all of the calls.
      if(data.errorHasBeenThrown) return
      if(err){
        data.errorHasBeenThrown = true
        // Resuming fiber and throwing error.
        fiber.throwInto(err)
      }else{
        data.returned += 1
        data.results[resultIndex] = result
        // Resuming fiber and returning result when all callbacks finished.
        if(data.returned == data.called) fiber.run(data.results)
      }
    })
  }
}

sync.defers = function(){
  if(!Fiber.current) throw new Error("no current Fiber, defer can't be used without Fiber!")
  if(Fiber.current._syncParallel) return sync.defersParallel.apply(sync, arguments)
  else return sync.defersSerial.apply(sync, arguments)
}

sync.defersSerial = function(){
  var fiber = Fiber.current;
  if(!fiber) throw new Error("no current Fiber, defer can't be used without Fiber!")
  // if(fiber._defered) throw new Error("invalid usage, should be clear previous defer!")
  // fiber._defered = true

  var kwds = Array.prototype.slice.call(arguments)

  // Prevent recursive call
  var called = false
  // Returning asynchronous callback.
  return function(err) {
    if (called) throw new Error("defer can't be used twice!")
    called = true
    // Wrapping in nextTick as a safe measure against not asynchronous usage.
    var args = Array.prototype.slice.call(arguments, 1)
    nextTick(function(){
      // fiber._defered = false
      if(fiber._syncIsTerminated) return
      if (err) {
        // Resuming fiber and throwing error.
        fiber.throwInto(err)
      } else {
        var results;
        if(!kwds.length){
          results = args
        } else {
          results = {}
          kwds.forEach(function(kwd, i){
            results[kwd]=args[i]
          })
        }
        fiber.run(results)
      }
    })
  }
}

sync.defersParallel = function(){
  var fiber = Fiber.current
  if(!fiber) throw new Error("no current Fiber, defer can't be used without Fiber!")
  if(!fiber._syncParallel) throw new Error("invalid usage, should be called in parallel mode!")
  var data = fiber._syncParallel
  // Counting amount of `defer` calls.
  data.called += 1
  var resultIndex = data.called - 1

  var kwds = Array.prototype.slice.call(arguments)
  // Returning asynchronous callback.
  return function(err) {
    // Wrapping in nextTick as a safe measure against not asynchronous usage.
    var args = Array.prototype.slice.call(arguments, 1)
    nextTick(function(){
      if(fiber._syncIsTerminated) return

      // Error in any of parallel call will result in aborting all of the calls.
      if(data.errorHasBeenThrown) return
      if (err) {
        data.errorHasBeenThrown = true
        // Resuming fiber and throwing error.
        fiber.throwInto(err)
      }
      var results;
      if(!kwds.length){
        results = args
      } else {
        results = {}
        kwds.forEach(function(kwd, i){
          results[kwd]=args[i]
        })
      }
      data.returned += 1
      data.results[resultIndex] = results
      if(data.returned == data.called) fiber.run(data.results)
    })
  }
}

// Support for parallel calls, all `defer` calls within callback will be
// performed in parallel.
sync.parallel = function(cb){
  var fiber = Fiber.current
  if(!fiber) throw new Error("no current Fiber, defer can't be used without Fiber!")

  // Enabling `defer` calls to be performed in parallel.
  // There's an important note - error in any parallel call will result in aborting
  // all of the parallel calls.
  fiber._syncParallel = {called: 0, returned: 0, results: [], errorHasBeenThrown: false}
  try{
    cb.call(this)
  }finally{
    // If neither `defer` nor `defers` were called within the callback, we need
    // to run the fiber ourselves or else the fiber will unwind when `await` is called.
    // This might happen if the user intended to enumerate an array within the
    // callback, calling `defer` once per array item, but the array was empty.
    if (!fiber._syncParallel.called) {
      nextTick(function(){
        // Return an empty array to represent that there were no results.
        if(!fiber._syncIsTerminated) fiber.run([])
      })
    }
    delete fiber._syncParallel
  }
}

// Executes `cb` within `Fiber`, when it finish it will call `done` callback.
// If error will be thrown during execution, this error will be catched and passed to `done`,
// if `done` not provided it will be just rethrown.
sync.fiber = function(cb, done){
  var that = this
  var fiber = Fiber(function(){
    // Prevent restart fiber
    if (Fiber.current._started) return
    if (done) {
      var result
      try {
        result = cb.call(that)
        Fiber.current._syncIsTerminated = true
      } catch (error){
        return done(error)
      }
      done(null, result)
    } else {
      // Don't catch errors if done not provided!
      cb.call(that)
      Fiber.current._syncIsTerminated = true
    }
  })
  fiber.run()
  fiber._started = true
}

// Asynchronous wrapper for mocha.js tests.
//
//   async = sync.asyncIt
//   it('should pass', async(function(){
//     ...
//   }))
//
sync.asyncIt = function(cb){
  if(!cb) throw "no callback for async spec helper!"
  return function(done){sync.fiber(cb.bind(this), done)}
}

// Same as `sync` but with verbose logging for every method invocation.
// Ignore this method, it shouldn't be used unless you want to track down
// tricky and complex bugs and need full information abouth how and when all
// this async stuff has been called.
var fiberIdCounter = 1
sync.syncWithDebug = function(){
  if(arguments.length > 1){
    // Synchronizing functions of object.
    var obj = arguments[0]
    for(var i = 1; i < arguments.length; i++){
      (function(fname){
        var fn = obj[fname]
        if(!fn) throw new Error("object doesn't have '" + fname + "' function!")
        var syncedFn = sync(fn)
        obj[fname] = function(){
          if(Fiber.current && Fiber.current._fiberId === undefined){
            Fiber.current._fiberId = fiberIdCounter
            fiberIdCounter = fiberIdCounter + 1
            Fiber.current._callbackLevel = 0
          }

          var fiberId = '-'
          if(Fiber.current){
            fiberId = Fiber.current._fiberId
            Fiber.current._callbackLevel = Fiber.current._callbackLevel + 1
          }

          var indent = '    '
          if(Fiber.current)
            for(var j = 0; j < Fiber.current._callbackLevel; j++) indent = indent + '  '

          console.log(fiberId + indent + this.constructor.name + '.' +
          fname + " called", JSON.stringify(arguments))

          var result
          try{
            result = syncedFn.apply(this, arguments)
          }finally{
            console.log(fiberId + indent + this.constructor.name + '.' +
            fname + " finished")

            if(Fiber.current)
              Fiber.current._callbackLevel = Fiber.current._callbackLevel - 1
          }
          return result
        }
      })(arguments[i])
    }
  }else{
    return sync.syncFn(arguments[0])
  }
}
