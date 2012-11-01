var sync  = require('synchronize')
var fs    = require('fs')

sync(fs, 'readFile')

var async = sync.asyncIt

describe('File System', function(){
  it('should read file', async(function(){
    var data = fs.readFile(__filename, 'utf8')
  }))
})