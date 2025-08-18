// client

let ver = 1.0;
// let wss = 'wss://moddersandrockers.com:4202';
let HTTPS_PORT=4203;
let WSS_PORT = 4202;
let PRISM_PORT = 4201;

let youtube="https://youtube.com/shorts/UHTcavXpMOM?feature=share";

let LINESPERPAGE = 24;


let wss = 'wss://moddersandrockers.com:'+WSS_PORT;
let rtcWss = 'wss://moddersandrockers.com:'+HTTPS_PORT;
let editMode = 0;
let gameMode = 0;       // telnet, web, etc
let style = 0;          // set by PHP 
let user = "";
let pass = "";
let host = wss;
let rtcHost = rtcWss;
let maxwidth=1000;    // initial width
const m68="MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM";
let screenheight = window.innerHeight;
let screenwidth = window.innerWidth;
let doSpeech = false;
let speech = null;
let myVoice = null;



// get value from optional html tag.
function getValue(name, def)
{ let f = document.getElementById(name);
  if( f != null){
    return f.value;
  }
  return def;
}

var clients = [];     // chat clients

function history(msg, client)
{ this.msg = msg;
  this.prev = client.hhead;
  this.next = null;

  if( client.hhead != null){
    client.hhead.next = this;
  }

  client.hhead = this;
  if( client.htail == null){
    client.htail = this;
  }

}

function UIshowHide(x, name)
{
  showHide(x, name);
}

// show hide a tag.
function showHide(x, name)
{ const initWidth = maxwidth;
  let f = document.getElementById(name);
  if( f != null){
    if( x == 0){
      f.style.display = "none";
    }else if( x == 1){
      f.style.display = "block";
    }else if( x == 2){    // toggle
      if( f.style.display == "none"){
        showHide(1, name);
        x = 1;              // return the state we used.
      }else {
        showHide(0, name);
        x = 0;
      }
    }
  }
  if( name == "webrtc" || name == "media"){
    if( x == 0){
      maxwidth -= 200;
    }else {
      maxwidth += 200;
    }
  }
  if( name == "compass"){
    if( x == 0){
      maxwidth -= 100;
    }else {
      maxwidth += 100;
    }
  }
  if( name == "editor"){
    if( x == 0){
      maxwidth -= 200;
    }else {
      maxwidth += 200;
    }
  }
  if( initWidth != maxwidth){
    f = document.getElementById("outer");
    if( f != null){
      f.style.maxWidth = ""+maxwidth+"px";
    }
  }
  return x;
}

function setColors(name, color, bg)
{
  let f = document.getElementById(name);
  if( f != null){
    if( color != null){
      f.style.color = color;
    }
    if( bg != null){
      f.style.backgroundColor = bg;
    }
  }
}

let speechMap = [ " nw ", " north west, ",
   " ne ", " north east, ",
   " sw ", " south west, ",
   " se ", " south east, ",
   "@PRISM CLIENT START", "Welcome, ",
   "Contents:", ", contents, ",
   "Obvious exits:", ", obvious exits, ",
   null, null

]

function prepareForSpeech(mouth, msg)
{ let lines = msg.split(/\r\n|\r|\n/g);
  let msgx = "";

  msgx = lines[0];
  for(let n = 1; n < lines.length; n++){
    msgx += " "+lines[n];
  }

//  console.log("Say:"+msgx);
  let pos = 0;
  let len = 0;
  for(n=0; speechMap[n] != null; n += 2){
    let mlen = msgx.length;
    len = msgx.indexOf( speechMap[n]);
//    console.log("test["+len+"/"+mlen+"] '"+speechMap[n]+"'");

    if( len == -1){
      continue;        // no match
    }
    msg = msgx;
    msgx = "";

    pos = 0;

    while( pos < mlen)
    { len = msg.indexOf( speechMap[n]);
      if( len == -1){
        msgx += msg;
        break;
      }
      let pre = msg.substr(0, len);   // add stuff before
//      console.log("pre["+len+","+pos+","+mlen+"]="+pre);
      msgx += pre;
      msgx += speechMap[n+1];
      pos += len;
      let skip = speechMap[n].length;
      msg = msg.substr(len+skip);
      pos += skip;
    }
//    console.log("Rescan["+pos+"/"+mlen+"] '"+msgx+"'");
  }
//  console.log("Say2:"+msgx);

  mouth.text = msgx;

}


