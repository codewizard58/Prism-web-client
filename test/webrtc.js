// webrtc client 
// 
/// web chat
// session start (broadcast) - announce existance
// session accept            - respond as a peer
// session ping              - if peers do not see a ping within 30 seconds they assume you are dead.
// session call              - initiate, accept
// session close             - end a peer session
// session forget            - forget a peer
//
// sdp offer                 - start an ice negociation
// sdp answer                - accept sdp offer
//
// ice                       - negociate peer to peer communication

const NUM_STREAMS=2;
const PING_TIME = 10000;

let localStream;
let localVideo = null;
let remoteVideo = [];
let peers = [];
let displays = [null, null, null, null];
let serverConnection = null;
let uuid = null;

// common strings
const startRtc = "Start Video Chat";
const stopRtc = "Stop Video Chat";
const startVideo = "Start Video";
const stopVideo = "Stop Video";

let layouts = [];
let pips = [];
let layout = 0;
let pip = 2;

// picture in picture
function setPip(pos)
{ let left = 0;

  pip = pos;

  if( (pos & 1) == 1){
    left = 100;
  }

  let bits = pos & 6;

  if( bits == 0){
    pips[0] = [ left, left+100, 0, 100, 6];
  }else if( bits == 2){
    pips[0] = [ left+300, left+400, 0, 100, 6];
  }else if( bits == 4){
    pips[0] = [ left+300, left+400, 200, 300, 6];
  }else if( bits == 6){
    pips[0] = [ left+300, left+400, 200, 300, 6];
  }
}


// layout 
// bit 0: left right main
// bit 1: peer 1 in main local pip
// bit 2: peer 2 in main local pip
// bit 3: peer 3 in main local pip
// bit 1,2,3 are exclusive

function setLayout( lay)
{ 
  setPip( (lay & 1) | (pip & 6));
  layout = lay;
  if( (lay & 1) == 0){
    layouts[0] = [0, 400, 0, 300, 2];
    layouts[1] = [400, 500, 0, 100, 4];
    layouts[2] = [400, 500, 100, 200, 4];
    layouts[3] = [400, 500, 200, 300, 4];
  }else {
    layouts[0] = [100, 500, 0, 300, 2];
    layouts[1] = [0, 100, 0, 100, 4];
    layouts[2] = [0, 100, 100, 200, 4];
    layouts[3] = [0, 100, 200, 300, 4];
  }
  if( (lay & 2) == 2){
    layouts[1] = layouts[0];
    layouts[0] = pips[ 0];    // pip
  }else if( (lay & 4) == 4){
    layouts[2] = layouts[0];
    layouts[0] = pips[ 0];    // pip
  }else if( (lay & 8) == 8){
    layouts[3] = layouts[0];
    layouts[0] = pips[ 0];    // pip
  }
}

function setPositions( )
{
  
  for(i=0; i < displays.length; i++){

    if( displays[i] == null){
      displays[i] = new displayUser(i);
    }
    displays[i].setPosition( layouts[i]);
    displays[i].label( "user", "location");
  }
}

function UImute(i)
{ const p = peers[i];

}

function UImain(i)
{ const p = peers[i];
  const disp = displays[p.display];

  if( disp == null){
    return;
  }
  let bit = 0;
  if( disp.display == 1){
    bit = 2;
  }else if( disp.display == 2){
    bit = 4;
  }else if( disp.display == 3){
    bit = 8;
  }

  // toggle this bit clearing the others and keeping the L/R bit 0
  layout = ((layout ^ bit) & bit )  | (layout & 1);
  setLayout(layout);
  setPositions();

}


const peerConnectionConfig = {
  'iceServers': [
    {'urls': 'stun:moddersandrockers.com:3478'},
//    {'urls': 'stun:stun.stunprotocol.org:3478'},
//    {'urls': 'stun:stun.l.google.com:19302'},
  ]
};

const colors = [ "black", "blue", "green", "red"];


