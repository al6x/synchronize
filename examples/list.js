var sync = require('synchronize')
var fs   = require('fs')

sync(fs, 'readdir', 'stat', 'readFile')

sync.fiber(function(){
  var i, paths, path, stat, data
  paths = fs.readdir('.')
  for(i = 0; i < paths.length; i++){
    path = paths[i]
    stat = fs.stat(path)
    if(!stat.isFile()) continue
    data = fs.readFile(path, 'utf8')
    console.log(data)
  }
})