// created by parsedbref, filled in after @ex
function prismObject(dbref, name, flags)
{ this.dbref = dbref;
  this.name = name;
  this.flags = flags;
  this.key = "";
  this.age = "";
  this.class = "";
  this.zone = "";
  this.description = "";
  this.location = "";

}

function prismClient(addr, name)
{ this.websocket = null;
  this.output = name;
  this.host =addr;
  this.hhead = null;
  this.htail = null;
  this.numHist = 0;
  this.index = -1;
  this.pstate = 0;
  this.curobj = -1;       // current object being processed
  this.prompt = "";
  this.user = null;       // from co, cr and score
  this.location = null;
  this.title = null;
  this.level = null;
  this.chp = null;
  this.pennies = null;
  this.uuid = null;
  this.addr = null;
  this.flags = 0;         // misc flags.  1 = score sent


  this.showHistory = function()
  { let f = document.getElementById(this.output+'_chatLog');

    let msg = "";
     let top = 0;

    while( top < (16 -this.numHist) ){
      msg += "<br />\n";
      top ++;
    }
  //  msg += "Lines="+numHist+"<br />";
    for(let h = this.htail; h != null; h = h.next){
      msg += h.msg;
    }
    f.innerHTML = msg;

  }

  // text to user
  this.outText = function(msg)
  {
    if( this.numHist < LINESPERPAGE){
      let h = new history(msg, this);
      this.numHist++;
    }else {
      // scroll
      let h = this.htail;
      this.htail = h.next;
      if( this.htail != null){
        this.htail.prev = null;
      }

      h.prev = this.hhead;
      this.hhead.next = h;

      this.hhead = h;
      h.next = null;

      h.msg = msg;
    }

    this.showHistory();
  }


  // text display. to user
  this.sendToUser = function(msg, id, whisper) 
  {
    let lines = msg.split(/\r\n|\r|\n/g);
    let msgx = "";
    let ocnt = 0;

    for(let i = 0; i < lines.length; i++){
      if( this.index >= 0){
        msgx = parse(lines[i], this.index);
      }else {
        msgx = msg;
      }
      if( msgx != ""){
        ocnt ++;
        this.outText(msgx+"<br />");
      }
    }
    if( speech != null && ocnt > 0 && whisper && doSpeech){
      speak(msg);
    }

  }


// incomming websocket connection
  this.connectWsChat = function()
  {
    try 
    {
      window.WebSocket = window.WebSocket || window.MozWebSocket;
      this.webSocket = new WebSocket( this.host );
      this.webSocket._client = this;

      this.sendToUser( "<p>Connecting to "+this.host+"</p>", null, false);

      this.webSocket.onopen = function() 
      {
        console.log("OPen");
      }

      this.webSocket.onmessage = function( msg ) 
      { let data = msg.data;
        let client = this._client;

        if( typeof msg.data == 'string'){
            client.sendToUser( data , null, true);
//            console.log("message1 "+data);
            return;
        }
        data = msg.data.text();
        data.then(( value)=>{
            client.sendToUser( value  , null, true);
//            console.log("message2 "+value);
        });
      }

      this.webSocket.onclose = function() 
      {
        let client = this._client;
        client.sendToUser( '<p>Disconnected '+client.output+'</p>' , null, false);
      }
    } 
    catch( exception ) 
    {
        this.sendToUser( '<p>Error ' + exception + '.</p>' , null, false);
    }

  let f = document.getElementById(this.output+'_chatText');
  if( f != null){
    f.onkeydown = this.KeyDown;
    f._client = this;
//    console.log("add keydown to "+this.output+'_chatText');
  }


  }

  this.isConnectedWsChat = function() 
  {
    if( this.webSocket && this.webSocket.readyState==1 ) {
      return 1;
    }
  }


  // 'this' is the text box usually not the chat
  this.KeyDown = function(e) {
    if( e.keyCode == '13' ) {
      sendWsChat(this._client);
    }
  }

  // start connection
  this.connectWsChat();

}  

// build command from up to two input fields.
// EG user login
function UIcmd(cindex, cmd, arg1, arg2){
  let client= clients[cindex];
  let msg = cmd;
  let f;

  if( arg1 != null && arg1 != ""){
    f = document.getElementById(client.output+"_"+arg1);
    if( f != null){
      msg += " "+f.value;
    }
  }
  if( arg2 != null && arg2 != ""){
    f = document.getElementById(client.output+"_"+arg2);
    if( f != null){
      msg += " "+f.value;
    }
  }
  UIsendCmd(msg, cindex, 0, -1);
}