function nbs(msg)
{ let ret="";

  if( msg == null){
    return null;
  }
  for(let n = 0; n < msg.length; n++){
    if(msg[n] == ' '){
      ret = ret+"&nbsp;";
    }else {
      ret = ret + msg[n];
    }
  }
  return ret;
}

// per peer data
function peerUser( index)
{ this.index = index;
  this.uuid = null;
  this.user = null;
  this.location = null;
  this.dest = null;       // the peers uuid.
  this.state = 0;
  this.display = null;
  this.call = 0;          // track exchange of call requests
  this._peer = index;
  this.ping = 1;          //
  this.video = false;


  // per peer user table entry
  this.showState = function()
  { let msg="";
    let n = this.index;
    let user=nbs(this.user);
    let loc = nbs(this.location);
  
    msg += "<tr>";
    if( localStream != null && this.video){
      msg += "<td> <input type='button' id='peeruser-"+n+"' value='Call' onclick='UIcall("+n+");' /> </td>";
    }
    msg += "<td style='min-width: 20em;' >"+user+"</td><td>"+loc+"</td>";
    if( localStream != null && this.video){
      msg += "<td> <input type='button' id='peermute-"+n+"' value='Mute' onclick='UImute("+n+");' /> </td>";
      let color="black";
      if( this.display != null){
        let disp = displays[this.display];
        if( disp.display < colors.length){
          color = colors[disp.display];
        }
      }
      msg += "<td> <input type='button' id='peermain-"+n+"' value='Main' onclick='UImain("+n+");' style='color: "+color+"' /> </td>";
    }
//    msg += "<td> ping="+this.ping+" </td>";
    msg += "</tr>\n";

    return msg;
  }

  // display the call state changes
  this.setState = function(state)
  {
    this.call = state;
    let f = document.getElementById("peeruser-"+this.index);
    if( f == null){
      return;
    }
    this.call = state;
    if(this.call == 0){
      f.value = "Call";
    }else if( this.call == 1){
      f.value = "Cancel";    
    }else if( this.call == 2){
      f.value = "Accept";
    }else if( this.call == 3){
      f.value = "Close";
    }else {
      f.value = "Unknown";
    }

  }

  this.sendPing = function()
  {
//    console.log("Send ping "+this.uuid+" call="+this.call);
    serverConnection.send(JSON.stringify({'session' : 'ping', 'uuid': uuid, 'dest' : this.uuid}));
    if( this.ping > 0){
      this.ping--;
    }
  }

}

