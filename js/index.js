/*
    Chat Example for Bluetooth Serial PhoneGap Plugin
    http://github.com/don/BluetoothSerial

    Copyright 2013 Don Coleman

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/* jshint quotmark: false, unused: vars */
/* global cordova, bluetoothSerial, listButton, connectButton, sendButton, disconnectButton */
/* global chatform, deviceList, message, messages, statusMessage, chat, connection */

String.prototype.getBytes = function()
{
  var bytes = [];
  for (var i = 0; i < this.length; ++i)
    bytes.push(this.charCodeAt(i));

  return bytes;
};

'use strict';

var app = 
{
  initialize: function()
  {
    deviceReady = false;
    
    remoteDevice = "";
    remoteName = "";

    this.bind();
  },
  
  bind: function()
  {
    listBusy = false;
    document.addEventListener('deviceready', this.deviceready, false);
    document.addEventListener("pause", this.suspend, false);
    document.addEventListener("resume", this.resume, false);
    
    $(document).ready(function()
    {
      //app.ondisconnect();
    });
  },
  
  deviceready: function()
  {
    console.log("deviceready");
    deviceReady = true;
    suspended = false;
    debugmessages.value = "";
    connecting = false;

    // note that this is an event handler so the scope is that of the event
    // so we need to call app.foo(), and not this.foo()

    // wire buttons to functions
    connectButton.onclick = app.connect_btn;
    connectQrButton.onclick = app.connect_qr;
    listButton.onclick = app.list;
    disconnectBtn.onclick = app.disconnect;

    //document.addEventListener("showkeyboard", keyboardShow, false);

    bluetoothSerial.isEnabled(function(){}, function(){app.setStatus("Bluetooth is not enabled");});
    
    // listen for messages
    bluetoothSerial.subscribe("\n", app.onmessage, app.generateFailureFunction("Subscribe Failed"));

    setTimeout(app.list, 1000);   // get a list of peers
  },
  
  suspend: function()
  {
    suspended = true;
  },
  
  resume: function()
  {
    suspended = false;
    
    if(!deviceReady || connecting)
      return;
    
    //app.setStatus("Resuming...");

    try
    {
      var isNotConnected = function ()
      {
        // Try to reconnect
        app.setStatus("Reconnecting to " + remoteDevice + " ...");
        app.list();
      };
      
      bluetoothSerial.isConnected(function(){}, isNotConnected);
    }
    catch(e)
    {}
    
  },
  
  keyboardShow: function()
  {
    $(document.activeElement).select();
  },
  
  list: function(event)
  {
    if(!deviceReady)
      return;
    
    if(listBusy)
    {
      app.setStatus("Discovery runnning ...");
      return;
    }

    var listFailed = function ()
    {
      listBusy = false;
      app.enable(listButton);
      app.generateFailureFunction("List Failed");
    };
    
    remoteDevice = window.localStorage.getItem("bluetooth");
    if(remoteDevice != null)
    {
      window.localStorage.removeItem("bluetooth");
      
      connecting = true;
      app.disable(connectButton);
      app.setStatus("Connecting to " + remoteDevice + " ...");
      try
      {
        bluetoothSerial.connect(remoteDevice, app.onconnect, app.ondisconnect);
      }
      catch(e)
      {}
    }
    else
    {
      app.setStatus("Looking for Bluetooth Devices...");
      app.disable(connectButton);
      try
      {
        listBusy = true;
        app.disable(listButton);
        
        bluetoothSerial.list(app.ondevicelist, listFailed);
      }
      catch(e)
      {
        listFailed();
      }
      
      deviceList.innerHTML = "";
      var option = document.createElement('option');
      option.innerHTML = "Discovering...";
      option.value = "0";
      deviceList.appendChild(option);

      if($('#deviceList').selectmenu('instance') !== undefined)
        $('#deviceList').selectmenu('refresh');
    }
  },
  
  connect: function(mac, name)
  {
    remoteDevice = mac;
    remoteName = name;

	connecting = true;
    app.disable(connectButton);
	
    app.setStatus("Connecting to " + remoteName + "...");
    bluetoothSerial.connect(remoteDevice, app.onconnect, app.ondisconnect);
  },
  
  connect_btn: function(device)
  {
	if(deviceList[deviceList.selectedIndex].value != '0')
	  connect(deviceList[deviceList.selectedIndex].innerHTML, deviceList[deviceList.selectedIndex].value);
    else
      app.list();
  },
  
  connect_qr: function()
  {
    cordova.plugins.barcodeScanner.scan(function(result)
    {
      if(!result.cancelled)
		connect("Anonymous via QR", result.text);
    });
  },
  
  disconnect: function(bye)
  {
    try
    {
      var isConnected = function ()
      {
        app.disable(disconnectBtn);
        app.setStatus("Disconnecting...");
        if(bye === undefined)
          bluetoothSerial.disconnect(app.ondisconnect);
        else
          bluetoothSerial.disconnect();
      };
      
      bluetoothSerial.isConnected(isConnected);
    }
    catch(e)
    {}
  },
  
  pollWeight: function()
  {
    if(suspended)
      return;
    
    try
    {
      var isConnected = function ()
      {
        var text = "$WGT?\n";
    
        bluetoothSerial.write(text);
      };
      
      bluetoothSerial.isConnected(isConnected);
    }
    catch(e)
    {}
  },
  
  ondevicelist: function(devices)
  {
    var option;
    listBusy = false;
    app.enable(listButton);
    
    // remove existing devices
    deviceList.innerHTML = "";
    app.setStatus("");

    var previousDevice = window.localStorage.getItem("bluetoothLast");

    devices.forEach(function(device)
    {
      option = document.createElement('option');
      if (device.hasOwnProperty("uuid"))
        option.value = device.uuid;
      else if (device.hasOwnProperty("address"))
        option.value = device.address;
      else
        option.value = "ERROR " + JSON.stringify(device);

  	  if((device.name == "HC-05") || (device.name == "LoadMonitor"))
        option.innerHTML = device.name + " (" + device.address + ")";
      else
        option.innerHTML = device.name;
	
	  if(device.class == 7936)
        deviceList.insertBefore(option, deviceList.childNodes[0]);
      else
        deviceList.appendChild(option);
      
      if(option.value == remoteDevice)
        deviceList.selectedIndex = deviceList.length;
      else if((option.value == previousDevice) && (deviceList.selectedIndex == -1))
        deviceList.selectedIndex = deviceList.length;
    });
    
    if($('#deviceList').selectmenu('instance') !== undefined)
      $('#deviceList').selectmenu('refresh');
    
    if (devices.length === 0)
    {
      option = document.createElement('option');
      option.innerHTML = "No Bluetooth Devices";
      deviceList.appendChild(option);
      if($('#deviceList').selectmenu('instance') !== undefined)
        $('#deviceList').selectmenu('refresh');
      
      if (cordova.platformId === "ios") // BLE
      {
        app.setStatus("No Bluetooth Peripherals Discovered.");
      }
      else  // Android
      {
        app.setStatus("Please Pair a Bluetooth Device.");
      }
      
      app.disable(connectButton);
    }
    else
    {
      //bluetoothSerial.isConnected(function(){}, function(){app.enable(connectButton);});
      app.enable(connectButton);
      app.setStatus("Found " + devices.length + (devices.length === 1 ? " device." : " devices."));
    }
  },
  
  onconnect: function()
  {
    connecting = false;
      
    app.setStatus("Connected to " + remoteName);
    app.enable(disconnectBtn);
    app.enable(connectIcon);
    
    if(remoteDevice)
      window.localStorage.setItem("bluetooth", remoteDevice);

    window.localStorage.setItem("bluetoothLast", remoteDevice);
    
    var firstpoll = function ()
    {
      app.sendDataRaw("$CAL?");
    };
    setTimeout(firstpoll, 250);
  },
  
  ondisconnect: function(reason)
  {
    connecting = false;
    
    var details = "";
    if (reason)
    {
      details += ": " + JSON.stringify(reason);
    }
    app.disable(connectIcon);
    app.disable(disconnectBtn);
    app.enable(connectButton);
    app.setStatus("Disconnected" + details);
    
    setTimeout(app.list, 2000);
    
    try{ mainValue(); } catch(e) {}
    try{ valuesConfig(); } catch(e) {}
    try{ valuesAngles(); } catch(e) {}
    try{ calibrationMax(); } catch(e) {}
    try{ calibrationStatus(); } catch(e) {}
  },
  
  //var subscribers = [],
  
  subscribe: function(message)
  {
  
  },
  
  onmessage: function(message)
  {
    var dump = false;

    var success = function ()
    {
    };
    var failed = function ()
    {
      app.setStatus("sendDataRaw failed");
    };
	
    var rsp = message.split("=");
	if(rsp[1] === undefined)
		rsp[1] = "";
    rsp[1] = rsp[1].replace(/(\r\n|\n|\r)/gm, "");
    var args = rsp[1].split(",");
    
    if(rsp[0] == "@ERR")
    {
      app.setStatus("Error: " + args[1] + " (" + args[0] + ")");
    }
    else if(rsp[0] == "@SEQ")
    {
      var num = args[0].match(/\d+/)[0];
      var text = "$SEQ=" + num + "\n";
      bluetoothSerial.write(text);
    }    
    else if(rsp[0] == "@WGT")
    {
      mainValue(args);
    }
    else if(rsp[0] == "@CFG")
    {
      valuesConfig(args);
    }
    else if(rsp[0] == "@ANG")
    {
      valuesAngles(args);
    }
    else if(rsp[0] == "@MAX")
    {
      dump = true;
      calibrationMax(args);
    }
    else if(rsp[0] == "@CAR")
    {
      dump = true;
      calibrationCar(args);
    }
    else if(rsp[0] == "@POL")
    {
      dump = true;
      calibrationPol(args);
    }
    else if(rsp[0] == "@BUZ")
    {
      dump = true;
      calibrationBuz(args);
    }
    else if(rsp[0] == "@CAL")
    {
      dump = true;
      calibrationStatus(args);
    }    
    else
	{
      dump = true;
	}
    
    if(debugmessages && dump)
    {
      debugmessages.value += message;
      debugmessages.scrollTop = debugmessages.scrollHeight;
    }
  },
  
  sendDataRaw: function(data)
  {
    if(!deviceReady)
    {
	  console.log("sendDataRaw("+ data + ") abort, device not ready");
      return;
    }
    if(suspended)
      return;
  
    if(data.indexOf('?') === -1)
    {
      debugmessages.value += data + " ";
      debugmessages.scrollTop = debugmessages.scrollHeight;
    }
    
    try
    {
      var isConnected = function()
      {
        data += "\n";
      
        var success = function ()
        {
          //debugmessages.value += data;
          //debugmessages.scrollTop = debugmessages.scrollHeight;
        };
        var failed = function ()
        {
          app.setStatus("sendDataRaw failed");
          //debugmessages.value += data;
          //debugmessages.scrollTop = debugmessages.scrollHeight;
        };
    
        bluetoothSerial.write(data, success, app.generateFailureFunction("sendDataRaw Failed"));
      };
      
      bluetoothSerial.isConnected(isConnected);
    }
    catch(e)
    {
      app.setStatus("sendRaw failed on " + data);
    }
  },
  
  setStatus: function(message)
  {
	if(message != "")
	{
      console.log(message); 
      if(debugmessages !== undefined)
      {
        debugmessages.value += message + "\n";
        debugmessages.scrollTop = debugmessages.scrollHeight;
	  }
    }

    window.clearTimeout(app.statusTimeout);
    $('div.statusMessage').html(message);
    $('div.statusMessage').removeClass('fadeout');
    $('div.statusMessage').addClass('fadein');

    // automatically clear the status with a timer
    app.statusTimeout = setTimeout(function ()
    {
      $('div.statusMessage').removeClass('fadein');
      $('div.statusMessage').addClass('fadeout');
    }, 5000);
  },
    
  enable: function(button)
  {
    button.className = button.className.replace(/\bui-state-disabled\b/g,'');
    //button.removeClass("ui-state-disabled");
  },
  
  disable: function(button)
  {
    //button.addClass("ui-state-disabled");
    if(!button.className.match(/ui-state-disabled/))
    {
      button.className += " ui-state-disabled";
    }
  },
  
  generateFailureFunction: function(message)
  {
    var func = function(reason)
    {
      var details = "";
      if (reason)
      {
        details += ": " + JSON.stringify(reason);
      }
      app.setStatus(message + details);
    };
    return func;
  }
};


// https://stackoverflow.com/questions/21677695/input-type-number-not-possible-to-insert-negative-numbers-on-mobile-phone
// https://gist.github.com/bendytree/936f6b9b4c0e10138b7e9158b5fd05d9
// not triggered yet...
(function($)
{
  var onKeyDown = function(e)
  {
    var $input = $(e.target);
    var lastkey = $input.data("ddn-lastkey");
    var lastval = $input.data("ddn-lastval");
    var key = String.fromCharCode(e.charCode);
    if(lastkey === "." && key === ".")
	{
      $input.val(isNaN(lastval) ? "-0" : String(-1 * lastval));
      $input.data("ddn-lastkey", "");
      e.preventDefault();
    }
	else
	{
      $input.data("ddn-lastkey", key);
    }
    $input.data("ddn-lastval", parseFloat($input.val()));
  };

  $.fn.doubleDotNegative = function()
  {
    $(this).each(function()
	{
      var $input = $(this);
      $input.data("ddn-lastval", parseFloat($input.val())||0);
      $input.keypress(onKeyDown);
    });
  };
})(jQuery);

var isAndroid = /android/i.test(window.navigator.userAgent);
if (isAndroid)
{
  $("input[type=number]").doubleDotNegative();
}
