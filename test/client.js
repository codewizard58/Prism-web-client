// client

let ver = 1.1;
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
let game = "";
let host = wss;
let rtcHost = rtcWss;
let maxwidth=1000;    // initial width
const m68="MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM";
let screenheight = window.innerHeight;
let screenwidth = window.innerWidth;
let doSpeech = false;
let doSpeechSaved;
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

function textBlock( text, say)
{ this.text = text;
  this.say = say;
  this.html = null;

  // console.log("TB("+text+","+say+")");
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

    while( top < (LINESPERPAGE -this.numHist) ){
      msg += "<br /> <!-- "+top+" --> \n";
      top ++;
    }
  //  msg += "Lines="+numHist+"<br />";
    for(let h = this.htail; h != null; h = h.next){
      msg += "<!-- "+top+" / "+this.numHist+" --> \n";
      msg += h.msg;
      top++;
    }
    f.innerHTML = msg;

  }

  // text or html to user
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

  this.sendHtmlToUser = function(msg)
  {
    this.outText(msg);
  }

  // text display. to user
  // not HTML
  // two streams, text and speech
  //
  this.sendToUser = function(msg, raw, whisper) 
  {
    let lines = msg.split(/\r\n|\r|\n/g);
    let msgx = "";
    let say = "";
    let tb = null;

    for(let i = 0; i < lines.length; i++){
      if( this.index >= 0){
        tb = parse(lines[i], this.index, raw);
        if( tb == null){
          continue;
        }
        if( doSpeech){
          say = tb.say+" ";
        }
        msgx = tb.text;
      }else {
        msgx = lines[n];
      }
      console.log("STU("+msgx+","+say+","+tb.html+")");
      // process text
      if( tb.html != null){
        this.outText(tb.html);
      }else {
        if( msgx != "" && msgx != null){
          let mlines = msgx.split(/\r\n|\r|\n/g);
          for(let n=0; n < mlines.length; n++){
            this.outText(mlines[n]+"<br />");
          }
        }
      }
      // process speech
      if( speech != null && say != "" && say != null && whisper && doSpeech){
        speak(say);
      }
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

      this.sendHtmlToUser( "<p>Connecting to "+this.host+"</p>");

      this.webSocket.onopen = function() 
      {
        console.log("OPen");
      }

      this.webSocket.onmessage = function( msg ) 
      { let data = msg.data;
        let client = this._client;

        if( typeof msg.data == 'string'){
            client.sendToUser( data , false, true);
//            console.log("message1 "+data);
            return;
        }
        data = msg.data.text();
        data.then(( value)=>{
            client.sendToUser( value  , false, true);
//            console.log("message2 "+value);
        });
      }

      this.webSocket.onclose = function() 
      {
        let client = this._client;
        client.sendHtmlToUser( '<p>Disconnected '+client.output+'</p>' );
      }
    } 
    catch( exception ) 
    {
        this.sendHtmlToUser( '<p>Error ' + exception + '.</p>' );
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

function toHTML(msg, raw)
{ let n;

  let msgx = "";

  if( raw){
    return msg;
  }
    // replace spaces with non breaking spaces
  for( n=0; n < msg.length; n++){
    if( msg[n] != ' '){
      msgx += msg[n];
    }else {
      msgx += "&nbsp;";
    }
  }
  return msgx;
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

function UIspeechIOS()
{
  speak("Hello, welcome to PRISM");

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

    f = document.getElementById("speechios");
    f.style.display="block";
  }

}

function xtmp()
{

}

let editMatch= ["Conten", "You are carrying:", "edit_e", "edit_r", "edit_t", "Owner:", "Class:", "Zone: ", "Locati", "Exits:"];
let scoreMatch = [6, "Hello $user", 9, "You have $pennies pennies",
   6, "Level $level", 6, "Title $title", 
   6, "Chp = $chp", 6, "Mhp = $mhp", 
   11, "You are in $location", 0, null, 6, "You fe", 6, "You co" , 6, "You wi" , 6, "You ca" , 0, null];
let lineMatch = [0, null];

function noAction(m, len, pat)
{
  return null;
}

function scoreAction(client, m, len, arg, pat)
{ 
  if( len == 0){
    return null;
  }
  console.log("Score action["+m.pos+"] "+arg+"/"+pat);

  pats = pat.split(" ");
  args = arg.split(" ");
  for(let n=0; n < pats.length; n++){
    if( pats[n][0] == '$'){
      let name = pats[n].substr(1);
      console.log("  action "+pats[n]+"/"+args[n]);
      if( name == "user"){
        client.user = args[n];
      }else if( name == "pennies"){
        client.pennies = args[n];
      }else if( name == "level"){
        client.level = args[n];
      }else if( name == "title"){
        client.title = args[n];
      }else if( name == "chp"){
        client.chp = args[n];
      }else if( name == "mhp"){
        client.mhp = args[n];
      }else if( name == "location"){
        client.location = arg;

        // show status
        showStatus( client);
        showHide(1, client.output+"_status");
      }
    }
  }
  return null;
}

function getAction(client, m, len, arg, pat)
{ let tb = null;

  console.log("getAction "+len+" "+arg);
  addMatcher(client, m.name);   // queue another one.
  tb = new textBlock(" "+arg, arg);
  tb.html = "&nbsp;"+makeCmd(arg, client.index, "get ", -1)+"<br />";
  return tb;

}

function dropAction(client, m, len, arg, pat)
{ let tb = null;

  console.log("getAction "+len+" "+arg);
  addMatcher(client, m.name);   // queue another one.
  tb = new textBlock(" "+arg, arg);
  tb.html = "&nbsp;"+makeCmd(arg, client.index, "drop ", -1)+"<br />";
  return tb;
}


function matchObject()
{
  this.name = "";
  this.next = null;
  this.prev = null;
  this.state = null;
  this.match = null;
  this.pos = null;
  this.action = noAction();
  this.indented = false;

}

let matchList = null;

function unlinkMatch(m)
{
  if( m == null){
    return;
  }
  if( m.next != null){
    m.next.prev = m.prev;
  }
  if( m.prev != null){
    m.prev.next = m.next;
  }
  if( matchList == m){
    matchList = m.prev;
  }
  m.next = null;
  m.prev = null;
}


// return textBlock

function matcher(client, msg)
{ let m = matchList;
  let indent = false;
  let tb = null;
  let msgx = "";

  if( m == null){
    console.log("not matching");
    tb = new textBlock(msg, msg);
    return tb;
  }
  console.log("M("+m.name+")"+msg);

  let ws = 0;
  while( msg[ws] == ' '){
    ws++;
    indent = true;
  }
  if( ws > 0){
    msgx = msg.substr(ws);   // remove leading ws
    console.log(m.name+" "+"WS["+ws+"] "+msg);
  }else {
    msgx = msg;
  }
  if( m.indented && !indent){
    // end of match
    console.log(m.name+" "+"End of match");
    unlinkMatch(m);
    tb = new textBlock(msg, msg);
    return tb;
  }

  let fields = msg.split(",");
  
  if( fields.length > 1){
    tb = matcher(client, fields[0]);
  }else while( m != null){
    let pos = m.pos;
    let plen = m.match[pos];
    let mpat = m.match[pos + 1];

    if( plen == 0){
      // end of match;
      let ret = m.action(client, m, 0, msg, null);
      // unlink
      console.log("matcher["+m.name+"]: "+msg+"///"+ret);
      unlinkMatch(m);

      return ret;
    }
    let pref = msgx.substr(0, plen);
    let mpref= mpat.substr(0, plen);

    if( pref == mpref){
      // matched
      let ret = m.action(client, m, plen, msg.substr(plen), mpat.substr(plen));
      m.pos += 2;
      console.log("matcher2["+m.name+"]: "+msg+"///"+ret);
      return ret;
    }

    m = m.next;
  }
  // no match
  console.log("M no match");
  if( tb == null){
    tb = new textBlock(msg, msg);
  }else {
    tb.text += msg;
    tb.say += msg;
  }
  if( fields.length > 1){
    let tb2 = matcher(client, fields[1]);
    if( tb2 == null){
      console.log("Matcher return tb");
      return tb;
    }
    if( tb == null){
      console.log("Matcher return tb2");
      return tb2;
    }
    tb.text += ','+tb2.text;
    tb.say += tb2.say;
  }
  return tb;
}

function addMatcher(client, match)
{ let mobj = null;

  console.log("Addmatcher["+client.pstate+"]: "+match);
  if( match == "score"){
    mobj = new matchObject();
    mobj.name = match;
    mobj.match = scoreMatch;
    mobj.pos = 0;
    mobj.action = scoreAction;
  }else if( match == "Contents:"){
    mobj = new matchObject(); 
    mobj.name = match;
    mobj.match = lineMatch;   
    mobj.pos = 0;
    mobj.action = getAction;
    mobj.indented = true;     // stop if not indented.
  }else if( match == "You are carrying:"){
    mobj = new matchObject(); 
    mobj.name = match;
    mobj.match = lineMatch;   
    mobj.pos = 0;
    mobj.action = dropAction;
    mobj.indented = true;     // stop if not indented.
  }

  if( mobj != null){
    mobj.prev = matchList;
    if( matchList != null){
      matchList.next = mobj;
    }
    matchList = mobj;
  }
}

// parse the data received from the game.
// COnnect guest adventure
// common to all client instances
// add matchers for
// Contents:
// You are carrying:
// does a lot of stuff for editing objects
//
// return of null means ignore this data.
// return of "" means use original 
// return of other is display other, do not speak other

function parse(msg, cindex, raw)
{
  let pref = msg.substr(0, 6);
  const client= clients[cindex];
  let n = 0;    // used to skip/count spaces etc
  let tb = null;

  if( msg.length == 0){
    return null;
  }

//  console.log("Pref='"+pref+"'");

  if(pref == "No mul"){
    showHide(0, "welcome");
    showHide(1, client.output);
    showHide(1, client.output+"_chatInput");
//      console.log("No mux for "+client.output);
    tb = new textBlock("No multiplexors available, try again in a few minutes\r\n", "");
    return tb;
  }

  // just throw @PING
  if( pref == "@PING"){
    return null;
  }

  if( client.pstate == 0){          // login state
    if( pref == "@RQV" ){           // BSX style request version
      showHide(0, "welcome");
      showHide(1, client.output+"_chatText");
      showHide(0, client.output+"_chatInput");
      console.log("@RQV");
      UIsendCmd("@WEB", client.index, 0, -1);
      client.prompt = "";

      return null;
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
        return null;
      }else if( gameMode != 1){       // no auto login 
        showHide(1, client.output);
        showHide(1, client.output+"_chatInput");
        client.pstate = 1;      // not web mode so display prompt
        client.sendToUser(client.prompt, true, false); // will parse the prompt again.
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
      return null;
    }
    return null;
  }

  if( client.pstate == 1 ){
    console.log("Parse '"+msg+"'");
    tb = matcher(client, msg);
    if( tb == null){
      console.log("matcher == null");
      return null;
    }


    if( msg.substr(0, 9) == "Contents:" ){
      addMatcher(client, "Contents:");
    }else if( msg.substr(0, 17) == "You are carrying:" ){
      addMatcher(client, "You are carrying:");
    }else if( msg.substr(0, 7) == "@SPEECH"){
      console.log("SPK: "+msg);
      let args=msg.split(" ");
      if( args.length > 1){
        if( args[1] == 4){
          doSpeech = doSpeechSaved;
        }else if( args[1] == 5){
          doSpeechSaved = doSpeech;
          doSpeech = false;
        }
        console.log("dospeech "+doSpeech);
      }
      return null;
    }
    if( tb != null){
          console.log("Parse(Text:"+tb.text+", Say:"+tb.say+")");
    }
    return tb;
  
  }

  let obj  = parseDBrefs(msg, cindex);
  if( obj != null){
    msg = obj.name+" "+makeCmd("#"+obj.dbref, cindex, "@ex ", -1);
    raw = true;
  }

  return toHTML(msg, raw);
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
    addMatcher(client, "@ex");
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
      client.sendHtmlToUser( makeCmd(cmd, cindex, "", -1) );
    }
    return;
  }
  
  if( pref == "@SPEECH"){
    if( speech == null){
      return;     // do nothing
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
      client.sendHtmlToUser( makeCmd(cmd, cindex, "", -1) );
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
        addMatcher(client, "score");
      }else {
        console.log("Second login "+tokens[1]+" "+client.user);
        return;
      }
    }
  }else if( tokens.length > 0){
    if( tokens[0] == "score"){
      console.log("Score "+client.flags);
      addMatcher(client, "score");
    }
  }

  if( client.isConnectedWsChat() ) {
    if( show == 1){
      let ucmd = makeCmd(cmd, cindex, "", -1);
      console.log("UCMD: "+ucmd);
      client.outText( ucmd+"<br />");
    }
    try{
      client.webSocket.send(  cmd+"\n" );
    } catch( exception ){
      client.sendHtmlToUser( '<p>Error: '+exception+'</p>' );
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
  game = getValue('defgame', "");

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
