var fs = require('fs')

var printFile = function(paths, i){
  if(i >= paths.length) return
  var path = paths[i]
  fs.stat(path, function(err, stat){
    if(err) throw err
    if(stat.isFile()){
      fs.readFile(path, 'utf8', function(err, data){
        if(err) throw err
        console.log(data)
        printFile(paths, i + 1)
      })
    } else {
      printFile(paths, i + 1)
    }
  })
}

fs.readdir('.', function(err, paths){
  if(err) throw err
  printFile(paths, 0)
})