// each peer display 
function displayUser(index)
{ this.user = null;
  this.peer = null;
  this.display = index;
  this.peerConnection = null;
  this.name = 'local';    // default name
  this.left = 0;
  this.right = 100;
  this.top = 0;
  this.bottom = 100;


  this.newPeer = function()
  {
//    console.log("Newpeer on display "+this.display);
    this.peerConnection = new RTCPeerConnection(peerConnectionConfig);
    this.peerConnection._peer = this.display;
    this.peerConnection.onicecandidate = iceHandlers[this.display];
    this.peerConnection.ontrack = streamHandlers[this.display];

    for(const track of localStream.getTracks()) {
      this.peerConnection.addTrack(track, localStream);
    }
  }

  this.initPeer = function(isCaller ) 
  {
    let p = peers[this.peer];

//    console.log("initPeer "+isCaller+" uuid="+uuid+" peer="+this.peer+" call="+p.call);

    p.state = 1;

    if(isCaller) {
      if( this.peerConnection == null){
        this.newPeer();
      }

      console.log("Send offer on display="+this.display);
      this.peerConnection.createOffer().then(descriptionHandler[this.display]).catch(errorHandler);
      const disp = displays[this.display];
      disp.showHide(1);
    }
  }

  // display
  this.close = function()
  { 
    this.showHide(0);
    if( this.peerConnection != null){
      let state = this.peerConnection.connectionState;

      if( state == "disconnected" || state == "failed" || state == "closed")
      {
        this.peerConnection = null;
        return;
      }
      this.peerConnection.close();
    }
    this.peerConnection = null;

    let bit = 0;
    if( this.display == 1){
      bit = 2;
    }else if( this.display == 2){
      bit = 4;
    }else if( this.display == 3){
      bit = 8;
    }

    if( (layout & bit) == bit){
      setLayout(layout ^ bit);
      setPositions();
    }

  }

  this.addStream = function(stream)
  {
    let f = document.getElementById(this.name+"-video");

    f.srcObject = stream;
  }

  this.showHide = function(show)
  { 
    showHide(show, this.name+"-video");
    showHide(show, this.name+"-user");
    showHide(show, this.name+"-location");
  }

  this.setPosition = function( layout)
  { let f;
    this.left = layout[0];
    this.top = layout[2];
    this.right = layout[1];
    this.bottom = layout[3];
    let z = 2;

    if( layout.length > 4){
      z = layout[4];
    }


    f = document.getElementById(this.name+'-video');
    if( f != null){
      let x = this.left;
      f.style.left = ""+x+"px";
      x = this.right;
      f.style.right = ""+x+"px";
      x = this.top;
      f.style.top =  ""+x+"px";
      x = this.bottom;
      f.style.bottom = ""+x+"px";
      x = this.right - this.left;
      f.style.width = ""+x+"px";
      x = this.bottom - this.top;
      f.style.height = ""+x+"px";

      f.style.zIndex = z;
    }

    f = document.getElementById(this.name+'-bg');
    if( f != null){
      let x = this.left;
      f.style.left = ""+x+"px";
      x = this.right;
      f.style.right = ""+x+"px";
      x = this.top;
      f.style.top =  ""+x+"px";
      x = this.bottom;
      f.style.bottom = ""+x+"px";
      x = this.right - this.left;
      f.style.width = ""+x+"px";
      x = this.bottom - this.top;
      f.style.height = ""+x+"px";

      f.style.zIndex = z-1;
    }

  }

  this.label = function(user, location)
  { let f = document.getElementById(this.name+"-user");
    let l = this.left;
    let t = this.bottom - 20;
    this.user = user;
    if( f != null){
      f.innerHTML = user;
      f.style.left = ""+l+"px";
      f.style.top = ""+t+"px";
      f.style.color = "white";
    }
    f = document.getElementById(this.name+"-location");
    this.location = location;
    if( f != null){
      f.innerHTML = location;
      f.style.left = ""+l+"px";
      t = t + 10;
      f.style.top = ""+t+"px";
      f.style.color = "white";
    }
  }

  if( index > 0){
    this.name = 'rem-'+index;
  }

}

function printPeers()
{ let msg="";

  msg += "Peers: "+peers.length;
  let n=0;
  for(n=0; n < peers.length;n++){
    if( peers[n] == null){
      msg += " Free "+n;
    }else {
      let p = peers[n];
      msg += " Used "+n;

      if( p.uuid != null){
        msg += " uuid="+p.uuid;
      }
      if( p.dest != null){
        msg += " uuid="+p.dest;
      }
    }
  }

  return msg;
}


function setCallState(i, state)
{  const p = peers[i];

  if( p == null){
    return;
  }
  p.setState(state);
}