function toHTML(msg)
{ let n;
    // replace leading spaces with non breaking spaces
  for( n=0; n < msg.length; n++){
    if( msg[n] != ' '){
      break;
    }
  }
  if( n > 0){
    let msgr = msg.substr(n);
    let msgx = "";
    while(n > 0){
      msgx+= "&nbsp;";
      n--;
    }
    msg = msgx+msgr;

  }

  return msg;

}

function UIwebaction(action)
{ let user = getValue('webuser', "");
  let pass = getValue('webpass', "");
  let client=clients[0];

  if( client == null){
    return;
  }
  if( action == 2){
    showHide(1, client.output);
    showHide(1, client.output+"_chatInput");
    client.pstate = 1;
    UIsendCmd("co guest adventure", client.index, 0, -1);
    showHide(0, "webprompt");
    return;
  }
  if( action == 3){
    showHide(1, client.output);
    showHide(1, client.output+"_chatInput");
    client.pstate = 1;
    UIsendCmd("co guest dungeon", client.index, 0, -1);
    showHide(0, "webprompt");
    return;
  }
  if( action == 4){
    showHide(1, client.output);
    showHide(1, client.output+"_chatInput");
    client.pstate = 1;
    UIsendCmd("co guest guest", client.index, 0, -1);
    showHide(0, "webprompt");
    return;
  }

  if( user == "" || pass == ""){
    return;
  }
  if( action == 0){
    // create
    showHide(1, client.output);
    showHide(1, client.output+"_chatInput");
    client.pstate = 1;
    UIsendCmd("co "+user+" "+pass, client.index, 0, -1);
    user = "";
    pass = "";
    showHide(0, "webprompt");
  }else if(action == 1){
    // connect
    showHide(1, client.output);
    showHide(1, client.output+"_chatInput");
    client.pstate = 1;
    UIsendCmd("cr "+user+" "+pass, client.index, 0, -1);
    user = "";
    pass = "";
    showHide(0, "webprompt");
  }
}

// 
function setValue(name, val)
{
  f = document.getElementById(name);
  if( f!= null){
    f.innerHTML = val;
  }
}

// (#0 RI)    (#dbref flags)
function parseDBrefs(msg, cindex)
{ const client = clients[cindex];
  let pos = msg.indexOf('(#');
  if( pos < 0 ){
    return null;
  }
  let pref = msg.substr(0, pos);
  pos += 2;
  let dbref = "";
  while(  msg[pos] >= '0' && msg[pos] <= '9'){
    dbref += msg[pos];
    pos++;
  }
  let post = msg.substr(pos);

  // parse rest of line " flags)"
  pos = 0;
  while(post[pos] == ' '){
    pos++;    // skipws
  }
  // get flags
  let flags = "";
  while(post[pos] != ')' && pos < post.length){
    flags += post[pos];
    pos++;
  }

  let pObj = new prismObject(dbref, pref, flags);
  
  return pObj;
}

function UIcompass(cindex)
{
  UIcmd(cindex, "@COMPASS", null, null);
}

function UImedia(cindex)
{
  UIcmd(cindex, "@MEDIA", null, null);
}

function UIspeech(mode)
{
  if( mode == 1){
    let f = document.getElementById('speech-select');
    if( f != null){
      let v = f.value;
      if( v == voices.length){
        doSpeech = true;  // @speech will toggle.
      }else {
        doSpeech = false; // @speech will toggle
        myVoice = v;
        speak("Hello");
      }
    }
  }
  UIcmd(0, "@SPEECH", null, null);
}

function UIcopass(cindex, cmd, arg1, arg2)
{
  UIcmd(cindex, cmd, arg1, arg2);
}

function UIcrpass()
{
  UIcmd(cindex, cmd, arg1, arg2);
}

function showStatus(client)
{ let msg="";
  let f = document.getElementById(client.output+"_status");

  if( f != null){
    msg += "<table><tr><td>";
    msg += "<span style='color: white;' >"+client.user+"</span>";
    msg += "</td><td width='70%' >";
    msg += "<span style='color: white;' >"+client.location+"</span>";
    msg += "</td><td><input type='button' onclick='UIcompass("+client.index+");' value='Compass' />";
    msg += "</td><td><div id='speech' ><input type='button' onclick='UIspeech(0);' value='Speech' /></div>";
    msg += "</td><td><input type='button' onclick='UImedia("+client.index+");' value='Media' />";
    msg += "</td></tr></table>\n";
    f.innerHTML = msg;
  }

}

