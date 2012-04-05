var sync = require('synchronize')
var fs   = require('fs')

sync.fiber(function(){
  var data = sync(fs, 'readFile')(__filename, 'utf8')
  console.log(data)
  
  try {
    data = sync(fs, 'readFile')('invalid', 'utf8')
  } catch (err) {
    console.log(err)
  }
})