function UIcall(i)
{ // call peer i
  const p = peers[i];
  let display = 0;

  console.log("UIcall "+i+" peer="+p.uuid+" call="+p.call+" user="+p.user);
  if( p.state == 0){
    if( p.call == 0){
      display = findDisplay(i);         // allocate a display and init peerconnection
      if( display == null){
        return;
      }
      p.display = display;
      console.log("Use display "+display);

      let disp = displays[display];
      if( disp.peerConnection == null){
        disp.newPeer();
      }
      serverConnection.send(JSON.stringify({'session' : 'call', 'uuid': uuid, 'dest' : p.uuid}));
      setCallState(i, 1);
      return;
    }else if( p.call == 1){ // cancel
      setCallState(i, 0);
      // go to close...
    }else if(p.call == 2){ // 2 we are accepting
      serverConnection.send(JSON.stringify({'session' : 'call', 'uuid': uuid, 'dest' : p.uuid}));
      setCallState(i, 3);
      display = findDisplay(i);       // allocate display and init peer connection.
      if( display == null){
        return;
      }
      p.display = display;
      let disp = displays[display];

      if( disp.peerConnection == null){
        disp.newPeer();
      }
      if( uuid > p.uuid){       // we are master
        disp.initPeer(true);    // send offer
      }
      return;
    }
  }
  // close
  serverConnection.send(JSON.stringify({'session' : 'close', 'uuid': uuid, 'dest' : p.uuid}));
  closePeer(i);
  setCallState(i, 0);
}

function initRemoteVideo()
{
  let i;
  let f ;
  let l = 0;
  let r = 400;
  let t = 0;
  let b = 300;

  let lr = 400;

  if( displays[0] == null){
    displays[0] = new displayUser(0);
  }

  setLayout(1);
  setPositions();

  return i;
}

function showRemoteUsers()
{ let f = document.getElementById("remoteUsers");
  let msg = "<table>";

  if( f == null){
    return;
  }

  for(let n = 0; n < peers.length; n++)
  {
    const p = peers[n];
    if( p != null){
      msg += p.showState();
    }
  }

  msg += "</table>\n";

  f.innerHTML = msg;

}

// look for peer with this uuid
function findPeerByUuid(uuid, makenew)
{ let n = 0;

  for(n=0; n < peers.length; n++){
    if( peers[n] != null){
      if( peers[n].uuid == uuid){
        console.log("Found uuid "+n+" "+uuid);
        return n;
      }
      if( peers[n].dest == uuid){
        console.log("Found dest "+n+" "+uuid);
        return n;
      }
      if( peers[n].uuid == null){
        peers[n].uuid = uuid;
        console.log("Set uuid "+n+" "+uuid);
        return n;
      }
    }
  }

  if( makenew){
    // find free slot
    for(n=0; n < peers.length; n++){
      if( peers[n] == null){
        break;
      }
    }
    console.log("NotFound uuid "+n+" "+uuid);
    peers[n] = new peerUser(n);
    peers[n].uuid = uuid;

    return n;
  }
  return null;
}

async function startLocalVideo()
{
  const constraints = {
    video: true,
    audio: true,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    localStream = stream;
    localVideo.srcObject = stream;
    
  } catch(error) {
    errorHandler(error);
  }

}

function stopVideoSub()
{  let f = document.getElementById("video-button");

    f.value = startVideo;
    for(let i=0; i < peers.length; i++){
      if( peers[i] != null){
        serverConnection.send(JSON.stringify({'session' : 'forget', 'uuid': uuid, 'dest' : peers[i].uuid}));
        closePeer(i);
        peers[i] = null;
      }
    }
    showRemoteUsers();

    if( localStream != null){
      let tracks = localStream.getTracks();
      for(t of tracks){
        t.stop();
      }
      localStream = null;
    }
    showHide(0, "webrtc");
    showHide(0, 'startrtc');
    f = document.getElementById("startrtc");
    f.value = startRtc;
    return;

}

// the start/stop video button handler
function UIstartVideo()
{ 
  let f = document.getElementById("video-button");
  if( f.value == stopVideo){
    // stop
    stopVideoSub();
    return;
  }

  // start
  initRemoteVideo();

  localVideo = document.getElementById('local-video');
  if(!navigator.mediaDevices.getUserMedia) {
    alert('Your browser does not support getUserMedia API');
    return;
  }

  startLocalVideo();
  stopWebRTC();             // put webrtc in init state

  showHide(1, 'webrtc');
  showHide(1, 'startrtc');
  if( f != null){
    f.value = stopVideo;
  }
  let disp = displays[0];
  if( disp == null){
    displays[0] = new displayUser(0);
    disp = displays[0];
  }
  disp.label(clients[0].user, clients[0].location); // local


}