// COnnect guest adventure
// common to all client instances
// Contents:
// You are carrying:
// does a lot of stuff for editing objects

function parse(msg, cindex)
{
  let pref = msg.substr(0, 6);
  const client= clients[cindex];
  let n = 0;    // used to skip/count spaces etc
  let msgx;

  if( msg.length == 0){
    return '';
  }

//  console.log("Pref='"+pref+"'");

  if(pref == "No mul"){
      showHide(0, "welcome");
      showHide(1, client.output);
      showHide(1, client.output+"_chatInput");
//      console.log("No mux for "+client.output);
      return "No multiplexors available, try again in a few minutes\r\n";
  }

  // just throw @PING
  if( pref == "@PING"){
    return "";
  }

  if( client.pstate == 0){          // login state
    if( pref == "@RQV" ){           // BSX style request version
      showHide(0, "welcome");
      showHide(1, client.output+"_chatText");
      showHide(0, client.output+"_chatInput");
      console.log("@RQV");

      client.prompt = "";

      return "";
    }

    client.prompt += msg+"\r\n";
//    console.log("["+client.pstate+"] "+client.prompt);

    if( pref == "PRISM>"){
      console.log("PRISM>");
      // end of prompt
      if( user != "" && pass != ""){
        if( gameMode == 2){
          showHide(1,"media");
        }
        showHide(1, client.output);
        showHide(1, client.output+"_chatInput");
        // auto login
        UIsendCmd("co "+user+" "+pass, client.index, 0, -1);
        user = "";
        pass = "";
        return "";
      }else if( gameMode != 1){       // no auto login 
        showHide(1, client.output);
        showHide(1, client.output+"_chatInput");
        client.pstate = 1;      // not web mode so display prompt
        client.sendToUser(client.prompt, null, false); // will parse the prompt again.
      }
      // 
      if( gameMode == 1){
        showHide(1,"webprompt");
      }else if( gameMode == 2){
        showHide(1,"media");
      }
    }
    if(pref == "@PRISM"){
      client.pstate = 1;
      console.log("@PRISM");
      return "";
    }
    return "";
  }



  if( client.pstate == 1 || client.pstate == 4 ){
//    console.log(client.pstate+"/"+editMode+"  '"+pref+"' ");
    if(pref == "Conten"){
      client.pstate = 2;    // get ...
    }else if( msg == "You are carrying:"){
      console.log("Inventory");
      client.pstate = 3;    // drop ...
    }else if( pref == "edit_e"){
        editor(cindex, msg);
        client.pstate = 1;
    }else if( pref == "edit_r"){
        editor(cindex, msg);
        client.pstate = 1;
    }else if( pref == "edit_t"){
        editor(cindex, msg);
        client.pstate = 1;
    }else if( pref == "Owner:"){
      if(editMode == 2){
          examine(cindex, "owner", msg);
      }
      client.pstate = 1;
    }else if( pref == "Class:"){
      if(editMode == 2){
        examine(cindex, "class", msg);
      }
      client.pstate = 1;
    }else if( pref == "Zone: "){
      if(editMode == 2){
        examine(cindex, "zone", msg);
      }
      client.pstate = 1;
    }else if( pref == "Locati"){
      if(editMode == 2){
        examine(cindex, "location", msg);
      }
      client.pstate = 1;
    }else if( pref == "Exits:"){
      if(editMode == 2){
        client.pstate = 4;
      }else {
        client.pstate = 1;
      }
    }else if( (client.flags & 3) == 1){     // sent score
      if( pref == "Hello "){
        if( msg.length > 6){
          client.user = msg.substr(6);
          client.flags |= 2;                // seen Hello
          console.log("score: user="+client.user+" flags="+client.flags);
          if( (client.flags & 4) == 4){
            return "";
          }
        }
      }
    }else if( (client.flags & 3) == 3){     // After Hello
      console.log("Score: flags="+client.flags);
      if( pref == "You ha"){
        if( msg.length > 9){
          client.pennies = msg.substr(9);
          console.log("score: pennies="+client.pennies);
        }
        if( (client.flags & 4) == 4){
          return "";
        }
      }else if( pref == "Level "){
        if( msg.length > 6){
          client.level = msg.substr(6);
          console.log("score: level="+client.levels);
        }
        if( (client.flags & 4) == 4){
          return "";
        }
      }else if( pref == "Chp = "){
        if( msg.length > 6){
          client.chp = msg.substr(6);
          console.log("score: chp="+client.chp);
        }
        if( (client.flags & 4) == 4){
          return "";
        }
      }else if( pref == "You ar"){
        if( msg.length > 11){
          client.location = msg.substr(11);
          console.log("score: location="+client.location);
        }
        if( (client.flags & 4) == 4){
          return "";
        }
      }else if( pref == "You fe"){        // you feel
        if( (client.flags & 4) == 4){
          return "";
        }
      }else if( pref == "You co" || pref == "You wi" || pref == "You ca"){        // you could/will/can
        showHide(1, client.output+"_status");
        showStatus(client);
        if( (client.flags & 4) == 4){
          client.flags &= 0xfff8;     // clear bits 0,1,2
          return "";
        }
        client.flags &= 0xfff8;     // clear bits 0,1,2
    }else {
        // end of sequence so reset and show
          showHide(1, client.output+"_status");
          showStatus(client);
          client.flags &= 0xfff8;     // clear bits 0,1,2
      }

    }else {
        console.log("Flags "+client.flags);
    }
    // if in state 4 then processing exits
    if( client.pstate == 4){
      // maybe an exit
    }

  }else if( client.pstate == 2 || client.pstate == 3){    // Content: / Inventory
    console.log(client.pstate+" '"+msg[0]+"' "+msg.length);
    if(msg[0] != ' '){
      client.pstate = 1;    // end of content
    }else {
      for( n=0; n < msg.length; n++){
        if( msg[n] != ' '){
          break;
        }
      }
      let obj = msg.substr(n);
      let ref = obj.indexOf("(#");
      if(ref >= 0){
        obj = obj.substr(0, ref);
      }
      msgx= "";
      while(n > 0){
        msgx+= "&nbsp;";
        n--;
      }
//      console.log("Content "+obj);
      if( client.pstate == 2){
        return msgx+makeCmd(obj, cindex, "get ", -1);
      }else if( client.pstate == 3){
        return msgx+makeCmd(obj, cindex, "drop ", -1);
      }
    }
  }else if( client.pstate == 4){ 
    // exits
  }
  let obj  = parseDBrefs(msg, cindex);
  if( obj != null){
    msg = obj.name+" "+makeCmd("#"+obj.dbref, cindex, "@ex ", -1);
    if(editMode == 1){
      editMode = 0;
      // first after @ex ...
      let otype = obj.flags[0];
      if( otype == 'R' || otype == 'P' || otype == 'C'){
        editMode = 2;     // look for owner
        client.pObj = obj;
      }
    
    }
  }

  return toHTML(msg);
}


