var sync = require('synchronize')
var fs   = require('fs')

fs.readFile_ = sync(fs.readFile)

sync.fiber(function(){
  var data = fs.readFile_(__filename, 'utf8')
  console.log(data)

  try {
    data = fs.readFile_('invalid', 'utf8')
  } catch (err) {
    console.log(err)
  }
})