function webRTCopen(e)
{ let f = document.getElementById('startrtc');
  const client = clients[0];

  if( serverConnection != null){
    if( localStream != null){
      serverConnection.send(JSON.stringify({'session' : 'start', 'user': client.user, 'location' : client.location, 'uuid': uuid, 'video' : true}));
    }else {
      serverConnection.send(JSON.stringify({'session' : 'start', 'user': client.user, 'location' : client.location, 'uuid': uuid, 'video' : false}));
    }
    if( f != null){
        f.value = stopRtc;
    }
  }

}


// start/stop rtc

function stopWebRTC()
{ let f = document.getElementById('startrtc');
  for(let n=0; n < peers.length; n++){
    if(peers[n] != null){
      serverConnection.send(JSON.stringify({'session' : 'close', 'uuid': uuid, 'dest' : peers[n].uuid}));
      serverConnection.send(JSON.stringify({'session' : 'forget', 'uuid': uuid, 'dest' : peers[n].uuid}));
      closePeer(n);
      peers[n].uuid = null;
      peers[n].dest = null;
      peers[n].user = null;
      peers[n].location = null;
      peers[n] = null;
    }
  }
  showRemoteUsers();

  f.value = startRtc;
}
// if stop cleanup all peer info
function UIstartStopRTC()
{ let f = document.getElementById('startrtc');
  const client = clients[0];

  if( f != null && f.value == stopRtc){
    console.log("Stop RTC");
    stopWebRTC();
    return;
  }

  console.log("Start RTC");
  if( client.user == null){
    client.sendToUser( "Need to login first!" , null, false);
    return;
  }
  webRTCopen();

}


//  states : new, connecting, connected, disconnected, failed, or closed.
function closePeer(peer)
{ let p = peers[peer];
  if( p == null ){
    return;
  }
  const display = p.display;
  if( display != null && display > 0){
    const disp = displays[display];
    if( disp != null){
      disp.close();
    }
    displays[display] = null;
  }

  p.state = 0;
  p.display = null;
  p.call = 0;

}

// process session messages
function rtcSession(signal, message)
{ let p;
  const client = clients[0];

  if( signal.session != 'ping'){
    p = findPeerByUuid(signal.uuid, true);
  }else {
    p = findPeerByUuid(signal.uuid, false);
  }

  if(signal.video){
    peers[p].video = signal.video;
    console.log("Video "+signal.video);
  }
  // start is for all
  console.log("Session "+signal.session+" uuid="+signal.uuid);
  if( signal.session == 'start'){
    peers[p].user = signal.user;
    peers[p].location = signal.location;
    peers[p].dest = signal.uuid;
    peers[p].uuid = signal.uuid;

    if( localStream != null){
      serverConnection.send(JSON.stringify({'session' : 'answer', 'user': client.user, 'location' : client.location, 'uuid': uuid, 'dest' : signal.uuid, 'video' : true}));
    }else {
      serverConnection.send(JSON.stringify({'session' : 'answer', 'user': client.user, 'location' : client.location, 'uuid': uuid, 'dest' : signal.uuid, 'video' : true}));
    }
    showRemoteUsers();

  }

  // rest are targetted.
  if( ( signal.dest && signal.dest != uuid)){
      console.log("Answer not for us");
      return;
  }
  
  if( signal.session == 'answer'){
    peers[p].user = signal.user;
    peers[p].location = signal.location;
    showRemoteUsers();

  }else if( signal.session == 'call'){
    console.log("got Call peer="+p+" call="+peers[p].call+" user="+peers[p].user);
    if( peers[p].call == 0){
      // request
      setCallState(p, 2);
    }else if(peers[p].call == 1) {   // accept of call
      showRemoteUsers();
      if( uuid > signal.uuid){      // master.
        let disp = displays[peers[p].display];
        disp.initPeer(true);    // send sdp.start
        disp.showHide(1);
      }
      setCallState(p, 3);
    }
  }else if( signal.session == 'close'){
    closePeer( p);
    setCallState(p, 0);
    showRemoteUsers();
    return;
  }else if( signal.session == 'forget'){
    closePeer( p);
    peers[p].uuid = null;
    peers[p] = null;
    showRemoteUsers();
    return;
  }else if( signal.session == 'ping'){
    if( p != null){
      peers[p].ping = 2;
//      console.log("Rec PING "+peers[p].uuid+" call="+peers[p].call);
    }
    return;
  }

}

