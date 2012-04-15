var sync = require('synchronize')
var fs   = require('fs')

sync(fs, 'readFile')

sync.fiber(function(){
  var data = fs.readFile(__filename, 'utf8')
  console.log(data)

  try {
    data = fs.readFile('invalid', 'utf8')
  } catch (err) {
    console.log(err)
  }

  fs.readFile(__filename, 'utf8', function(err, data){
    console.log(data)
  })
})