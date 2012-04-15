var sync = require('synchronize')
var fs   = require('fs')

sync(fs, 'readFile')

sync.it = function(desc, callback){
  it(desc, function(done){
    sync.fiber(callback.bind(this), done)
  })
}

describe('File System', function(){
  sync.it('should read file', function(){
    var data = fs.readFile(__filename, 'utf8')
  })
})