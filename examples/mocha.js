var sync   = require('synchronize')
var fs     = require('fs')

fs.readFile_ = sync(fs.readFile)

global.it_ = function(desc, callback){
  it(desc, function(done){
    sync.fiber(callback.bind(this), done)
  })
}

describe('File System', function(){
  it_('should read file', function(){
    fs.readFile_(__filename, 'utf8')
  })
})