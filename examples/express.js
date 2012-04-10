var sync    = require('synchronize')
var fs      = require('fs')
var express = require('express')

fs.readFile_ = sync(fs.readFile)

var app = express.createServer()
app.use(function(req, res, next){
  sync.fiber(next)
})

app.get('/', function(req, res){
  var data = fs.readFile_(__filename, 'utf8')
  res.send(data, {'Content-Type': 'text/plain'})
})

app.listen(3000)