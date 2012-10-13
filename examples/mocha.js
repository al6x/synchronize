var sync = require('synchronize')
var fs   = require('fs')

sync(fs, 'readFile')

sync.it = function(desc, cb){
  it(desc, function(done){
    sync.fiber(cb.bind(this), done)
  })
}

describe('File System', function(){
  sync.it('should read file', function(){
    var data = fs.readFile(__filename, 'utf8')
  })
})