$(document).ready(function(){

   var ref = new Firebase('https://crowddebate.firebaseio.com');
   //ref.child("topics").push({title: "Is Will Smith a Good Actor?"});
   var topicId = getUrlParameter('topicId');
   var stance = getUrlParameter('stance');
   var timeEnd = 0;
   var timeStart = 0;
   var nuggetTimeStart = 0;
   var topicKeep = 0;
   var phase = "init"; // ["init","tag","nugget","done"]

   var tagItems = $("#tag-items");
   var tagContainer = $("#tag-container");
   var nuggetContainer = $("#nugget-container");
   var summaryContainerPro = $("#summary-container-pro");
   var summaryContainerCon = $("#summary-container-con");

   var votedNuggets = {};

   var nuggetTagRatio;
   ref.child("consts").once("value", function(snapshot){
      nuggetTagRatio = snapshot.val().nuggetTagRatio;
      topicKeep = snapshot.val().topicKeep;
   });

   var topicRef = ref.child("topics/" + topicId);
   var stanceRef;

   if(stance == "pro"){
      stanceRef = topicRef.child("pro");
   } else {
      stanceRef = topicRef.child("con");
   }

   //setup static topic level items
   topicRef.once("value", function(snapshot){
      $("#topic-title").text(snapshot.val().title);
      timeEnd = snapshot.val().timeEnd;
      timeStart = snapshot.val().timeStart;

      nuggetTimeStart = ((timeEnd - timeStart) * (1 - (nuggetTagRatio / (nuggetTagRatio + 1)))) + timeStart;

      var now = (new Date()).getTime();
      if(now >= timeEnd){
         setupSummaryView();
      } else if(now >= nuggetTimeStart){
         setupNuggetView();
      } else {
         setupTagView();
      }

      var isNuggetPhase = false;
      $("#countdown").countdown(timeEnd, function(event) {
         $(this).text(
            event.strftime('%M:%S')
         );
      }).on('update.countdown', function(time){
         if(time.timeStamp >= nuggetTimeStart && !isNuggetPhase){
            isNuggetPhase = true;
            setupNuggetView();
         }
      }).on('finish.countdown', function(time){
         setupSummaryView();
      });
   });

   //setup dynamic topic level items
   stanceRef.on("value", function(snapshot) {
      topicData = snapshot.val();
   });

   stanceRef.child("count").transaction(function(curr_val){
      return (curr_val || 0) + 1;
   });

   $("#add-tag-btn").click(function(){
      var title = $("#focused-input").val();
      stanceRef.child("tags").push({title: title, votes: 0, nuggets: ""});
   });


   function containerEnable(tag, nugget, summary){
      if(tag){
         tagContainer.show();
      } else {
         tagContainer.hide();
      }

      if(nugget){
         nuggetContainer.show();
      } else {
         nuggetContainer.hide();
      }

      if(summary){
         summaryContainerPro.show();
         summaryContainerCon.show();
      } else {
         summaryContainerPro.hide();
         summaryContainerCon.hide();
      }
   }

   var onTagChange = function(snapshot) {
      topicData = snapshot.val();

      //update stance count banner
      setupStanceBanner(stance, topicData.count);

      //populate list of tags
      tagItems.empty();
      for(var key in topicData.tags){
         var tag = topicData.tags[key];

         tagItems.append(
            '<a href="#" id="' + key + '" class="btn btn-default btn-lg btn-fixed btn-tag"><span class="badge" style="float:left;">'
            + tag.votes + '</span> ' + tag.title + '</a>'
         );
      }

      //allow for tag upvoting
      $(".btn-tag").each(function(index) {
         $(this).click(function(){
            var tagId = $(this).attr('id');
            stanceRef.child("tags/" + tagId + "/votes").transaction(function (curr_val) {
               return (curr_val || 0) + 1;
            });
         });
      });
   };

   var onNuggetChange = function(snapshot) {
      //var topicData = snapshot.val();

      //update stnace count banner
      setupStanceBanner(stance, topicData.count);

      buildSummary(snapshot, nuggetContainer, true, false);

      $(".add-nugget-btn").click(function(){
         var text = $(this).siblings(".add-nugget-textarea").val();
         var id = $(this).attr("data-id");
         stanceRef.child("tags/" + id + "/nuggets").push({text: text, upVotes: 0, downVotes: 0});
      });

      $(".nugget-upvotes").one('click', function(){
         var nuggetId = $(this).attr("data-nugget-id");
         if(votedNuggets[nuggetId] === undefined){
            var tagId = $(this).attr("data-tag-id");
            stanceRef.child("tags/" + tagId + "/nuggets/" + nuggetId + "/upVotes").transaction(function(curr_val){
               return (curr_val || 0) + 1;
            });
            votedNuggets[nuggetId] = true;
         }
      });

      $(".nugget-downvotes").one('click', function(){
         var nuggetId = $(this).attr("data-nugget-id");
         if(votedNuggets[nuggetId] === undefined){
            var tagId = $(this).attr("data-tag-id");
            stanceRef.child("tags/" + tagId + "/nuggets/" + nuggetId + "/downVotes").transaction(function(curr_val){
               return (curr_val || 0) + 1;
            });
            votedNuggets[nuggetId] = true;
         }
      });
   };

   function setupTagView(){
      containerEnable(true, false, false);
      stanceRef.on("value", onTagChange);
   }

   function setupNuggetView(){
      containerEnable(false, true, false);
      stanceRef.off("value", onTagChange);
      stanceRef.on("value", onNuggetChange);
   }

   function setupSummaryView(){
      containerEnable(false, false, true);
      stanceRef.off("value", onNuggetChange);
      topicRef.child("pro").once("value", function(snapshot){
         buildSummary(snapshot, summaryContainerPro, false, true);
         var containerHtml = "<a class='btn btn-success btn-g title-btn'>PRO (" + snapshot.val().count + ")</a>";
         summaryContainerPro.prepend(containerHtml);
      });
      topicRef.child("con").once("value", function(snapshot){
         buildSummary(snapshot, summaryContainerCon, false, true);
         var containerHtml = "<a class='btn btn-primary btn-g title-btn'>CON (" + snapshot.val().count + ")</a>";
         summaryContainerCon.prepend(containerHtml);
      });
   }

   var buildSummary = function(snapshot, container, enableForm, filterNuggets){
      var topicData = snapshot.val();
      var topTags = [];
      for(var key in topicData.tags){
         var tag = topicData.tags[key];
         tag.id = key;
         topTags.push(tag);
      }
      sortList(topTags, "votes");

      var tableHtml = '<table class="table table-striped table-hover nugget-table">';
      tableHtml += '<thead><tr>';
      for(var i = 0; i < topicKeep && i < topTags.length; i++){
         var currTag = topTags[i];
         tableHtml += "<th>" + currTag.title + "</th>";
      }
      tableHtml += '</tr></thead><tbody>';

      tableHtml += "<tr>";
      var maxLength = 0;
      var nuggetLists = [];
      var nuggetListsIds = [];

      for(var i = 0; (i < topicKeep) && (i < topTags.length); i++){
         var currTag = topTags[i];

         var currNuggetList = [];

         Object.keys(currTag.nuggets).forEach(function(key){
            var currNugget = currTag.nuggets[key];
            currNugget["id"] = key;
            currNugget["netVotes"] = currNugget["upVotes"] - currNugget["downVotes"];
            currNuggetList.push(currTag.nuggets[key]);
         });
         sortList(currNuggetList, "netVotes");

         if(filterNuggets){
            for(var j = 0; j < currNuggetList.length; j++){
               console.log(currNuggetList[j]);
               if(currNuggetList[j].netVotes <= 0){
                  currNuggetList.splice(j, 1);
               }
            }
         }

         nuggetLists.push(currNuggetList);
         nuggetListsIds.push(currTag.id);

         var currTagNuggetLength = getObjLength(currTag.nuggets);
         if(currTagNuggetLength > maxLength){
            maxLength = currTagNuggetLength;
         }
      }
      tableHtml += "</tr>";

      for(var i = 0; i < maxLength; i++){
         tableHtml += "<tr>";
         for(var j = 0; j < nuggetLists.length; j++){

            if(i < nuggetLists[j].length){
               var currNugget = nuggetLists[j][i];

               tableHtml += "<td>" + convertlink(currNugget.text);
               tableHtml += "<br /><br /><br />";
               tableHtml += "<span class='label label-primary nugget-downvotes' data-nugget-id='" + currNugget.id + "' + data-tag-id='" + nuggetListsIds[j] + "'>" + currNugget.downVotes + "</span>";
               tableHtml += "<span class='label label-success nugget-upvotes' data-nugget-id='" + currNugget.id + "' + data-tag-id='" + nuggetListsIds[j] + "'>" + currNugget.upVotes + "</span>";
               tableHtml += "</td>";
            } else {
               tableHtml += "<td></td>";
            }
         }
         tableHtml += "</tr>";
      }

      if(enableForm){
         tableHtml += "<tr>";
         for(var i = 0; i < nuggetLists.length; i++){
            tableHtml += "<td>";
            tableHtml += "<textarea class='form-control add-nugget-textarea' wrap='hard' />";
            tableHtml += "<input class='btn btn-default add-nugget-btn' type='submit' data-id='" + nuggetListsIds[i] + "' value='Add Nugget'";
            tableHtml += "</td>";
         }
         tableHtml += "</tr>";
      }

      tableHtml += "</tbody></table>";
      container.empty();
      container.append(tableHtml);
   }

   function setupStanceBanner(stance, count){
      if(stance == "pro"){
         $("#vote-count").addClass("btn-success");
         $("#vote-count").text("PRO (" + count + ")");
      } else {
         $("#vote-count").addClass("btn-primary");
         $("#vote-count").text("CON (" + count + ")");
      }
   }


});

function getUrlParameter(sParam) {
   var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

   for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
   }
};

function convertlink(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '">' + geturl(url) + '</a>';
    })

}

function geturl(url){
    if(url.length > 20){
     //return url.substr(0,20) + "...";
     return "link";
    } else {
     return url;
    }
}

function sortList(objList, key){
   if(objList.length <= 0){
      return [];
   }
   for(var i = 0; i < objList.length; i++){
      var max = {};
      max[key] = -99999999;
      var maxIndex = 0;
      for(var j = i; j < objList.length; j++){
         if(objList[j][key] >= max[key]){
            max = objList[j];
            maxIndex = j;
         }
      }
      var temp = objList[i];
      objList[i] = max;
      objList[maxIndex] = temp;
   }
}

function getObjLength(obj){
   return Object.keys(obj).length;
}
