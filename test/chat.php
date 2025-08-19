<?php

$user = "";
$location = "";
$style = "";
$host = "wss://moddersandrockers.com:4203";


function getValue($name, $def)
{ $ret = $def;
  if( isset($_GET[$name]) ){
    $ret = $_GET[$name];
  }
  if( isset($_POST[$name]) ){
    $ret = $_POST[$name];
  }
  return $ret;
}

// get values from URL

$style = getValue("style","");
$user = getValue("user", "");
// $pass = getValue("pass");
$host = getValue("host", $host);
$location = getValue("location", "");


?>
<!DOCTYPE html>
<html>
<head>
<TITLE>Video Chat Client</TITLE>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body onload="onPageLoaded();">

<div style='display:none;' >
  // args from PHP
  <?php if( $user != ""){ ?>
  <input id='defuser' value='<?php echo "$user"; ?>' />
  <?php }if( $pass != ""){ ?>
  <input id='defpass' value='<?php echo "$pass"; ?>' />
  <?php }if( $style != ""){ ?>
  <input id='defstyle' value='<?php echo "$style"; ?>' />
  <?php }if( $host != ""){ ?>
  <input id='defhost' value='<?php echo "$host"; ?>' />
  <?php }if( $speech != ""){ ?>
  <input id='defspeech' value='<?php echo "$speech"; ?>' />
  <?php } ?>
</div>
<div id='welcome-info' style='max-width:1000px;' >
    <p>Recently I wanted to add a Websocket based interface to my text based MUD to replace an HTTP polling one.
        The text based MUD is realtime and polling at a high enough rate was consuming a significant amount of resource.
  </p>
  <p>I had added HTTP support to the MUD back in 1995 or so. Adding Websocket support was not going to work for a number 
    of reasons, so I switched to using a node.js solution. Once I had the Websocket based solution I then looked at WebRTC
    for Video chatting. Back in 1990, MUDs were popular for allowing poeple to chat with each other whilst having fun.
  </p><p>
    WebRTC examples were a great help in getting Video chat up and running. The examples I found allowed a single peer to peer 
    video link to be setup but I wanted multiple peer to peer links. So I modified and re-wrote example code once I had 
    extracted the essence of the process. The WebRTC example used Websockets which I now have a better understanding of.
  </p>
  <p>
    I am making this code available so that you can build your own video chat system.
  </p>
  <input type='button' onclick='UIshowHide(0, "welcome-info");' value='Hide' />
  <br />
</div>
<table><tr>
  <td valign='top'>
      <div id='media' >
        <input type='button' value='Start Video' id='video-button' onclick='UIstartVideo();' />
      </div>
      <div id='webrtc' style='display:none;' >
        <div id="display-area" style="position:relative;" >
        <div  style="position:relative;" >
          <img src="resources/chat2.png"/>
          <video id="local-video" autoplay playsinline muted style="position:absolute; z-index:2;"></video>
          <span id='local-user' style="position:absolute; z-index:3;" >User</span>
          <span id='local-location' style="position:absolute; z-index:3;" >Location</span>
          <video id='rem-1-video' autoplay playsinline style="position:absolute; z-index:4;"></video>
          <span id='rem-1-user' style="position:absolute; z-index:6;" >User</span>
          <span id='rem-1-location' style="position:absolute; z-index:6;" >Location</span>
          <span id='rem-1-bg' style="position:absolute; z-index:3; background-color:  rgba(0, 0, 255, 1.0);"></span>
          <video id='rem-2-video' autoplay playsinline style="position:absolute; z-index:4;"></video>
          <span id='rem-2-user' style="position:absolute; z-index:6;" >User</span>
          <span id='rem-2-location' style="position:absolute; z-index:6;" >Location</span>
          <span id='rem-2-bg' style="position:absolute; z-index:3;  background-color:  rgba(0, 255, 0, 1.0);"></span>
          <video id='rem-3-video' autoplay playsinline style="position:absolute; z-index:4;"></video>
          <span id='rem-3-user' style="position:absolute; z-index:6;" >User</span>
          <span id='rem-3-location' style="position:absolute; z-index:6;" >Location</span>
          <span id='rem-3-bg' style="position:absolute; z-index:3;  background-color:  rgba(255, 0, 0, 1.0);"></span>
        </div>
        </div>
      </div>
  </td><td valign='top' rowspan='2'>
        <div >
          <input type="button" id="startrtc" onclick="UIstartStopRTC();" value="Start Video Chat"  style='display:none;' ></input>
          <div id='remoteUsers' >
            <p>Remote user list shown here</p>
          </div>
        </div>
  </td>
  </tr><tr>
  <td valign='top'>
    <div id="chat1" style="border-style:solid; border-color:red;" >
    <div id="chat1_status" style="font-family: 'courier new', monospace; display:none; background-color: green; ">
    </div>
    <div id="chat1_chatLog" style="font-family: 'courier new', monospace; max-width:1000px; min-width:800px; ">
    </div>
    </div>
    <div id="chat1_chatInput"  >
    </div>
  </td></tr>
  </table>