function rtcMessage(message) 
{
  const signal = JSON.parse(message.data);
  const client = clients[0];

  // Ignore messages from ourself
  if(signal.uuid == uuid){
    console.log("IGNORE ourself");
   return;
  }

  if( signal.chat){
    rtcChat( signal, message);
    return;
  }

  if( signal.session){
    rtcSession(signal, message);
    return;
  }

  if(signal.sdp) {
    let dest = "";

    if( signal.dest){
      dest = signal.dest;
      if( dest != uuid){
        console.log("SDP not us "+uuid+" dest="+dest);
        printPeers();
        return;
      }
    }
    console.log("SDP "+signal.sdp.type+" uuid="+signal.uuid+" dest="+dest);

    const pindex = findPeerByUuid( signal.uuid, true);

    const p = peers[pindex];
    const display = findDisplay(pindex);
    if( display == null){
      return;     // all in use
    }
    p.display = display;
    const disp = displays[display];
    if( disp.peerConnection == null){
      disp.newPeer();
    }

    disp.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
      // Only create answers in response to offers
      if(signal.sdp.type !== 'offer') {
        return;
      }
      // only start when session calls have been exchanged.
      console.log("Offer "+p.call+" user="+p.user+" dest="+p.dest);
      if( p.call == 0 ){
        return;
      }
      setCallState(p.index, 3);

      p.dest = signal.uuid;
      disp.peerConnection.createAnswer().then(descriptionHandler[p.display]).catch(errorHandler);
      disp.showHide(1);

    }).catch(errorHandler);
  } else if(signal.ice) {
    let dest = "";
    
    if( signal.dest){
      dest = signal.dest;
      if( dest != uuid){
        console.log("ICE not us "+uuid+" dest="+dest);
        printPeers();
        return;
      }
    }
    const pindex = findPeerByUuid( signal.uuid, true);
    const p = peers[pindex];
    const display = findDisplay(pindex);
    const disp = displays[display];

    console.log("ICE uuid="+uuid+"peer="+pindex+" user="+p.user+" call="+p.call);

    disp.peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
  }
  else {
    console.log("Other "+message);
  }
}

function gotIceCandidate(event, display) 
{ const disp = displays[display];
  const peer = disp.peer;           // peer index
  const p = peers[peer];

  if(event.candidate != null) {
//     console.log("Got ICE ["+peer+"]"+event.candidate);
    serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid, 'dest' : p.uuid}));
  }
}

function createdDescription_0(description)
{
  createdDescription_sub(description, 0);
}

function createdDescription_1(description)
{
  createdDescription_sub(description, 1);
}

function createdDescription_2(description)
{
  createdDescription_sub(description, 2);
}

function createdDescription_3(description)
{
  createdDescription_sub(description, 3);
}

const descriptionHandler = [ createdDescription_0, createdDescription_1, createdDescription_2, createdDescription_3, null, null, null, null];

function createdDescription_sub(description, display) 
{ const disp = displays[display];
  const peer = disp.peer;
  const p = peers[peer];

  console.log('create description peer='+peer+" "+p.index+" user="+p.user);
  disp.peerConnection.setLocalDescription(description).then(() => {
    serverConnection.send(JSON.stringify({'sdp': disp.peerConnection.localDescription, 'uuid': uuid, 'dest' : p.dest}));
  }).catch(errorHandler);
}

