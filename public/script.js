// client-side js, loaded by index.html
// run by the browser each time the page is loaded

$(function() {
  console.log("hello world :o");
  
  const socket = window.io();
  var sense = window.sense.init();
  //mabel tower bell sounds
  var soundurl = "https://cdn.glitch.com/73aed9e9-7ed2-40e5-93da-eb7538e8d42c%2F";
  //mabel handbell sounds
  var bellurl = "https://cdn.glitch.com/3222d552-1e4d-4657-8891-89dc006ccce8%2F";
  const stages = ["minimus", "minor", "major", "royal", "maximus", "fourteen", "sixteen"];
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = audioCtx.createGain();
  //name entered for this socket
  let name;
  let list = [];
  let entrants = [];
  let captain = false;
  let door = false;
  let numbells;
  let sounds = "tower";
  let trebleloc = "right";
  let bells;
  let mybells = [];
  let mbells = [];
  let sallies = [];
  let hand;
  let tails = [];
  let back;
  let speed = 1.3;
  let latency = 0;
  let phone = false;
  let phoneid;
  let phoneids = [];
  let phonebell;
  let phonestroke = 1;
  let p = 1;
  let centerself = false;
  let centerbell;
  let width = $("#spacing option:checked").val();
  
  $("#container").on("click", 'input[type="text"]', () => {
    $("#resume").show();
  });
  
  $("#resume").on("click", () => {
    $("#resume").hide();
  });
  
  $(window).focus(() => {
    $("#resume").hide();
  });
  
  $(window).blur(() => {
    $("#resume").show();
  });
  
  
  $("#enterbutton").on("click", enter);
  $("input#secret").on("keyup", (e) => {
    if (e.code === "Enter") {
      enter(e);
    }
  });
  
  //assign a bell
  $("#entrants").on("change", "div.assign", function() {
    let n = $(this).prev("span").text();
    let arr = [];
    $(this).find("input:checked").each(function() {
      arr.push(Number($(this).val()));
    });
    
    socket.emit("assign", {name: n, bells: arr});
  });
  
  //display bell options on touchscreens
  $("#entrants").on("touchstart", "div.assign.active", function() {
    $(this).children("ul").toggleClass("block");
    $(this).parent("li").siblings("li").children("div.assign").toggleClass("hide");
  });
  
  //enter press in chat input
  $("input#chat").on("keyup", function(e) {
    if (e.code === "Enter" && $("input#chat").val().length) {
      socket.emit("chat", {name: name, message: $("input#chat").val()});
      $("input#chat").val("");
    }
  });
  
  //prevent typing in inputs from triggering a bell ring
  $("body").on("keyup", "input", function(e) {
    //e.preventDefault();
    e.stopPropagation();
  });
  
  //prevent duplication in keyboard commands
  $("#keyboard").on("keypress", "input.keyboard", function(e) {
    if (mbells.find(o => o.keys.includes(e.key))) {
      e.preventDefault();
    }
  });
  
  //update keyboard commands
  $("#keyboard").on("keyup", "input.keyboard", function(e) {
    let b = mbells.find(o => o.num === Number(this.id.slice(4)));
    if (b) {
      b.keys = $(this).val();
      //console.log(b);
    }
  });
  
  
  
  //ring bell with keyboard
  $("body").on("keyup", function(e) {
    if (door && mybells.length) {
      let bell = mbells.find(o => o.keys.includes(e.key));
      if (bell && !bell.ringing) {
        bell.ringing = true;
        let stroke = bells.find(b => b.num === bell.num).stroke;
        socket.emit("ring", {bell: bell.num, stroke: stroke});
      }
    }
  });
  
  //click stand button
  $("#stand").on("click", function(e) {
    socket.emit("stand");
  });
  
  $("#volume").on("change", function(e) {
    gainNode.gain.value = this.value;
  });
  
  
  $(".column").on("change", ".phone select", function(e) {
    console.log(this);
    let bell = Number($(this).find("option:checked").val());
    //if (bell) {
      let mbell = mbells.find(b => b.num === bell);
      if (mbell) mbell.phone = true;
      let id = Number(this.id.slice(5,-4));
      socket.emit("assignphone", {name: name, phoneid: phoneids.find(o => o.num === id).id, bellnum: bell, bellname: mbell ? mbell.name : null});
    //} else {
      //console.log("phone bell not emitted");
    //}
  });
  
  
  $("#numbells li").on("click", function(e) {
    
      let n = Number($(this).text());
      socket.emit("stage", n);
    
  });
  
  $('input[name="trebleloc"]').on("change", function(e) {
    trebleloc = $('input[name="trebleloc"]:checked').val();
    rearrange(true);
  });
  
  $('input[name="centerself"]').on("change", function() {
    if ($(this).is(":checked")) {
      centerself = true;
    } else {
      centerself = false;
    }
    rearrange(false);
  });
  
  
  
  
  //get list of names currently in use
  socket.on("names", (nn) => {
    list = nn;
  });
  
  //get bells
  socket.on("bells", arr => {
    bells = arr.map(b => {
      b.url = bellurl + b.url;
      b.ringers = [];
      return b;
    });
    setupSample(0);
  });
  
  
  
  
  
  socket.on("ping", () => {
    //console.log("ping sent");
    if (door) socket.emit("test", Date.now());
  });
  
  
  socket.on("pong", (n) => {
    if (door) {
        if (n > latency) {
        socket.emit("latency", {name: name, latency: n});
      }
      latency = n;
    }
  });
  
  socket.on("time", (n) => {
    console.log(Date.now()-n);
  });
  
  socket.on("duplicate", () => {
    $("#name").val("");
    $("#name").attr("placeholder", '"'+name+'" already in use; pick another name');
  });
  
  
  //secret was wrong
  socket.on('wrong', () => {
    $("#secret").val("");
    $("#secret").attr("placeholder", "invalid secret");
  });
  
  //this socket enters
  socket.on("open", (obj) => {
    door = true;
    entrants = obj.entrants;
    numbells = obj.state.numbells;
    centerbell = numbells/2;
    stagechange(obj.state);
    if (entrants.find(o => o.name === name).conductor) {
      captain = true;
      $(".conduct").show();
    }
    updatelist(entrants);
     
    $("#resume").hide();
    $("#enter").hide();
    $("#container").show();
  });
  
  //this phone socket enters
  socket.on("phoneopen", (obj) => {
    door = true;
    phone = true;
    
    $("#enter").hide();
    $("#phoneinfo").append(`<h3>${name}'s phone</h3>`);
    $("#phoneinfo").removeClass("hidden");
  });
  
  //this phone socket assigned
  socket.on("phoneassign", (obj) => {
    console.log(obj);
    if (obj.bellname && door) {
      phonebell = obj.bellnum;
      $("#phoneinfo .bellname").remove();
      $("#phoneinfo").append(`<h3 class="bellname">Bell ${obj.bellnum}</h3>`);
      sense.fling({off: true}, phonering);
      sense.fling({interval: 300, sensitivity: 0.8}, phonering);
    } else if (door) {
      phonebell = null;
      $("#phoneinfo .bellname").remove();
      sense.fling({off: true}, phonering);
    }
    
    function phonering(data) {
      console.log(data);
      socket.emit("ring", {bell: obj.bellnum, stroke: phonestroke}); 
    }
  });
  
  //someone else enters
  socket.on("entrance", (m) => {
    if (door) {
      updateentrant(m.info, true);
    }
    
  });
  
  socket.on("exit", (m) => {
    if (door) {
      updateentrant(m, false);
    }
  });
  
  //phone connected to this computer socket
  socket.on("phone", (obj) => {
    
    phoneids.push({id: obj.id, num: p});
    
    //entrants.find(o => o.name === name).phones = phoneids;
    
    let after = phoneids.length === 1 ? "div#keyboard" : "div#phone"+(phoneids[phoneids.length-2].num);
      let options = `<option></option>`;
      mbells.forEach(b => {
        options += `<option value="${b.num}">${b.num}</option>`;
      });
      let div = `<div id="phone${p}" class="phone">
          <h4>
            Phone
          </h4>
          <label for="phone${p}bell">Bell: </label><select id="phone${p}bell" >
            ${options}
          </select>
        </div>`;
      $(div).insertAfter($(after));
    p++;
  });
  
  
  socket.on("disconnect", (r) => {
    console.log(r);
    //if (r === 'io server disconnect') {
      door = false;
      captain = false;
      $("#container").hide();
      $("#enter").hide();
      $("#phoneinfo").hide();
      $("#closed").show();
    //}
    
  });
  
  //a phone connected to this socket closes
  socket.on("closephone", (id) => {
    let i = phoneids.findIndex(o => o.id === id);
    $("#phone"+phoneids[i].num).remove();
    phoneids.splice(i, 1);
  });
  
  //this phone socket closes
  socket.on("phoneclose", (r) => {
    door = false;
    $("#phoneinfo").hide();
    $("#closed").show();
  });
  
  
  //stand command received
  socket.on("stand", (n) => {
    if (door) {
      for (let i = 1; i <= numbells; i++) {
        bells.find(b => b.num === i).stroke = 1;
        let transform = (numbells >= 10 ? "scale(0.8) " : "") + "rotate("+(i <= numbells/2 ? "-145deg)" : "145deg)");
        $("#rope"+i).css("transform", transform);
        let bell = mbells.find(b => b.num === i);
        if (bell) {
          bell.ringing = false;
        }
        if (phone && phonebell === i) {
          phonestroke = 1;
        }
      }
    }
  });
  
  
  socket.on("stagechange", stagechange);
  
  //any socket is assigned
  socket.on("assignment", (obj) => {
    //console.log(bells);
    
    
    updateentrant(obj);
    if (obj.name === name) {
      assign(obj);
      if (centerself) { //why???
        rearrange(false);
      }
    }
  });
  
  
  
  //ring arrives
  socket.on("ring", obj => {
    if (door && !phone) {
      //console.log(obj);
      let bell = bells.find(b => b.num === obj.bell);
      if (bell.stroke === obj.stroke) {
        let angle = obj.stroke === 1 ? 45 : 145;
        let transform = (numbells >= 10 ? "scale(0.8) " : "") + "rotate("+(bell.left > 400 ? -1*angle+"deg)" : angle+"deg)");
        
        let mbell = mbells.find(b => b.num === obj.bell);
        if (mbell) {
          mbell.ringing = false;
        }
        $("#rope"+bell.num).css("transform", transform);
        
        ring(bell.num);

        bell.stroke = obj.stroke * -1;
      }
      
    } else if (door && phone && obj.bell === phonebell) {
      phonestroke *= -1;
    }
  });
  
  //chat message arrives
  socket.on("chat", obj => {
    let message = obj.name+": "+obj.message+ "\n";
    document.querySelector("textarea").value += message;
  });
  
  
  // BEGIN FUNCTIONS
  
  //attempt to enter the chamber
  function enter(e) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    requestDeviceMotion();
    name = $("#name").val();
    let secret = $("#secret").val();
    if (name.length && !/^\s+$/.test(name) && secret.length && !/^[^\w]+$/.test(secret)) {
      socket.emit("entrant", {name: name, secret: secret});

    } else {
      $("#name").val("");
      $("#secret").val("");
      $("#name").attr("placeholder", "invalid name or wrong secret");
    }
    
  }
  
  function remove(e) {
    e.removeEventListener("click", emitring);
    e.removeEventListener("mouseenter", pointer);
  }
  
  //change cursor
  function pointer(e) {
    let num = Number(this.id.slice(4));
    if (mybells.includes(num)) {
      this.style.cursor = "pointer";
    } else {
      this.style.cursor = "auto";
    }
  }
  
  //emit ring from a click
  function emitring(e) {
    let num = Number(this.id.slice(4));
    let bell = bells.find(b => b.num === num);
    if (mybells.includes(num)) {
      socket.emit("ring", {bell: bell.num, stroke: bell.stroke});
    }
  }
  
  //build list of entrants
  function updatelist(m) {
    $("#entrants li").remove();
    m.forEach((e) => {
      if (e.name === name && e.conductor) {
        captain = true;
        $("#numbells li:hover").css("cursor", "pointer");
      }
      let c = e.conductor ? " (C)" : "";
      let d = captain || e.name === name ? ' active"' : '"';
      let b = e.bells.length ? e.bells.join(",") : "no bells";
      $("#entrants").append('<li id="'+e.name+'"><span>'+e.name+ '</span>' + c+'<div class="assign'+ d+ '><span class="summary">'+b+'</span>' + selectOpts(name, e.bells) +'</div></li>');
    });
  }
  
  //build bell selection dropdown
  function selectOpts(name, n) {
    let opts = `
      <ul class="dropdown">
      `;
    for (let i = 1; i <= numbells; i++) {
      let s = n.includes(i) ? " checked " : "";
      opts += `<li><input type="checkbox" id="${name+"-"+i}" value="${i}"${s} /><label for="${name+"-"+i}">${i}</label></li>
`
    }
    opts += `</ul>`;
    return opts;
  }
  
  function updateentrant(o, isnew) {
    if (isnew) {
      entrants.push(o);
      let c = o.conductor ? " (C)" : "";
      let d = captain || o.name === name ? ' active"' : '"';
      $("#entrants").append('<li id="'+o.name+'"><span>'+o.name+ '</span>' + c+'<div class="assign'+ d+ '><span class="summary">no bells</span>' + selectOpts(name, o.bells) +'</div></li>');
      
    } else {
      let li = $("li#"+o.name);
      let assigned = bells.filter(b => b.ringers.includes(o.name));
      assigned.forEach(b => {
          b.ringers.splice(b.ringers.indexOf(o.name), 1);
          $(".bellnum.rope"+b.num).text(b.num+"\n"+b.ringers.join("\n"));
        });
      let j = entrants.findIndex(e => e.name === o.name);
      if (o.exit) {
        li.remove();
        entrants.splice(j, 1);
        
      } else {
        let text = o.bells.length ? o.bells.join(",") : "no bells";
        li.find("span.summary").text(text);
        for (let i = 1; i <= numbells; i++) { //edit conductor's dropdown menu
          $("input#"+o.name+"-"+i).prop("checked", o.bells.includes(i));
          if (o.bells.includes(i)) {
            let bell = bells.find(b => b.num === i)
            bell.ringers.push(o.name);
            $(".bellnum.rope"+bell.num).text(bell.num+"\n"+bell.ringers.join("\n"));
          }
        }
        entrants[j].bells = o.bells;
      }
    
    }
  }
  
  //rotate and/or flip the ropes displayed
  function rearrange(rev) {
    let coords = [];
    $(".bellnum").remove();
    for (let i = 0; i < numbells; i++) {
      let o = {left: bells[i].left, top: bells[i].top};
      coords.push(o);
    }
    if (rev) {
      coords.reverse();
      let i = (centerbell - numbells/2)*2;
      if (i < 0) i+= numbells;
      for (let j = 0; j < i; j++) {
        coords.push(coords.shift());
      }
    } else {
      let centernum = centerself && mybells.length ? Math.min(...mybells) : numbells/2;
      let offset = centernum - centerbell;
      if (offset < 0) offset += numbells;
      //if ((!centerself && trebleloc === "right") || (centerself && trebleloc === "left")) coords.reverse();
      while (offset > 0) {
        coords.push(coords.shift());
        offset--;
      }
      centerbell = centernum;
    }
    for (let i = 0; i < numbells; i++) {
      bells[i].left = coords[i].left;
      bells[i].top = coords[i].top;
      let angle = (bells[i].stroke === 1 ? 145 : 45) * (bells[i].left > 400 ? -1 : 1);
      let transform = (numbells >= 10 ? "scale(0.8) " : "") + "rotate("+angle+"deg)";
      $("#rope"+bells[i].num).attr("style", "left:"+coords[i].left+"px;top:"+coords[i].top+"px;transform:"+transform+";");
      bellnums(bells[i]);
    }
    
    
    
    if (rev && mbells.length >= 2) {
      let k = ["j", "f"];
      if (trebleloc === "left") k.reverse();
      for (let i = 0; i < 2; i++) {
        let b = mbells[i].num;
        if (mbells[i].keys.includes(k[1-i])) mbells[i].keys = (b < 10 ? b.toString() : b === 10 ? "0" : b === 11 ? "-" : "=") + k[i];
      }
    }
  }
  
  //what it says on the tin
  function stagechange(o) {
    //if (n !== numbells) {
      numbells = o.numbells;
      
      $("#display div").remove();
      $("#bells div").remove();
      $(".phone option").remove();
      $(".assign ul.dropdown").remove();
    let th = Math.PI /numbells;
    let xx = [];
    let yy = [];
    let n = 1;
    let c = [10,12].includes(numbells) ? 240 : [14,16].includes(numbells) ? 280 : 200;
    
    do {
      xx.push(c*Math.sin(n*th));
      yy.push(c*Math.cos(n*th));
      n += 2;
    } while (n*th < Math.PI/2);
    if (n*th === Math.PI/2) {
      xx.push(c);
      yy.push(0);
    }
    
      bells.forEach(b => delete b.num);
      let centernum = centerself && mybells.length ? Math.min(...mybells) : numbells/2;
    centerbell = numbells/2;
      let offset = (centernum + numbells/2)%numbells;
    let k = 0;
      for (let i = 0; i < numbells; i++) {
        let j = trebleloc === "left" ? i : numbells-1-i;
        let num = trebleloc === "left" ? numbells-i : i+1;
        if (num === 0) num = numbells;
        let bell = bells[j];
        
        bell.num = num;
        bell.stroke = o.bells.find(b => b.num === num).stroke;
        if (i < numbells / 4) {
          bell.left = 400 + xx[k];
          bell.top = 300 - yy[k];
          i+1 >= numbells/4 ? (numbells%4 === 0 ? k*=1 : k--) : k++;
        } else if ( i < numbells / 2) {
          bell.left = 400 + xx[k];
          bell.top = 300 + yy[k];
          if (k > 0) k--;
        } else if (i < 3*numbells/4) {
          bell.left = 400 - xx[k];
          bell.top = 300 + yy[k];
          i+1 >= 3*numbells/4 ? (numbells%4 === 0 ? k*=1 : k--) : k++;
        } else {
          bell.left = 400 - xx[k];
          bell.top = 300 - yy[k];
          if (k > 0) k--;
        }
        bell.ringers = entrants.filter(o => o.bells.includes(bell.num)).map(o => o.name);
        addBell(bell, i);
        bellnums(bell);
      }
      //$(".bellnum").css("width", width+"px");
      $("#numbells li").css({color: "black", "background-color": "white"});
      let stage = stages[(numbells-4)/2];
      $("li#"+stage).css({color: "white", "background-color": "black"});
      
      for (let i = 0; i < entrants.length; i++) {
        entrants[i].bells = entrants[i].bells.filter(b => b <= numbells);
        $("li#"+entrants[i].name+ " > div.assign").append(selectOpts(entrants[i].name, entrants[i].bells));
        updateentrant(entrants[i]);
        if (entrants[i].name === name) {
          assign(entrants[i]);
        }
      }
    for (let i = numbells; i < bells.length; i++) {
      delete bells[i].left;
      delete bells[i].top;
      bells[i].ringers = [];
    }
    rearrange(false);
    //}
  }
  
  //add bell number above the rope
  function bellnums(bell) {
    let left = bell.left + (bell.left > 400 ? 120 : -50);
    let hemi = bell.left > 400 ? " right" : " left";
    let top = bell.top + 5;
    let names = entrants.filter(o => o.bells.includes(bell.num)).map(o => o.name).join("\n");
    let elem = `<div class="bellnum rope${bell.num + hemi}" style="left:${left}px;top:${top}px;">${bell.num + (names.length ? "\n"+names : "")}</div>`;
    $("#bells").append(elem);
  }
  
  //assign a bell to me
  function assign(me) {
    
    if (me && me.bells) {
      //console.log(me.bells);
      //remove any event listeners
      sallies.forEach(remove);
      
      //remove anything from my old arrays of bells not in the new array
      mybells.forEach(b => {
        let i = mbells.findIndex(m => m.num === b);
        if (!me.bells.includes(b)) {
          $('.phone option[value="'+b+'"]').remove();
          $('label[for="bell'+b+'"]').parent("li").remove();
          mbells.splice(i, 1);
        }
      });
      mybells = mybells.filter(b => me.bells.includes(b));
      
      //add whatever's needed
      me.bells.forEach(b => {
        let bell = bells.find(be => be.num === b);
        let keys = b < 10 ? b.toString() : b === 10 ? "0" : b === 11 ? "-" : "="; //+(i===0 ? "j" : i===1 ? "f" : "")
        sallies.push(document.getElementById("rope"+b));
        let mbell = mbells.find(mb => mb.num === b);
        if (mbell) {
          mbell.name = bell.bell;
          mbell.keys = keys;
        }
        if (!mybells.includes(b)) {
          
          //console.log(bell);
          
          $(".phone select").append(`<option value="${b}">${b}</option>`);
          
          mbells.push({num: b, name: bell.bell, keys: keys});
          mybells.push(b);
        }
      });
      /*
      mbells = [];
      $(".phone option").remove();
      let options = '<option></option>';
      
      $("#keyboard ul > li").detach();
      if (mybells.length > 0) {
        $("#keyboard ul").append("<li>Press ANY of the keys to ring the corresponding bell</li>");
        mybells.forEach((mb, i) => {
          let bell = bells.find(b => b.num === mb);
          let keys = (mb < 10 ? mb : mb === 10 ? "0" : mb === 11 ? "-" : "=")+(i===0 ? "j" : i===1 ? "f" : "");
          mbells.push({num: mb, name: bell.bell, keys: keys});
          options += `<option value="${mb}">${mb}</option>`;
          sallies.push(document.getElementById("sally"+bell.bell));
          tails.push(document.getElementById("tail"+bell.bell));
          document.getElementById("hand15"+bell.bell).addEventListener("endEvent", endpull);
          document.getElementById("back14"+bell.bell).addEventListener("endEvent", endpull);
          let li = `<li><label for="bell${mb}">bell ${mb}:</label><input type="text" id="bell${mb}" value="${keys}" class="keyboard" /></li>`;
          $("#keyboard ul").append(li);
        });
        
        $(".phone select").append(options);
        
      } */
      sallies.forEach(s => {
          s.addEventListener("mouseenter", pointer);
          s.addEventListener("click", emitring);
        });
        
        
      mbells.sort((a,b) => {b.num-a.num});
      let keys = ["j", "f"];
      for (let i = 0; i < 2; i++) {
        let k = trebleloc === "right" ? keys[i] : keys[1-i];
        if (mbells[i] && !mbells.map(m => m.keys).join("").includes(k)) mbells[i].keys += k;
      }
      mbells.forEach(b => {
        if ($("#bell"+b.num).length === 0) {
          let li = `<li><label for="bell${b.num}">bell ${b.num}:</label><input type="text" id="bell${b.num}" value="${b.keys}" class="keyboard" /></li>`;
          $("#keyboard ul").append(li);
        }
        
      });
    }
    
  }
  
  async function getFile(audioContext, filepath) {
    const response = await fetch(filepath);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  }
  
  //create sound buffers for all the bells
  async function setupSample(i) {
    let arrayBuffer = await getFile(audioCtx, bells[i].url);
    audioCtx.decodeAudioData(arrayBuffer, (buffer) => {
      bells[i].buffer = buffer;
      if (i < bells.length-1) {
        i++;
        setupSample(i);
      } else {
        console.log("finished setting up");
      }
    }, (e) => { console.log(e) });
  }
  
  //given bellnum find the buffer to play
  function ring(bellnum) {
    //console.log(this.id);
    let bell = bells.find(b => b.num === bellnum);
    if (bell) {
      let buffer = bell.buffer;
      playSample(audioCtx, buffer);
    }
  }
  
  //play sound
  function playSample(audioContext, audioBuffer) {
    //console.log("playSample called");
    //console.log(audioBuffer);
    const sampleSource = audioContext.createBufferSource();
    sampleSource.buffer = audioBuffer;
    sampleSource.connect(gainNode).connect(audioContext.destination)
    //sampleSource.connect(audioContext.destination);
    sampleSource.start();
    return sampleSource;
  }
  
  //just updates mbells??? leftover from animations, is this still being used?
  function endpull(e) {
    let bellnum = Number(this.id.slice(4));
    let bell = mbells.find(o => o.num === bellnum);
    if (bell) {
      bell.ringing = false;
    }
  }
  
  //taken from https://developer.apple.com/forums/thread/128376
  function requestDeviceMotion () {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {

        }
      })
      .catch(console.error);
    } else {
    // handle regular non iOS 13+ devices
    console.log ("not iOS");
    }
  }
  
  var svgurl = "http://www.w3.org/2000/svg";
  var pathinfo = {d: `M10,5
               H90
               q -20 20, -20 60
               q -20 10, -40 0
               q 0 -40, -20 -60
               `,
                 "stroke-width": "2",
                 stroke: "black"};
  function addBell(bell, i) {
    let svg = document.createElementNS(svgurl, "svg");
    let info = {width: "100", height: "100", viewBox: bell.viewbox};
    for (let key in info) {
      svg.setAttributeNS(null, key, info[key]);
    }
    let path = document.createElementNS(svgurl, "path");
    for (let key in pathinfo) {
      path.setAttributeNS(null, key, pathinfo[key]);
    }
    svg.appendChild(path);
    
    let transform = (numbells >= 10 ? "scale(0.8) " : "") + "rotate("+(i < numbells/2 ? "-145deg)" : "145deg)");
    let div = document.createElement("div");
    div.id = "rope"+bell.num;
    div.setAttribute("class", "bell "+bell.bell);
    div.setAttribute("style", "left:"+bell.left+"px;top:"+bell.top+"px;transform:"+transform);
    div.appendChild(svg);
    let base = document.createElement("div");
    base.setAttribute("class", "base");
    let handle = document.createElement("div");
    handle.setAttribute("class", "handle");
    div.appendChild(base);
    div.appendChild(handle);
    let room = document.getElementById("bells");
    room.appendChild(div);
    
    
  }
  
  //add a bell
  function addrope(bell) {
    let rope = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="rope${bell.num}" class="rope" width="${width}" height="500" viewBox="0 ${bell.stroke === 1 ? "0" : "173.7"} ${width} 500" >
          <defs>
            <pattern id="sallypattern" x="0" y="0" width="1" height="0.13" >
              <path stroke="blue" stroke-width="3.2" d="M-2,4 l5,-5" />
              <path stroke="red" stroke-width="3.2" d="M-2,8 l9,-9" />
              <path stroke="skyblue" stroke-width="3.2" d="M-2,12 l12,-12" />
              <path stroke="blue" stroke-width="3.2" d="M1,13 l9,-9" />
              <path stroke="red" stroke-width="3.2" d="M5,13 l5,-5" />
            </pattern>
          </defs>
          
          <rect x="30" y="-90" width="3" height="260" fill="#ddd" stroke-width="1" stroke="#aaa" />
          <rect x="30" y="255" width="3" height="60" fill="#ddd" stroke-width="1" stroke="#aaa" />
          
          <svg id="hand${bell.num}" class="hand">
            <rect x="0" y="170" width="29" height="90" fill="white"/>
            <rect x="35" y="170" width="29" height="90" fill="white"/>
            <rect id="sally${bell.num}" class="sally" x="27" y="170" width="9" height="90" rx="7" fill="url(#sallypattern)" />
          </svg>
          
          <svg id="back${bell.num}" class="back">
            <rect x="0" y="315" width="29" height="61" fill="white"/>
            <rect x="33" y="315" width="29" height="61" fill="white"/>
            <svg id="tail${bell.num}" class="tail">
              <rect x="30" y="315" width="5" height="61" fill="white"/>
              <path stroke="#ddd" stroke-width="3" d="M31.5,310
                                                      v30
                                                      l2,2
                                                      v30
                                                      l-1,2
                                                      h-2
                                                      l-1,-2
                                                      v-28
                                                      l4,-5
                                                      v-20
                                                      l-6,-3" fill="none" />
              <path stroke="#aaa" stroke-width="1" d="M30,290 v50
                                                      l2,2
                                                      v30
                                                      l-1,2
                                                      l-1,-2
                                                      v-28
                                                      l5,-5
                                                      v-20
                                                      l-6,-3" fill="none" />
              <path stroke="#aaa" stroke-width="1" d="M33,290 v50
                                                      l2,2
                                                      v30
                                                      l-2,3
                                                      h-4
                                                      l-2,-2
                                                      v-28
                                                      l6,-7
                                                      v-17
                                                      l-6,-3
                                                      l1.2,-2" fill="none" />
              <rect x="30.5" y="315" width="2" height="9" fill="#ddd" />
              <path stroke="#ddd" fill="none" stroke-width="1" d="M31,342 l3,-3" />
            </svg>
          </svg>
          
          
        </svg>`
    
    $("#bells").append(rope);
  }
  
  
});