function playSound(){
//    var audio = new Audio('notify.mp3');
//    audio.play();   
}

function makeClick(cmd, cindex, xtra, show, obj)
{
  let msg ='onclick="UIsendCmd(\''+xtra+cmd+'\',\''+cindex+'\', '+show+', '+obj+');"';
  return msg;
}

function makeCmd(cmd, cindex, xtra, obj)
{
   let msg = '<span style="color: blue; cursor: pointer;" '+makeClick(cmd, cindex, xtra, 1, obj)+' >' + cmd + '</span>';

  return msg;
}


// send cmd string to server for client cindex, show cmd locally if show == 1
function UIsendCmd(cmd, cindex, show, obj)
{ let client = clients[cindex];
  let f;

//  f = document.getElementById(client.output+"_edit");
  let pref = cmd.substr(0, 4);
  if( pref == "@ex "){
    editMode = 1;
  }
  client.curobj = obj;
  if( obj != -1){
    showHide(1, "editor");
  }else {
    showHide(0, "editor");
  }

  f = document.getElementById(client.output+"_chatText");
  f.focus();

  // console.log("UIsendcmd "+pref+" "+cindex+" "+show+" "+obj);
  pref = cmd.substr(0, 8);
  if( pref == "@COMPASS"){
    showHide(2, "compass");
    if( show == 1){ 
      client.sendToUser( makeCmd(cmd, cindex, "", -1) , null, false);
    }
    return;
  }
  
  if( pref == "@SPEECH"){
    if( speech == null){
      return;
    }
    f = document.getElementById("speech");    // the div
    doSpeech = !doSpeech;
    if( doSpeech ){
      f.innerHTML = showVoices();
    }else{
      if( f != null){
        f.innerHTML = "<input type='button'  onclick='UIspeech(0);' value='Speech On' />";
      }

    }
    return;
  }
  
  if( pref == "@MEDIA"){
    if( client.user == null){
      client.sendToUser( "Need to login first!", null, false );
      return;
    }
    let show = showHide(2, "media");
    if( show == 0){
      showHide(0, "webrtc");    // hide
    }
    if( show == 1){ 
      client.sendToUser( makeCmd(cmd, cindex, "", -1), null, false );
    }
    return;
  }

  // look for login commands
  let tokens = cmd.split(/ /g);
  if( tokens.length > 2){
    let lcmd = tokens[0].substr(0, 2).toLowerCase();
    
    if( lcmd == 'co' || lcmd == 'cr'){
      if( client.user == null){
        client.user = tokens[1];
        console.log("User: "+client.user);
        cmd += "\nscore";
        client.flags |= 5;      // score sent
      }else {
        console.log("Second login "+tokens[1]+" "+client.user);
        return;
      }
    }
  }else if( tokens.length > 0){
    if( tokens[0] == "score"){
      client.flags |= 1;      // score sent
      console.log("Score "+client.flags);
    }
  }

  if( client.isConnectedWsChat() ) {
    try{
      client.webSocket.send(  cmd+"\n" );
      if( show == 1){ 
        client.sendToUser( makeCmd(cmd, cindex, "", -1) , null, false);
      }
    } catch( exception ){
      client.sendToUser( '<p>Error: '+exception+'</p>' , null, false);
    }
  }

}

