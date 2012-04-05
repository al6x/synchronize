var sync   = require('synchronize')
var fs     = require('fs')

global.itSync = function(desc, callback){
  it(desc, function(done){
    sync.fiber(callback.bind(this), done)
  })
}

describe('File System', function(){
  itSync('should read file', function(){
    sync(fs, 'readFile')(__filename, 'utf8')
  })
})