<script type="text/javascript" >

const LINESPERPAGE = 24;
let HTTPS_PORT=4203;

let rtcWss = 'wss://moddersandrockers.com:'+HTTPS_PORT;
let rtcHost = rtcWss;
let maxwidth=1000;    // initial width
const m68="MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM";
let screenheight = window.innerHeight;
let screenwidth = window.innerWidth;


// Stub of the client objet from the MUD web client.

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

  return x;
}

function UIshowHide(x, name)
{
  showHide(x, name);
}


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


function chatClient(host, name)
{   this.websocket = null;
    this.host = "";
    this.user = "";
    this.location = "";
    this.output = name;
    this.hhead = null;
    this.htail = null;
    this.numHist = 0;
    this._client = this;        // keydown hack.

    
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

    this.sendToUser = function( msg, id, whisper)
    {
        let lines = msg.split(/\r\n|\r|\n/g);
        let msgx = "";
        const client = clients[0];
        let pindex = null;
        if( id != null){
            pindex = findPeerByUuid(id, false);
        }

        for(let i = 0; i < lines.length; i++){
            msgx = msg;
            if( id != null){
                if( pindex == null){
                    user = client.user+": ";
                    msgx = user+msg;
                }else {
                    user = peers[pindex].user;
                    msgx = "<input type='button' value='"+user+"' onclick='UIselectUser("+pindex+");' /> "+msg;
                }
            }
            if( msgx != ""){
              if( whisper){
                this.outText("whisper: "+msgx+"<br />");
              }else {
                this.outText(msgx+"<br />");
              }
            }
        }

    }


    // 'this' is the text box usually not the chat
    this.KeyDown = function(e) 
    {
        if( e.keyCode == '13' ) {
            if( this._client.user == null || this._client.user == ""){
                let f = document.getElementById('chat1_chatText');
                // do user name checking here
                this._client.user = parseChat(f.value);
                canChat();
                webRTCopen(null);           // send our info
            }else {
                sendWsChat(this._client);
            }
        }
    }
}

function UIselectUser(pindex)
{  
    if( pindex == null){
        return;
    }
    p = peers[pindex];
    if( p == null){
        return;
    }
    let user = p.user;
    let f = document.getElementById('chat1_chatText');

    f.value = "@"+user+": "+f.value;
    f.focus();

}

function sendChat(data, dest)
{   let msg = "";
    let pindex = null;
    const client = clients[0];
    

    msg = parseChat(data);
    console.log("sendchat '"+msg+"' to="+dest);

    client.sendToUser(msg, uuid, false);

    let bdata = btoa(msg);

    if( dest == null){
        serverConnection.send(JSON.stringify({'chat' : bdata, 'user': client.user, 'uuid': uuid, 'addr' : "-"}));
    }else {
        serverConnection.send(JSON.stringify({'chat' : bdata, 'user': client.user, 'uuid': uuid, 'dest': dest, 'addr' : "-"}));
    }

}