function findDisplay(pindex)
{ const p = peers[pindex];
  let disp;

  if( p == null){
    return;
  }
  if( p.display != null){     // we already have a display
    console.log("Find display return "+p.display);
    return p.display;
  }
  for(let d = 1; d < displays.length; d++){
    disp = displays[d];
    if( disp == null){
      continue;
    }
    if( disp.peer == pindex){
      console.log("Find display2 return "+d);
      return d;
    }
  }
  // not existing
  for(let d = 1; d < displays.length; d++){
    disp = displays[d];
    if( disp == null){
      displays[d] = new displayUser(d);
      disp = displays[d];
      disp.peer = pindex;
      peers[pindex].display = d;
      console.log("Find display new return "+d);
      return d;
    }
    if( disp.peer == null){
      disp.peer = pindex;
      peers[pindex].display = d;
      console.log("Find display free return "+d);
      return d;
    }
  }
  console.log("Find display null ");
  return null;     // no free displays.

}


function gotIceCandidate_0(event)
{
  console.log("ICE 0");
  gotIceCandidate(event, 0); 
} 

function gotIceCandidate_1(event)
{
  console.log("ICE 1");
  gotIceCandidate(event, 1); 
} 

function gotIceCandidate_2(event)
{
  gotIceCandidate(event, 2); 
} 

function gotIceCandidate_3(event)
{
  gotIceCandidate(event, 3); 
} 

function gotIceCandidate_4(event)
{
  gotIceCandidate(event, 4); 
} 

////
function gotRemoteStream_0(event)
{
  console.log("Stream 0");
  gotRemoteStream(event, 0);
}

function gotRemoteStream_1(event)
{
  console.log("Stream 1");
  gotRemoteStream(event, 1);
}

function gotRemoteStream_2(event)
{
  gotRemoteStream(event, 2);
}

function gotRemoteStream_3(event)
{
  gotRemoteStream(event, 3);
}

function gotRemoteStream_4(event)
{
  gotRemoteStream(event, 4);
}

function gotRemoteStream_5(event)
{
  gotRemoteStream(event, 5);
}

function gotRemoteStream_6(event)
{
  gotRemoteStream(event, 0);
}

function gotRemoteStream_7(event)
{
  gotRemoteStream(event, 7);
}

// match requests with their object.
let iceHandlers = [gotIceCandidate_0, gotIceCandidate_1, gotIceCandidate_2, gotIceCandidate_3, gotIceCandidate_4, null, null, null ];
let streamHandlers = [ gotRemoteStream_0, gotRemoteStream_1, gotRemoteStream_2, gotRemoteStream_3, gotRemoteStream_4, gotRemoteStream_5, gotRemoteStream_6, gotRemoteStream_7];

function gotRemoteStream(event, display)
{ const disp = displays[display];
  const pindex = disp.peer;
  let p = peers[pindex];

  console.log('got remote stream '+(event.streams.length)+" on display="+display+" peer="+pindex);
  if( display == 0){
    return;
  }

  disp.label(p.user, p.location);
  disp.showHide(1);
  disp.addStream(event.streams[0]);
}

function errorHandler(error) {
  console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4() + s4() + s4()}`;
}

function doPing()
{
  setTimeout(doPing, PING_TIME);

  for(let n = 0; n < peers.length; n++){
    let p = peers[n];

    if( p == null){
      continue;
    }
    if( p.ping == 0){
      console.log("Ping close "+p.uuid);
      closePeer( n);
      peers[n] = null;
      showRemoteUsers();
    }else {
      p.sendPing();
    }
  }

}

function initWebRTC()
{
  uuid = createUUID();
  
  serverConnection = new WebSocket(rtcWss);
  serverConnection.onmessage = rtcMessage;
  serverConnection.onopen = webRTCopen;

  setTimeout(doPing, 10000);
}


// end of webrtc.js
