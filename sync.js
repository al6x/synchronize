require('fibers')

// Takes function and returns its synchronized version, it's still backward compatible and
// can be used as asynchronous `syncFn = sync(asyncFn)`.
//
// Or You can provide object and it will synchronize its functions `sync(obj, fname1, fname2, ...)`.
//
// New synchronized version of function is backward compatible and You may call it as usual with
// explicit cb or inside of `fiber` with `aware` and `defer` keywords.
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

// Takes function and returns its synchronized version, it's still backward compatible and can
// be used as asynchronous.
sync.syncFn = function(fn){
  // Preventing function to be synchronized twice.
  if(fn._synchronized) return fn

  var syncFn = function(){
    // Using fibers only if there's active fiber and cb not provided explicitly.
    if(Fiber.current && (typeof arguments[arguments.length-1] !== 'function')){
      // Calling asynchronous function with our special fiber-aware cb.
      Array.prototype.push.call(arguments, sync.defer())
      fn.apply(this, arguments)

      // Waiting for asynchronous result.
      return sync.await()
    }else{
      // If there's no active fiber or cb provided explicitly we call original version.
      return fn.apply(this, arguments)
    }
  }

  // Marking function as synchronized.
  syncFn._synchronized = true

  return syncFn
}
// Use it to wait for asynchronous cb.
sync.await = global.yield

// Creates special, fiber-aware asynchronous cb resuming current fiber when it will be finished.
sync.defer = function(){
  var fiber = Fiber.current
  if(!fiber) throw "no current Fiber, defer can'b be used without Fiber!"

  return function(){
    var thatArguments = arguments

    // Wrapping in nextTick as a safe measure against not asynchronous usage.
    process.nextTick(function(){
      if(thatArguments[0]){
        // Resuming fiber and throwing error.
        fiber.throwInto(thatArguments[0])
      }else{
        // Resuming fiber and returning result.
        fiber.run(thatArguments[1])
      }
    })
  }
}

// Executes `cb` within `Fiber`, when it finish it will call `done` cb.
// If error will be thrown during execution, this error will be catched and passed to `done`,
// if `done` not provided it will be just rethrown.
sync.fiber = function(cb, done){
  var that = this
  Fiber(function(){
    if (done) {
      try {
        cb.call(that)
        done()
      } catch (error){
        done(error)
      }
    } else {
      // Don't catch errors if done not provided!
      cb.call(that)
    }
  }).run()
}