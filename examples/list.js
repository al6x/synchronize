var sync = require('synchronize')
var fs   = require('fs')

fs.readdir_  = sync(fs.readdir)
fs.stat_     = sync(fs.stat)
fs.readFile_ = sync(fs.readFile)

sync.fiber(function(){
  var i, paths, path, stat, data
  paths = fs.readdir_('.')
  for(i = 0; i < paths.length; i++){
    path = paths[i]
    stat = fs.stat_(path)
    if(!stat.isFile()) continue
    data = fs.readFile_(path, 'utf8')
    console.log(data)
  }
})