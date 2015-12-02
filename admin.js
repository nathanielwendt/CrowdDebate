$(document).ready(function(){

   var ref = new Firebase('https://crowddebate.firebaseio.com');
   var topicDuraction;

   ref.child("consts").once("value", function(snapshot){
      topicDuration = snapshot.val().topicDuration;
   });

   $("#admin-add-topic-submit").click(function(){
      var title = $("#admin-add-topic-text").val();
      var now = (new Date()).getTime();
      ref.child("topics").push({
         title: title,
         timeStart: now,
         timeEnd: now + topicDuration,
         pro: {count: 0, tags:""},
         con: {count: 0, tags:""}
      });

      $("#admin-add-topic-text").val("");
   });

});
