function readFile(file){
   var loader = new FileReader();
   var def = $.Deferred(), promise = def.promise();

   //--- provide classic deferred interface
   loader.onload = function (e) { def.resolve(e.target.result); };
   loader.onprogress = loader.onloadstart = function (e) { def.notify(e); };
   loader.onerror = loader.onabort = function (e) { def.reject(e); };
   promise.abort = function () { return loader.abort.apply(loader, arguments); };

   loader.readAsBinaryString(file);

   return promise;
}

function upload(url, data){
    var def = $.Deferred(), promise = def.promise();
    var mul = buildMultipart(data);
    var req = $.ajax({
        url: url,
        data: mul.data,
        processData: false,
        type: "post",
        async: true,
        contentType: "multipart/form-data; boundary="+mul.bound,
        xhr: function() {
            var xhr = jQuery.ajaxSettings.xhr();
            if (xhr.upload) {

                xhr.upload.addEventListener('progress', function(event) {
                    var percent = 0;
                    var position = event.loaded || event.position; /*event.position is deprecated*/
                    var total = event.total;
                    if (event.lengthComputable) {
                        percent = Math.ceil(position / total * 100);
                        def.notify(percent);
                    }                    
                }, false);
            }
            return xhr;
        }
    });
    req.done(function(){ def.resolve.apply(def, arguments); })
       .fail(function(){ def.reject.apply(def, arguments); });

    promise.abort = function(){ return req.abort.apply(req, arguments); }

    return promise;
}

var buildMultipart = function(data){
    var key, crunks = [], bound = false;
    while (!bound) {
        bound = $.md5 ? $.md5(new Date().valueOf()) : (new Date().valueOf());
        for (key in data) if (~data[key].indexOf(bound)) { bound = false; continue; }
    }

    for (var key = 0, l = data.length; key < l; key++){
        if (typeof(data[key].value) !== "string") {
            crunks.push("--"+bound+"\r\n"+
                "Content-Disposition: form-data; name=\""+data[key].name+"\"; filename=\""+data[key].value[1]+"\"\r\n"+
                "Content-Type: application/octet-stream\r\n"+
                "Content-Transfer-Encoding: binary\r\n\r\n"+
                data[key].value[0]);
        }else{
            crunks.push("--"+bound+"\r\n"+
                "Content-Disposition: form-data; name=\""+data[key].name+"\"\r\n\r\n"+
                data[key].value);
        }
    }

    return {
        bound: bound,
        data: crunks.join("\r\n")+"\r\n--"+bound+"--"
    };
};

//----------
//---------- On submit form:
var form = $("form");
var $file = form.find("#file");
readFile($file[0].files[0]).done(function(fileData){
   var formData = form.find(":input:not('#file')").serializeArray();
   formData.file = [fileData, $file[0].files[0].name];
   upload(form.attr("action"), formData).done(function(){ alert("successfully uploaded!"); });
});
