// PRISM object editor

function editRoom(cindex, args)
{ let f = document.getElementById("editor");

  if( f == null){
    return;
  }
  f.style.display="block";

  setValue("dbref", args[1]);
  setValue("name", args[2]);
  setValue("description", args[3]);
  setValue("media", args[4]);

}

function editExit(cindex, args)
{ let f = document.getElementById("editor");

  if( f == null){
    return;
  }
  f.style.display="block";

  setValue("dbref", args[1]);
  setValue("name", args[2]);
  setValue("description", args[3]);
  
}

function editThing(cindex, args)
{ let f = document.getElementById("editor");

  if( f == null){
    return;
  }
  f.style.display="block";

  setValue("dbref", args[1]);
  setValue("name", args[2]);
  setValue("description", args[3]);
  setValue("media", args[4]);
 
}

function editor(cindex, msg)
{
  let arglist = msg.indexOf("(");
  if( arglist < 0){
    return;
  }
  let func = msg.substr(0, arglist);
  let pos = arglist+1;
  let args = [];
  let argc = 0;

  args[argc] = func;
  argc++;
  while(pos < msg.length && msg[pos] != ')'){
    while(msg[pos] == ' '){
      pos++;
    }
    if( msg[pos] != '"'){
      console.log("expecting string "+argc+" "+pos+" "+msg[pos]);
      return;
    }
    let arg="";
    pos++;
    while(pos < msg.length){
      if(msg[pos] != '"'){
        arg += msg[pos];
        pos++;
      }else {
        break;
      }
    }
    pos++;
    args[argc] = arg;
    argc++;
    while(msg[pos] == ' '){
      pos++;
    }
    if( msg[pos] == ')'){
      break;
    }

    if( msg[pos] != ',' ){
      console.log("expecting , "+argc+" "+pos+" "+msg[pos]);
      return;
    }
    pos++;
  }
  if( func == "edit_room"){
    editRoom(cindex, args);
  }else if( func == "edit_exit"){
    editExit(cindex, args);
  }else if( func == "edit_thing"){
    editThing(cindex, args);
  }
  for(let n=0; n < argc; n++){
    console.log("["+n+"] "+args[n]);
  }

}


// display the object in the editor
function showObject(obj)
{ let f = document.getElementById("editor");

  if( f == null){
    return;
  }
  f.style.display = "block";
  setValue("name", obj.name);
  setValue("dbref", obj.dbref);
  setValue("class", obj.class);
  setValue("zone", obj.zone);
  setValue("description", obj.description);

}

function examine(cindex, tag, val)
{ const client = clients[cindex];
  let apos;
  let kpos;

  if(tag == "owner"){
    apos = val.indexOf("Age:");
    kpos = val.indexOf("Key:");
    console.log("ex "+tag+" key="+kpos+" age="+apos+" "+val);
    if( client.pObj != null){
      if( kpos >= 0){
        client.pObj.key = val.substr(kpos+4, apos-kpos-4);
        client.pObj.age = val.substr(apos+4);
      }
    }
  }else if( tag == "zone"){         // room ...
    if( client.pObj != null){
      client.pObj.zone = val;
      showObject(client.pObj);
    }
  }else if( tag == "location"){     // player thing
    if( client.pObj != null){
      client.pObj.location = val;
      showObject(client.pObj);
    }
  }

}

