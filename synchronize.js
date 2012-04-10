require('fibers')

// Takes functino and returns its synchronized version.
var synchronizeFunction = function(fn){
  return function(){
    // Ensuring it runs within Fiber.
    var fiber = Fiber.current
    if(!fiber) throw new Error("can't synchronize code not enclosed with fiber!")

    // Calling.
    Array.prototype.push.call(arguments, function(){
      var thatArguments = arguments
      // Wrapping in nextTick as a safe measure against not asynchronous callbacks.
      process.nextTick(function(){
        // Resuming fiber when callback finishes.
        fiber.run(thatArguments)
      })
    })
    fn.apply(this, arguments)

    // Pausing fiber and waiting for result from callback.
    var args = yield()
    if(args[0]) throw args[0]
    return args[1]
  }
}

// Turns asynchronous function into another pseudo-synchronous function.
// When You call it it will sort of `wait` and return callback result as
// if it's usual `return` statement.
// In case of error it will throw it as if it's thrown with usual `throw`, so You can
// use `try/catch` to catch it.
//
// `sync(fn)` - synchronizes `fn` function.
// `sync(obj, fname)` - synchronizes `obj[fname]` funciton and bind it to `obj`.
//
// Note: `sync` should be called only inside of `sync.fiber` callback.
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
// If error will be thrown during execution, this error will be also passed to `done`.
// Every call of `sync` should be done only inside of `sync.fiber` callback.
sync.fiber = function(callback, done){
  var that = this
  Fiber(function(){
    try {
      callback.call(that)
      if(typeof done === "function") done()
    } catch (error){
      if(typeof done === "function") done(error)
    }
  }).run()
}