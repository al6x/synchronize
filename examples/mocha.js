var sync  = require('synchronize')
var fs    = require('fs')

sync(fs, 'readFile')

var async = sync.asyncIt

describe('File System', async(function(){
  it('should read file', function(){
    var data = fs.readFile(__filename, 'utf8')
  })
}))