// use cmd input
function sendWsChat(client) {
  let f = document.getElementById(client.output+"_chatText");
  let chatText = f.value;
  if( client.isConnectedWsChat() ) {
    if(  chatText=='' ){
      return;
    }
    f.value = "";
    f.focus();

    UIsendCmd(chatText, client.index, 1, -1);
  }
}

// called from webrtc code.
function rtcChat(signal, message)
{

}


let voices;

function loadVoices() {
  let msg = "";
  voices = speech.getVoices();

//  for (const [i, voice] of voices.entries()) {
//    const option = document.createElement("option");
//    option.textContent = `${voice.name} (${voice.lang})`;
//    option.value = i;
//    voiceSelect.appendChild(option);
//  }
}

function showVoices()
{
  if( speech == null){
    return "<input type='button' id='speech-select' value='No Speech' />"
  }
  let msg = "";
  msg += "<select id='speech-select' onchange='UIspeech(1);' >";
  msg += "<option value='"+voices.length+"' >Stop Speech</option>\n";
  for (const [i, voice] of voices.entries()) {
    let sel = "";
    if( myVoice == i){
      sel = "selected";
    }
    msg += "<option value='"+i+"' "+sel+" >"+voice.name+"</option>\n";
  }

  return msg;
}

function speak(msg)
{
  let mouth = new SpeechSynthesisUtterance();
  prepareForSpeech(mouth, msg);
  if( mouth.text != ""){
    if( myVoice != null){
      mouth.voice = voices[myVoice];
    }
    speechSynthesis.speak(mouth);
  }

}

// 
function onPageLoaded()
{ let f;

  if( !( 'WebSocket' in window ) ) {
    return;
  }

  style = getValue('defstyle', 0);
  user = getValue('defuser', "");
  pass = getValue('defpass', "");
  host = getValue('defhost', "wss://moddersandrockers.com:"+WSS_PORT);
  let s = getValue('defspeech', 0);
  console.log("ARGS: speech="+s);
  if( s == '1'){
    doSpeech = true;
  }

  // look for chat clients
  for(let n=0; n < 4; n++){
    f = document.getElementById('chat'+(n+1));
    if( f != null){
      clients[n] = new prismClient(host, "chat"+(n+1));
      clients[n].index = n;
      showHide(0, clients[n].output);
    }
  }

  if( style == "telnet"){
    for(let n=0; n < 4; n++){
        showHide(1, clients[n].output);
    }
    gameMode = 0;
  }else if( style=="media"){
    gameMode = 2;
  }else if( style=="web"){
    gameMode = 1;
  }

  if ('speechSynthesis' in window) {
    speech =  window.speechSynthesis;

    if ("onvoiceschanged" in speech) {
      speech.onvoiceschanged = loadVoices;
    } else {
      loadVoices();
    }

  }

  initWebRTC();
}
