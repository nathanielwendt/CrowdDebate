$(document).ready(function(){

   var ref = new Firebase('https://crowddebate.firebaseio.com');


   ref.child("topics").on("value", function(snapshot){
      topics = snapshot.val();

      var count = 0;
      var tableHtml = "";
      var now = (new Date()).getTime();
      Object.keys(topics).forEach(function(key){
         var currTopic = topics[key];
         console.log(currTopic);
         if(count % 2 == 0){
            tableHtml += "<div class='row'>";
         }

         tableHtml += "<div class='col-lg-6'>";
         tableHtml += "<div class='well well-lg topic-title'>";
         tableHtml += "<h3>" + currTopic.title + "</h3>";
         tableHtml += "<div data-id='" + key + "' data-time-end='" + currTopic.timeEnd + "' class='title-timer countdown-title'></div>";

         tableHtml += "<p><a href='viewtopic.htm?topicId=" + key + "&stance=pro' class='btn btn-success btn-lg title-btn'";
         if(currTopic.timeEnd <= now){
            tableHtml += " disabled";
         }
         tableHtml += ">(" + currTopic.pro.count + ") PRO</a>";

         tableHtml += "<a href='viewtopic.htm?topicId=" + key + "&stance=con' class='btn btn-primary btn-lg title-btn'";
         if(currTopic.timeEnd <= now){
            tableHtml += " disabled";
         }
         tableHtml += ">(" + currTopic.con.count + ") CON</a>";
         tableHtml += "</p></div></div>"


         if(count % 2 == 1){
            tableHtml += "</div>";
         }

         count += 1;
      });

      $("#home-topic-container").append(tableHtml);


      $(".countdown-title").each(function(){
         var timeEnd = $(this).attr("data-time-end");
         if(timeEnd <= now){
            $(this).html("Closed");
            return;
         }
         $(this).countdown(timeEnd, function(event) {
            $(this).text(
               event.strftime('%M:%S')
            );
         }).on('finish.countdown', function(time){
            $(this).html("Closed");
         });
      });
      // <!-- row -->
      // <div class="row">
      //    <div class="col-lg-6">
      //       <div class="well well-lg topic-title">
      //         <h3>All People Should Be Vegetarians</h3>
      //         <div class="title-timer">Closed</div>
      //         <p>
      //            <a class="btn btn-success btn-lg title-btn disabled">(11) PRO</a>
      //            <a class="btn btn-primary btn-lg title-btn disabled">(14) CON</a>
      //         </p>
      //       </div>
      //    </div>
      //    <div class="col-lg-6">
      //       <div class="well well-lg topic-title">
      //         <h3>Every Child Should Have a Mobile Phone</h3>
      //         <div class="title-timer">6:36</div>
      //         <p>
      //            <a class="btn btn-success btn-lg title-btn">PRO</a>
      //            <a class="btn btn-primary btn-lg title-btn">CON</a>
      //         </p>
      //       </div>
      //    </div>


   });

});
