require('fibers')

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
  } else {
    context = null
    fn      = first
  }

  // Ensuring it runs within Fiber.
  var fiber = Fiber.current
  if(!fiber) throw new Error("can't synchronize code not enclosed with fiber!")

  // Returning synchronized wrapper.
  return function(){
    // Callback waiting for result or error.
    var callback = function(){
      fiber.run(arguments)
    }

    // Calling.
    Array.prototype.push.call(arguments, callback)
    if(context){
      fn.apply(context, arguments)
    } else {
      fn.apply(this, arguments)
    }

    // Sort-of "waiting" for result from callback.
    var args = yield()
    if(args[0]) throw args[0]
    return args[1]
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