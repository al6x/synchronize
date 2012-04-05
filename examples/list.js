var sync = require('synchronize')
var fs   = require('fs')

sync.fiber(function(){
  var i, paths, path, stat, data
  paths = sync(fs, 'readdir')('.')  
  for(i = 0; i < paths.length; i++){
    path = paths[i]
    stat = sync(fs, 'stat')(path)
    if(!stat.isFile()) continue
    data = sync(fs, 'readFile')(path, 'utf8')
    console.log(data)
  }
})