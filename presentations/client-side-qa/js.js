var counter = 0
var idCounter = 1
var ids = {}
$('.step').each(function(){
  var slide = $(this)

  // Auto-layout.
  slide.attr('data-x', counter)
  counter = counter + 1000;

  // Auto-id.
  if(!slide.attr('id')){
    var title = slide.find('*')[0]
    if(title){
      var id = $(title).text().replace(/[^a-z0-9-]/ig, '-').slice(0, 30);
      if(ids[id]){
        id = id + '-' + idCounter
        idCounter = idCounter + 1
      }
      slide.attr('id', id)
    }
  }
  ids[slide.attr('id')] = true
})