// called from webrtc code.
function rtcChat(signal, message)
{
    const pindex = findPeerByUuid( signal.uuid, false);
    console.log("rtcChat peer="+pindex+" "+message.data);
    let addr = "";

    if( pindex == null){
      console.log("No peer");
        return;
    }
    if( signal.addr){
      addr = signal.addr;
      console.log("Addr="+addr+" loc='"+peers[pindex].location+"'" );
      if( peers[pindex].location == null || peers[pindex].location == ""){
        peers[pindex].location = addr;
        console.log("new addr "+addr);
        showRemoteUsers();
      }
    }else {
      console.log("No addr");
    }
    let whisper = false;
    if( signal.dest ){
      whisper = true;
    }

    const client = clients[0];
    let data = atob( signal.chat);
    client.sendToUser(data, signal.uuid, whisper);
}


let clients = [];

<?php include("webrtc.js"); ?>

// get value from optional html tag.
function getValue(name, def)
{ let f = document.getElementById(name);
  if( f != null){
    return f.value;
  }
  return def;
}

function uuidOfUser(user)
{
    for(let n = 0; n < peers.length; n++){
        let p = peers[n];
        if( p == null){
            continue;
        }
        if( p.user == user){
            console.log("User="+p.uuid);
            return p.uuid;
        }
    }
    console.log("Not found "+user);
    return null;
}

// look for '@user: '
function parseChat( data)
{   let users = [];
    let msg = data;
    let nxt = 0;        // index of next name in users[]

    // some entity mappings
    let pos = 0;
    let here = 0;
    msg = "";
    while( pos < data.length && pos < 72){
        if( data[pos] == '<'){
            msg += "&lt;";
        }else if( data[pos] == '&'){
            msg += "&amp;";
        }else {
            msg += data[pos];
        }
        pos++;
    }
    data = msg;

    pos = 0;
    here = 0;
    while( pos < data.length && pos < 72){
        if( data[pos] == '@'){
            pos++;
            here = pos;
            while( pos < data.length){
                if( data[pos] != ':'){
                    pos++;
                }else {
                    break;
                }
            }
            // at end or at a :
            if( pos == data.length){
                break;          // not a name                
            }
            let name = data.substr(here, pos-1);
            if( pos < data.length && data[pos] == ':'){
                pos++;
            }
            if( pos < data.length && data[pos] == ' '){
                pos++;
                data = data.substr(pos);
                users[nxt] = name;
                nxt++;
            }
        }else {
            break;  // no '@name: '
        }
    }

    if( users.length > 0){
        for(let n=0; n < users.length; n++){
            console.log("Send to user="+users[n]+" "+data);
            sendChat(data, uuidOfUser(users[n]));
        }
        return "";
    }


    return data;
}

// use cmd input
function sendWsChat(client) {
  let f = document.getElementById(client.output+"_chatText");
  let chatText = f.value;
    f.value = "";
    f.focus();
    let msg = parseChat(chatText);

    if( msg != null && msg != ""){
        sendChat(chatText, null);
    }
}

function canChat()
{   let f = document.getElementById('chat1_chatInput');

    if( f == null){
        return;
    }
    if( clients[0].user != null &&  clients[0].user != ""){
        f.innerHTML = '<table><tr><td>Chat:</td><td><input id="chat1_chatText" type="text" size=20 /></td></tr></table>';
    }else {
        f.innerHTML = '<table><tr><td>Your name:</td><td><input id="chat1_chatText" type="text" size=20 /></td></tr></table>';
    }
    f.onkeydown = clients[0].KeyDown;
    f._client = clients[0];

}

function onPageLoaded()
{
  let f;

  if( !( 'WebSocket' in window ) ) {
    return;
  }
  user = getValue('defuser', "");
//  pass = getValue('defpass', "");
  host = getValue('defhost', "wss://moddersandrockers.com:4203");

  clients[0] = new chatClient(host, "chat1");
  clients[0].user = user;

//  UIstartVideo();
  clients[0].sendToUser("<h1>Chat text goes here</h1>", null, false);

  initWebRTC();

 
  canChat();
}

</script>

  </body>
  </html>