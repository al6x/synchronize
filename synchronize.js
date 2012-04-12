require('fibers')

// Takes function and returns its synchronized version.
var synchronizeFunction = function(fn){
  return function(){
    // Ensuring it runs within Fiber.
    var fiber = Fiber.current
    if(!fiber) throw new Error("can't synchronize code not enclosed with fiber!")

    // Providing special, fiber-aware asynchronous callback.
    var callback = function(){
      var thatArguments = arguments
      // Wrapping in nextTick as a safe measure against not asynchronous usage.
      process.nextTick(function(){
        // Resuming fiber when callback finishes.
        fiber.run(thatArguments)
      })
    }

    // Calling asynchronous function with our special fiber-aware callback.
    Array.prototype.push.call(arguments, callback)
    fn.apply(this, arguments)

    // Pausing current execution and waiting for result from callback.
    var args = yield()

    // Checking for error and returning result of callback.
    if(args[0]) throw args[0]
    return args[1]
  }
}

// Turns asynchronous function into pseudo-synchronous function.
// When You call it it will sort of `wait` and return callback result as
// if it's usual `return` statement.
//
// In case of error it will throw it as if it's thrown with usual `throw`, so You can
// use `try/catch` to catch it.
//
// There are two version - the first synchronizes function and the second synchronizes function
// and binds it to the object.
//
// `sync(fn)` - synchronizes `fn` function.
// `sync(obj, fname)` - synchronizes `obj[fname]` funciton and bind it to `obj`.
//
// Note: synchronized version of function should be called only inside of `sync.fiber` callback.
var sync = module.exports = function(first, second){
  // Parsing arguments
  var context, fn
  if(typeof second !== "undefined" && second !== null){
    context = first
    fn      = first[second]
    if(!fn) throw new Error("object " + first + " has no function " + second + "!")
    return synchronizeFunction(fn).bind(context)
  } else {
    fn = first
    return synchronizeFunction(fn)
  }
}

// Executes `callback` within `Fiber`, when it finish it will call `done` callback.
// If error will be thrown during execution, this error will be catched and passed to `done`,
// if `done` not provided it will be just rethrown.
//
// Every call of `sync` should be done only inside of `sync.fiber` callback.
sync.fiber = function(callback, done){
  var that = this
  Fiber(function(){
    if (done) {
      try {
        callback.call(that)
        done()
      } catch (error){
        done(error)
      }
    } else {
      // Don't catch errors if done not provided!
      callback.call(that)
    }
  }).run()
}